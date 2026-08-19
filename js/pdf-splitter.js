/**
 * DocuHug — Split PDF Engine (Phase 4)
 * Client-side PDF page extraction and range splitter using pdf-lib, PDF.js, and JSZip.
 * Strictly 100% Client-Side.
 */

class PdfSplitterEngine {
  constructor() {
    this.currentFile = null;
    this.arrayBuffer = null;
    this.pageCount = 0;
    this.pdfDoc = null; // pdf-lib document
    this.pdfjsDoc = null; // pdf.js document
    this.splitMode = 'extract'; // 'extract', 'all', 'ranges'
    this.outputFiles = []; // { id, name, rangeStr, pageCount, blob }
    this.isProcessing = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('split-dropzone');
    this.fileInput = document.getElementById('split-file-input');
    this.workspace = document.getElementById('split-workspace');

    // Document Meta
    this.docNameEl = document.getElementById('split-doc-name');
    this.docMetaEl = document.getElementById('split-doc-meta');
    this.btnChangeDoc = document.getElementById('btn-change-split-doc');

    // Mode Radios
    this.modeExtractRadio = document.getElementById('mode-extract');
    this.modeAllRadio = document.getElementById('mode-all');
    this.modeRangesRadio = document.getElementById('mode-ranges');

    // Mode Panels
    this.panelExtract = document.getElementById('panel-extract');
    this.panelAll = document.getElementById('panel-all');
    this.panelRanges = document.getElementById('panel-ranges');

    // Inputs
    this.inputExtractRange = document.getElementById('split-extract-range');
    this.inputMultiRanges = document.getElementById('split-multi-ranges');
    this.thumbnailsContainer = document.getElementById('split-thumbnails-grid');

    // Action button
    this.btnSplit = document.getElementById('btn-split-action');

    // Results Section
    this.resultSection = document.getElementById('split-result-section');
    this.resultsList = document.getElementById('split-results-list');
    this.btnDownloadAllZip = document.getElementById('btn-download-all-zip');
    this.btnReset = document.getElementById('btn-reset-split');
  }

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    DocuUtils.bindDropzone(this.dropzone, this.fileInput, (files) => {
      if (files.length > 0) this.handleFileSelected(files[0]);
    });

    if (this.btnChangeDoc) {
      this.btnChangeDoc.addEventListener('click', () => this.reset());
    }

