/**
 * DocuHug — Image Resizer Engine (Phase 2)
 * Client-Side Image Resizing with Aspect Ratio Locking & Percentage Scaling.
 * Strictly 100% Client-Side.
 */

class ImageResizer {
  constructor() {
    this.currentFile = null;
    this.imgElement = null;
    this.origWidth = 0;
    this.origHeight = 0;
    this.aspectRatio = 1.0;
    this.lockAspectRatio = true;
    this.previewUrl = null;
    this.resultBlob = null;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('resize-dropzone');
    this.fileInput = document.getElementById('resize-file-input');
    this.workspace = document.getElementById('resize-workspace');
    
    // Inputs
    this.inputWidth = document.getElementById('resize-width');
    this.inputHeight = document.getElementById('resize-height');
    this.lockAspectCheckbox = document.getElementById('lock-aspect-ratio');
    this.formatSelect = document.getElementById('resize-format-select');
    this.percentBtns = document.querySelectorAll('.percent-preset-btn');
    
    // Preview & Metas
    this.previewImg = document.getElementById('resize-preview-img');
    this.metaFilename = document.getElementById('resize-filename');
    this.metaOrigDims = document.getElementById('resize-orig-dims');
    this.metaOrigSize = document.getElementById('resize-orig-size');
    this.metaResultDims = document.getElementById('resize-result-dims');
    this.metaResultSize = document.getElementById('resize-result-size');

    // Actions
    this.btnExecute = document.getElementById('btn-execute-resize');
    this.btnDownload = document.getElementById('btn-download-resize');
    this.btnReset = document.getElementById('btn-reset-resize');
  }

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    DocuUtils.bindDropzone(this.dropzone, this.fileInput, (files) => {
      if (files.length > 0) this.loadImageFile(files[0]);
    });

    if (this.inputWidth) {
      this.inputWidth.addEventListener('input', () => {
        const val = parseInt(this.inputWidth.value, 10);
        if (val > 0 && this.lockAspectRatio && this.aspectRatio > 0) {
          const newH = Math.round(val / this.aspectRatio);
          this.inputHeight.value = newH;
        }
        this.clearPercentSelection();
        this.updateDimensionDisplay();
      });
    }

    if (this.inputHeight) {
      this.inputHeight.addEventListener('input', () => {
        const val = parseInt(this.inputHeight.value, 10);
        if (val > 0 && this.lockAspectRatio && this.aspectRatio > 0) {
          const newW = Math.round(val * this.aspectRatio);
          this.inputWidth.value = newW;
        }
        this.clearPercentSelection();
        this.updateDimensionDisplay();
      });
    }

    if (this.lockAspectCheckbox) {
      this.lockAspectCheckbox.addEventListener('change', (e) => {
        this.lockAspectRatio = e.target.checked;
        if (this.lockAspectRatio && this.origWidth && this.origHeight) {
          // Re-sync height based on current width
          const curW = parseInt(this.inputWidth.value, 10) || this.origWidth;
          this.inputHeight.value = Math.round(curW / this.aspectRatio);
        }
      });
    }

