/**
 * DocuHug — Image Converter Engine (Phase 2)
 * Client-Side Format Conversion (JPG, PNG, WebP) with Batch Support and Alpha Transparency Handling.
 * Strictly 100% Client-Side.
 */

class ImageConverter {
  constructor() {
    this.files = []; // { id, file, origFormat, targetFormat, previewUrl, status, resultBlob, resultSize, errorMessage }
    this.globalTargetFormat = 'png'; // default target
    this.isProcessing = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('convert-dropzone');
    this.fileInput = document.getElementById('convert-file-input');
    this.controlsSection = document.getElementById('convert-controls');
    this.resultsSection = document.getElementById('convert-results');
    this.fileListContainer = document.getElementById('convert-file-list');
    
    this.targetFormatSelect = document.getElementById('convert-target-format');
    this.transparencyNotice = document.getElementById('convert-transparency-notice');

    this.btnConvertAll = document.getElementById('btn-convert-all');
    this.btnDownloadZip = document.getElementById('btn-convert-zip');
    this.btnClearAll = document.getElementById('btn-convert-clear');
    this.batchSummary = document.getElementById('convert-batch-summary');
  }

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    DocuUtils.bindDropzone(this.dropzone, this.fileInput, (files) => this.handleFilesAdded(files));

    if (this.targetFormatSelect) {
      this.targetFormatSelect.addEventListener('change', (e) => {
        this.globalTargetFormat = e.target.value;
        this.updateAllTargetFormats(this.globalTargetFormat);
        this.updateTransparencyNotice();
      });
    }

    if (this.btnConvertAll) {
      this.btnConvertAll.addEventListener('click', () => this.convertAll());
    }

