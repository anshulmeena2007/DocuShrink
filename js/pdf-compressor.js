/**
 * DocuShrink — Compress PDF / PDF Optimizer Engine (Phase 4)
 * Client-side PDF optimization and stream compression using pdf-lib and PDF.js.
 * Strictly 100% Client-Side.
 */

class PdfCompressorEngine {
  constructor() {
    this.currentFile = null;
    this.arrayBuffer = null;
    this.pageCount = 0;
    this.pdfDoc = null;
    this.compressionLevel = 'balanced'; // 'light', 'balanced', 'strong'
    this.optimizedBlob = null;
    this.isCompressing = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('compress-pdf-dropzone');
    this.fileInput = document.getElementById('compress-pdf-file-input');
    this.workspace = document.getElementById('compress-pdf-workspace');

    // Document Meta
    this.docNameEl = document.getElementById('compress-pdf-doc-name');
    this.docMetaEl = document.getElementById('compress-pdf-doc-meta');
    this.btnChangeDoc = document.getElementById('btn-change-compress-doc');

    // Compression Level Radios
    this.levelRadios = document.querySelectorAll('input[name="pdf-compress-level"]');

    // Action button
    this.btnOptimize = document.getElementById('btn-optimize-pdf-action');

    // Results Section
    this.resultSection = document.getElementById('compress-pdf-results');
    this.originalSizeText = document.getElementById('original-pdf-size');
    this.optimizedSizeText = document.getElementById('optimized-pdf-size');
    this.reductionBadge = document.getElementById('pdf-reduction-badge');
    this.statusBanner = document.getElementById('pdf-optimization-status-msg');
    this.btnDownload = document.getElementById('btn-download-optimized-pdf');
    this.btnReset = document.getElementById('btn-reset-compress-pdf');
  }

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    DocuUtils.bindDropzone(this.dropzone, this.fileInput, (files) => {
      if (files.length > 0) this.handleFileSelected(files[0]);
    });

    if (this.btnChangeDoc) {
      this.btnChangeDoc.addEventListener('click', () => this.reset());
    }

