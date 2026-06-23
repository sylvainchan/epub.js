/* eslint-disable */
// hos.js — 核心：params、book/rendition 初始化、CFI save/resume、TOC、lifecycle
// 重構版：var→let/const、簡化 URL params、CFI save debounce 整理
(function () {
  'use strict';

  // =====================================================================
  // URL params（安全解析）
  // =====================================================================
  function _getUrlParam(name, fallback) {
    try {
      var params = new URLSearchParams(document.location.search.substring(1));
      var v = params.get(name);
      return v !== null ? v : (fallback !== undefined ? fallback : null);
    } catch (_e) {
      return fallback !== undefined ? fallback : null;
    }
  }

  var epubUrl = _getUrlParam('url', './ex.epub');
  var STORAGE_KEY = 'epub-cfi-' + epubUrl;
  var SAVE_DEBOUNCE_MS = 500;

  // =====================================================================
  // CFI 自動儲存
  // =====================================================================
  var _saveTimeout = null;

  function _saveCurrentCfi(rendition) {
    try {
      var loc = rendition.currentLocation();
      if (loc && loc.start && loc.start.cfi) {
        localStorage.setItem(STORAGE_KEY, loc.start.cfi);
      }
    } catch (_e) {
      /* ignore */
    }
  }

  function _debouncedSaveCfi(rendition) {
    if (_saveTimeout !== null) {
      clearTimeout(_saveTimeout);
    }
    _saveTimeout = window.setTimeout(function () {
      _saveCurrentCfi(rendition);
    }, SAVE_DEBOUNCE_MS);
  }

  // =====================================================================
  // 決定起始 CFI
  // =====================================================================
  function _resolveStartCfi() {
    var paramLoc = _getUrlParam('loc');
    if (paramLoc) return paramLoc;

    var savedLoc = localStorage.getItem(STORAGE_KEY);
    if (savedLoc) return savedLoc;

    return undefined;
  }

  // =====================================================================
  // Book + Rendition 初始化
  // =====================================================================
  var book = ePub(epubUrl);
  var rendition = book.renderTo('viewer', {
    width: '100%',
    height: '100%',
    spread: 'none',
    layout: 'reflowable',
    manager: 'default',
    flow: 'paginated',
  });

  // ---- 暴露畀其他 module（merge 而唔係 overwrite）----
  window.hosReader = window.hosReader || {};
  var H = window.hosReader;
  H.book = book;
  H.rendition = rendition;
  H.url = epubUrl;

  // =====================================================================
  // Display（加載完畢後顯示）
  // =====================================================================
  var startCfi = _resolveStartCfi();
  book.ready
    .then(function () { return book.locations.generate(1000); })
    .then(function () {
      if (startCfi) {
        rendition.display(startCfi);
      } else {
        rendition.display();
      }
    });

  // =====================================================================
  // Wire up modules（book ready 後初始化 settings / navigation）
  // =====================================================================
  book.ready.then(function () {
    if (window.hosReader._initSettings) {
      window.hosReader._initSettings();
    }
    if (window.hosReader._initNavigation) {
      window.hosReader._initNavigation();
    }
  });

  // =====================================================================
  // TOC sync（當前章節高亮）
  // =====================================================================
  rendition.on('rendered', function (section) {
    var current = book.navigation && book.navigation.get(section.href);
    if (!current) return;

    var selectEl = _getElementById('toc');
    if (!selectEl) return;

    // 清除舊 selected
    var oldSelected = selectEl.querySelector('option[selected]');
    if (oldSelected) {
      oldSelected.removeAttribute('selected');
    }

    // 設定新 selected
    var options = selectEl.querySelectorAll('option');
    for (var i = 0; i < options.length; i++) {
      if (options[i].getAttribute('ref') === current.href) {
        options[i].setAttribute('selected', '');
        break;
      }
    }
  });

  // =====================================================================
  // CFI auto-save（每次翻頁）
  // =====================================================================
  rendition.on('relocated', function (location) {
    _debouncedSaveCfi(rendition);
    console.log(location);
  });

  // =====================================================================
  // Spread class（單欄 / 多欄樣式）
  // =====================================================================
  rendition.on('layout', function (layout) {
    var viewer = _getElementById('viewer');
    if (!viewer) return;
    if (layout.spread) {
      viewer.classList.remove('single');
    } else {
      viewer.classList.add('single');
    }
  });

  // =====================================================================
  // Save on exit
  // =====================================================================
  window.addEventListener('beforeunload', function () {
    _saveCurrentCfi(rendition);
  });

  window.addEventListener('unload', function () {
    console.log('unloading');
    book.destroy();
  });

  // =====================================================================
  // TOC dropdown（加載目錄）
  // =====================================================================
  book.loaded.navigation.then(function (toc) {
    var selectEl = _getElementById('toc');
    if (!selectEl) return;

    var docFrag = document.createDocumentFragment();
    for (var i = 0; i < toc.length; i++) {
      var chapter = toc[i];
      var option = document.createElement('option');
      option.textContent = chapter.label;
      option.setAttribute('ref', chapter.href);
      docFrag.appendChild(option);
    }
    selectEl.appendChild(docFrag);

    selectEl.onchange = function () {
      var index = this.selectedIndex;
      var href = this.options[index].getAttribute('ref');
      if (href) {
        rendition.display(href);
      }
      return false;
    };
  });

  // ---- 工具函數（內部使用）----
  function _getElementById(id) {
    return document.getElementById(id);
  }
})();
