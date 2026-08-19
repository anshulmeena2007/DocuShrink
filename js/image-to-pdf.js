/**
 * DocuHug — Image to PDF Engine (Phase 3)
 * High-performance, client-side PDF document generation from multiple images using jsPDF.
 * Strictly 100% Client-Side.
 */

class ImageToPdfEngine {
  constructor(options = {}) {
    this.mode = options.mode || 'all'; // 'all' (JPG/PNG/WebP) or 'jpg' (JPG only)
    this.files = []; // { id, file, name, size, width, height, previewUrl }
    this.pageSize = 'a4'; // 'a4', 'letter', 'original'
    this.orientation = 'portrait'; // 'portrait', 'landscape', 'auto'
    this.marginMm = 10; // 0, 5, 10, 20
    this.fitMode = 'fit'; // 'fit', 'fill', 'original'
    this.quality = 0.9;
    this.resultBlob = null;
    this.isGenerating = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('pdf-dropzone');
    this.fileInput = document.getElementById('pdf-file-input');
    this.workspace = document.getElementById('pdf-workspace');
    this.fileListContainer = document.getElementById('pdf-file-list');
    this.pageCountBadge = document.getElementById('pdf-page-count');
    
    // Settings inputs
    this.selectPageSize = document.getElementById('pdf-page-size');
    this.selectOrientation = document.getElementById('pdf-orientation');
    this.selectMargin = document.getElementById('pdf-margin');
    this.selectFit = document.getElementById('pdf-fit-mode');
    this.selectQuality = document.getElementById('pdf-quality');

    // Action buttons
    this.btnGenerate = document.getElementById('btn-generate-pdf');
    this.btnDownload = document.getElementById('btn-download-pdf');
    this.btnReset = document.getElementById('btn-reset-pdf');
    this.btnClearAll = document.getElementById('btn-clear-pdf-files');
    this.btnAddMore = document.getElementById('btn-add-more-images');
    this.addMoreInput = document.getElementById('add-more-file-input');

    // Results container
    this.resultSection = document.getElementById('pdf-result-section');
    this.resultPagesText = document.getElementById('result-pdf-pages');
    this.resultSizeText = document.getElementById('result-pdf-size');
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

    if (this.selectPageSize) {
      this.selectPageSize.addEventListener('change', (e) => {
        this.pageSize = e.target.value;
      });
    }

    if (this.selectOrientation) {
      this.selectOrientation.addEventListener('change', (e) => {
        this.orientation = e.target.value;
      });
    }

    if (this.selectMargin) {
      this.selectMargin.addEventListener('change', (e) => {
        this.marginMm = parseInt(e.target.value, 10);
      });
    }

    if (this.selectFit) {
      this.selectFit.addEventListener('change', (e) => {
        this.fitMode = e.target.value;
      });
    }

    if (this.selectQuality) {
      this.selectQuality.addEventListener('change', (e) => {
        this.quality = parseFloat(e.target.value);
      });
    }

    if (this.btnGenerate) {
      this.btnGenerate.addEventListener('click', () => this.generatePdf());
    }

    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.downloadPdf());
    }

    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => this.reset());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.reset());
    }
  }

  async handleFilesAdded(newFiles) {
    let validExtensions = /\.(jpe?g|png|webp)$/i;
    let allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (this.mode === 'jpg') {
      validExtensions = /\.(jpe?g)$/i;
      allowedTypes = ['image/jpeg', 'image/jpg'];
    }

    const validFiles = newFiles.filter(f => allowedTypes.includes(f.type) || validExtensions.test(f.name));

    if (validFiles.length === 0) {
      const msg = this.mode === 'jpg'
        ? 'Please select valid JPG / JPEG image files.'
        : 'Please select valid JPG, PNG, or WebP image files.';
      DocuUtils.showToast(msg, 'error');
      return;
    }

    for (const file of validFiles) {
      try {
        const { width, height, objectUrl } = await DocuUtils.loadImage(file);
        this.files.push({
          id: 'img_' + Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: file.size,
          width,
          height,
          previewUrl: objectUrl,
        });
      } catch (err) {
        DocuUtils.showToast(`Could not load "${file.name}": ${err.message}`, 'error');
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

    if (this.pageCountBadge) {
      this.pageCountBadge.textContent = `${this.files.length} ${this.files.length === 1 ? 'Page' : 'Pages'}`;
    }

    this.renderFileList();
  }

  renderFileList() {
    if (!this.fileListContainer) return;
    this.fileListContainer.innerHTML = '';

    this.files.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-3 transition-all';
      card.id = `item-${item.id}`;

      const isFirst = index === 0;
      const isLast = index === this.files.length - 1;

      card.innerHTML = `
        <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <!-- Page Number Badge -->
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-50 text-brand-700 font-bold text-xs sm:text-sm flex items-center justify-center flex-shrink-0 border border-brand-200">
            ${index + 1}
          </div>

          <!-- Thumbnail -->
          <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
            <img src="${item.previewUrl}" alt="Page ${index + 1}" class="w-full h-full object-cover" />
          </div>

          <!-- Meta -->
          <div class="min-w-0 flex-1">
            <h4 class="text-xs sm:text-sm font-bold text-slate-800 truncate" title="${DocuUtils.escapeHtml(item.name)}">
              ${DocuUtils.escapeHtml(item.name)}
            </h4>
            <p class="text-xs text-slate-500 mt-0.5">
              ${item.width} × ${item.height} px • ${DocuUtils.formatBytes(item.size)}
            </p>
          </div>
        </div>

        <!-- Reorder & Action Controls -->
        <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <button type="button" class="btn-move-up p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors" data-index="${index}" ${isFirst ? 'disabled' : ''} title="Move Page Up" aria-label="Move page ${index + 1} up">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>

          <button type="button" class="btn-move-down p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors" data-index="${index}" ${isLast ? 'disabled' : ''} title="Move Page Down" aria-label="Move page ${index + 1} down">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button type="button" class="btn-remove-page p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1" data-id="${item.id}" title="Remove Page" aria-label="Remove page ${index + 1}">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;

      this.fileListContainer.appendChild(card);
    });

    // Attach listeners
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

    this.fileListContainer.querySelectorAll('.btn-remove-page').forEach((btn) => {
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
    const item = this.files.find(f => f.id === id);
    if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    this.files = this.files.filter(f => f.id !== id);
    this.render();
  }

  reset() {
    this.files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    this.files = [];
    this.resultBlob = null;
    if (this.fileInput) this.fileInput.value = '';
    if (this.resultSection) this.resultSection.classList.add('hidden');
    this.render();
    DocuUtils.showToast('Workspace reset.');
  }

  async generatePdf() {
    if (this.isGenerating || this.files.length === 0) return;

    const jspdfModule = window.jspdf;
    if (!jspdfModule || !jspdfModule.jsPDF) {
      DocuUtils.showToast('jsPDF library failed to load. Please check network connection.', 'error');
      return;
    }

    const { jsPDF } = jspdfModule;
    this.isGenerating = true;

    if (this.btnGenerate) {
      this.btnGenerate.disabled = true;
      this.btnGenerate.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Creating PDF (${this.files.length} pages)...
      `;
    }

    try {
      let doc = null;

      for (let i = 0; i < this.files.length; i++) {
        const item = this.files[i];
        const { img, width, height } = await DocuUtils.loadImage(item.file);

        // Determine Page Format & Dimensions in mm
        let pageFormat = 'a4';
        let orient = 'p'; // 'p' or 'l'
        let pageW = 210;
        let pageH = 297;

        if (this.pageSize === 'letter') {
          pageFormat = 'letter';
          pageW = 215.9;
          pageH = 279.4;
        } else if (this.pageSize === 'original') {
          // 96 DPI conversion to mm (1 px = 25.4 / 96 mm)
          pageW = Math.max(10, (width * 25.4) / 96);
          pageH = Math.max(10, (height * 25.4) / 96);
          pageFormat = [pageW, pageH];
        }

        // Apply Orientation
        if (this.orientation === 'landscape') {
          orient = 'l';
          if (pageW < pageH) {
            const temp = pageW;
            pageW = pageH;
            pageH = temp;
          }
        } else if (this.orientation === 'auto') {
          if (width > height) {
            orient = 'l';
            if (pageW < pageH) {
              const temp = pageW;
              pageW = pageH;
              pageH = temp;
            }
          } else {
            orient = 'p';
            if (pageW > pageH) {
              const temp = pageW;
              pageW = pageH;
              pageH = temp;
            }
          }
        } else {
          orient = 'p';
          if (pageW > pageH) {
            const temp = pageW;
            pageW = pageH;
            pageH = temp;
          }
        }

        if (this.pageSize === 'original') {
          pageFormat = [pageW, pageH];
        }

        // Initialize document on first page or add new page
        if (i === 0) {
          doc = new jsPDF({
            orientation: orient,
            unit: 'mm',
            format: pageFormat,
            compress: true,
          });
        } else {
          doc.addPage(pageFormat, orient);
        }

        // Printable / Available Area with Margins
        const margin = this.marginMm;
        const availW = Math.max(1, pageW - 2 * margin);
        const availH = Math.max(1, pageH - 2 * margin);

        let drawW = availW;
        let drawH = availH;
        let drawX = margin;
        let drawY = margin;

        const imgAspect = width / height;
        const availAspect = availW / availH;

        if (this.fitMode === 'fit') {
          if (imgAspect > availAspect) {
            drawW = availW;
            drawH = availW / imgAspect;
          } else {
            drawH = availH;
            drawW = availH * imgAspect;
          }
          drawX = margin + (availW - drawW) / 2;
          drawY = margin + (availH - drawH) / 2;
        } else if (this.fitMode === 'original') {
          const imgMmW = (width * 25.4) / 96;
          const imgMmH = (height * 25.4) / 96;
          if (imgMmW <= availW && imgMmH <= availH) {
            drawW = imgMmW;
            drawH = imgMmH;
          } else {
            if (imgAspect > availAspect) {
              drawW = availW;
              drawH = availW / imgAspect;
            } else {
              drawH = availH;
              drawW = availH * imgAspect;
            }
          }
          drawX = margin + (availW - drawW) / 2;
          drawY = margin + (availH - drawH) / 2;
        } else {
          // 'fill' - cover available content area
          drawW = availW;
          drawH = availH;
          drawX = margin;
          drawY = margin;
        }

        // Prepare Image Data for jsPDF (Handle WebP, transparency, and scaling via Canvas)
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Solid white background for clean PDF rendering without black alpha artifacts
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = canvas.toDataURL('image/jpeg', this.quality);
        doc.addImage(imgData, 'JPEG', drawX, drawY, drawW, drawH);
      }

      const pdfBlob = doc.output('blob');
      this.resultBlob = pdfBlob;

      if (this.resultPagesText) this.resultPagesText.textContent = `${this.files.length} Pages`;
      if (this.resultSizeText) this.resultSizeText.textContent = DocuUtils.formatBytes(pdfBlob.size);
      if (this.resultSection) this.resultSection.classList.remove('hidden');

      DocuUtils.showToast('PDF created successfully!', 'success');
    } catch (err) {
      DocuUtils.showToast(`PDF generation failed: ${err.message}`, 'error');
    } finally {
      this.isGenerating = false;
      if (this.btnGenerate) {
        this.btnGenerate.disabled = false;
        this.btnGenerate.innerHTML = `
          <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Generate PDF Document
        `;
      }
    }
  }

  downloadPdf() {
    if (!this.resultBlob) return;

    let filename = this.mode === 'jpg' ? 'jpg-to-pdf.pdf' : 'images-to-pdf.pdf';
    if (this.files.length === 1) {
      const base = DocuUtils.getBaseFilename(this.files[0].name);
      filename = `${base}.pdf`;
    }

    DocuUtils.downloadBlob(this.resultBlob, filename);
  }
}

// Auto instantiate on tool page load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('image-to-pdf-app')) {
    window.imageToPdfApp = new ImageToPdfEngine({ mode: 'all' });
  } else if (document.getElementById('jpg-to-pdf-app')) {
    window.jpgToPdfApp = new ImageToPdfEngine({ mode: 'jpg' });
  }
});
