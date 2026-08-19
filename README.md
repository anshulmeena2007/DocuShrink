# DocuHug

> **Simple tools for your files. Private by design.**

DocuHug is an original, privacy-first web application designed for lightning-fast image optimization, format conversion, resizing, cropping, and document management. All file operations execute **100% locally within the user's browser runtime** without uploading files to remote servers or third-party cloud APIs.

---

## Key Features Implemented (Phases 1, 2, 3, 4 & 5)

### Phase 1: Core Layout, UI Foundation & SEO Base
- **Responsive Navigation**: Desktop header with active section tracking and mobile hamburger drawer.
- **Brand Identity**: Original modern teal/emerald/slate theme with custom vector logo mark.
- **Homepage Structure**: Hero section with trust badges, Popular Tools grid, Categorized Directory, "Your Files Stay With You" privacy section, 3-step "How It Works", 6-card "Why DocuHug", accessible FAQ accordion, and footer.
- **AdSense Reservation**: 3 layout-stable, non-intrusive placeholder slots preventing Cumulative Layout Shift (CLS).
- **SEO & Accessibility**: WCAG AA focus outlines, skip link, semantic HTML5, Open Graph tags, canonical links, and Schema.org JSON-LD structured data.

### Phase 2: Client-Side Image Tools Suite
1. **Compress Image (`tools/compress-image.html`)**:
   - Multi-file drag-and-drop / file picker for JPG, PNG, and WebP.
   - Quality slider (10%–100%) with real-time percentage display.
   - Target Size Presets (~50 KB, ~100 KB, ~200 KB) with iterative binary search solver.
   - PNG lossless disclosure banner.
   - Output format selector (Maintain Original, JPG, PNG, WebP).
   - Real Blob.size and reduction percentage calculation (e.g. `-71.7%`).
   - Single-file downloads & batch ZIP export using `JSZip`.
2. **Resize Image (`tools/resize-image.html`)**:
   - Custom width and height pixel inputs.
   - Aspect ratio lock toggle (auto-syncs proportional dimensions).
   - Percentage scaling presets (25%, 50%, 75%, 100%).
   - High-quality Canvas scaling with image smoothing.
   - Real-time dimension and byte size display.
3. **Convert Image (`tools/convert-image.html`)**:
   - Cross-format conversion between JPG, PNG, and WebP.
   - Batch conversion queue with status indicators.
   - Transparency background handling for PNG/WebP -> JPG (solid white fill).
   - Single-file and bulk ZIP downloads.
4. **Crop Image (`tools/crop-image.html`)**:
   - Interactive Canvas crop frame with touch & mouse drag handles.
   - Aspect ratio presets: Freeform, 1:1 (Square), 4:3, 16:9, 3:2.
   - Live crop dimension indicators.
   - Canvas `drawImage` extraction and instant download.

