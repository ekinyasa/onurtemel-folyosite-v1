/**
 * ONUR TEMEL — VIDEOGRAPHER PORTFOLIO
 * Test A: Coded Covers + Explicit Play Badge + Filter/Sort Engine + Multi-Media Renderer
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

  // Filter & Sort Elements
  const filterToggleBtn = document.getElementById('filter-toggle-btn');
  const filterBtnLabel = document.getElementById('filter-btn-label');
  const filterMenu = document.getElementById('filter-menu');
  const filterFormatsList = document.getElementById('filter-formats-list');
  const filterCategoriesList = document.getElementById('filter-categories-list');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  const sortToggleBtn = document.getElementById('sort-toggle-btn');
  const sortBtnLabel = document.getElementById('sort-btn-label');
  const sortMenu = document.getElementById('sort-menu');

  // Application State
  let siteData = null;
  let currentView = 'work';
  let currentLang = 'TR';
  let enabledLangs = ['TR', 'EN'];
  let cmsThemeMode = 'otomatik';

  let selectedFormats = new Set();
  let selectedCategories = new Set();
  let currentSort = 'newest';

  let activeOverlay = null;
  let originatingButton = null;

  function init() {
    setupEventListeners();
    loadContent();
  }

  function parseYouTubeUrl(input) {
    if (!input) return { id: '', start: 0 };

    const str = String(input).trim();
    let id = str;
    let start = 0;

    const tMatch = str.match(/[?&](?:t|start)=(\d+)s?/);
    if (tMatch) {
      start = parseInt(tMatch[1], 10);
    }

    if (str.includes('youtube.com/') || str.includes('youtu.be/')) {
      const idMatch = str.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (idMatch) {
        id = idMatch[1];
      }
    }

    return { id, start };
  }

  function t(fieldObj, targetLang) {
    if (fieldObj === null || fieldObj === undefined) return '';
    if (typeof fieldObj !== 'object') return String(fieldObj);

    const lang = targetLang || currentLang;

    if (fieldObj[lang] !== undefined && fieldObj[lang] !== null) {
      return String(fieldObj[lang]);
    }

    const fallbackLang = lang === 'TR' ? 'EN' : 'TR';
    if (fieldObj[fallbackLang] !== undefined && fieldObj[fallbackLang] !== null) {
      return String(fieldObj[fallbackLang]);
    }

    const keys = Object.keys(fieldObj);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!k.startsWith('_') && fieldObj[k] !== undefined && fieldObj[k] !== null) {
        return String(fieldObj[k]);
      }
    }

    return '';
  }

  function determineLanguage(settings) {
    let rawLangs = (settings && Array.isArray(settings.gosterilecekDiller))
      ? settings.gosterilecekDiller
      : ['TR', 'EN'];

    enabledLangs = rawLangs.map(l => String(l).toUpperCase().trim()).filter(l => l === 'TR' || l === 'EN');
    if (enabledLangs.length === 0) enabledLangs = ['TR', 'EN'];

    if (enabledLangs.length === 1) {
      currentLang = enabledLangs[0];
      return;
    }

    const storedLang = localStorage.getItem('onurtemel_lang');
    if (storedLang && enabledLangs.includes(storedLang.toUpperCase())) {
      currentLang = storedLang.toUpperCase();
      return;
    }

    const forcedDefault = settings && settings.varsayilanDil ? String(settings.varsayilanDil).toUpperCase().trim() : '';
    if (forcedDefault && enabledLangs.includes(forcedDefault)) {
      currentLang = forcedDefault;
      return;
    }

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

  async function loadContent() {
    hideError();
    try {
      const response = await fetch('content.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      siteData = await response.json();

      const settings = siteData.siteAyarlari || {};
      determineLanguage(settings);
      initTheme(settings);

      renderFilterOptions();
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

  // --- FILTER & SORT CONTROL RENDERING ---
  function renderFilterOptions() {
    if (!siteData || !siteData.taksonomi) return;
    const tax = siteData.taksonomi;

    // Render Formats
    filterFormatsList.innerHTML = '';
    (tax.medyaTipleri || []).forEach(fmt => {
      const labelText = t(fmt.label, currentLang);
      const isChecked = selectedFormats.has(fmt.id);

      const label = document.createElement('label');
      label.className = 'filter-checkbox-label';
      label.innerHTML = `
        <input type="checkbox" value="${escapeAttr(fmt.id)}" ${isChecked ? 'checked' : ''} data-type="format">
        <span>${escapeHTML(labelText)}</span>
      `;
      filterFormatsList.appendChild(label);
    });

    // Render Categories
    filterCategoriesList.innerHTML = '';
    (tax.kategoriler || []).forEach(cat => {
      const labelText = t(cat.label, currentLang);
      const isChecked = selectedCategories.has(cat.id);

      const label = document.createElement('label');
      label.className = 'filter-checkbox-label';
      label.innerHTML = `
        <input type="checkbox" value="${escapeAttr(cat.id)}" ${isChecked ? 'checked' : ''} data-type="category">
        <span>${escapeHTML(labelText)}</span>
      `;
      filterCategoriesList.appendChild(label);
    });

    // Attach Checkbox Listeners
    filterMenu.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const val = e.target.value;
        const type = e.target.dataset.type;
        if (type === 'format') {
          if (e.target.checked) selectedFormats.add(val);
          else selectedFormats.delete(val);
        } else if (type === 'category') {
          if (e.target.checked) selectedCategories.add(val);
          else selectedCategories.delete(val);
        }
        updateFilterBtnLabel();
        renderWorksGrid(getProcessedWorks());
      });
    });
  }

  function updateFilterBtnLabel() {
    const totalCount = selectedFormats.size + selectedCategories.size;
    if (totalCount === 0) {
      filterBtnLabel.textContent = currentLang === 'TR' ? 'TÜMÜ' : 'SHOW ALL';
    } else {
      filterBtnLabel.textContent = `${currentLang === 'TR' ? 'FİLTRELER' : 'FILTERS'} (${totalCount})`;
    }
  }

  function updateSortBtnLabel() {
    let labelText = '';
    if (currentSort === 'newest') labelText = currentLang === 'TR' ? 'SIRALA: EN YENİ' : 'SORT BY: NEWEST';
    else if (currentSort === 'oldest') labelText = currentLang === 'TR' ? 'SIRALA: EN ESKİ' : 'SORT BY: OLDEST';
    else if (currentSort === 'title') labelText = currentLang === 'TR' ? 'SIRALA: UNVAN (A–Z)' : 'SORT BY: TITLE (A–Z)';

    sortBtnLabel.textContent = labelText;
  }

  // Get Processed (Filtered & Sorted) Works
  function getProcessedWorks() {
    if (!siteData || !Array.isArray(siteData.works)) return [];
    let list = siteData.works.slice();

    // 1. Filter Formats
    if (selectedFormats.size > 0) {
      list = list.filter(w => {
        let fmtId = '';
        if (w.mediaType === 'photo') fmtId = 'photo';
        else if (w.mediaType === 'video' && w.aspect === 'portrait') fmtId = 'video-portrait';
        else fmtId = 'video-landscape';

        return selectedFormats.has(fmtId);
      });
    }

    // 2. Filter Categories
    if (selectedCategories.size > 0) {
      list = list.filter(w => {
        const cats = Array.isArray(w.categories) ? w.categories : [];
        return cats.some(c => selectedCategories.has(c));
      });
    }

    // 3. Sort List
    list.sort((a, b) => {
      if (currentSort === 'newest') {
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        return dateB.localeCompare(dateA);
      } else if (currentSort === 'oldest') {
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        return dateA.localeCompare(dateB);
      } else if (currentSort === 'title') {
        const titleA = t(a.title, currentLang);
        const titleB = t(b.title, currentLang);
        return titleA.localeCompare(titleB);
      }
      return 0;
    });

    return list;
  }

  // --- RENDERING ALL COMPONENTS ---
  function renderAll() {
    if (!siteData) return;

    document.documentElement.lang = currentLang.toLowerCase();

    if (siteData.site) {
      const title = t(siteData.site.pageTitle, currentLang);
      if (title) document.title = title;

      const desc = t(siteData.site.description, currentLang);
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && desc) metaDesc.setAttribute('content', desc);
    }

    if (langToggleBtn) {
      if (enabledLangs.length <= 1) {
        langToggleBtn.hidden = true;
      } else {
        langToggleBtn.hidden = false;
        const targetLang = currentLang === 'TR' ? 'EN' : 'TR';
        langToggleBtn.textContent = targetLang;
        langToggleBtn.setAttribute('aria-label', currentLang === 'TR' ? 'Switch language to English' : 'Türkçe diline geç');
      }
    }

    // Update Headings in Filter/Sort Menu
    const fmtHead = document.getElementById('filter-format-heading');
    if (fmtHead) fmtHead.textContent = currentLang === 'TR' ? 'FORMAT' : 'FORMAT';

    const catHead = document.getElementById('filter-category-heading');
    if (catHead) catHead.textContent = currentLang === 'TR' ? 'KATEGORİ' : 'CATEGORY';

    if (clearFiltersBtn) clearFiltersBtn.textContent = currentLang === 'TR' ? 'Filtreleri Temizle' : 'Clear Filters';

    updateFilterBtnLabel();
    updateSortBtnLabel();

    renderFilterOptions();
    renderWorksGrid(getProcessedWorks());
    renderInfoView(siteData.bio || {}, siteData.links || [], siteData.site || {});
    updateViewSwitchBtnState();
  }

  // Render Works (Primary View Grid)
  function renderWorksGrid(works) {
    worksGrid.innerHTML = '';

    const workHeading = document.getElementById('work-heading');
    if (workHeading) {
      workHeading.textContent = currentLang === 'TR' ? 'Seçilmiş Çalışmalar' : 'Selected Works';
    }

    if (!Array.isArray(works) || works.length === 0) {
      worksGrid.innerHTML = `<p class="work-description">${currentLang === 'TR' ? 'Filtrelere uygun çalışma bulunamadı.' : 'No works match the selected filters.'}</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    works.forEach(work => {
      const workId = work.id || `work-${Math.random().toString(36).substr(2, 9)}`;
      const title = t(work.title, currentLang) || (currentLang === 'TR' ? 'İsimsiz Çalışma' : 'Untitled Work');
      const year = work.date ? String(work.date).split('-')[0] : '';
      const role = t(work.role, currentLang) || '';
      const description = t(work.description, currentLang) || '';

      const mediaType = work.mediaType || 'video';
      const aspect = work.aspect || 'landscape';
      const youtubeRaw = work.youtube || '';
      const photoUrl = work.photoUrl || (work.cover ? work.cover.image : '');

      // Coded Cover Metadata
      const cover = work.cover || {};
      const imgPath = cover.image || '';
      const coverText = cover.text || '';
      const textColor = cover.textColor || '#ffffff';
      const horiz = cover.horizontal || 'center';
      const vert = cover.vertical || 'center';
      const alignClass = `cover-align-${horiz}-${vert}`;

      const article = document.createElement('article');
      article.className = 'work-item';
      article.id = workId;

      // TEST A EXPLICIT PLAY AFFORDANCE: Centered white triangle play badge ONLY for VIDEO works
      let playBadgeHTML = '';
      if (mediaType === 'video') {
        playBadgeHTML = `
          <span class="test-a-play-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24"><polygon points="6,4 18,12 6,20"></polygon></svg>
          </span>
        `;
      }

      let mediaHTML = `
        <div class="work-media-container ${!imgPath ? 'black-cover-container' : ''}" id="media-${workId}">
          <button class="work-media-btn" 
            data-media-type="${escapeAttr(mediaType)}"
            data-aspect="${escapeAttr(aspect)}"
            data-youtube="${escapeAttr(youtubeRaw)}"
            data-photo="${escapeAttr(photoUrl)}"
            data-title="${escapeAttr(title)}"
            aria-label="${currentLang === 'TR' ? 'Çalışmayı aç' : 'Open work'}: ${escapeAttr(title)}">

            ${imgPath ? `<img class="cover-img" src="${escapeAttr(imgPath)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none';">` : ''}
            <div class="cover-veil"></div>

            ${coverText ? `
              <div class="cover-typography-layer ${alignClass}">
                <h3 class="cover-text" style="color:${escapeAttr(textColor)}">${escapeHTML(coverText)}</h3>
              </div>
            ` : ''}

            ${playBadgeHTML}
          </button>
        </div>
      `;

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

    // Attach Click Event Listener
    worksGrid.querySelectorAll('.work-media-btn').forEach(btn => {
      btn.addEventListener('click', handleMediaClick);
    });
  }

  // --- MEDIA INTERACTION & OVERLAY CONTROLLER ---
  function handleMediaClick(e) {
    const btn = e.currentTarget;
    const mediaType = btn.dataset.mediaType;
    const aspect = btn.dataset.aspect;
    const title = btn.dataset.title || 'Work viewer';
    const rawYoutube = btn.dataset.youtube;
    const photoUrl = btn.dataset.photo;

    originatingButton = btn;

    if (mediaType === 'photo') {
      openPhotoLightbox(photoUrl, title);
    } else if (mediaType === 'video') {
      openVideoOverlay(rawYoutube, aspect, title);
    }
  }

  function openPhotoLightbox(imgSrc, title) {
    if (!imgSrc) return;

    const overlay = document.createElement('div');
    overlay.className = 'photo-lightbox-overlay';
    overlay.id = 'photo-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    overlay.innerHTML = `
      <button class="photo-lightbox-close" id="photo-lightbox-close" aria-label="${currentLang === 'TR' ? 'Görseli kapat (Esc)' : 'Close photo (Esc)'}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <img class="photo-lightbox-img" src="${escapeAttr(imgSrc)}" alt="${escapeAttr(title)}">
    `;

    document.body.appendChild(overlay);
    activeOverlay = overlay;
    document.body.style.overflow = 'hidden';

    function closeLightbox() {
      if (!activeOverlay) return;
      document.removeEventListener('keydown', handleKeyDown);
      activeOverlay.remove();
      activeOverlay = null;
      document.body.style.overflow = '';
      if (originatingButton) {
        originatingButton.focus();
        originatingButton = null;
      }
    }

    function handleKeyDown(evt) {
      if (evt.key === 'Escape' || evt.key === 'Esc') closeLightbox();
    }

    const closeBtn = overlay.querySelector('#photo-lightbox-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeLightbox);
      closeBtn.focus();
    }

    document.addEventListener('keydown', handleKeyDown);
  }

  function openVideoOverlay(rawYoutube, aspect, title) {
    if (!rawYoutube) return;
    const { id: youtubeId, start: startTime } = parseYouTubeUrl(rawYoutube);
    if (!youtubeId) return;

    let embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&playsinline=1&rel=0`;
    if (startTime > 0) embedSrc += `&start=${startTime}`;

    const isPortrait = (aspect === 'portrait');

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
      <div class="${isPortrait ? 'portrait-video-wrapper' : 'video-overlay-frame-wrapper'}">
        <iframe class="video-overlay-iframe" src="${escapeAttr(embedSrc)}" title="${escapeAttr(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen frameborder="0"></iframe>
      </div>
    `;

    document.body.appendChild(overlay);
    activeOverlay = overlay;
    document.body.style.overflow = 'hidden';

    function closeOverlay() {
      if (!activeOverlay) return;

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }

      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);

      activeOverlay.remove();
      activeOverlay = null;
      document.body.style.overflow = '';

      if (originatingButton) {
        originatingButton.focus();
        originatingButton = null;
      }
    }

    function handleKeyDown(evt) {
      if (evt.key === 'Escape' || evt.key === 'Esc') closeOverlay();
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) closeOverlay();
    }

    const closeBtn = overlay.querySelector('#video-overlay-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeOverlay);
      closeBtn.focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    if (overlay.requestFullscreen) overlay.requestFullscreen().catch(() => {});
    else if (overlay.webkitRequestFullscreen) overlay.webkitRequestFullscreen();
  }

  // Render Information View (Bio & CV)
  function renderInfoView(bio, links, site) {
    infoContainer.innerHTML = '';

    const infoHeading = document.getElementById('info-heading');
    if (infoHeading) infoHeading.textContent = currentLang === 'TR' ? 'Bilgi & Arşiv' : 'Information & Archive';

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
                    .map(link => `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer" class="editorial-link">${escapeHTML(t(link.label, currentLang) || link.label || '')} ↗</a>`)
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
        <strong>${currentLang === 'TR' ? 'DENEYSEL TEST A:' : 'EXPERIMENTAL TEST A:'}</strong> ${
          currentLang === 'TR'
            ? "Bu sayfa kodlanmış kapak, filtreleme/sıralama taksonomisi ve belirgin video ikonu (Test A) deneysel arayüzüdür."
            : "This page is an isolated experimental prototype (Test A) featuring coded covers, filtering/sorting, and explicit play badges."
        }
      </div>
    </div>`;

    infoContainer.innerHTML = sidebarHTML + mainHTML;
  }

  // --- NAVIGATION & EVENT LISTENERS ---
  function setupEventListeners() {
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', () => {
        setLanguage(currentLang === 'TR' ? 'EN' : 'TR');
      });
    }

    if (viewSwitchBtn) {
      viewSwitchBtn.addEventListener('click', () => {
        switchView(currentView === 'work' ? 'info' : 'work', true);
      });
    }

    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('work', true);
      });
    }

    // Filter Bar Dropdowns
    if (filterToggleBtn && filterMenu) {
      filterToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExp = filterToggleBtn.getAttribute('aria-expanded') === 'true';
        filterToggleBtn.setAttribute('aria-expanded', !isExp);
        filterMenu.hidden = isExp;
        if (sortMenu) sortMenu.hidden = true;
      });
    }

    if (sortToggleBtn && sortMenu) {
      sortToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExp = sortToggleBtn.getAttribute('aria-expanded') === 'true';
        sortToggleBtn.setAttribute('aria-expanded', !isExp);
        sortMenu.hidden = isExp;
        if (filterMenu) filterMenu.hidden = true;
      });
    }

    // Sort Options Click
    if (sortMenu) {
      sortMenu.querySelectorAll('.sort-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const sortVal = e.target.dataset.sort;
          currentSort = sortVal;
          sortMenu.querySelectorAll('.sort-option-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          sortMenu.hidden = true;
          sortToggleBtn.setAttribute('aria-expanded', 'false');
          updateSortBtnLabel();
          renderWorksGrid(getProcessedWorks());
        });
      });
    }

    // Clear Filters Click
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        selectedFormats.clear();
        selectedCategories.clear();
        filterMenu.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
        updateFilterBtnLabel();
        renderWorksGrid(getProcessedWorks());
      });
    }

    // Close Dropdowns on Click Outside
    document.addEventListener('click', (e) => {
      if (filterMenu && !filterMenu.contains(e.target) && e.target !== filterToggleBtn) {
        filterMenu.hidden = true;
        if (filterToggleBtn) filterToggleBtn.setAttribute('aria-expanded', 'false');
      }
      if (sortMenu && !sortMenu.contains(e.target) && e.target !== sortToggleBtn) {
        sortMenu.hidden = true;
        if (sortToggleBtn) sortToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    window.addEventListener('hashchange', handleHashNavigation);
    if (retryBtn) retryBtn.addEventListener('click', loadContent);
  }

  function handleHashNavigation() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#info' || hash === '#/info') switchView('info', false);
    else switchView('work', false);
  }

  function switchView(viewName, updateHash = true) {
    if (viewName !== 'work' && viewName !== 'info') viewName = 'work';
    currentView = viewName;

    if (updateHash) {
      const targetHash = `#${viewName}`;
      if (window.location.hash !== targetHash) history.pushState(null, '', targetHash);
    }

    if (document.startViewTransition) document.startViewTransition(() => updateDOMView(viewName));
    else updateDOMView(viewName);
  }

  function updateDOMView(viewName) {
    const filterSortBar = document.getElementById('filter-sort-bar');

    if (viewName === 'info') {
      workView.hidden = true;
      infoView.hidden = false;
      if (filterSortBar) filterSortBar.style.display = 'none';
      updateViewSwitchBtnState();
      const infoHeading = document.getElementById('info-heading');
      if (infoHeading) infoHeading.focus();
    } else {
      infoView.hidden = true;
      workView.hidden = false;
      if (filterSortBar) filterSortBar.style.display = 'flex';
      updateViewSwitchBtnState();
      const workHeading = document.getElementById('work-heading');
      if (workHeading) workHeading.focus();
    }
  }

  function updateViewSwitchBtnState() {
    if (!viewSwitchBtn) return;
    if (currentView === 'info') {
      viewSwitchBtn.setAttribute('aria-expanded', 'true');
      viewSwitchBtn.setAttribute('aria-label', currentLang === 'TR' ? 'Çalışmalar görünümüne dön' : 'Return to Work Grid view');
      viewSwitchBtn.setAttribute('title', currentLang === 'TR' ? 'Çalışmalar Görünümü' : 'Show Work View');
    } else {
      viewSwitchBtn.setAttribute('aria-expanded', 'false');
      viewSwitchBtn.setAttribute('aria-label', currentLang === 'TR' ? 'Metin / Bilgi görünümünü göster' : 'Show Information / Bio view');
      viewSwitchBtn.setAttribute('title', currentLang === 'TR' ? 'Metin Görünümü' : 'Show Information View');
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) { return escapeHTML(str); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