    // Radio change handlers
    [this.modeExtractRadio, this.modeAllRadio, this.modeRangesRadio].forEach((radio) => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          this.splitMode = e.target.value;
          this.updateModePanels();
        });
      }
    });

    if (this.btnSplit) {
      this.btnSplit.addEventListener('click', () => this.executeSplit());
    }

    if (this.btnDownloadAllZip) {
      this.btnDownloadAllZip.addEventListener('click', () => this.downloadAllAsZip());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.reset());
    }
  }

  updateModePanels() {
    if (this.panelExtract) this.panelExtract.classList.toggle('hidden', this.splitMode !== 'extract');
    if (this.panelAll) this.panelAll.classList.toggle('hidden', this.splitMode !== 'all');
    if (this.panelRanges) this.panelRanges.classList.toggle('hidden', this.splitMode !== 'ranges');
  }

  async handleFileSelected(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      DocuUtils.showToast('Please select a valid PDF document.', 'error');
      return;
    }

    try {
      this.arrayBuffer = await DocuUtils.readFileAsArrayBuffer(file);
      this.currentFile = file;

      // Load with pdf-lib
      this.pdfDoc = await PDFLib.PDFDocument.load(this.arrayBuffer, { ignoreEncryption: true });
      if (this.pdfDoc.isEncrypted) {
        DocuUtils.showToast('This PDF is password-protected and cannot be processed.', 'error');
        this.reset();
        return;
      }

      this.pageCount = this.pdfDoc.getPageCount();

      // Update UI Header
      if (this.docNameEl) this.docNameEl.textContent = file.name;
      if (this.docMetaEl) {
        this.docMetaEl.textContent = `${this.pageCount} ${this.pageCount === 1 ? 'Page' : 'Pages'} • ${DocuUtils.formatBytes(file.size)}`;
      }

      // Pre-fill extract input
      if (this.inputExtractRange) {
        this.inputExtractRange.placeholder = `e.g. 1-${Math.min(3, this.pageCount)}`;
        this.inputExtractRange.value = `1-${Math.min(this.pageCount, 2)}`;
      }

      // Pre-fill multi ranges input
      if (this.inputMultiRanges) {
        if (this.pageCount >= 4) {
          this.inputMultiRanges.value = `1-2\n3-${this.pageCount}`;
        } else {
          this.inputMultiRanges.value = `1\n${this.pageCount > 1 ? '2' : '1'}`;
        }
      }

      if (this.dropzone) this.dropzone.classList.add('hidden');
      if (this.workspace) this.workspace.classList.remove('hidden');

      // Render Thumbnails
      this.renderThumbnails();
    } catch (err) {
      DocuUtils.showToast(`Failed to open PDF: ${err.message}`, 'error');
    }
  }

  async renderThumbnails() {
    if (!this.thumbnailsContainer) return;
    this.thumbnailsContainer.innerHTML = '';

    if (typeof pdfjsLib === 'undefined') return;

    try {
      // Configure PDF.js worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(this.arrayBuffer) });
      this.pdfjsDoc = await loadingTask.promise;

      const numPagesToRender = Math.min(this.pageCount, 12); // Render first 12 pages for fast interactive preview

      for (let p = 1; p <= numPagesToRender; p++) {
        const page = await this.pdfjsDoc.getPage(p);
        const viewport = page.getViewport({ scale: 0.25 });

        const thumbWrapper = document.createElement('div');
        thumbWrapper.className = 'bg-slate-50 border border-slate-200 rounded-lg p-2 text-center flex flex-col items-center justify-between cursor-pointer hover:border-brand-500 transition-all';
        thumbWrapper.title = `Click to select/add Page ${p}`;

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = 'rounded shadow-sm max-h-24 w-auto object-contain';

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const pageLabel = document.createElement('span');
        pageLabel.className = 'text-xs font-semibold text-slate-600 mt-1';
        pageLabel.textContent = `Page ${p}`;

        thumbWrapper.appendChild(canvas);
        thumbWrapper.appendChild(pageLabel);

        thumbWrapper.addEventListener('click', () => {
          if (this.splitMode === 'extract' && this.inputExtractRange) {
            const current = this.inputExtractRange.value.trim();
            this.inputExtractRange.value = current ? `${current}, ${p}` : `${p}`;
          }
        });

        this.thumbnailsContainer.appendChild(thumbWrapper);
      }
    } catch (err) {
      console.warn('Thumbnail generation skipped:', err);
    }
  }

  async executeSplit() {
    if (this.isProcessing || !this.currentFile || !this.arrayBuffer) return;

    this.isProcessing = true;
    this.outputFiles = [];

    if (this.btnSplit) {
      this.btnSplit.disabled = true;
      this.btnSplit.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Splitting PDF Document...
      `;
    }

    try {
      const baseName = DocuUtils.getBaseFilename(this.currentFile.name);

      if (this.splitMode === 'extract') {
        const rangeText = this.inputExtractRange ? this.inputExtractRange.value : '1';
        const indices = DocuUtils.parsePageRanges(rangeText, this.pageCount);

        const newPdf = await PDFLib.PDFDocument.create();
        const copied = await newPdf.copyPages(this.pdfDoc, indices);
        copied.forEach(p => newPdf.addPage(p));

        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        this.outputFiles.push({
          id: 'out_1',
          name: `${baseName}_extracted.pdf`,
          rangeStr: rangeText,
          pageCount: indices.length,
          blob,
        });
      } else if (this.splitMode === 'all') {
        // Split every single page into individual PDF
        for (let i = 0; i < this.pageCount; i++) {
          const newPdf = await PDFLib.PDFDocument.create();
          const [copied] = await newPdf.copyPages(this.pdfDoc, [i]);
          newPdf.addPage(copied);

          const pdfBytes = await newPdf.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });

          this.outputFiles.push({
            id: `out_page_${i + 1}`,
            name: `${baseName}_page_${i + 1}.pdf`,
            rangeStr: `Page ${i + 1}`,
            pageCount: 1,
            blob,
          });
        }
      } else if (this.splitMode === 'ranges') {
        const multiText = this.inputMultiRanges ? this.inputMultiRanges.value : '1';
        const rangeTasks = DocuUtils.parseMultipleRanges(multiText, this.pageCount);

        for (let t = 0; t < rangeTasks.length; t++) {
          const task = rangeTasks[t];
          const newPdf = await PDFLib.PDFDocument.create();
          const copied = await newPdf.copyPages(this.pdfDoc, task.indices);
          copied.forEach(p => newPdf.addPage(p));

          const pdfBytes = await newPdf.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });

          this.outputFiles.push({
            id: `out_range_${t + 1}`,
            name: `${baseName}_${task.label}.pdf`,
            rangeStr: task.rangeStr,
            pageCount: task.indices.length,
            blob,
          });
        }
      }

      this.renderResults();
      DocuUtils.showToast(`Successfully created ${this.outputFiles.length} PDF ${this.outputFiles.length === 1 ? 'file' : 'files'}!`, 'success');
    } catch (err) {
      DocuUtils.showToast(`Split failed: ${err.message}`, 'error');
    } finally {
      this.isProcessing = false;
      if (this.btnSplit) {
        this.btnSplit.disabled = false;
        this.btnSplit.innerHTML = `
          <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
          </svg>
          Split PDF
        `;
      }
    }
  }

  renderResults() {
    if (!this.resultsList || !this.resultSection) return;
    this.resultsList.innerHTML = '';

    this.outputFiles.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3';

      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-brand-200">
            ${index + 1}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-bold text-slate-800 truncate" title="${DocuUtils.escapeHtml(item.name)}">
              ${DocuUtils.escapeHtml(item.name)}
            </h4>
            <p class="text-xs text-slate-500 mt-0.5">
              ${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'} (${item.rangeStr}) • ${DocuUtils.formatBytes(item.blob.size)}
            </p>
          </div>
        </div>

        <button type="button" class="btn-download-single px-4 py-2 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center justify-center gap-1.5 flex-shrink-0" data-id="${item.id}">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </button>
      `;

      this.resultsList.appendChild(row);
    });

    this.resultsList.querySelectorAll('.btn-download-single').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const fileObj = this.outputFiles.find(f => f.id === id);
        if (fileObj) {
          DocuUtils.downloadBlob(fileObj.blob, fileObj.name);
        }
      });
    });

    if (this.btnDownloadAllZip) {
      this.btnDownloadAllZip.classList.toggle('hidden', this.outputFiles.length <= 1);
    }

    this.resultSection.classList.remove('hidden');
    this.resultSection.scrollIntoView({ behavior: 'smooth' });
  }

  async downloadAllAsZip() {
    if (this.outputFiles.length === 0) return;
    try {
      const fileList = this.outputFiles.map(f => ({
        filename: f.name,
        blob: f.blob,
      }));
      await DocuUtils.createAndDownloadZip(fileList, 'DocuHug_Split_PDFs.zip');
    } catch (err) {
      DocuUtils.showToast(`ZIP export failed: ${err.message}`, 'error');
    }
  }

  reset() {
    this.currentFile = null;
    this.arrayBuffer = null;
    this.pageCount = 0;
    this.pdfDoc = null;
    this.pdfjsDoc = null;
    this.outputFiles = [];

    if (this.fileInput) this.fileInput.value = '';
    if (this.workspace) this.workspace.classList.add('hidden');
    if (this.dropzone) this.dropzone.classList.remove('hidden');
    if (this.resultSection) this.resultSection.classList.add('hidden');
    if (this.thumbnailsContainer) this.thumbnailsContainer.innerHTML = '';

    DocuUtils.showToast('Workspace reset.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('split-pdf-app')) {
    window.pdfSplitterApp = new PdfSplitterEngine();
  }
});