### Phase 3: Client-Side Image to PDF Tools Suite
1. **Image to PDF (`tools/image-to-pdf.html`)**:
   - Single & multi-file conversion for JPG, PNG, and WebP into structured multi-page PDF documents.
   - Interactive page reordering: **Move Up** and **Move Down** buttons per page thumbnail with live page order badges.
   - Configurable Page Sizes: **A4** (210 × 297 mm), **US Letter** (8.5 × 11 in), and **Original Image Dimensions**.
   - Orientations: **Portrait**, **Landscape**, and **Auto** (dynamically matches each image's aspect ratio).
   - Page Margins: **No Margin (0mm)**, **Small (5mm)**, **Medium (10mm)**, and **Large (20mm)**.
   - Fitting Modes: **Fit to Page** (proportional scaling preserving aspect ratio), **Fill Area**, and **Original Size** (centered).
   - Quality / Size balancing control.
   - Real `pdf.output('blob').size` measurement and direct local object URL download.
2. **JPG to PDF (`tools/jpg-to-pdf.html`)**:
   - Dedicated conversion flow restricted to JPG/JPEG images with tailored SEO and streamlined UI.
   - Shares the unified, high-performance `ImageToPdfEngine` pipeline.

### Phase 4: Client-Side PDF Tools Suite
1. **Merge PDF (`tools/merge-pdf.html`)**:
   - Upload multiple PDF documents with automatic page count detection via `pdf-lib`.
   - Visual reordering with Move Up / Move Down buttons to control exact document sequence.
   - Password protection & encryption check with user notifications.
   - Direct merged PDF generation and local Blob download.
2. **Split PDF (`tools/split-pdf.html`)**:
   - Page thumbnails preview grid rendered in-browser using `PDF.js`.
   - **Mode A: Extract Pages / Ranges**: specify custom ranges like `1-3`, `1, 3, 5`, `2-4, 7` with instant syntax validation.
   - **Mode B: Split Every Page**: extracts every page into an individual 1-page PDF file.
   - **Mode C: Multiple Ranges**: multi-line range definition creating distinct PDF files per line.
   - Single PDF downloads and single-click **"Download All as ZIP"** via `JSZip`.
3. **PDF to JPG (`tools/pdf-to-jpg.html`)**:
   - High-fidelity PDF page rendering to Canvas using `PDF.js`.
   - Page selection: Convert All Pages or Convert Selected Pages.
   - Resolution scale control: 1x (Standard), 1.5x (Medium), 2x (High Quality Print).
   - JPEG quality control (75% to 100%).
   - Individual image downloads and bulk ZIP archive export.
4. **Compress PDF (`tools/compress-pdf.html`)**:
   - Client-side PDF file size optimization.
   - 3 Strength Presets: **Basic Clean** (removes redundant objects/metadata), **Balanced** (stream compression + downsampling), and **Maximum Compression** (compact attachments).
   - Honest metric reporting: compares actual Blob size against original file size. If no reduction is safe, displays: *"The PDF could not be reduced further without risking quality or content."*

### Phase 5: Legal, Informational, SEO & AdSense-Ready Architecture
1. **Privacy Policy (`privacy.html`)**:
   - Transparent disclosures of browser-based processing, zero server storage, zero cookies collected by core tools, and third-party CDN/Ad disclosures.
2. **Terms of Service (`terms.html`)**:
   - Clear terms outlining permitted use, user ownership of files, technical processing limitations, warranty disclaimers, and limitation of liability.
3. **About Us (`about.html`)**:
   - Authentic narrative detailing why DocuHug was created, its privacy philosophy, and supported workflows without fabricated company details.
4. **Contact Us (`contact.html`)**:
   - Direct email contact link with documented domain placeholder (`contact@your-domain.com`), troubleshooting advice, and FAQ shortcuts.
5. **404 Error Page (`404.html`)**:
   - Branded error handler providing immediate navigation back to home and tool directories.
6. **SEO & Structured Data**:
   - 16 Unique `<title>` and `<meta name="description">` tags.
   - Semantic H1/H2/H3 tag hierarchies.
   - Schema.org JSON-LD structured data (`WebSite`, `WebApplication`, `SoftwareApplication`, `BreadcrumbList`, `AboutPage`, `ContactPage`) without fake ratings or reviews.
   - Verified `robots.txt` and `sitemap.xml` with production domain placeholders.
7. **AdSense-Ready Layout Stability**:
   - Dedicated ad slots with fixed minimum heights (`min-height: 90px`) to prevent Cumulative Layout Shift (CLS), labeled neutrally as "ADVERTISEMENT".

---

## Client-Side Privacy Architecture

```
User Device (Browser Memory)
├── 1. User Selects Files (File API / Drag & Drop)
├── 2. Decoded in browser memory (PDF.js / pdf-lib / FileReader)
├── 3. Manipulated / Rasterized locally (HTMLCanvasElement / pdf-lib)
├── 4. Assembled into Output Document (pdf-lib / jsPDF / JSZip)
├── 5. Generated Binary Blob (Blob API)
└── 6. Direct Local Download (a[download] -> Disk)
═════════════════════════════════════════════════════════════════════════
[ STRICT PRIVACY BOUNDARY: 0 BYTES SENT TO BACKEND / EXTERNAL APIS ]
```

- **Zero Cloud Uploads**: User files never leave local device memory.
- **Zero Database / Telemetry**: No tracking cookies, accounts, or file retention.
- **Memory Hygiene**: Object URLs are revoked with `URL.revokeObjectURL()` upon file removal or workspace reset.

---

## Technologies Used

- **HTML5**: Semantic tags, `<canvas>`, `<details>/<summary>`, accessible forms, JSON-LD metadata.
- **CSS3 / Tailwind CSS (CDN)**: Modern layout grid, flexbox, glassmorphism header, responsive design tokens.
- **Vanilla JavaScript (ES6+)**: Modular engines (`ImageCompressor`, `ImageResizer`, `ImageConverter`, `ImageCropper`, `ImageToPdfEngine`, `PdfMergerEngine`, `PdfSplitterEngine`, `PdfToJpgEngine`, `PdfCompressorEngine`), asynchronous Promises, binary search algorithms.
- **pdf-lib (CDN)**: In-browser PDF document merging, splitting, and structural stream optimization.
- **PDF.js (CDN)**: In-browser PDF rendering, thumbnail generation, and Canvas raster extraction.
- **jsPDF (CDN)**: In-browser PDF document generation from images.
- **JSZip (CDN)**: In-browser ZIP archive generation.

---

## Local Development & Static Hosting Compatibility

1. **Clone or Navigate to the Project Directory**:
   ```bash
   cd DocuHug
   ```

2. **Start a Local HTTP Server**:
   ```bash
   python -m http.server 8000
   ```

3. **Open in Browser**:
   ```
   http://127.0.0.1:8000
   ```

## Static Hosting Deployment Guides

DocuHug is a 100% static web application with zero backend requirements. It can be hosted on any static hosting platform:

### 1. GitHub Pages (Free)
1. Push this repository to GitHub (`main` branch).
2. Go to **Settings &rarr; Pages**.
3. Under **Build and deployment &rarr; Branch**, select `main` and `/ (root)`. Click **Save**.
4. Your website is instantly live at `https://<username>.github.io/<repo-name>/`.

### 2. Cloudflare Pages
1. In the Cloudflare Dashboard, go to **Workers & Pages &rarr; Create Application &rarr; Pages**.
2. Connect your Git repository.
3. Build command: *(leave empty)*, Output directory: `/`. Click **Save and Deploy**.

### 3. Netlify
1. Connect your repository on Netlify.
2. Publish directory: `.` (root). Click **Deploy Site**.

### 4. Vercel
1. Import the Git repository in Vercel.
2. Framework Preset: `Other`, Root Directory: `./`. Click **Deploy**.

---

## Google Search Console Setup & SEO Indexing

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add your production domain property (e.g. `https://docuhug.com`).
3. Verify domain ownership via DNS TXT record or HTML tag.
4. Navigate to **Sitemaps**, enter `sitemap.xml`, and submit.
5. Inspect the homepage URL and request indexing.

---

## Known Technical Limitations & Design Trade-offs

- **Browser Memory Limits**: Extremely large files (e.g. multi-gigabyte PDFs or massive photo batches) are constrained by available device memory in the browser sandbox.
- **Encrypted / Password-Protected PDFs**: Password-protected PDFs cannot be merged, split, or optimized in the client without providing credentials first.
- **True Compression Dependency**: Pure vector and text PDFs or already heavily-optimized images cannot be reduced further without destructive quality loss; DocuHug honestly discloses this state rather than faking reduced byte counts.

---

## Production Deployment Checklist

Before deploying to a public production domain:
- [ ] **Domain Replacement**: Replace `https://example.com` in all canonical links, Open Graph tags, JSON-LD schemas, `robots.txt`, and `sitemap.xml` with your actual live domain.
- [ ] **Contact Email**: Replace `contact@your-domain.com` in `contact.html`, `privacy.html`, and `terms.html` with your official contact address.
- [ ] **AdSense Activation**: When approved for Google AdSense, paste your real AdSense script in `<head>` and ad units into the designated `.ad-placeholder-unit` containers.
- [ ] See [`PRODUCTION-CHECKLIST.md`](file:///c:/Users/anshu/OneDrive/Desktop/DocuHug/PRODUCTION-CHECKLIST.md) for full launch instructions.

---

## B.Tech CSE Viva & Project Defense Guide

- **Problem Statement**: Standard online file converters require uploading sensitive files (IDs, photos, signatures) to remote servers, incurring network latency, security risks, and privacy leaks.
- **Proposed Solution**: DocuHug executes file manipulation client-side using browser-native APIs, eliminating server overhead and guaranteeing zero data leakage.
- **Key Concepts Demonstrated**:
  1. *Client-Side PDF Manipulation with pdf-lib*: Direct ArrayBuffer binary manipulation, reading object dictionaries, copying page references between documents, and stream compression.
  2. *Asynchronous PDF Rendering with PDF.js*: Using Web Workers to parse PostScript/PDF instruction streams, calculating viewport matrices at variable scale factors, and rendering onto offscreen `HTMLCanvasElement`s.
  3. *Client-Side PDF Document Assembly*: Constructing multi-page PDF files locally using `jsPDF`, determining millimeter geometry (`unit: 'mm'`), available printable rects, and aspect ratio containment algorithms.
  4. *Binary Search Algorithm for Target Compression*: Iteratively approximates target file sizes (e.g. 50 KB) by adjusting lossy encoding quality and scaling dimensions.
  5. *Canvas API & Raster Pipeline*: Loading Blobs into `HTMLImageElement`, drawing to `HTMLCanvasElement`, and encoding via `canvas.toBlob()`.
  6. *Alpha Transparency Handling*: Converting transparent PNG/WebP rasters to JPEG requires filling the background with white pixels to avoid rendering black artifacts.
  7. *In-Browser ZIP Packaging*: Generating uncompressed/compressed ZIP archive files entirely within JavaScript memory using `JSZip` and triggering local disk writes via anchor download attributes.
  8. *Legal & SEO Architecture*: Adhering to truth-in-advertising, search engine structured data standards, WCAG AA accessibility, and layout-shift stability without server backend dependencies.
