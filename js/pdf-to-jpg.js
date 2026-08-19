/**
 * DocuHug — PDF to JPG Engine (Phase 4)
 * High-performance, client-side PDF-to-JPG image extraction using PDF.js and JSZip.
 * Strictly 100% Client-Side.
 */

class PdfToJpgEngine {
  constructor() {
    this.currentFile = null;
    this.arrayBuffer = null;
    this.pdfjsDoc = null;
    this.pageCount = 0;
    this.selectedPages = new Set(); // 1-based page numbers
    this.scale = 1.5; // 1.0, 1.5, 2.0
    this.quality = 0.9;
    this.convertedImages = []; // { id, pageNum, name, width, height, blob, previewUrl }
    this.isConverting = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('pdf-to-jpg-dropzone');
    this.fileInput = document.getElementById('pdf-to-jpg-file-input');
    this.workspace = document.getElementById('pdf-to-jpg-workspace');

    // Document Meta
    this.docNameEl = document.getElementById('pdf-to-jpg-doc-name');
    this.docMetaEl = document.getElementById('pdf-to-jpg-doc-meta');
    this.btnChangeDoc = document.getElementById('btn-change-pdf-doc');

    // Controls
    this.selectScale = document.getElementById('pdf-to-jpg-scale');
    this.selectQuality = document.getElementById('pdf-to-jpg-quality');
    this.btnSelectAll = document.getElementById('btn-select-all-pages');
    this.btnDeselectAll = document.getElementById('btn-deselect-all-pages');
    this.pagesGrid = document.getElementById('pdf-pages-grid');

    // Action button
    this.btnConvert = document.getElementById('btn-convert-action');

    // Results Section
    this.resultSection = document.getElementById('pdf-to-jpg-results');
    this.resultsGrid = document.getElementById('pdf-to-jpg-results-grid');
    this.btnDownloadZip = document.getElementById('btn-download-jpg-zip');
    this.btnReset = document.getElementById('btn-reset-pdf-to-jpg');
  }

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    DocuUtils.bindDropzone(this.dropzone, this.fileInput, (files) => {
      if (files.length > 0) this.handleFileSelected(files[0]);
    });

    if (this.btnChangeDoc) {
      this.btnChangeDoc.addEventListener('click', () => this.reset());
    }

    if (this.selectScale) {
      this.selectScale.addEventListener('change', (e) => {
        this.scale = parseFloat(e.target.value);
      });
    }

    if (this.selectQuality) {
      this.selectQuality.addEventListener('change', (e) => {
        this.quality = parseFloat(e.target.value);
      });
    }

    if (this.btnSelectAll) {
      this.btnSelectAll.addEventListener('click', () => {
        for (let p = 1; p <= this.pageCount; p++) this.selectedPages.add(p);
        this.updatePageSelectionUI();
      });
    }

    if (this.btnDeselectAll) {
      this.btnDeselectAll.addEventListener('click', () => {
        this.selectedPages.clear();
        this.updatePageSelectionUI();
      });
    }

    if (this.btnConvert) {
      this.btnConvert.addEventListener('click', () => this.convertPages());
    }

