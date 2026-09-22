/**
 * ONUR TEMEL — VIDEOGRAPHER PORTFOLIO
 * Vanilla JS Application Controller (Bilingual & CMS Controlled)
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
  const langToggleBtn = document.getElementById('lang-toggle');
  const brandLink = document.getElementById('brand-link');

  // Application State
  let siteData = null;
  let currentView = 'work';
  let currentLang = 'TR';
  let enabledLangs = ['TR', 'EN'];
  let cmsThemeMode = 'otomatik';

  // --- 1. INITIALIZATION ---
  function init() {
    setupEventListeners();
    loadContent();
  }

  // --- 2. TRANSLATION RESOLVER (DEFENSIVE FALLBACK CHAIN) ---
  function t(fieldObj, targetLang) {
    if (fieldObj === null || fieldObj === undefined) return '';
    if (typeof fieldObj !== 'object') return String(fieldObj);

    const lang = targetLang || currentLang;

    // 1. Requested language
    if (fieldObj[lang] !== undefined && fieldObj[lang] !== null) {
      return String(fieldObj[lang]);
    }

    // 2. Other enabled language fallback
    const fallbackLang = lang === 'TR' ? 'EN' : 'TR';
    if (fieldObj[fallbackLang] !== undefined && fieldObj[fallbackLang] !== null) {
      return String(fieldObj[fallbackLang]);
    }

    // 3. Any available localized property in object
    const keys = Object.keys(fieldObj);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!k.startsWith('_') && fieldObj[k] !== undefined && fieldObj[k] !== null) {
        return String(fieldObj[k]);
      }
    }

    // 4. Empty string fallback
    return '';
  }

  // --- 3. LANGUAGE DETERMINATION & PRECEDENCE ---
  function determineLanguage(settings) {
    let rawLangs = (settings && Array.isArray(settings.gosterilecekDiller))
      ? settings.gosterilecekDiller
      : ['TR', 'EN'];

    // Normalize enabled languages
    enabledLangs = rawLangs.map(l => String(l).toUpperCase().trim()).filter(l => l === 'TR' || l === 'EN');
    if (enabledLangs.length === 0) {
      enabledLangs = ['TR', 'EN'];
    }

    // Rule: Single language enabled -> Source of truth
    if (enabledLangs.length === 1) {
      currentLang = enabledLangs[0];
      return;
    }

    // Check visitor's previously stored preference
    const storedLang = localStorage.getItem('onurtemel_lang');
    if (storedLang && enabledLangs.includes(storedLang.toUpperCase())) {
      currentLang = storedLang.toUpperCase();
      return;
    }

    // Check CMS forced default
    const forcedDefault = settings && settings.varsayilanDil ? String(settings.varsayilanDil).toUpperCase().trim() : '';
    if (forcedDefault && enabledLangs.includes(forcedDefault)) {
      currentLang = forcedDefault;
      return;
    }

    // Browser language auto detection
    const browserLangs = navigator.languages || [navigator.language || ''];
    let detectedTR = false;
    for (let i = 0; i < browserLangs.length; i++) {
      if (String(browserLangs[i]).toLowerCase().startsWith('tr')) {
        detectedTR = true;
        break;
      }
    }

    if (detectedTR && enabledLangs.includes('TR')) {
      currentLang = 'TR';
    } else if (enabledLangs.includes('EN')) {
      currentLang = 'EN';
    } else {
      currentLang = enabledLangs[0];
    }
  }

  function setLanguage(newLang) {
    if (!enabledLangs.includes(newLang)) return;
    currentLang = newLang;
    localStorage.setItem('onurtemel_lang', currentLang);
    renderAll();
  }

  // --- 4. THEME CONTROL & PRECEDENCE ---
  function initTheme(settings) {
    cmsThemeMode = settings && settings.varsayilanTema ? String(settings.varsayilanTema).toLowerCase().trim() : 'otomatik';

    if (cmsThemeMode === 'karanlik') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeToggleBtn) themeToggleBtn.hidden = true;
      return;
    }

    if (cmsThemeMode === 'aydinlik') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeToggleBtn) themeToggleBtn.hidden = true;
      return;
    }

    // "otomatik" mode: Show visual icon, check visitor stored choice or OS default
    if (themeToggleBtn) themeToggleBtn.hidden = false;
    const savedTheme = localStorage.getItem('onurtemel_theme');

    if (savedTheme === 'dark' || savedTheme === 'light') {
      applyTheme(savedTheme);
    } else {
      applyTheme('system');
    }
  }

  function applyTheme(theme) {
    if (cmsThemeMode === 'karanlik' || cmsThemeMode === 'aydinlik') return;

    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      updateThemeButtonLabel('dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      updateThemeButtonLabel('light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      updateThemeButtonLabel(systemIsDark ? 'dark' : 'light');
    }
  }

  function updateThemeButtonLabel(currentActiveTheme) {
    if (!themeToggleBtn) return;
    if (currentActiveTheme === 'dark') {
      themeToggleBtn.setAttribute('aria-label', currentLang === 'TR' ? 'Açık temaya geç' : 'Switch to light theme');
    } else {
      themeToggleBtn.setAttribute('aria-label', currentLang === 'TR' ? 'Koyu temaya geç' : 'Switch to dark theme');
    }
  }

  function toggleTheme() {
    if (cmsThemeMode === 'karanlik' || cmsThemeMode === 'aydinlik') return;

    const currentAttr = document.documentElement.getAttribute('data-theme');
    let nextTheme = 'dark';

    if (currentAttr === 'dark') {
      nextTheme = 'light';
    } else if (currentAttr === 'light') {
      nextTheme = 'dark';
    } else {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      nextTheme = systemIsDark ? 'light' : 'dark';
    }

    localStorage.setItem('onurtemel_theme', nextTheme);
    applyTheme(nextTheme);
  }

  // --- 5. CONTENT LOADING & FETCHING ---
  async function loadContent() {
    hideError();
    try {
      const response = await fetch('content.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      siteData = await response.json();
      
      const settings = siteData.siteAyarlari || {};
      determineLanguage(settings);
      initTheme(settings);
      
      renderAll();
      handleHashNavigation();
    } catch (err) {
      console.error('Failed to load portfolio content:', err);
      showError(currentLang === 'TR'
        ? 'İçerik kataloğu yüklenemedi. Lütfen bağlantınızı kontrol edin.'
        : 'Unable to load content catalog. Please verify your connection.');
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

  // --- 6. RENDERING ALL COMPONENTS ---
  function renderAll() {
    if (!siteData) return;

    // 1. Update HTML tag lang attribute
    document.documentElement.lang = currentLang.toLowerCase();

    // 2. Site Metadata
    if (siteData.site) {
      const title = t(siteData.site.pageTitle, currentLang);
      if (title) document.title = title;

      const desc = t(siteData.site.description, currentLang);
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && desc) metaDesc.setAttribute('content', desc);
    }

    // 3. Language Switch Button State
    if (langToggleBtn) {
      if (enabledLangs.length <= 1) {
        langToggleBtn.hidden = true;
      } else {
        langToggleBtn.hidden = false;
        // Button displays the target language visitor can switch to
        const targetLang = currentLang === 'TR' ? 'EN' : 'TR';
        langToggleBtn.textContent = targetLang;
        langToggleBtn.setAttribute(
          'aria-label',
          currentLang === 'TR' ? 'Switch language to English' : 'Türkçe diline geç'
        );
        langToggleBtn.setAttribute(
          'title',
          currentLang === 'TR' ? 'Switch to English' : 'Türkçe Diline Geç'
        );
      }
    }

    // 4. Render Views
    renderWorksGrid(siteData.works || []);
    renderInfoView(siteData.bio || {}, siteData.links || [], siteData.site || {});
    updateViewSwitchBtnState();
  }

  // Render Works (Primary View)
  function renderWorksGrid(works) {
    worksGrid.innerHTML = '';

    const workHeading = document.getElementById('work-heading');
    if (workHeading) {
      workHeading.textContent = currentLang === 'TR' ? 'Seçilmiş Çalışmalar' : 'Selected Works';
    }

    if (!Array.isArray(works) || works.length === 0) {
      worksGrid.innerHTML = `<p class="work-description">${currentLang === 'TR' ? 'Çalışma bulunamadı.' : 'No works available.'}</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    works.forEach(work => {
      const workId = work.id || `work-${Math.random().toString(36).substr(2, 9)}`;
      const title = t(work.title, currentLang) || (currentLang === 'TR' ? 'İsimsiz Çalışma' : 'Untitled Work');
      const year = work.year || '';
      const role = t(work.role, currentLang) || '';
      const description = t(work.description, currentLang) || '';
      const youtubeId = work.youtube || '';

      // Derive thumbnail
      let thumbUrl = work.thumbnail && String(work.thumbnail).trim() ? work.thumbnail : '';
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
              ? `<button class="work-media-btn" data-youtube="${escapeAttr(youtubeId)}" data-title="${escapeAttr(title)}" aria-label="${currentLang === 'TR' ? 'Videoyu oynat' : 'Play video'}: ${escapeAttr(title)}">
                  <img src="${escapeAttr(thumbUrl)}" alt="${currentLang === 'TR' ? 'Kapak görseli' : 'Thumbnail'}: ${escapeAttr(title)}" loading="lazy" width="640" height="360" onerror="this.onerror=null; this.src='https://i.ytimg.com/vi/${escapeAttr(youtubeId)}/hqdefault.jpg';">
                  <span class="play-indicator" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><polygon points="6,4 18,12 6,20"></polygon></svg>
                  </span>
                </button>`
              : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--fg-muted);">${currentLang === 'TR' ? 'Video bulunamadı' : 'No video source'}</div>`
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

    const infoHeading = document.getElementById('info-heading');
    if (infoHeading) {
      infoHeading.textContent = currentLang === 'TR' ? 'Bilgi & Arşiv' : 'Information & Archive';
    }

    const shortBio = t(bio.short, currentLang);
    const longBio = t(bio.long, currentLang);
    const sections = bio.sections || [];
    const email = site.email || '';
    const location = site.location || '';

    let sidebarHTML = `
      <div class="info-sidebar">
        <div>
          <h2 class="info-section-title">${currentLang === 'TR' ? 'Hakkında' : 'About'}</h2>
          ${shortBio ? `<p class="info-short-bio">${escapeHTML(shortBio)}</p>` : ''}
          ${longBio ? `<p class="info-long-bio">${escapeHTML(longBio)}</p>` : ''}
        </div>

        <div>
          <h2 class="info-section-title">${currentLang === 'TR' ? 'İletişim & Konum' : 'Contact & Location'}</h2>
          ${email ? `<p style="margin:0 0 0.25rem 0;"><a href="mailto:${escapeAttr(email)}" class="editorial-link">${escapeHTML(email)}</a></p>` : ''}
          ${location ? `<p style="margin:0; font-size:0.85rem; color:var(--fg-muted);">${escapeHTML(location)}</p>` : ''}
        </div>

        ${
          Array.isArray(links) && links.length > 0
            ? `<div>
                <h2 class="info-section-title">${currentLang === 'TR' ? 'Dış Bağlantılar' : 'External Links'}</h2>
                <div class="links-list">
                  ${links
                    .map(
                      link =>
                        `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer" class="editorial-link">
                          ${escapeHTML(t(link.label, currentLang) || link.label || '')} ↗
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
        const secTitle = t(sec.title, currentLang) || '';
        const items = sec.items || [];
        mainHTML += `
          <div>
            <h2 class="info-section-title">${escapeHTML(secTitle)}</h2>
            <ul class="info-list">
              ${items.map(item => `<li>${escapeHTML(t(item, currentLang))}</li>`).join('')}
            </ul>
          </div>
        `;
      });
    }

    mainHTML += `
      <div class="demo-notice">
        <strong>${currentLang === 'TR' ? 'ARŞİV NOTU:' : 'ARCHIVE NOTE:'}</strong> ${
          currentLang === 'TR'
            ? "Bu önizleme kataloğunda yer alan tüm metinler ve video çalışmaları, Onur Temel'in videografi portfolyosu için yapılandırılmış gösterim örnekleridir."
            : "All copy and video works contained in this preview catalog represent structured demonstration placeholders for Onur Temel's videography portfolio."
        }
      </div>
    </div>`;

    infoContainer.innerHTML = sidebarHTML + mainHTML;
  }

  // --- 7. NAVIGATION & VIEW SWITCHING ---
  function setupEventListeners() {
    // Theme toggle button
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Language toggle button
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', () => {
        const nextLang = currentLang === 'TR' ? 'EN' : 'TR';
        setLanguage(nextLang);
      });
    }

    // View switch button
    if (viewSwitchBtn) {
      viewSwitchBtn.addEventListener('click', () => {
        const targetView = currentView === 'work' ? 'info' : 'work';
        switchView(targetView, true);
      });
    }

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
      updateViewSwitchBtnState();

      const infoHeading = document.getElementById('info-heading');
      if (infoHeading) infoHeading.focus();
    } else {
      infoView.hidden = true;
      workView.hidden = false;
      updateViewSwitchBtnState();

      const workHeading = document.getElementById('work-heading');
      if (workHeading) workHeading.focus();
    }
  }

  function updateViewSwitchBtnState() {
    if (!viewSwitchBtn) return;
    if (currentView === 'info') {
      viewSwitchBtn.setAttribute('aria-expanded', 'true');
      viewSwitchBtn.setAttribute(
        'aria-label',
        currentLang === 'TR' ? 'Çalışmalar görünümüne dön' : 'Return to Work Grid view'
      );
      viewSwitchBtn.setAttribute(
        'title',
        currentLang === 'TR' ? 'Çalışmalar Görünümü' : 'Show Work View'
      );
    } else {
      viewSwitchBtn.setAttribute('aria-expanded', 'false');
      viewSwitchBtn.setAttribute(
        'aria-label',
        currentLang === 'TR' ? 'Metin / Bilgi görünümünü göster' : 'Show Information / Bio view'
      );
      viewSwitchBtn.setAttribute(
        'title',
        currentLang === 'TR' ? 'Metin Görünümü' : 'Show Information View'
      );
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