    if (this.levelRadios) {
      this.levelRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
          this.compressionLevel = e.target.value;
        });
      });
    }

    if (this.btnOptimize) {
      this.btnOptimize.addEventListener('click', () => this.optimizePdf());
    }

    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.downloadOptimizedPdf());
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

      if (typeof PDFLib === 'undefined') {
        DocuUtils.showToast('pdf-lib library is loading. Please try again.', 'warning');
        return;
      }

      this.pdfDoc = await PDFLib.PDFDocument.load(this.arrayBuffer, { ignoreEncryption: true });
      if (this.pdfDoc.isEncrypted) {
        DocuUtils.showToast('This PDF is password-protected and cannot be optimized.', 'error');
        this.reset();
        return;
      }

      this.pageCount = this.pdfDoc.getPageCount();

      if (this.docNameEl) this.docNameEl.textContent = file.name;
      if (this.docMetaEl) {
        this.docMetaEl.textContent = `${this.pageCount} ${this.pageCount === 1 ? 'Page' : 'Pages'} • ${DocuUtils.formatBytes(file.size)}`;
      }

      if (this.dropzone) this.dropzone.classList.add('hidden');
      if (this.workspace) this.workspace.classList.remove('hidden');
    } catch (err) {
      DocuUtils.showToast(`Failed to open PDF: ${err.message}`, 'error');
    }
  }

  async optimizePdf() {
    if (this.isCompressing || !this.currentFile || !this.arrayBuffer) return;

    this.isCompressing = true;
    this.optimizedBlob = null;

    if (this.btnOptimize) {
      this.btnOptimize.disabled = true;
      this.btnOptimize.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Optimizing PDF Streams...
      `;
    }

    try {
      const originalBytes = this.currentFile.size;

      // Method 1: Structural clean & object optimization via pdf-lib
      const optimizedDoc = await PDFLib.PDFDocument.create();
      const indices = this.pdfDoc.getPageIndices();
      const copiedPages = await optimizedDoc.copyPages(this.pdfDoc, indices);
      copiedPages.forEach(p => optimizedDoc.addPage(p));

      // Strip unneeded metadata objects for size reduction
      optimizedDoc.setTitle('');
      optimizedDoc.setAuthor('');
      optimizedDoc.setSubject('');
      optimizedDoc.setKeywords([]);
      optimizedDoc.setProducer('DocuShrink Privacy PDF Optimizer');
      optimizedDoc.setCreator('DocuShrink');

      const savedBytes = await optimizedDoc.save({ useObjectStreams: true });
      let outputBlob = new Blob([savedBytes], { type: 'application/pdf' });

      // Method 2: If balanced or strong mode selected, and document is image-heavy or structural didn't reduce
      if ((this.compressionLevel === 'strong' || this.compressionLevel === 'balanced') && typeof pdfjsLib !== 'undefined') {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(this.arrayBuffer) });
          const pdfjsDoc = await loadingTask.promise;

          const quality = this.compressionLevel === 'strong' ? 0.65 : 0.8;
          const scale = this.compressionLevel === 'strong' ? 1.0 : 1.25;

          const rasterDoc = await PDFLib.PDFDocument.create();

          for (let p = 1; p <= this.pageCount; p++) {
            const page = await pdfjsDoc.getPage(p);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;
            const imgDataUrl = canvas.toDataURL('image/jpeg', quality);

            const embeddedImg = await rasterDoc.embedJpg(imgDataUrl);
            const origPage = this.pdfDoc.getPage(p - 1);
            const { width, height } = origPage.getSize();

            const newPage = rasterDoc.addPage([width, height]);
            newPage.drawImage(embeddedImg, {
              x: 0,
              y: 0,
              width,
              height,
            });
          }

          const rasterBytes = await rasterDoc.save({ useObjectStreams: true });
          // If raster compression resulted in smaller size than structural, use it
          if (rasterBytes.length < outputBlob.size) {
            outputBlob = new Blob([rasterBytes], { type: 'application/pdf' });
          }
        } catch (rasterErr) {
          console.warn('Raster optimization skipped:', rasterErr);
        }
      }

      this.optimizedBlob = outputBlob;
      const finalBytes = outputBlob.size;

      // Update Result UI
      if (this.originalSizeText) this.originalSizeText.textContent = DocuUtils.formatBytes(originalBytes);
      if (this.optimizedSizeText) this.optimizedSizeText.textContent = DocuUtils.formatBytes(finalBytes);

      const diff = originalBytes - finalBytes;
      const percentReduction = ((diff / originalBytes) * 100).toFixed(1);

      if (finalBytes < originalBytes && diff > 1024) {
        if (this.reductionBadge) {
          this.reductionBadge.className = 'px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800';
          this.reductionBadge.textContent = `-${percentReduction}% (${DocuUtils.formatBytes(diff)} saved)`;
        }
        if (this.statusBanner) {
          this.statusBanner.className = 'p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm';
          this.statusBanner.textContent = `Optimization complete! Your PDF file size was successfully reduced by ${percentReduction}%.`;
        }
        if (this.btnDownload) this.btnDownload.classList.remove('hidden');
      } else {
        // Honest disclosure when PDF is already optimal
        if (this.reductionBadge) {
          this.reductionBadge.className = 'px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700';
          this.reductionBadge.textContent = 'Already Optimal';
        }
        if (this.statusBanner) {
          this.statusBanner.className = 'p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm';
          this.statusBanner.textContent = 'The PDF could not be reduced further without risking quality or content. Your original document is already well-compressed.';
        }
        if (this.btnDownload) this.btnDownload.classList.remove('hidden');
      }

      if (this.resultSection) {
        this.resultSection.classList.remove('hidden');
        this.resultSection.scrollIntoView({ behavior: 'smooth' });
      }

      DocuUtils.showToast('Optimization analysis finished!', 'success');
    } catch (err) {
      DocuUtils.showToast(`Optimization failed: ${err.message}`, 'error');
    } finally {
      this.isCompressing = false;
      if (this.btnOptimize) {
        this.btnOptimize.disabled = false;
        this.btnOptimize.innerHTML = `
          <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          Optimize &amp; Compress PDF
        `;
      }
    }
  }

  downloadOptimizedPdf() {
    if (!this.optimizedBlob) return;
    const baseName = DocuUtils.getBaseFilename(this.currentFile ? this.currentFile.name : 'document');
    DocuUtils.downloadBlob(this.optimizedBlob, `${baseName}_optimized.pdf`);
  }

  reset() {
    this.currentFile = null;
    this.arrayBuffer = null;
    this.pdfDoc = null;
    this.optimizedBlob = null;

    if (this.fileInput) this.fileInput.value = '';
    if (this.workspace) this.workspace.classList.add('hidden');
    if (this.dropzone) this.dropzone.classList.remove('hidden');
    if (this.resultSection) this.resultSection.classList.add('hidden');

    DocuUtils.showToast('Workspace reset.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('compress-pdf-app')) {
    window.pdfCompressorApp = new PdfCompressorEngine();
  }
});
