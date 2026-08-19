/**
 * DocuShrink — Merge PDF Engine (Phase 4)
 * High-performance, client-side PDF document merger using pdf-lib.
 * Strictly 100% Client-Side.
 */

class PdfMergerEngine {
  constructor() {
    this.files = []; // { id, file, name, size, pageCount, arrayBuffer }
    this.resultBlob = null;
    this.isMerging = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('merge-dropzone');
    this.fileInput = document.getElementById('merge-file-input');
    this.workspace = document.getElementById('merge-workspace');
    this.fileListContainer = document.getElementById('merge-file-list');
    this.docCountBadge = document.getElementById('merge-doc-count');
    this.totalPagesBadge = document.getElementById('merge-total-pages');

    this.btnAddMore = document.getElementById('btn-add-more-pdfs');
    this.addMoreInput = document.getElementById('add-more-pdf-input');
    this.btnClearAll = document.getElementById('btn-clear-merge');
    this.btnMerge = document.getElementById('btn-merge-action');

    this.resultSection = document.getElementById('merge-result-section');
    this.resultPagesText = document.getElementById('result-merged-pages');
    this.resultSizeText = document.getElementById('result-merged-size');
    this.btnDownload = document.getElementById('btn-download-merged');
    this.btnReset = document.getElementById('btn-reset-merge');
  }

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    DocuUtils.bindDropzone(this.dropzone, this.fileInput, (files) => this.handleFilesAdded(files));