    if (this.btnDownloadZip) {
      this.btnDownloadZip.addEventListener('click', () => this.downloadAllZip());
    }

    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => this.reset());
    }
  }

  updateAllTargetFormats(format) {
    this.files.forEach(f => {
      f.targetFormat = format;
      if (f.status === 'done') {
        f.status = 'ready';
        f.resultBlob = null;
      }
    });
    this.render();
  }

  updateTransparencyNotice() {
    if (!this.transparencyNotice) return;
    const hasTransparentSource = this.files.some(f => f.origFormat === 'png' || f.origFormat === 'webp');
    const isTargetJpg = (this.globalTargetFormat === 'jpg' || this.globalTargetFormat === 'jpeg');

    if (hasTransparentSource && isTargetJpg) {
      this.transparencyNotice.classList.remove('hidden');
    } else {
      this.transparencyNotice.classList.add('hidden');
    }
  }

  async handleFilesAdded(newFiles) {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validFiles = newFiles.filter(f => validImageTypes.includes(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));

    if (validFiles.length === 0) {
      DocuUtils.showToast('Please select valid JPG, PNG, or WebP image files.', 'error');
      return;
    }

    for (const file of validFiles) {
      try {
        const { width, height, objectUrl } = await DocuUtils.loadImage(file);
        const ext = DocuUtils.getFileExtension(file.name) || 'jpg';
        
        // Auto pick alternate target format if same as input
        let defaultTarget = this.globalTargetFormat;
        if (ext === defaultTarget) {
          defaultTarget = ext === 'png' ? 'jpg' : 'png';
        }

        this.files.push({
          id: 'conv_' + Math.random().toString(36).substr(2, 9),
          file,
          origFormat: ext.toUpperCase(),
          targetFormat: defaultTarget,
          dimensions: `${width} × ${height}`,
          originalSize: file.size,
          previewUrl: objectUrl,
          status: 'ready',
          resultBlob: null,
          resultSize: null,
          errorMessage: null,
        });
      } catch (err) {
        DocuUtils.showToast(`Failed to load "${file.name}": ${err.message}`, 'error');
      }
    }

    this.render();
    this.updateTransparencyNotice();
  }

  render() {
    if (this.files.length > 0) {
      if (this.controlsSection) this.controlsSection.classList.remove('hidden');
      if (this.resultsSection) this.resultsSection.classList.remove('hidden');
      if (this.dropzone) this.dropzone.classList.add('py-6');
    } else {
      if (this.controlsSection) this.controlsSection.classList.add('hidden');
      if (this.resultsSection) this.resultsSection.classList.add('hidden');
      if (this.dropzone) this.dropzone.classList.remove('py-6');
    }

    this.renderList();
    this.updateBatchSummary();
  }

  renderList() {
    if (!this.fileListContainer) return;
    this.fileListContainer.innerHTML = '';

    this.files.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between';

      let statusBadge = '';
      if (item.status === 'ready') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Ready to Convert</span>`;
      } else if (item.status === 'processing') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-100 text-brand-800 flex items-center gap-1">
          <svg class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Converting...
        </span>`;
      } else if (item.status === 'done') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
          Converted to ${item.targetFormat.toUpperCase()}
        </span>`;
      } else if (item.status === 'error') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Failed</span>`;
      }

      card.innerHTML = `
        <div class="flex items-center gap-4 w-full md:w-auto">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
            <img src="${item.previewUrl}" alt="${DocuUtils.escapeHtml(item.file.name)}" class="w-full h-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm sm:text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md" title="${DocuUtils.escapeHtml(item.file.name)}">
              ${DocuUtils.escapeHtml(item.file.name)}
            </h4>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                ${item.origFormat}
              </span>
              <span class="text-xs text-slate-400">&rarr;</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-brand-100 text-brand-800">
                ${item.targetFormat.toUpperCase()}
              </span>
              <span class="text-xs text-slate-500">• ${DocuUtils.formatBytes(item.originalSize)}</span>
            </div>
            ${item.status === 'done' ? `
              <p class="text-xs text-emerald-700 font-semibold mt-1">
                Converted Size: ${DocuUtils.formatBytes(item.resultSize)}
              </p>
            ` : ''}
          </div>
        </div>

        <div class="flex items-center justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div>${statusBadge}</div>
          <div class="flex items-center gap-2">
            ${item.status === 'done' ? `
              <button class="btn-download-conv px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5" data-id="${item.id}">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </button>
            ` : ''}
            <button class="btn-remove-conv p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" data-id="${item.id}" title="Remove file">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      `;

      this.fileListContainer.appendChild(card);
    });

    this.fileListContainer.querySelectorAll('.btn-download-conv').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.downloadSingle(id);
      });
    });

    this.fileListContainer.querySelectorAll('.btn-remove-conv').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.removeFile(id);
      });
    });
  }

  updateBatchSummary() {
    if (!this.batchSummary) return;
    const total = this.files.length;
    const completed = this.files.filter(f => f.status === 'done').length;

    if (total === 0) {
      this.batchSummary.textContent = '';
      if (this.btnDownloadZip) this.btnDownloadZip.disabled = true;
      return;
    }

    this.batchSummary.textContent = `${completed} of ${total} files converted`;
    if (this.btnDownloadZip) {
      this.btnDownloadZip.disabled = completed === 0;
      if (completed === 0) {
        this.btnDownloadZip.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        this.btnDownloadZip.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  removeFile(id) {
    const item = this.files.find(f => f.id === id);
    if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    this.files = this.files.filter(f => f.id !== id);
    this.render();
    this.updateTransparencyNotice();
  }

  reset() {
    this.files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    this.files = [];
    if (this.fileInput) this.fileInput.value = '';
    this.render();
    this.updateTransparencyNotice();
    DocuUtils.showToast('Converter reset.');
  }

  async convertAll() {
    if (this.isProcessing || this.files.length === 0) return;
    this.isProcessing = true;
    if (this.btnConvertAll) {
      this.btnConvertAll.disabled = true;
      this.btnConvertAll.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Converting...
      `;
    }

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      item.status = 'processing';
      this.renderList();

      try {
        const { img, width, height } = await DocuUtils.loadImage(item.file);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const targetMime = DocuUtils.getMimeType(item.targetFormat);

        // Transparency fill if converting to JPG
        if (targetMime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        const quality = targetMime === 'image/jpeg' || targetMime === 'image/webp' ? 0.92 : undefined;
        const blob = await DocuUtils.canvasToBlob(canvas, targetMime, quality);

        item.resultBlob = blob;
        item.resultSize = blob.size;
        item.status = 'done';
      } catch (err) {
        item.status = 'error';
        item.errorMessage = err.message;
      }
      this.renderList();
      this.updateBatchSummary();
    }

    this.isProcessing = false;
    if (this.btnConvertAll) {
      this.btnConvertAll.disabled = false;
      this.btnConvertAll.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
        Convert All Files
      `;
    }
    DocuUtils.showToast('All conversions completed!', 'success');
  }

  downloadSingle(id) {
    const item = this.files.find(f => f.id === id);
    if (!item || !item.resultBlob) return;

    const baseName = DocuUtils.getBaseFilename(item.file.name);
    const ext = DocuUtils.getExtensionForMime(item.resultBlob.type);
    const filename = `${baseName}_converted.${ext}`;

    DocuUtils.downloadBlob(item.resultBlob, filename);
  }

  async downloadAllZip() {
    const completedItems = this.files.filter(f => f.status === 'done' && f.resultBlob);
    if (completedItems.length === 0) return;

    try {
      const fileList = completedItems.map(item => {
        const baseName = DocuUtils.getBaseFilename(item.file.name);
        const ext = DocuUtils.getExtensionForMime(item.resultBlob.type);
        return {
          filename: `${baseName}_converted.${ext}`,
          blob: item.resultBlob
        };
      });

      DocuUtils.showToast('Generating ZIP archive...');
      await DocuUtils.createAndDownloadZip(fileList, 'DocuHug_Converted_Images.zip');
      DocuUtils.showToast('ZIP archive downloaded successfully!', 'success');
    } catch (err) {
      DocuUtils.showToast(`ZIP generation failed: ${err.message}`, 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('convert-tool-app')) {
    window.converterApp = new ImageConverter();
  }
});
