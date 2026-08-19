/**
 * DocuHug — Image Compressor Engine (Phase 2)
 * Client-Side Lossy & Lossless Compression with Intelligent Binary Search Target Size Solver.
 * Strictly 100% Client-Side.
 */

class ImageCompressor {
  constructor() {
    this.files = []; // { id, file, originalDimensions, originalSize, previewUrl, status, resultBlob, resultDimensions, resultSize, reduction, outputFormat }
    this.quality = 0.8; // 0.1 to 1.0
    this.outputFormat = 'original'; // 'original', 'jpg', 'png', 'webp'
    this.targetSizeKB = null; // null or number (e.g. 50, 100, 200)
    this.isProcessing = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('compress-dropzone');
    this.fileInput = document.getElementById('compress-file-input');
    this.controlsSection = document.getElementById('compress-controls');
    this.resultsSection = document.getElementById('compress-results');
    this.fileListContainer = document.getElementById('compress-file-list');
    
    // Sliders & Controls
    this.qualitySlider = document.getElementById('quality-slider');
    this.qualityValueDisplay = document.getElementById('quality-val-display');
    this.formatSelect = document.getElementById('output-format-select');
    this.pngNotice = document.getElementById('png-lossless-notice');
    this.targetNotice = document.getElementById('target-solver-notice');

    // Preset Buttons
    this.presetBtns = document.querySelectorAll('.target-preset-btn');
    
    // Action Buttons
    this.processAllBtn = document.getElementById('btn-process-all');
    this.downloadZipBtn = document.getElementById('btn-download-zip');
    this.clearAllBtn = document.getElementById('btn-clear-all');
    this.batchSummary = document.getElementById('batch-summary');
  }

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    DocuUtils.bindDropzone(this.dropzone, this.fileInput, (files) => this.handleFilesAdded(files));

    if (this.qualitySlider) {
      this.qualitySlider.addEventListener('input', (e) => {
        this.quality = parseInt(e.target.value, 10) / 100;
        if (this.qualityValueDisplay) {
          this.qualityValueDisplay.textContent = `${e.target.value}%`;
        }
        this.targetSizeKB = null;
        this.clearActivePresets();
        this.updateNotices();
      });
    }

    if (this.formatSelect) {
      this.formatSelect.addEventListener('change', (e) => {
        this.outputFormat = e.target.value;
        this.updateNotices();
      });
    }