    this.percentBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const pct = parseInt(btn.getAttribute('data-percent'), 10);
        this.applyPercentageScale(pct);
        this.percentBtns.forEach(b => {
          b.classList.remove('bg-brand-600', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        btn.classList.add('bg-brand-600', 'text-white');
      });
    });

    if (this.btnExecute) {
      this.btnExecute.addEventListener('click', () => this.executeResize());
    }

    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.downloadResult());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.reset());
    }
  }

  clearPercentSelection() {
    this.percentBtns.forEach(b => {
      b.classList.remove('bg-brand-600', 'text-white');
      b.classList.add('bg-slate-100', 'text-slate-700');
    });
  }

  applyPercentageScale(pct) {
    if (!this.origWidth || !this.origHeight) return;
    const factor = pct / 100;
    const newW = Math.max(1, Math.round(this.origWidth * factor));
    const newH = Math.max(1, Math.round(this.origHeight * factor));
    this.inputWidth.value = newW;
    this.inputHeight.value = newH;
    this.updateDimensionDisplay();
  }

  updateDimensionDisplay() {
    if (this.metaResultDims) {
      const w = this.inputWidth.value || 0;
      const h = this.inputHeight.value || 0;
      this.metaResultDims.textContent = `${w} × ${h}`;
    }
  }

  async loadImageFile(file) {
    try {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);

      const { img, width, height, objectUrl } = await DocuUtils.loadImage(file);
      this.currentFile = file;
      this.imgElement = img;
      this.origWidth = width;
      this.origHeight = height;
      this.aspectRatio = width / height;
      this.previewUrl = objectUrl;

      // Populate UI
      if (this.previewImg) this.previewImg.src = objectUrl;
      if (this.metaFilename) this.metaFilename.textContent = file.name;
      if (this.metaOrigDims) this.metaOrigDims.textContent = `${width} × ${height}`;
      if (this.metaOrigSize) this.metaOrigSize.textContent = DocuUtils.formatBytes(file.size);
      
      this.inputWidth.value = width;
      this.inputHeight.value = height;
      this.updateDimensionDisplay();

      if (this.dropzone) this.dropzone.classList.add('hidden');
      if (this.workspace) this.workspace.classList.remove('hidden');

      // Auto run initial preview
      await this.executeResize();
      DocuUtils.showToast('Image loaded. Configure dimensions below.', 'info');
    } catch (err) {
      DocuUtils.showToast(err.message, 'error');
    }
  }

  async executeResize() {
    if (!this.imgElement || !this.currentFile) return;

    const targetWidth = parseInt(this.inputWidth.value, 10);
    const targetHeight = parseInt(this.inputHeight.value, 10);

    if (isNaN(targetWidth) || targetWidth <= 0 || isNaN(targetHeight) || targetHeight <= 0) {
      DocuUtils.showToast('Please enter valid width and height dimensions.', 'error');
      return;
    }

    if (targetWidth > 10000 || targetHeight > 10000) {
      DocuUtils.showToast('Dimensions exceed browser safe memory limit (max 10,000px).', 'warning');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Output Format
      let targetMime = this.currentFile.type || 'image/jpeg';
      if (this.formatSelect && this.formatSelect.value !== 'original') {
        targetMime = DocuUtils.getMimeType(this.formatSelect.value);
      }

      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(this.imgElement, 0, 0, targetWidth, targetHeight);

      const blob = await DocuUtils.canvasToBlob(canvas, targetMime, 0.92);
      this.resultBlob = blob;

      if (this.metaResultDims) this.metaResultDims.textContent = `${targetWidth} × ${targetHeight}`;
      if (this.metaResultSize) this.metaResultSize.textContent = DocuUtils.formatBytes(blob.size);
      
      if (this.btnDownload) {
        this.btnDownload.disabled = false;
        this.btnDownload.classList.remove('opacity-50', 'cursor-not-allowed');
      }

      DocuUtils.showToast('Resize processed successfully!', 'success');
    } catch (err) {
      DocuUtils.showToast(`Resize failed: ${err.message}`, 'error');
    }
  }

  downloadResult() {
    if (!this.resultBlob || !this.currentFile) return;
    const baseName = DocuUtils.getBaseFilename(this.currentFile.name);
    const mime = this.resultBlob.type;
    const ext = DocuUtils.getExtensionForMime(mime);
    const targetW = this.inputWidth.value;
    const targetH = this.inputHeight.value;
    const filename = `${baseName}_resized_${targetW}x${targetH}.${ext}`;

    DocuUtils.downloadBlob(this.resultBlob, filename);
  }

  reset() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.currentFile = null;
    this.imgElement = null;
    this.resultBlob = null;
    if (this.fileInput) this.fileInput.value = '';
    
    if (this.workspace) this.workspace.classList.add('hidden');
    if (this.dropzone) this.dropzone.classList.remove('hidden');
    DocuUtils.showToast('Workspace reset.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('resize-tool-app')) {
    window.resizerApp = new ImageResizer();
  }
});
