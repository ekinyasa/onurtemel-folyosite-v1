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
  const portfolioTabsNav = document.getElementById('portfolio-tabs-nav');

  // Application State
  let siteData = null;
  let currentView = 'work';
  let activeTab = 'video';
  let currentLang = 'TR';
  let enabledLangs = ['TR', 'EN'];
  let cmsThemeMode = 'otomatik';

  let activeOverlay = null;
  let originatingButton = null;

  // --- 1. INITIALIZATION ---
  function init() {
    setupEventListeners();
    initSmartHeader();
    loadContent();
  }

  // --- SMART HEADER SCROLL CONTROLLER ---
  let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

  function initSmartHeader() {
    const siteHeader = document.querySelector('.site-header');
    if (!siteHeader) return;

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollY;

      // Keep header visible if keyboard focus is inside header controls
      if (siteHeader.contains(document.activeElement)) {
        siteHeader.classList.remove('header-hidden');
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY <= 20) {
        // At or near page top -> always show header
        siteHeader.classList.remove('header-hidden');
      } else if (deltaY > 5) {
        // Meaningful downward scroll -> hide header
        siteHeader.classList.add('header-hidden');
      } else if (deltaY < -4) {
        // Immediate upward scroll -> reveal header
        siteHeader.classList.remove('header-hidden');
      }

      lastScrollY = currentScrollY;
    }, { passive: true });
  }

  // --- YOUTUBE URL & START TIME PARSER ---
  function parseYouTubeUrl(input) {
    if (!input) return { id: '', start: 0 };

    const str = String(input).trim();
    let id = str;
    let start = 0;

    // Extract start time parameter (e.g. &t=21s, ?t=320s, &start=21)
    const tMatch = str.match(/[?&](?:t|start)=(\d+)s?/);
    if (tMatch) {
      start = parseInt(tMatch[1], 10);
    }

    // Extract video ID from YouTube URL formats
    if (str.includes('youtube.com/') || str.includes('youtu.be/')) {
      const idMatch = str.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (idMatch) {
        id = idMatch[1];
      }
    }

    return { id, start };
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
    renderPortfolioTabs();
    renderActiveTabContent();
    renderInfoView(siteData.bio || {}, siteData.links || [], siteData.site || {});
    renderFooter(siteData);
    updateViewSwitchBtnState();
  }

  // --- CMS-DRIVEN PORTFOLIO TABS ENGINE ---
  function getEnabledPortfolioTabs() {
    if (!siteData) return [];
    const settings = siteData.siteAyarlari || {};
    const tabs = settings.portfolioTabs || siteData.portfolioTabs || [
      { id: 'video', label: { TR: 'Video', EN: 'Video' }, enabled: true },
      { id: 'photo', label: { TR: 'Fotoğraf', EN: 'Photograph' }, enabled: true },
      { id: 'podcast', label: { TR: 'Podcast', EN: 'Podcast' }, enabled: true }
    ];
    return tabs.filter(t => t.enabled !== false);
  }

  function renderPortfolioTabs() {
    if (!portfolioTabsNav) return;
    portfolioTabsNav.innerHTML = '';

    // Do not render portfolio tabs if Info view is currently active
    if (currentView === 'info') {
      portfolioTabsNav.style.display = 'none';
      return;
    }

    const enabledTabs = getEnabledPortfolioTabs();
    if (enabledTabs.length === 0) {
      portfolioTabsNav.style.display = 'none';
      return;
    }

    portfolioTabsNav.style.display = 'flex';
    const fragment = document.createDocumentFragment();

    enabledTabs.forEach((tab, index) => {
      const btn = document.createElement('button');
      btn.className = `portfolio-tab-btn ${tab.id === activeTab ? 'active' : ''}`;
      btn.dataset.tab = tab.id;
      btn.textContent = t(tab.label, currentLang) || tab.id;
      btn.setAttribute('aria-selected', tab.id === activeTab ? 'true' : 'false');
      btn.setAttribute('role', 'tab');

      btn.addEventListener('click', () => {
        setActiveTab(tab.id, true);
      });

      fragment.appendChild(btn);
    });

    // Render separator '|' after the LAST enabled tab (spacing after matches utility controls)
    const sep = document.createElement('span');
    sep.className = 'header-nav-sep';
    sep.setAttribute('aria-hidden', 'true');
    sep.textContent = '|';
    fragment.appendChild(sep);

    portfolioTabsNav.appendChild(fragment);
  }

  function setActiveTab(tabId, updateHash = true) {
    const enabledTabs = getEnabledPortfolioTabs();
    if (!enabledTabs.some(t => t.id === tabId)) {
      if (enabledTabs.length > 0) {
        tabId = enabledTabs[0].id;
      } else {
        tabId = 'video';
      }
    }

    activeTab = tabId;

    if (currentView === 'work' && updateHash) {
      const targetHash = `#${tabId}`;
      if (window.location.hash !== targetHash) {
        history.pushState(null, '', targetHash);
      }
    }

    renderPortfolioTabs();
    renderActiveTabContent();
  }

  function getItemsForTab(tabId) {
    if (!siteData) return [];
    const allItems = [];
    if (Array.isArray(siteData.works)) allItems.push(...siteData.works);
    if (Array.isArray(siteData.photos)) allItems.push(...siteData.photos);
    if (Array.isArray(siteData.podcasts)) allItems.push(...siteData.podcasts);

    return allItems.filter(item => {
      const itemTab = item.tab || (item.mediaType === 'photo' ? 'photo' : (item.mediaType && item.mediaType.startsWith('spotify') ? 'podcast' : 'video'));
      return itemTab === tabId;
    });
  }

  function renderActiveTabContent() {
    if (!worksGrid || !siteData) return;

    if (activeTab === 'photo') {
      renderPhotoGrid();
    } else if (activeTab === 'podcast') {
      renderPodcastGrid();
    } else if (activeTab === 'video') {
      renderVideoGrid(siteData.works || []);
    } else {
      renderGenericTabGrid(activeTab);
    }
  }

  // --- PHOTO GRID & NATIVE ASPECT RATIO RENDERER ---
  function renderPhotoGrid() {
    worksGrid.className = 'photos-grid';
    worksGrid.innerHTML = '';

    const photoHeading = document.getElementById('work-heading');
    if (photoHeading) {
      photoHeading.textContent = currentLang === 'TR' ? 'Fotoğraf Portfolyosu' : 'Photograph Portfolio';
    }

    const photos = getItemsForTab('photo');
    if (photos.length === 0) {
      worksGrid.innerHTML = `<p class="work-description">${currentLang === 'TR' ? 'Fotoğraf bulunamadı.' : 'No photographs available.'}</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    photos.forEach(photo => {
      const photoId = photo.id || `photo-${Math.random().toString(36).substr(2, 9)}`;
      const imgSrc = photo.image || '';
      const altText = t(photo.alt, currentLang) || t(photo.title, currentLang) || (currentLang === 'TR' ? 'Fotoğraf' : 'Photograph');

      const article = document.createElement('article');
      article.className = 'photo-item';
      article.id = photoId;

      article.innerHTML = `
        <button class="photo-btn" data-img="${escapeAttr(imgSrc)}" data-title="${escapeAttr(altText)}" aria-label="${currentLang === 'TR' ? 'Fotoğrafı büyüt' : 'Enlarge photo'}: ${escapeAttr(altText)}">
          <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(altText)}" loading="lazy" decoding="async" class="photo-img">
        </button>
      `;

      fragment.appendChild(article);
    });

    worksGrid.appendChild(fragment);

    // Attach Photo Click Listener -> Fullscreen Photo Overlay
    worksGrid.querySelectorAll('.photo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.currentTarget;
        const imgUrl = btnEl.dataset.img;
        const titleText = btnEl.dataset.title;
        openPhotoOverlay(imgUrl, titleText, btnEl);
      });
    });
  }

  function openPhotoOverlay(imgSrc, altText, btnEl) {
    if (!imgSrc) return;
    originatingButton = btnEl;

    const overlay = document.createElement('div');
    overlay.className = 'photo-overlay';
    overlay.id = 'photo-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', altText || 'Photograph view');

    overlay.innerHTML = `
      <button class="photo-overlay-close" id="photo-overlay-close" aria-label="${currentLang === 'TR' ? 'Görseli kapat (Esc)' : 'Close photo (Esc)'}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="photo-overlay-content">
        <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(altText)}" class="photo-overlay-img">
      </div>
    `;

    document.body.appendChild(overlay);
    activeOverlay = overlay;
    document.body.style.overflow = 'hidden';

    function closePhoto() {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      activeOverlay = null;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      if (originatingButton) {
        originatingButton.focus();
        originatingButton = null;
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closePhoto();
      }
    }

    const closeBtn = overlay.querySelector('#photo-overlay-close');
    if (closeBtn) closeBtn.addEventListener('click', closePhoto);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('photo-overlay-content')) {
        closePhoto();
      }
    });

    document.addEventListener('keydown', handleKeyDown);
    if (closeBtn) closeBtn.focus();
  }

  // --- PODCAST TAB & SPOTIFY EMBED RENDERER ---
  function renderPodcastGrid() {
    worksGrid.className = 'podcasts-grid';
    worksGrid.innerHTML = '';

    const podcastHeading = document.getElementById('work-heading');
    if (podcastHeading) {
      podcastHeading.textContent = currentLang === 'TR' ? 'Podcast Seri & Bölümleri' : 'Podcast Series & Episodes';
    }

    const podcasts = getItemsForTab('podcast');
    if (podcasts.length === 0) {
      worksGrid.innerHTML = `<p class="work-description">${currentLang === 'TR' ? 'Podcast bulunamadı.' : 'No podcasts available.'}</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    podcasts.forEach(podcast => {
      const podcastId = podcast.id || `podcast-${Math.random().toString(36).substr(2, 9)}`;
      const title = t(podcast.title, currentLang) || 'Podcast';
      const embedUrl = parseSpotifyUrl(podcast.url);

      const article = document.createElement('article');
      article.className = 'podcast-item';
      article.id = podcastId;

      article.innerHTML = `
        <h3 class="podcast-title">${escapeHTML(title)}</h3>
        ${embedUrl ? `
          <iframe class="spotify-iframe" src="${escapeAttr(embedUrl)}" title="${escapeAttr(title)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" frameborder="0"></iframe>
        ` : `<div class="work-description">${currentLang === 'TR' ? 'Çalma kaynağı bulunamadı.' : 'No stream source.'}</div>`}
      `;

      fragment.appendChild(article);
    });

    worksGrid.appendChild(fragment);
  }

  function parseSpotifyUrl(url) {
    if (!url) return '';
    try {
      const str = String(url).trim();
      const parsed = new URL(str);
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const type = parts[0]; // 'show' or 'episode'
        const id = parts[1];
        return `https://open.spotify.com/embed/${type}/${id}`;
      }
    } catch (e) {}
    return '';
  }

  function renderGenericTabGrid(tabId) {
    worksGrid.className = 'works-grid';
    worksGrid.innerHTML = '';

    const items = getItemsForTab(tabId);
    if (items.length === 0) {
      worksGrid.innerHTML = `<p class="work-description">${currentLang === 'TR' ? 'İçerik bulunamadı.' : 'No items available.'}</p>`;
      return;
    }

    renderVideoGrid(items);
  }

  // --- CMS-DRIVEN MINIMAL FOOTER ---
  function renderFooter(data) {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl || !data) return;

    const footerData = data.footer || {};
    const owner = footerData.owner || 'Onur Temel';
    const copyrightText = t(footerData.copyright, currentLang) || (currentLang === 'TR' ? 'Tüm hakları saklıdır.' : 'All rights reserved.');
    const email = footerData.email || (data.site && data.site.email) || '';
    const currentYear = new Date().getFullYear();

    let emailHTML = '';
    if (email) {
      emailHTML = `<a href="mailto:${escapeAttr(email)}" class="footer-email-link">${escapeHTML(email)}</a>`;
    }

    footerEl.innerHTML = `
      <div class="footer-content">
        <span>© ${currentYear} ${escapeHTML(owner)}. ${escapeHTML(copyrightText)}</span>
        ${emailHTML}
      </div>
    `;
  }

  // Render Video Grid (Primary View Grid)
  function renderVideoGrid(works) {
    worksGrid.className = 'works-grid';
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
      const youtubeRaw = work.youtube || '';

      const { id: parsedId } = parseYouTubeUrl(youtubeRaw);
      const thumbUrl = work.thumbnail && String(work.thumbnail).trim() ? String(work.thumbnail).trim() : '';
      const isBlackCover = (thumbUrl === 'none' || thumbUrl === 'black' || work.noCover === true);

      const article = document.createElement('article');
      article.className = 'work-item';
      article.id = workId;

      let mediaHTML = '';

      // Centered Circular Translucent Glass Play Button
      const playGlyphHTML1 = `
        <span class="glass-play-btn" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <polygon points="9,6 19,12 9,18"></polygon>
          </svg>
        </span>
      `;
      // Centered Circular Translucent Glass Play Button
      const playGlyphHTML = `
        <div class="liquidGlass-wrapper button glass-play-btn">
            <div class="liquidGlass-effect2"></div>
            <div class="liquidGlass-tint"></div>
            <div class="liquidGlass-shine"></div>
            <div class="liquidGlass-text">
              <span> 
              <svg viewBox="0 0 24 24" width="24" height="24">
                <polygon points="9,6 19,12 9,18"></polygon>
              </svg>
              </span>
            </div>
          </div>
      `;

      if (isBlackCover) {
        // 100% Black cover state (Work 14 - SLAPP #3) - Zero YouTube requests!
        mediaHTML = `
          <div class="work-media-container black-cover-container" id="media-${workId}">
            <button class="work-media-btn black-cover-btn" data-youtube="${escapeAttr(youtubeRaw)}" data-title="${escapeAttr(title)}" aria-label="${currentLang === 'TR' ? 'Videoyu oynat' : 'Play video'}: ${escapeAttr(title)}">
              ${playGlyphHTML}
            </button>
          </div>
        `;
      } else if (thumbUrl) {
        // Local cover image - Zero YouTube requests!
        mediaHTML = `
          <div class="work-media-container" id="media-${workId}">
            <button class="work-media-btn" data-youtube="${escapeAttr(youtubeRaw)}" data-title="${escapeAttr(title)}" aria-label="${currentLang === 'TR' ? 'Videoyu oynat' : 'Play video'}: ${escapeAttr(title)}">
              <img src="${escapeAttr(thumbUrl)}" alt="${currentLang === 'TR' ? 'Kapak görseli' : 'Thumbnail'}: ${escapeAttr(title)}" loading="lazy" decoding="async" width="640" height="360">
              ${playGlyphHTML}
            </button>
          </div>
        `;
      } else if (parsedId) {
        // Fallback YouTube thumbnail (only for future works without cover decision)
        const fallbackThumb = `https://i.ytimg.com/vi/${parsedId}/hqdefault.jpg`;
        mediaHTML = `
          <div class="work-media-container" id="media-${workId}">
            <button class="work-media-btn" data-youtube="${escapeAttr(youtubeRaw)}" data-title="${escapeAttr(title)}" aria-label="${currentLang === 'TR' ? 'Videoyu oynat' : 'Play video'}: ${escapeAttr(title)}">
              <img src="${escapeAttr(fallbackThumb)}" alt="${currentLang === 'TR' ? 'Kapak görseli' : 'Thumbnail'}: ${escapeAttr(title)}" loading="lazy" decoding="async" width="640" height="360">
              ${playGlyphHTML}
            </button>
          </div>
        `;
      } else {
        mediaHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--fg-muted);">${currentLang === 'TR' ? 'Video bulunamadı' : 'No video source'}</div>`;
      }

      const detailsText = [year, role].filter(Boolean).join(' — ');

      article.innerHTML = `
        ${mediaHTML}
        <div class="work-meta">
          <h2 class="work-title">${escapeHTML(title)}</h2>
          ${detailsText ? `<p class="work-details">${escapeHTML(detailsText)}</p>` : ''}
          ${description ? `<p class="work-description">${escapeHTML(description)}</p>` : ''}
        </div>
      `;

      fragment.appendChild(article);
    });

    worksGrid.appendChild(fragment);

    // Attach Cover Click Listener -> Opens Fullscreen Video Overlay
    worksGrid.querySelectorAll('.work-media-btn').forEach(btn => {
      btn.addEventListener('click', handleVideoPlay);
    });
  }

  // --- FULLSCREEN VIDEO OVERLAY CONTROLLER ---
  function handleVideoPlay(e) {
    const btn = e.currentTarget;
    const rawYoutube = btn.dataset.youtube;
    const title = btn.dataset.title || 'Video player';

    if (!rawYoutube) return;

    const { id: youtubeId, start: startTime } = parseYouTubeUrl(rawYoutube);
    if (!youtubeId) return;

    // Record origin button for focus restoration
    originatingButton = btn;

    let embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&playsinline=1&rel=0`;
    if (startTime > 0) {
      embedSrc += `&start=${startTime}`;
    }

    // Create Fullscreen Modal Overlay
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    overlay.id = 'video-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    overlay.innerHTML = `
      <button class="video-overlay-close" id="video-overlay-close" aria-label="${currentLang === 'TR' ? 'Videoyu kapat (Esc)' : 'Close video (Esc)'}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="video-overlay-frame-wrapper">
        <iframe class="video-overlay-iframe" src="${escapeAttr(embedSrc)}" title="${escapeAttr(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen frameborder="0"></iframe>
      </div>
    `;

    document.body.appendChild(overlay);
    activeOverlay = overlay;

    // Prevent background scrolling while video overlay is active
    document.body.style.overflow = 'hidden';

    // Teardown & Exit Handler
    function closeOverlay() {
      if (!activeOverlay) return;

      // 1. Exit native browser fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }

      // 2. Remove listeners
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);

      // 3. Remove overlay from DOM (destroys iframe & stops audio/video immediately)
      activeOverlay.remove();
      activeOverlay = null;

      // 4. Restore body scrolling
      document.body.style.overflow = '';

      // 5. Restore focus to originating cover button in grid
      if (originatingButton) {
        originatingButton.focus();
        originatingButton = null;
      }
    }

    function handleKeyDown(evt) {
      if (evt.key === 'Escape' || evt.key === 'Esc') {
        closeOverlay();
      }
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        closeOverlay();
      }
    }

    // Attach Close Button Event Listener
    const closeBtn = overlay.querySelector('#video-overlay-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeOverlay);
      closeBtn.focus();
    }

    // Attach Esc & Fullscreen Change Listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Request native element fullscreen if supported
    if (overlay.requestFullscreen) {
      overlay.requestFullscreen().catch(() => {});
    } else if (overlay.webkitRequestFullscreen) {
      overlay.webkitRequestFullscreen();
    }
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
          <h2 class="info-section-title">${currentLang === 'TR' ? 'İletişim' : 'Contact'}</h2>
          ${email ? `<p style="margin:0 0 0.25rem 0;"><a href="mailto:${escapeAttr(email)}" class="editorial-link">${escapeHTML(email)}</a></p>` : ''}
         ${links
                    .map(
                      link =>
                        `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer" class="editorial-link">
                          ${escapeHTML(t(link.label, currentLang) || link.label || '')} ↗
                        </a>`
                    )
                    .join('')}
        </div>

        ${
          Array.isArray(links) && links.length > 0
            ? ``
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
    const rawHash = window.location.hash.toLowerCase().replace('#', '').replace('/', '').trim();
    if (rawHash === 'info') {
      switchView('info', false);
    } else {
      switchView('work', false);
      if (rawHash && rawHash !== 'work') {
        const enabledTabs = getEnabledPortfolioTabs();
        const matchingTab = enabledTabs.find(t => t.id === rawHash);
        if (matchingTab) {
          setActiveTab(matchingTab.id, false);
        }
      }
    }
  }

  function switchView(viewName, updateHash = true) {
    if (viewName !== 'work' && viewName !== 'info') viewName = 'work';
    currentView = viewName;

    if (updateHash) {
      const targetHash = viewName === 'info' ? '#info' : `#${activeTab}`;
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
      renderPortfolioTabs();
      updateViewSwitchBtnState();

      const infoHeading = document.getElementById('info-heading');
      if (infoHeading) infoHeading.focus();
    } else {
      infoView.hidden = true;
      workView.hidden = false;
      renderPortfolioTabs();
      renderActiveTabContent();
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
