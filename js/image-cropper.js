/**
 * DocuShrink — Image Cropper Engine (Phase 2)
 * Interactive Canvas Cropper with Aspect Ratio Locks, Touch/Mouse Handles, and Instant Export.
 * Strictly 100% Client-Side.
 */

class ImageCropper {
  constructor() {
    this.currentFile = null;
    this.imgElement = null;
    this.origWidth = 0;
    this.origHeight = 0;
    this.previewUrl = null;
    this.resultBlob = null;

    // Crop box coordinates in natural image space
    this.crop = { x: 0, y: 0, width: 0, height: 0 };
    this.aspectRatioPreset = 'free'; // 'free', '1:1', '4:3', '16:9', '3:2'
    this.targetAspect = null; // null or number

    // Drag state
    this.isDragging = false;
    this.dragMode = null; // 'move', 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
    this.startX = 0;
    this.startY = 0;
    this.initialCrop = { x: 0, y: 0, width: 0, height: 0 };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dropzone = document.getElementById('crop-dropzone');
    this.fileInput = document.getElementById('crop-file-input');
    this.workspace = document.getElementById('crop-workspace');
    
    // Canvas & Container
    this.cropperContainer = document.getElementById('cropper-stage-container');
    this.stageCanvas = document.getElementById('crop-stage-canvas');
    this.cropBoxEl = document.getElementById('crop-selection-box');
    
    // Aspect buttons
    this.presetBtns = document.querySelectorAll('.crop-preset-btn');
    
    // Meta / Result
    this.cropDimsDisplay = document.getElementById('crop-dims-display');
    this.resultContainer = document.getElementById('crop-result-container');
    this.resultPreviewImg = document.getElementById('crop-result-img');
    this.resultDimsText = document.getElementById('crop-result-dims');
    this.resultSizeText = document.getElementById('crop-result-size');

    // Actions
    this.btnExecute = document.getElementById('btn-execute-crop');
    this.btnDownload = document.getElementById('btn-download-crop');
    this.btnReset = document.getElementById('btn-reset-crop');
  }

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    DocuUtils.bindDropzone(this.dropzone, this.fileInput, (files) => {
      if (files.length > 0) this.loadImageFile(files[0]);
    });

    this.presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const ratio = btn.getAttribute('data-ratio');
        this.setAspectRatioPreset(ratio);

