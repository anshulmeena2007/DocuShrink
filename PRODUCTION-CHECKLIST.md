# DocuHug — Production Deployment Checklist & Launch Guide

This checklist provides step-by-step instructions for deploying DocuHug to static hosting environments (GitHub Pages, Cloudflare Pages, Netlify, Vercel), configuring custom domains, submitting sitemaps to Google Search Console, and activating future Google AdSense advertising.

---

## 1. Pre-Deployment Configuration & Placeholders

Before pushing the codebase to your live public domain, perform a search-and-replace for the following documented placeholders:

### A. Production Domain
- **Current Placeholder**: `https://example.com`
- **Target Value**: `https://your-custom-domain.com` (e.g. `https://docuhug.com`)
- **Files to Update**:
  - `robots.txt` (`Sitemap: https://example.com/sitemap.xml`)
  - `sitemap.xml` (all `<loc>` URLs)
  - `index.html` (canonical, Open Graph `og:url`, `og:image`, Twitter `twitter:image`, JSON-LD URLs)
  - `about.html`, `contact.html`, `privacy.html`, `terms.html` (canonical, Open Graph, JSON-LD)
  - `tools/*.html` (all 10 tool pages: canonical, Open Graph, Twitter, JSON-LD)

### B. Contact & Support Email
- **Current Placeholder**: `contact@your-domain.com`
- **Target Value**: Your official support email address (e.g. `support@docuhug.com` or `hello@docuhug.com`)
- **Files to Update**:
  - `contact.html` (email card `mailto:` link & displayed text)
  - `privacy.html` (Section 11 contact section)
  - `terms.html` (Section 11 contact section)

---

## 2. Static Hosting Deployment Options

DocuHug is a **100% static web application** (HTML5, CSS3, Vanilla JS). It requires **no backend server, no database, and no Node.js runtime**.

### Option 1: GitHub Pages (Recommended Free Option)
1. Initialize a Git repository and push your project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Deploy DocuHug production build"
   git branch -M main
   git remote add origin https://github.com/your-username/docuhug.git
   git push -u origin main
   ```
2. Navigate to **Repository Settings &rarr; Pages**.
3. Under **Build and deployment &rarr; Source**, select `Deploy from a branch`.
4. Set branch to `main` and folder to `/(root)`. Click **Save**.
5. Your website will be live at `https://your-username.github.io/docuhug/` (or your connected custom domain).

### Option 2: Cloudflare Pages (Fast Global CDN)
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and select **Workers & Pages**.
2. Click **Create Application &rarr; Pages &rarr; Connect to Git**.
3. Select your repository.
4. Set Build Settings:
   - **Framework preset**: `None`
   - **Build command**: *(Leave blank)*
   - **Build output directory**: `/`
5. Click **Save and Deploy**.

### Option 3: Netlify
1. Log in to [Netlify](https://app.netlify.com/) and click **Add new site &rarr; Import an existing project**.
2. Connect your Git repository.
3. Set **Publish directory** to `.` (root).
4. Click **Deploy Site**.

### Option 4: Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New &rarr; Project**.
2. Import your GitHub repository.
3. Framework Preset: `Other`. Output Directory: `.`
4. Click **Deploy**.

---

## 3. Custom Domain & SSL/HTTPS Verification

1. In your static hosting provider's dashboard, add your custom domain (e.g. `docuhug.com` and `www.docuhug.com`).
2. Update DNS records at your domain registrar:
   - **Apex domain (`@`)**: Add an `A` record or `ALIAS`/`ANAME` pointing to your host's IP/server.
   - **`www` subdomain**: Add a `CNAME` record pointing to your host's target URL.
3. Ensure **Enforce HTTPS / Automatic SSL Certificate** is enabled in your hosting dashboard.
4. Verify that browsing to `http://your-domain.com` automatically redirects to `https://your-domain.com`.

---

## 4. Google Search Console Setup & Sitemap Submission

1. Visit [Google Search Console](https://search.google.com/search-console).
2. Click **Add Property** and enter your live URL (`https://your-domain.com`).
3. Complete domain verification (via DNS TXT record or HTML tag).
4. In the left navigation, click **Sitemaps**.
5. Enter your sitemap URL: `sitemap.xml` (e.g. `https://your-domain.com/sitemap.xml`) and click **Submit**.
6. Open **URL Inspection**, enter your homepage URL, and click **Request Indexing**.

---

## 5. Google AdSense Activation Checklist

DocuHug was engineered with **AdSense-ready layout stability** (`.ad-placeholder-unit` slots with fixed minimum heights to avoid layout shifts).

When your domain qualifies for Google AdSense:
1. Apply at [Google AdSense](https://adsense.google.com/).
2. Once your site is reviewed and approved, copy your AdSense verification script and paste it into the `<head>` tag of `index.html`, legal pages, and `tools/*.html`.
3. In each `.ad-placeholder-unit` container across the site, replace the placeholder text with your actual `<ins class="adsbygoogle">` ad tag code.
4. Ensure auto-ads or responsive display banners render seamlessly without overlapping tool dropzones or download buttons.

---

## 6. Final Production Verification Steps

- [ ] **Desktop & Mobile Smoke Test**: Load all 10 tools on Chrome, Safari, Firefox, and Edge.
- [ ] **Single & Multiple File Processing**: Run compression, resizing, conversion, cropping, and PDF merging/splitting with test files.
- [ ] **Privacy Verification**: Open Browser DevTools Network tab &rarr; confirm 0 file uploads sent to any external server.
- [ ] **Error Handling**: Test invalid file types (e.g. text file in image compressor) and confirm clear, friendly error toasts.
- [ ] **Footer Navigation**: Click each link in the 4-column footer and confirm 0 broken links.
