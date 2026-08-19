/**
 * DocuHug — Utility Module (Phase 2)
 * Shared helper functions for client-side processing, formatting, ZIP packaging, and UI notifications.
 * Strictly 100% Client-Side.
 */

const DocuUtils = {
  /**
   * Format raw bytes into human-readable string (KB, MB, etc.)
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    if (!bytes || isNaN(bytes)) return '0 KB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return `${formatted} ${sizes[i]}`;
  },

  /**
   * Safely escape HTML strings to prevent XSS in filenames or metadata
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Extract base filename without extension
   */
  getBaseFilename(filename) {
    if (!filename) return 'image';
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
  },

  /**
   * Get file extension
   */
  getFileExtension(filename) {
    if (!filename) return '';
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filename.substring(lastDotIndex + 1).toLowerCase();
  },

  /**
   * Map format strings to MIME types
   */
  getMimeType(format, fallbackMime = 'image/jpeg') {
    switch (format?.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
      case 'image/jpeg':
        return 'image/jpeg';
      case 'png':
      case 'image/png':
        return 'image/png';
      case 'webp':
      case 'image/webp':
        return 'image/webp';
      default:
        return fallbackMime;
    }
  },

  /**
   * Get default extension for MIME type
   */
  getExtensionForMime(mimeType) {
    switch (mimeType?.toLowerCase()) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/jpeg':
      default:
        return 'jpg';
    }
  },

  /**
   * Load an image file into an HTMLImageElement using Object URL
   */
  loadImage(fileOrBlob) {
    return new Promise((resolve, reject) => {
      if (!fileOrBlob || !(fileOrBlob instanceof Blob)) {
        return reject(new Error('Invalid image file or blob'));
      }
      const objectUrl = URL.createObjectURL(fileOrBlob);
      const img = new Image();
      img.onload = () => {
        resolve({
          img,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          objectUrl,
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image. The file may be corrupt or an unsupported format.'));
      };
      img.src = objectUrl;
    });
  },

  /**
   * Promisified canvas.toBlob()
   */
  canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.8) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed.'));
            }
          },
          mimeType,
          quality
        );
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Trigger local browser download for a Blob
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  },

  /**
   * Create and trigger a ZIP download of multiple Blobs using JSZip
   */
  async createAndDownloadZip(fileList, zipFilename = 'DocuHug_Processed_Files.zip') {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is not loaded. Please check your internet connection.');
    }

    const zip = new JSZip();
    const nameCounts = {};

    fileList.forEach((item) => {
      if (!item.blob) return;
      let filename = item.filename || 'processed_image.jpg';

      // Avoid filename collisions
      if (nameCounts[filename]) {
        const base = DocuUtils.getBaseFilename(filename);
        const ext = DocuUtils.getFileExtension(filename);
        nameCounts[filename]++;
        filename = `${base}_(${nameCounts[filename]}).${ext}`;
      } else {
        nameCounts[filename] = 1;
      }

      zip.file(filename, item.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    DocuUtils.downloadBlob(zipBlob, zipFilename);
  },

  /**
   * Accessible toast notification helper
   */
  showToast(message, type = 'info') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    let bgClass = 'bg-slate-900 border-slate-700 text-white';
    if (type === 'error') bgClass = 'bg-rose-900 border-rose-700 text-rose-100';
    if (type === 'success') bgClass = 'bg-emerald-900 border-emerald-700 text-emerald-100';
    if (type === 'warning') bgClass = 'bg-amber-900 border-amber-700 text-amber-100';

    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-3 text-sm font-medium rounded-xl shadow-2xl border transition-all duration-300 transform opacity-100 translate-y-0 ${bgClass}`;
    toast.textContent = message;

    if (toast.dismissTimeout) clearTimeout(toast.dismissTimeout);
    toast.dismissTimeout = setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-4');
    }, 3500);
  },

  /**
   * Drag-and-Drop Dropzone binder
   */
  bindDropzone(dropzoneEl, fileInputEl, onFilesSelected) {
    if (!dropzoneEl || !fileInputEl) return;

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.add('border-brand-500', 'bg-brand-50/50');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.remove('border-brand-500', 'bg-brand-50/50');
      });
    });

    dropzoneEl.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0 && typeof onFilesSelected === 'function') {
        onFilesSelected(files);
      }
    });

    dropzoneEl.addEventListener('click', (e) => {
      if (e.target !== fileInputEl) {
        fileInputEl.click();
      }
    });

    fileInputEl.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0 && typeof onFilesSelected === 'function') {
        onFilesSelected(files);
      }
      fileInputEl.value = ''; // Reset input so same file can be re-selected
    });
  },

  /**
   * Read File as ArrayBuffer (Promise)
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file into memory.'));
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Parse a page range string (e.g. "1, 3-5, 8") into 0-indexed page indices
   * Validates against total page count.
   */
  parsePageRanges(rangeStr, maxPages) {
    if (!rangeStr || !rangeStr.trim()) {
      throw new Error('Please specify a page range.');
    }

    const cleaned = rangeStr.replace(/\s+/g, '');
    if (!/^(\d+(-\d+)?)(,\d+(-\d+)?)*$/.test(cleaned)) {
      throw new Error('Invalid page range syntax. Example: 1-3, 5, 8-10');
    }

    const segments = cleaned.split(',');
    const indexSet = new Set();

    for (const seg of segments) {
      if (seg.includes('-')) {
        const [startStr, endStr] = seg.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);

        if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
          throw new Error(`Invalid range "${seg}". Start page must be >= 1 and end page must be >= start page.`);
        }
        if (start > maxPages || end > maxPages) {
          throw new Error(`Range "${seg}" exceeds total document page count (${maxPages}).`);
        }

        for (let p = start; p <= end; p++) {
          indexSet.add(p - 1);
        }
      } else {
        const pageNum = parseInt(seg, 10);
        if (isNaN(pageNum) || pageNum < 1) {
          throw new Error(`Invalid page number "${seg}".`);
        }
        if (pageNum > maxPages) {
          throw new Error(`Page ${pageNum} exceeds total document page count (${maxPages}).`);
        }
        indexSet.add(pageNum - 1);
      }
    }

    // Return sorted 0-indexed page indices
    return Array.from(indexSet).sort((a, b) => a - b);
  },

  /**
   * Parse multi-range lines (e.g. "1-3\n4-6\n7-10") into separate PDF range tasks
   */
  parseMultipleRanges(rangesText, maxPages) {
    const lines = rangesText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      throw new Error('Please specify at least one page range.');
    }

    const results = [];
    lines.forEach((line, idx) => {
      const indices = DocuUtils.parsePageRanges(line, maxPages);
      if (indices.length > 0) {
        results.push({
          label: `pages_${line.replace(/[\s,]+/g, '_')}`,
          rangeStr: line,
          indices,
        });
      }
    });

    return results;
  }
};

// Expose globally
window.DocuUtils = DocuUtils;