        this.presetBtns.forEach(b => {
          b.classList.remove('bg-brand-600', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        btn.classList.add('bg-brand-600', 'text-white');
      });
    });

    if (this.cropBoxEl) {
      // Mouse events
      this.cropBoxEl.addEventListener('mousedown', (e) => this.onPointerDown(e));
      window.addEventListener('mousemove', (e) => this.onPointerMove(e));
      window.addEventListener('mouseup', () => this.onPointerUp());

      // Touch events
      this.cropBoxEl.addEventListener('touchstart', (e) => this.onPointerDown(e), { passive: false });
      window.addEventListener('touchmove', (e) => this.onPointerMove(e), { passive: false });
      window.addEventListener('touchend', () => this.onPointerUp());
    }

    if (this.btnExecute) {
      this.btnExecute.addEventListener('click', () => this.executeCrop());
    }

    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.downloadResult());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.reset());
    }

    window.addEventListener('resize', () => {
      if (this.imgElement) this.renderStage();
    });
  }

  setAspectRatioPreset(preset) {
    this.aspectRatioPreset = preset;
    if (preset === '1:1') this.targetAspect = 1;
    else if (preset === '4:3') this.targetAspect = 4 / 3;
    else if (preset === '16:9') this.targetAspect = 16 / 9;
    else if (preset === '3:2') this.targetAspect = 3 / 2;
    else this.targetAspect = null; // free

    this.initDefaultCropBox();
    this.updateCropBoxDOM();
  }

  async loadImageFile(file) {
    try {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);

      const { img, width, height, objectUrl } = await DocuUtils.loadImage(file);
      this.currentFile = file;
      this.imgElement = img;
      this.origWidth = width;
      this.origHeight = height;
      this.previewUrl = objectUrl;

      if (this.dropzone) this.dropzone.classList.add('hidden');
      if (this.workspace) this.workspace.classList.remove('hidden');
      if (this.resultContainer) this.resultContainer.classList.add('hidden');

      this.renderStage();
      this.initDefaultCropBox();
      this.updateCropBoxDOM();
      DocuUtils.showToast('Image loaded. Drag or resize the crop box.', 'info');
    } catch (err) {
      DocuUtils.showToast(err.message, 'error');
    }
  }

  renderStage() {
    if (!this.stageCanvas || !this.cropperContainer || !this.imgElement) return;

    const containerWidth = this.cropperContainer.clientWidth || 600;
    const maxHeight = 500;

    let displayW = containerWidth;
    let displayH = (this.origHeight / this.origWidth) * displayW;

    if (displayH > maxHeight) {
      displayH = maxHeight;
      displayW = (this.origWidth / this.origHeight) * displayH;
    }

    this.stageCanvas.width = displayW;
    this.stageCanvas.height = displayH;
    this.stageScale = displayW / this.origWidth; // screen px per image px

    const ctx = this.stageCanvas.getContext('2d');
    ctx.drawImage(this.imgElement, 0, 0, displayW, displayH);
    this.updateCropBoxDOM();
  }

  initDefaultCropBox() {
    let cropW = this.origWidth * 0.8;
    let cropH = this.origHeight * 0.8;

    if (this.targetAspect) {
      if (cropW / cropH > this.targetAspect) {
        cropW = cropH * this.targetAspect;
      } else {
        cropH = cropW / this.targetAspect;
      }
    }

    this.crop = {
      x: (this.origWidth - cropW) / 2,
      y: (this.origHeight - cropH) / 2,
      width: cropW,
      height: cropH,
    };
  }

  updateCropBoxDOM() {
    if (!this.cropBoxEl || !this.stageScale) return;

    const screenX = this.crop.x * this.stageScale;
    const screenY = this.crop.y * this.stageScale;
    const screenW = this.crop.width * this.stageScale;
    const screenH = this.crop.height * this.stageScale;

    this.cropBoxEl.style.left = `${screenX}px`;
    this.cropBoxEl.style.top = `${screenY}px`;
    this.cropBoxEl.style.width = `${screenW}px`;
    this.cropBoxEl.style.height = `${screenH}px`;

    if (this.cropDimsDisplay) {
      this.cropDimsDisplay.textContent = `${Math.round(this.crop.width)} × ${Math.round(this.crop.height)} px`;
    }
  }

  getClientPos(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  onPointerDown(e) {
    if (!this.imgElement) return;
    const target = e.target;
    this.dragMode = target.getAttribute('data-handle') || 'move';
    this.isDragging = true;

    const pos = this.getClientPos(e);
    this.startX = pos.x;
    this.startY = pos.y;
    this.initialCrop = { ...this.crop };

    if (e.cancelable) e.preventDefault();
  }

  onPointerMove(e) {
    if (!this.isDragging || !this.stageScale) return;

    const pos = this.getClientPos(e);
    const deltaX = (pos.x - this.startX) / this.stageScale;
    const deltaY = (pos.y - this.startY) / this.stageScale;

    let newX = this.initialCrop.x;
    let newY = this.initialCrop.y;
    let newW = this.initialCrop.width;
    let newH = this.initialCrop.height;

    const minSize = 20;

    if (this.dragMode === 'move') {
      newX = Math.max(0, Math.min(this.origWidth - newW, this.initialCrop.x + deltaX));
      newY = Math.max(0, Math.min(this.origHeight - newH, this.initialCrop.y + deltaY));
    } else if (this.dragMode === 'se') {
      newW = Math.max(minSize, Math.min(this.origWidth - newX, this.initialCrop.width + deltaX));
      newH = this.targetAspect ? newW / this.targetAspect : Math.max(minSize, Math.min(this.origHeight - newY, this.initialCrop.height + deltaY));
    } else if (this.dragMode === 'sw') {
      const maxDelta = this.initialCrop.width - minSize;
      const appliedDelta = Math.min(maxDelta, Math.max(-this.initialCrop.x, deltaX));
      newX = this.initialCrop.x + appliedDelta;
      newW = this.initialCrop.width - appliedDelta;
      newH = this.targetAspect ? newW / this.targetAspect : Math.max(minSize, Math.min(this.origHeight - newY, this.initialCrop.height + deltaY));
    } else if (this.dragMode === 'ne') {
      newW = Math.max(minSize, Math.min(this.origWidth - newX, this.initialCrop.width + deltaX));
      newH = this.targetAspect ? newW / this.targetAspect : Math.max(minSize, this.initialCrop.height - deltaY);
      newY = this.initialCrop.y + (this.initialCrop.height - newH);
    } else if (this.dragMode === 'nw') {
      const maxDelta = this.initialCrop.width - minSize;
      const appliedDelta = Math.min(maxDelta, Math.max(-this.initialCrop.x, deltaX));
      newX = this.initialCrop.x + appliedDelta;
      newW = this.initialCrop.width - appliedDelta;
      newH = this.targetAspect ? newW / this.targetAspect : Math.max(minSize, this.initialCrop.height - deltaY);
      newY = this.initialCrop.y + (this.initialCrop.height - newH);
    }

    // Bounds checking
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + newW > this.origWidth) newW = this.origWidth - newX;
    if (newY + newH > this.origHeight) newH = this.origHeight - newY;

    this.crop = { x: newX, y: newY, width: newW, height: newH };
    this.updateCropBoxDOM();

    if (e.cancelable) e.preventDefault();
  }

  onPointerUp() {
    this.isDragging = false;
    this.dragMode = null;
  }

  async executeCrop() {
    if (!this.imgElement || !this.currentFile) return;

    try {
      const cropW = Math.round(this.crop.width);
      const cropH = Math.round(this.crop.height);
      const cropX = Math.round(this.crop.x);
      const cropY = Math.round(this.crop.y);

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');

      const mime = this.currentFile.type || 'image/jpeg';
      if (mime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, cropW, cropH);
      }

      ctx.drawImage(this.imgElement, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const blob = await DocuUtils.canvasToBlob(canvas, mime, 0.95);
      this.resultBlob = blob;

      const resultUrl = URL.createObjectURL(blob);
      if (this.resultPreviewImg) this.resultPreviewImg.src = resultUrl;
      if (this.resultDimsText) this.resultDimsText.textContent = `${cropW} × ${cropH} px`;
      if (this.resultSizeText) this.resultSizeText.textContent = DocuUtils.formatBytes(blob.size);

      if (this.resultContainer) this.resultContainer.classList.remove('hidden');
      DocuUtils.showToast('Image cropped successfully!', 'success');
    } catch (err) {
      DocuUtils.showToast(`Crop failed: ${err.message}`, 'error');
    }
  }

  downloadResult() {
    if (!this.resultBlob || !this.currentFile) return;
    const baseName = DocuUtils.getBaseFilename(this.currentFile.name);
    const ext = DocuUtils.getExtensionForMime(this.resultBlob.type);
    const filename = `${baseName}_cropped.${ext}`;

    DocuUtils.downloadBlob(this.resultBlob, filename);
  }

  reset() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.currentFile = null;
    this.imgElement = null;
    this.resultBlob = null;
    if (this.fileInput) this.fileInput.value = '';
    
    if (this.workspace) this.workspace.classList.add('hidden');
    if (this.resultContainer) this.resultContainer.classList.add('hidden');
    if (this.dropzone) this.dropzone.classList.remove('hidden');
    DocuUtils.showToast('Cropper reset.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('crop-tool-app')) {
    window.cropperApp = new ImageCropper();
  }
});
