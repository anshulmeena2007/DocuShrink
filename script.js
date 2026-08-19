/**
 * DocuHug — Core Script (Phase 1)
 * Clean, lightweight, fully accessible Vanilla JavaScript.
 * Strictly zero backend, zero analytics trackers, zero eval.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNavigation();
  initFaqAccordion();
  initSmoothScroll();
  initToolCardPlaceholders();
});

/**
 * Mobile Navigation Drawer & Hamburger Toggle
 */
function initMobileNavigation() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIconOpen = document.getElementById('menu-icon-open');
  const menuIconClose = document.getElementById('menu-icon-close');

  if (!menuBtn || !mobileMenu) return;

  function toggleMenu(forceOpen) {
    const isCurrentlyHidden = mobileMenu.classList.contains('menu-hidden') || mobileMenu.style.display === 'none';
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isCurrentlyHidden;
    
    if (shouldOpen) {
      mobileMenu.classList.remove('menu-hidden', 'hidden');
      mobileMenu.classList.add('menu-visible');
      mobileMenu.style.display = 'block';
      menuBtn.setAttribute('aria-expanded', 'true');
      if (menuIconOpen) menuIconOpen.classList.add('hidden');
      if (menuIconClose) menuIconClose.classList.remove('hidden');
    } else {
      mobileMenu.classList.remove('menu-visible');
      mobileMenu.classList.add('menu-hidden');
      mobileMenu.style.display = 'none';
      menuBtn.setAttribute('aria-expanded', 'false');
      if (menuIconOpen) menuIconOpen.classList.remove('hidden');
      if (menuIconClose) menuIconClose.classList.add('hidden');
    }
  }

  // Ensure initial closed state
  toggleMenu(false);

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close menu when clicking outside or clicking any nav link
  document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target) && mobileMenu.classList.contains('menu-visible')) {
      toggleMenu(false);
    }
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('menu-visible')) {
      toggleMenu(false);
      menuBtn.focus();
    }
  });
}

/**
 * FAQ Accordion Enhancement for ARIA & Single/Multi Expand support
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('#faq details');
  
  faqItems.forEach((details) => {
    const summary = details.querySelector('summary');
    if (!summary) return;

    summary.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        // native details behavior works, but ensure clean focus
      }
    });
  });
}

/**
 * Smooth scrolling for internal anchor links with offset handling
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Set focus to the target section for screen readers
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus({ preventScroll: true });
      }
    });
  });
}

/**
 * Tool Card interactions in Phase 1
 * Note: Processing engines are reserved for Phases 2-4.
 */
function initToolCardPlaceholders() {
  const comingSoonCards = document.querySelectorAll('.card-coming-soon');
  comingSoonCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const toolName = card.querySelector('h3')?.textContent?.trim() || 'This tool';
      showToast(`${toolName} is coming in a future release.`);
    });
  });
}

/**
 * Accessible toast notification helper
 */
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.className = 'fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-xl border border-slate-700 transition-all duration-300 opacity-0 transform translate-y-4';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('opacity-0', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-4');
  }, 3000);
}