    if (this.btnAddMore && this.addMoreInput) {
      this.btnAddMore.addEventListener('click', () => this.addMoreInput.click());
      this.addMoreInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) this.handleFilesAdded(files);
        this.addMoreInput.value = '';
      });
    }

    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => this.reset());
    }

    if (this.btnMerge) {
      this.btnMerge.addEventListener('click', () => this.mergePdfs());
    }

    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.downloadMergedPdf());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.reset());
    }
  }

  async handleFilesAdded(newFiles) {
    const validFiles = newFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (validFiles.length === 0) {
      DocuUtils.showToast('Please select valid PDF documents.', 'error');
      return;
    }

    if (typeof PDFLib === 'undefined') {
      DocuUtils.showToast('pdf-lib is still loading. Please try again in a moment.', 'warning');
      return;
    }

    for (const file of validFiles) {
      try {
        const arrayBuffer = await DocuUtils.readFileAsArrayBuffer(file);
        let pageCount = 0;

        try {
          const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          if (pdfDoc.isEncrypted) {
            DocuUtils.showToast(`"${file.name}" is password-protected or encrypted.`, 'error');
            continue;
          }
          pageCount = pdfDoc.getPageCount();
        } catch (loadErr) {
          DocuUtils.showToast(`Could not read "${file.name}": The file may be corrupt or encrypted.`, 'error');
          continue;
        }

        this.files.push({
          id: 'pdf_' + Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: file.size,
          pageCount,
          arrayBuffer,
        });
      } catch (err) {
        DocuUtils.showToast(`Error loading "${file.name}": ${err.message}`, 'error');
      }
    }

    this.render();
  }

  render() {
    if (this.files.length > 0) {
      if (this.dropzone) this.dropzone.classList.add('hidden');
      if (this.workspace) this.workspace.classList.remove('hidden');
    } else {
      if (this.dropzone) this.dropzone.classList.remove('hidden');
      if (this.workspace) this.workspace.classList.add('hidden');
    }

    const totalDocs = this.files.length;
    const totalPages = this.files.reduce((sum, f) => sum + f.pageCount, 0);

    if (this.docCountBadge) {
      this.docCountBadge.textContent = `${totalDocs} ${totalDocs === 1 ? 'Document' : 'Documents'}`;
    }
    if (this.totalPagesBadge) {
      this.totalPagesBadge.textContent = `${totalPages} Total Pages`;
    }

    if (this.btnMerge) {
      this.btnMerge.disabled = this.files.length < 2;
    }

    this.renderFileList();
  }

  renderFileList() {
    if (!this.fileListContainer) return;
    this.fileListContainer.innerHTML = '';

    this.files.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3 transition-all hover:border-slate-300';
      card.id = `item-${item.id}`;

      const isFirst = index === 0;
      const isLast = index === this.files.length - 1;

      card.innerHTML = `
        <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <!-- Order Badge -->
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm flex items-center justify-center flex-shrink-0 border border-emerald-200">
            ${index + 1}
          </div>

          <!-- PDF Icon -->
          <div class="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-bold text-slate-800 truncate" title="${DocuUtils.escapeHtml(item.name)}">
              ${DocuUtils.escapeHtml(item.name)}
            </h4>
            <p class="text-xs text-slate-500 mt-0.5">
              ${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'} • ${DocuUtils.formatBytes(item.size)}
            </p>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <button type="button" class="btn-move-up p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors" data-index="${index}" ${isFirst ? 'disabled' : ''} title="Move Up" aria-label="Move document ${index + 1} up">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>

          <button type="button" class="btn-move-down p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors" data-index="${index}" ${isLast ? 'disabled' : ''} title="Move Down" aria-label="Move document ${index + 1} down">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button type="button" class="btn-remove-doc p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1" data-id="${item.id}" title="Remove Document" aria-label="Remove document ${index + 1}">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;

      this.fileListContainer.appendChild(card);
    });

    this.fileListContainer.querySelectorAll('.btn-move-up').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.moveItem(idx, -1);
      });
    });

    this.fileListContainer.querySelectorAll('.btn-move-down').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        this.moveItem(idx, 1);
      });
    });

    this.fileListContainer.querySelectorAll('.btn-remove-doc').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.removeFile(id);
      });
    });
  }

  moveItem(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= this.files.length) return;

    const temp = this.files[index];
    this.files[index] = this.files[targetIdx];
    this.files[targetIdx] = temp;

    this.render();
  }

  removeFile(id) {
    this.files = this.files.filter(f => f.id !== id);
    this.render();
  }

  reset() {
    this.files = [];
    this.resultBlob = null;
    if (this.fileInput) this.fileInput.value = '';
    if (this.resultSection) this.resultSection.classList.add('hidden');
    this.render();
    DocuUtils.showToast('Workspace reset.');
  }

  async mergePdfs() {
    if (this.isMerging || this.files.length < 2) return;

    if (typeof PDFLib === 'undefined') {
      DocuUtils.showToast('pdf-lib is not available.', 'error');
      return;
    }

    this.isMerging = true;

    if (this.btnMerge) {
      this.btnMerge.disabled = true;
      this.btnMerge.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Merging ${this.files.length} PDFs...
      `;
    }

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();

      for (let i = 0; i < this.files.length; i++) {
        const item = this.files[i];
        const srcDoc = await PDFLib.PDFDocument.load(item.arrayBuffer, { ignoreEncryption: true });
        const indices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, indices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
      this.resultBlob = mergedBlob;

      const totalPages = mergedPdf.getPageCount();

      if (this.resultPagesText) this.resultPagesText.textContent = `${totalPages} Pages`;
      if (this.resultSizeText) this.resultSizeText.textContent = DocuUtils.formatBytes(mergedBlob.size);
      if (this.resultSection) this.resultSection.classList.remove('hidden');

      DocuUtils.showToast('PDFs merged successfully!', 'success');
    } catch (err) {
      DocuUtils.showToast(`Merge failed: ${err.message}`, 'error');
    } finally {
      this.isMerging = false;
      if (this.btnMerge) {
        this.btnMerge.disabled = false;
        this.btnMerge.innerHTML = `
          <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Merge PDF Files
        `;
      }
    }
  }

  downloadMergedPdf() {
    if (!this.resultBlob) return;
    DocuUtils.downloadBlob(this.resultBlob, 'merged_document.pdf');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('merge-pdf-app')) {
    window.pdfMergerApp = new PdfMergerEngine();
  }
});