    this.presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const kb = parseInt(btn.getAttribute('data-target-kb'), 10);
        if (this.targetSizeKB === kb) {
          this.targetSizeKB = null;
          btn.classList.remove('bg-brand-600', 'text-white');
          btn.classList.add('bg-slate-100', 'text-slate-700');
        } else {
          this.clearActivePresets();
          this.targetSizeKB = kb;
          btn.classList.remove('bg-slate-100', 'text-slate-700');
          btn.classList.add('bg-brand-600', 'text-white');
        }
        this.updateNotices();
      });
    });

    if (this.processAllBtn) {
      this.processAllBtn.addEventListener('click', () => this.processAll());
    }

    if (this.downloadZipBtn) {
      this.downloadZipBtn.addEventListener('click', () => this.downloadAllZip());
    }

    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.reset());
    }
  }

  clearActivePresets() {
    this.presetBtns.forEach((b) => {
      b.classList.remove('bg-brand-600', 'text-white');
      b.classList.add('bg-slate-100', 'text-slate-700');
    });
  }

  updateNotices() {
    const hasPng = this.files.some(f => f.file.type === 'image/png') || this.outputFormat === 'png';
    if (this.pngNotice) {
      if (hasPng && !this.targetSizeKB) {
        this.pngNotice.classList.remove('hidden');
      } else {
        this.pngNotice.classList.add('hidden');
      }
    }

    if (this.targetNotice) {
      if (this.targetSizeKB) {
        this.targetNotice.classList.remove('hidden');
        this.targetNotice.querySelector('.target-kb-text').textContent = `~${this.targetSizeKB} KB`;
      } else {
        this.targetNotice.classList.add('hidden');
      }
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
        this.files.push({
          id: 'file_' + Math.random().toString(36).substr(2, 9),
          file,
          originalDimensions: `${width} × ${height}`,
          originalWidth: width,
          originalHeight: height,
          originalSize: file.size,
          previewUrl: objectUrl,
          status: 'ready', // 'ready', 'processing', 'done', 'error'
          resultBlob: null,
          resultDimensions: null,
          resultSize: null,
          reduction: null,
          errorMessage: null,
        });
      } catch (err) {
        DocuUtils.showToast(`Could not load "${file.name}": ${err.message}`, 'error');
      }
    }

    this.render();
    this.updateNotices();
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

    this.files.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm transition-all flex flex-col md:flex-row items-center gap-4 justify-between';
      card.id = `card-${item.id}`;

      let statusBadge = '';
      if (item.status === 'ready') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Ready</span>`;
      } else if (item.status === 'processing') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-100 text-brand-800 flex items-center gap-1.5">
          <svg class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Processing...
        </span>`;
      } else if (item.status === 'done') {
        const isReduction = item.reduction > 0;
        const reductionClass = isReduction ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700';
        statusBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full ${reductionClass}">
          ${isReduction ? `-${item.reduction}%` : 'Optimized'}
        </span>`;
      } else if (item.status === 'error') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Failed</span>`;
      }

      card.innerHTML = `
        <!-- Preview & Info -->
        <div class="flex items-center gap-4 w-full md:w-auto">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
            <img src="${item.previewUrl}" alt="${DocuUtils.escapeHtml(item.file.name)}" class="w-full h-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm sm:text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md" title="${DocuUtils.escapeHtml(item.file.name)}">
              ${DocuUtils.escapeHtml(item.file.name)}
            </h4>
            <p class="text-xs text-slate-500 mt-0.5">
              Original: <span class="font-medium text-slate-700">${item.originalDimensions}</span> • <span class="font-medium text-slate-700">${DocuUtils.formatBytes(item.originalSize)}</span>
            </p>
            ${item.status === 'done' ? `
              <p class="text-xs text-emerald-700 font-semibold mt-1">
                Result: ${item.resultDimensions} • ${DocuUtils.formatBytes(item.resultSize)} (Saved ${DocuUtils.formatBytes(item.originalSize - item.resultSize)})
              </p>
            ` : ''}
            ${item.status === 'error' ? `
              <p class="text-xs text-rose-600 mt-1">${DocuUtils.escapeHtml(item.errorMessage || 'Processing error')}</p>
            ` : ''}
          </div>
        </div>

        <!-- Status & Actions -->
        <div class="flex items-center justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div>${statusBadge}</div>
          <div class="flex items-center gap-2">
            ${item.status === 'done' ? `
              <button class="btn-download-single px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5" data-id="${item.id}">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </button>
            ` : ''}
            <button class="btn-remove-single p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" data-id="${item.id}" title="Remove file" aria-label="Remove ${DocuUtils.escapeHtml(item.file.name)}">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      `;

      this.fileListContainer.appendChild(card);
    });

    // Attach individual action listeners
    this.fileListContainer.querySelectorAll('.btn-download-single').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.downloadSingle(id);
      });
    });

    this.fileListContainer.querySelectorAll('.btn-remove-single').forEach((btn) => {
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
      if (this.downloadZipBtn) this.downloadZipBtn.disabled = true;
      return;
    }

    if (completed === total && total > 0) {
      const origSum = this.files.reduce((acc, f) => acc + f.originalSize, 0);
      const resSum = this.files.reduce((acc, f) => acc + (f.resultSize || f.originalSize), 0);
      const saved = Math.max(0, origSum - resSum);
      const overallReduction = origSum > 0 ? ((saved / origSum) * 100).toFixed(1) : 0;

      this.batchSummary.textContent = `All ${total} files processed: Saved ${DocuUtils.formatBytes(saved)} (${overallReduction}% reduction)`;
      if (this.downloadZipBtn) {
        this.downloadZipBtn.disabled = false;
        this.downloadZipBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } else {
      this.batchSummary.textContent = `${completed} of ${total} files processed`;
      if (this.downloadZipBtn) {
        this.downloadZipBtn.disabled = completed === 0;
        if (completed === 0) {
          this.downloadZipBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          this.downloadZipBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
    }
  }

  removeFile(id) {
    const item = this.files.find(f => f.id === id);
    if (item && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    this.files = this.files.filter(f => f.id !== id);
    this.render();
    this.updateNotices();
  }

  reset() {
    this.files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    this.files = [];
    this.targetSizeKB = null;
    this.clearActivePresets();
    if (this.fileInput) this.fileInput.value = '';
    this.render();
    this.updateNotices();
    DocuUtils.showToast('Workspace reset successfully.');
  }

  async processAll() {
    if (this.isProcessing || this.files.length === 0) return;
    this.isProcessing = true;
    if (this.processAllBtn) {
      this.processAllBtn.disabled = true;
      this.processAllBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Compressing...
      `;
    }

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      item.status = 'processing';
      this.renderList();

      try {
        const result = await this.compressSingleFile(item);
        item.resultBlob = result.blob;
        item.resultDimensions = result.dimensions;
        item.resultSize = result.blob.size;
        item.reduction = ((Math.max(0, item.originalSize - item.resultSize) / item.originalSize) * 100).toFixed(1);
        item.status = 'done';
      } catch (err) {
        item.status = 'error';
        item.errorMessage = err.message;
      }
      this.renderList();
      this.updateBatchSummary();
    }

    this.isProcessing = false;
    if (this.processAllBtn) {
      this.processAllBtn.disabled = false;
      this.processAllBtn.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        Compress All Files
      `;
    }
    DocuUtils.showToast('Compression finished!', 'success');
  }

  async compressSingleFile(item) {
    const { img, width, height } = await DocuUtils.loadImage(item.file);
    
    // Determine Target Mime Type
    let targetMime = 'image/jpeg';
    if (this.outputFormat === 'original') {
      targetMime = item.file.type || 'image/jpeg';
    } else {
      targetMime = DocuUtils.getMimeType(this.outputFormat);
    }

    // TARGET SIZE SOLVER
    if (this.targetSizeKB) {
      return await this.solveForTargetSize(img, width, height, targetMime, this.targetSizeKB * 1024);
    }

    // STANDARD QUALITY COMPRESSION
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Handle transparent background if converting to JPEG
    if (targetMime === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await DocuUtils.canvasToBlob(canvas, targetMime, targetMime === 'image/png' ? undefined : this.quality);
    return {
      blob,
      dimensions: `${width} × ${height}`
    };
  }

  /**
   * Binary Search Target Size Solver
   * Balances quality and dimensions to reach approximate target bytes
   */
  async solveForTargetSize(img, origWidth, origHeight, targetMime, targetBytes) {
    let scale = 1.0;
    let bestBlob = null;
    let bestDiff = Infinity;
    let bestDims = `${origWidth} × ${origHeight}`;

    // For PNG with target size requirement, suggest/convert to JPEG/WebP or downscale
    const isLosslessPng = (targetMime === 'image/png');

    for (let pass = 0; pass < 5; pass++) {
      const curW = Math.max(1, Math.round(origWidth * scale));
      const curH = Math.max(1, Math.round(origHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = curW;
      canvas.height = curH;
      const ctx = canvas.getContext('2d');

      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, curW, curH);
      }
      ctx.drawImage(img, 0, 0, curW, curH);

      if (isLosslessPng) {
        const blob = await DocuUtils.canvasToBlob(canvas, targetMime);
        const diff = Math.abs(blob.size - targetBytes);
        if (blob.size <= targetBytes * 1.1 || diff < bestDiff) {
          bestDiff = diff;
          bestBlob = blob;
          bestDims = `${curW} × ${curH}`;
        }
        if (blob.size <= targetBytes) break;
        scale *= 0.75; // Downscale PNG dimensions
      } else {
        // Binary search on quality
        let minQ = 0.1;
        let maxQ = 0.95;
        let passBestBlob = null;

        for (let b = 0; b < 6; b++) {
          const midQ = (minQ + maxQ) / 2;
          const blob = await DocuUtils.canvasToBlob(canvas, targetMime, midQ);
          passBestBlob = blob;

          if (blob.size > targetBytes) {
            maxQ = midQ;
          } else {
            minQ = midQ;
          }
        }

        const diff = Math.abs(passBestBlob.size - targetBytes);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestBlob = passBestBlob;
          bestDims = `${curW} × ${curH}`;
        }

        if (passBestBlob.size <= targetBytes * 1.05) {
          break; // Satisfied
        }

        // If at lowest quality still above target, scale down dimensions
        scale *= 0.8;
      }
    }

    return {
      blob: bestBlob,
      dimensions: bestDims
    };
  }

  downloadSingle(id) {
    const item = this.files.find(f => f.id === id);
    if (!item || !item.resultBlob) return;

    const baseName = DocuUtils.getBaseFilename(item.file.name);
    const mime = item.resultBlob.type;
    const ext = DocuUtils.getExtensionForMime(mime);
    const filename = `${baseName}_compressed.${ext}`;

    DocuUtils.downloadBlob(item.resultBlob, filename);
  }

  async downloadAllZip() {
    const completedItems = this.files.filter(f => f.status === 'done' && f.resultBlob);
    if (completedItems.length === 0) {
      DocuUtils.showToast('No compressed images ready for ZIP download.', 'warning');
      return;
    }

    try {
      const fileList = completedItems.map(item => {
        const baseName = DocuUtils.getBaseFilename(item.file.name);
        const ext = DocuUtils.getExtensionForMime(item.resultBlob.type);
        return {
          filename: `${baseName}_compressed.${ext}`,
          blob: item.resultBlob
        };
      });

      DocuUtils.showToast('Generating ZIP file...');
      await DocuUtils.createAndDownloadZip(fileList, 'DocuHug_Compressed_Images.zip');
      DocuUtils.showToast('ZIP archive downloaded successfully!', 'success');
    } catch (err) {
      DocuUtils.showToast(`ZIP generation failed: ${err.message}`, 'error');
    }
  }
}

// Instantiate on tool page load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('compress-tool-app')) {
    window.compressorApp = new ImageCompressor();
  }
});
