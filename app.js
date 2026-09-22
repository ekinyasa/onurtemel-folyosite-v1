/**
 * ONUR TEMEL — VIDEOGRAPHER PORTFOLIO
 * Vanilla JS Application Controller
 */

(function () {
  'use strict';

  // DOM Elements
  const workView = document.getElementById('work-view');
  const infoView = document.getElementById('info-view');
  const worksGrid = document.getElementById('works-grid');
  const infoContainer = document.getElementById('info-container');
  const errorState = document.getElementById('error-state');
  const errorMessage = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');
  const viewSwitchBtn = document.getElementById('view-switch-btn');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const brandLink = document.getElementById('brand-link');

  // Application State
  let siteData = null;
  let currentView = 'work';

  // --- 1. INITIALIZATION ---
  function init() {
    initTheme();
    setupEventListeners();
    loadContent();
  }

  // --- 2. THEME SYSTEM ---
  function initTheme() {
    const savedTheme = localStorage.getItem('onurtemel_theme');
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      applyTheme('system');
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggleBtn.textContent = 'LIGHT';
      themeToggleBtn.setAttribute('aria-label', 'Switch to light theme');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggleBtn.textContent = 'DARK';
      themeToggleBtn.setAttribute('aria-label', 'Switch to dark theme');
    } else {
      document.documentElement.removeAttribute('data-theme');
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      themeToggleBtn.textContent = systemIsDark ? 'LIGHT' : 'DARK';
      themeToggleBtn.setAttribute('aria-label', 'Toggle light/dark theme');
    }
  }

  function toggleTheme() {
    const currentAttr = document.documentElement.getAttribute('data-theme');
    let nextTheme = 'dark';

    if (currentAttr === 'dark') {
      nextTheme = 'light';
    } else if (currentAttr === 'light') {
      nextTheme = 'dark';
    } else {
      // System mode default
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      nextTheme = systemIsDark ? 'light' : 'dark';
    }

    localStorage.setItem('onurtemel_theme', nextTheme);
    applyTheme(nextTheme);
  }

  // --- 3. CONTENT LOADING & FETCHING ---
  async function loadContent() {
    hideError();
    try {
      const response = await fetch('content.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      siteData = await response.json();
      validateAndRender();
      handleHashNavigation();
    } catch (err) {
      console.error('Failed to load portfolio content:', err);
      showError('Unable to load content catalog. Please verify your connection.');
    }
  }

  function showError(msg) {
    if (errorMessage) errorMessage.textContent = msg;
    if (workView) workView.hidden = true;
    if (infoView) infoView.hidden = true;
    if (errorState) errorState.hidden = false;
  }

  function hideError() {
    if (errorState) errorState.hidden = true;
  }

  // --- 4. DATA VALIDATION & RENDERING ---
  function validateAndRender() {
    if (!siteData) return;

    // Site Meta updates
    if (siteData.site) {
      if (siteData.site.pageTitle) document.title = siteData.site.pageTitle;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && siteData.site.description) {
        metaDesc.setAttribute('content', siteData.site.description);
      }
    }

    renderWorksGrid(siteData.works || []);
    renderInfoView(siteData.bio || {}, siteData.links || [], siteData.site || {});
  }

  // Render Works (Primary View)
  function renderWorksGrid(works) {
    worksGrid.innerHTML = '';

    if (!Array.isArray(works) || works.length === 0) {
      worksGrid.innerHTML = '<p class="work-description">No works available.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    works.forEach(work => {
      const workId = work.id || `work-${Math.random().toString(36).substr(2, 9)}`;
      const title = work.title || 'Untitled Work';
      const year = work.year || '';
      const role = work.role || '';
      const description = work.description || '';
      const youtubeId = work.youtube || '';

      // Derive thumbnail
      let thumbUrl = work.thumbnail && work.thumbnail.trim() ? work.thumbnail : '';
      if (!thumbUrl && youtubeId) {
        thumbUrl = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
      }

      const article = document.createElement('article');
      article.className = 'work-item';
      article.id = workId;

      article.innerHTML = `
        <div class="work-media-container" id="media-${workId}">
          ${
            youtubeId
              ? `<button class="work-media-btn" data-youtube="${escapeAttr(youtubeId)}" data-title="${escapeAttr(title)}" aria-label="Play video: ${escapeAttr(title)}">
                  <img src="${escapeAttr(thumbUrl)}" alt="Thumbnail for ${escapeAttr(title)}" loading="lazy" width="640" height="360" onerror="this.onerror=null; this.src='https://i.ytimg.com/vi/${escapeAttr(youtubeId)}/hqdefault.jpg';">
                  <span class="play-indicator" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><polygon points="6,4 18,12 6,20"></polygon></svg>
                  </span>
                </button>`
              : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--fg-muted);">No video source</div>`
          }
        </div>
        <div class="work-meta">
          <h2 class="work-title">${escapeHTML(title)}</h2>
          <p class="work-details">${escapeHTML(year)}${year && role ? ' — ' : ''}${escapeHTML(role)}</p>
          ${description ? `<p class="work-description">${escapeHTML(description)}</p>` : ''}
        </div>
      `;

      fragment.appendChild(article);
    });

    worksGrid.appendChild(fragment);

    // Attach Video Play Event Listeners
    worksGrid.querySelectorAll('.work-media-btn').forEach(btn => {
      btn.addEventListener('click', handleVideoPlay);
    });
  }

  // Handle Video Cover Click -> Replace with YouTube iframe
  function handleVideoPlay(e) {
    const btn = e.currentTarget;
    const youtubeId = btn.dataset.youtube;
    const title = btn.dataset.title || 'Video player';
    const container = btn.parentElement;

    if (!youtubeId || !container) return;

    const iframe = document.createElement('iframe');
    iframe.className = 'work-iframe';
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&playsinline=1&rel=0`;
    iframe.title = title;
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('frameborder', '0');

    container.innerHTML = '';
    container.appendChild(iframe);
    iframe.focus();
  }

  // Render Information View (Bio & CV)
  function renderInfoView(bio, links, site) {
    infoContainer.innerHTML = '';

    const shortBio = bio.short || '';
    const longBio = bio.long || '';
    const sections = bio.sections || [];
    const email = site.email || '';
    const location = site.location || '';

    let sidebarHTML = `
      <div class="info-sidebar">
        <div>
          <h2 class="info-section-title">About</h2>
          ${shortBio ? `<p class="info-short-bio">${escapeHTML(shortBio)}</p>` : ''}
          ${longBio ? `<p class="info-long-bio">${escapeHTML(longBio)}</p>` : ''}
        </div>

        <div>
          <h2 class="info-section-title">Contact & Location</h2>
          ${email ? `<p style="margin:0 0 0.25rem 0;"><a href="mailto:${escapeAttr(email)}" class="editorial-link">${escapeHTML(email)}</a></p>` : ''}
          ${location ? `<p style="margin:0; font-size:0.85rem; color:var(--fg-muted);">${escapeHTML(location)}</p>` : ''}
        </div>

        ${
          Array.isArray(links) && links.length > 0
            ? `<div>
                <h2 class="info-section-title">External Links</h2>
                <div class="links-list">
                  ${links
                    .map(
                      link =>
                        `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer" class="editorial-link">
                          ${escapeHTML(link.label)} ↗
                        </a>`
                    )
                    .join('')}
                </div>
              </div>`
            : ''
        }
      </div>
    `;

    let mainHTML = `<div class="info-main">`;

    if (Array.isArray(sections) && sections.length > 0) {
      sections.forEach(sec => {
        const secTitle = sec.title || 'Section';
        const items = sec.items || [];
        mainHTML += `
          <div>
            <h2 class="info-section-title">${escapeHTML(secTitle)}</h2>
            <ul class="info-list">
              ${items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
            </ul>
          </div>
        `;
      });
    }

    mainHTML += `
      <div class="demo-notice">
        <strong>ARCHIVE NOTE:</strong> All copy and video works contained in this preview catalog represent structured demonstration placeholders for Onur Temel's videography portfolio.
      </div>
    </div>`;

    infoContainer.innerHTML = sidebarHTML + mainHTML;
  }

  // --- 5. NAVIGATION & VIEW SWITCHING ---
  function setupEventListeners() {
    // Theme toggle button
    themeToggleBtn.addEventListener('click', toggleTheme);

    // View switch button
    viewSwitchBtn.addEventListener('click', () => {
      const targetView = currentView === 'work' ? 'info' : 'work';
      switchView(targetView, true);
    });

    // Brand link (ONUR TEMEL) -> returns to #work
    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('work', true);
      });
    }

    // Hash change listener (browser back/forward support)
    window.addEventListener('hashchange', handleHashNavigation);

    // Retry loading button
    if (retryBtn) {
      retryBtn.addEventListener('click', loadContent);
    }
  }

  function handleHashNavigation() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#info' || hash === '#/info') {
      switchView('info', false);
    } else {
      switchView('work', false);
    }
  }

  function switchView(viewName, updateHash = true) {
    if (viewName !== 'work' && viewName !== 'info') viewName = 'work';
    currentView = viewName;

    if (updateHash) {
      const targetHash = `#${viewName}`;
      if (window.location.hash !== targetHash) {
        history.pushState(null, '', targetHash);
      }
    }

    // View Transitions API Progressive Enhancement
    if (document.startViewTransition) {
      document.startViewTransition(() => updateDOMView(viewName));
    } else {
      updateDOMView(viewName);
    }
  }

  function updateDOMView(viewName) {
    if (viewName === 'info') {
      workView.hidden = true;
      infoView.hidden = false;
      viewSwitchBtn.setAttribute('aria-expanded', 'true');
      viewSwitchBtn.setAttribute('aria-label', 'Return to Work Grid view');
      viewSwitchBtn.setAttribute('title', 'Show Work View');

      const infoHeading = document.getElementById('info-heading');
      if (infoHeading) infoHeading.focus();
    } else {
      infoView.hidden = true;
      workView.hidden = false;
      viewSwitchBtn.setAttribute('aria-expanded', 'false');
      viewSwitchBtn.setAttribute('aria-label', 'Show Information / Bio view');
      viewSwitchBtn.setAttribute('title', 'Show Information View');

      const workHeading = document.getElementById('work-heading');
      if (workHeading) workHeading.focus();
    }
  }

  // Helper Escapes
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHTML(str);
  }

  // Run App
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