    if (this.btnDownloadZip) {
      this.btnDownloadZip.addEventListener('click', () => this.downloadAllAsZip());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.reset());
    }
  }

  async handleFileSelected(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      DocuUtils.showToast('Please select a valid PDF document.', 'error');
      return;
    }

    try {
      this.arrayBuffer = await DocuUtils.readFileAsArrayBuffer(file);
      this.currentFile = file;

      if (typeof pdfjsLib === 'undefined') {
        DocuUtils.showToast('PDF.js library is loading. Please try again.', 'warning');
        return;
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(this.arrayBuffer) });
      this.pdfjsDoc = await loadingTask.promise;
      this.pageCount = this.pdfjsDoc.numPages;

      // Select all pages by default
      this.selectedPages.clear();
      for (let p = 1; p <= this.pageCount; p++) {
        this.selectedPages.add(p);
      }

      // Update Header
      if (this.docNameEl) this.docNameEl.textContent = file.name;
      if (this.docMetaEl) {
        this.docMetaEl.textContent = `${this.pageCount} ${this.pageCount === 1 ? 'Page' : 'Pages'} • ${DocuUtils.formatBytes(file.size)}`;
      }

      if (this.dropzone) this.dropzone.classList.add('hidden');
      if (this.workspace) this.workspace.classList.remove('hidden');

      this.renderPagesSelector();
    } catch (err) {
      DocuUtils.showToast(`Failed to read PDF: ${err.message}`, 'error');
    }
  }

  async renderPagesSelector() {
    if (!this.pagesGrid) return;
    this.pagesGrid.innerHTML = '';

    for (let p = 1; p <= this.pageCount; p++) {
      const pageCard = document.createElement('div');
      pageCard.id = `page-card-${p}`;
      pageCard.className = 'relative bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm cursor-pointer transition-all hover:border-brand-400 select-none';

      // Thumbnail Canvas
      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'w-full h-40 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-2';

      const canvas = document.createElement('canvas');
      canvas.className = 'max-h-full w-auto object-contain';
      canvasContainer.appendChild(canvas);

      // Label & Checkbox
      const footer = document.createElement('div');
      footer.className = 'flex items-center justify-between mt-1 text-xs';
      footer.innerHTML = `
        <span class="font-bold text-slate-700">Page ${p}</span>
        <input type="checkbox" id="check-p-${p}" class="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 pointer-events-none" checked />
      `;

      pageCard.appendChild(canvasContainer);
      pageCard.appendChild(footer);

      // Toggle selection on click
      pageCard.addEventListener('click', () => {
        if (this.selectedPages.has(p)) {
          this.selectedPages.delete(p);
        } else {
          this.selectedPages.add(p);
        }
        this.updatePageSelectionUI();
      });

      this.pagesGrid.appendChild(pageCard);

      // Async render thumbnail
      this.renderSingleThumbnail(p, canvas);
    }

    this.updatePageSelectionUI();
  }

  async renderSingleThumbnail(pageNum, canvas) {
    try {
      const page = await this.pdfjsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.3 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.warn(`Thumbnail render failed for page ${pageNum}:`, err);
    }
  }

  updatePageSelectionUI() {
    for (let p = 1; p <= this.pageCount; p++) {
      const card = document.getElementById(`page-card-${p}`);
      const chk = document.getElementById(`check-p-${p}`);
      const isSelected = this.selectedPages.has(p);

      if (card && chk) {
        chk.checked = isSelected;
        if (isSelected) {
          card.classList.add('border-brand-600', 'bg-brand-50/20');
          card.classList.remove('border-slate-200');
        } else {
          card.classList.remove('border-brand-600', 'bg-brand-50/20');
          card.classList.add('border-slate-200');
        }
      }
    }

    if (this.btnConvert) {
      const count = this.selectedPages.size;
      this.btnConvert.disabled = count === 0;
      this.btnConvert.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Convert ${count} ${count === 1 ? 'Page' : 'Pages'} to JPG
      `;
    }
  }

  async convertPages() {
    if (this.isConverting || this.selectedPages.size === 0) return;

    this.isConverting = true;
    this.cleanConvertedPreviews();
    this.convertedImages = [];

    if (this.btnConvert) {
      this.btnConvert.disabled = true;
      this.btnConvert.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Rendering JPG Images...
      `;
    }

    try {
      const baseName = DocuUtils.getBaseFilename(this.currentFile.name);
      const sortedPages = Array.from(this.selectedPages).sort((a, b) => a - b);

      for (let i = 0; i < sortedPages.length; i++) {
        const pageNum = sortedPages[i];
        const page = await this.pdfjsDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: this.scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        // Solid white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await DocuUtils.canvasToBlob(canvas, 'image/jpeg', this.quality);
        const previewUrl = URL.createObjectURL(blob);

        this.convertedImages.push({
          id: `jpg_p_${pageNum}`,
          pageNum,
          name: `${baseName}_page_${pageNum}.jpg`,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
          blob,
          previewUrl,
        });
      }

      this.renderResults();
      DocuUtils.showToast(`Converted ${this.convertedImages.length} pages to JPG!`, 'success');
    } catch (err) {
      DocuUtils.showToast(`Conversion failed: ${err.message}`, 'error');
    } finally {
      this.isConverting = false;
      this.updatePageSelectionUI();
    }
  }

  renderResults() {
    if (!this.resultsGrid || !this.resultSection) return;
    this.resultsGrid.innerHTML = '';

    this.convertedImages.forEach((img) => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between';

      card.innerHTML = `
        <div>
          <div class="w-full h-48 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-3">
            <img src="${img.previewUrl}" alt="Page ${img.pageNum}" class="max-h-full w-auto object-contain" />
          </div>
          <h4 class="text-sm font-bold text-slate-800 truncate" title="${DocuUtils.escapeHtml(img.name)}">
            ${DocuUtils.escapeHtml(img.name)}
          </h4>
          <p class="text-xs text-slate-500 mt-1">
            ${img.width} × ${img.height} px • ${DocuUtils.formatBytes(img.blob.size)}
          </p>
        </div>

        <button type="button" class="btn-download-single-jpg mt-4 w-full py-2 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center justify-center gap-1.5" data-id="${img.id}">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download JPG
        </button>
      `;

      this.resultsGrid.appendChild(card);
    });

    this.resultsGrid.querySelectorAll('.btn-download-single-jpg').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const imgObj = this.convertedImages.find(i => i.id === id);
        if (imgObj) {
          DocuUtils.downloadBlob(imgObj.blob, imgObj.name);
        }
      });
    });

    if (this.btnDownloadZip) {
      this.btnDownloadZip.classList.toggle('hidden', this.convertedImages.length <= 1);
    }

    this.resultSection.classList.remove('hidden');
    this.resultSection.scrollIntoView({ behavior: 'smooth' });
  }

  async downloadAllAsZip() {
    if (this.convertedImages.length === 0) return;
    try {
      const fileList = this.convertedImages.map(img => ({
        filename: img.name,
        blob: img.blob,
      }));
      await DocuUtils.createAndDownloadZip(fileList, 'DocuHug_PDF_Pages.zip');
    } catch (err) {
      DocuUtils.showToast(`ZIP export failed: ${err.message}`, 'error');
    }
  }

  cleanConvertedPreviews() {
    this.convertedImages.forEach(img => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });
  }

  reset() {
    this.cleanConvertedPreviews();
    this.currentFile = null;
    this.arrayBuffer = null;
    this.pdfjsDoc = null;
    this.pageCount = 0;
    this.selectedPages.clear();
    this.convertedImages = [];

    if (this.fileInput) this.fileInput.value = '';
    if (this.workspace) this.workspace.classList.add('hidden');
    if (this.dropzone) this.dropzone.classList.remove('hidden');
    if (this.resultSection) this.resultSection.classList.add('hidden');
    if (this.pagesGrid) this.pagesGrid.innerHTML = '';

    DocuUtils.showToast('Workspace reset.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('pdf-to-jpg-app')) {
    window.pdfToJpgApp = new PdfToJpgEngine();
  }
});
