/* eslint-disable */
// hos-navigation.js — 導航：Swipe / 窄螢幕偵測 / 箭嘴 / 鍵盤 / Resize
// 重構版：提取 RTL 翻頁邏輯、移除重複 keyListener、var→let/const
(function () {
  'use strict';

  // ---- 常數 ----
  var NARROW_BREAKPOINT = 768;
  var SWIPE_MIN_DISTANCE = 30;
  var SWIPE_MIN_VELOCITY = 0.3;
  var SWIPE_VERTICAL_RATIO = 1.2;
  var RESIZE_DEBOUNCE_MS = 200;
  var KEY_LEFT = 37;
  var KEY_RIGHT = 39;

  // ---- 工具函數 ----
  function _isNarrowScreen() {
    return window.innerWidth <= NARROW_BREAKPOINT;
  }

  function _isRtl(book) {
    return book.package.metadata.direction === 'rtl';
  }

  /**
   * 根據滑動/點擊方向 + RTL 狀態，執行正確嘅翻頁。
   * direction: 'forward' 表示向右 swipe / 按右箭嘴；
   *            'backward' 表示向左 swipe / 按左箭嘴
   */
  function _navigate(direction, book, rendition) {
    var rtl = _isRtl(book);
    if (direction === 'forward') {
      rtl ? rendition.prev() : rendition.next();
    } else {
      rtl ? rendition.next() : rendition.prev();
    }
  }

  /**
   * 判斷滑動手勢是否應觸發翻頁。
   */
  function _shouldNavigate(dx, dy, dt) {
    // 垂直位移太大 → skip
    if (Math.abs(dy) > Math.abs(dx) * SWIPE_VERTICAL_RATIO) {
      return false;
    }
    // 距離唔夠 + 速度唔夠 → skip
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE) {
      var velocity = dt > 0 ? Math.abs(dx) / dt : 0;
      if (velocity < SWIPE_MIN_VELOCITY) {
        return false;
      }
    }
    return true;
  }

  function _getElementById(id) {
    return document.getElementById(id);
  }

  // ---- UI 箭嘴操作 ----
  function _updateArrowVisibility(prevEl, nextEl) {
    if (!prevEl || !nextEl) return;
    var narrow = _isNarrowScreen();
    prevEl.style.display = narrow ? 'none' : '';
    nextEl.style.display = narrow ? 'none' : '';
  }

  // ---- 註冊觸摸同滑鼠 swipe 事件 ----
  function _registerSwipeListeners(contents, book, rendition) {
    var doc = contents.document;
    if (!doc) return;

    var startX = 0;
    var startY = 0;
    var startTime = 0;
    var dragging = false;

    // Touch
    doc.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) return;
      dragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });

    doc.addEventListener('touchend', function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      var dt = Date.now() - startTime;
      if (!_shouldNavigate(dx, dy, dt)) return;
      _navigate(dx > 0 ? 'forward' : 'backward', book, rendition);
    }, { passive: true });

    doc.addEventListener('touchcancel', function () {
      dragging = false;
    });

    // Mouse drag（桌面端）
    doc.addEventListener('mousedown', function (e) {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
    });

    doc.addEventListener('mouseup', function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!_shouldNavigate(dx, dy, 0)) return;
      _navigate(dx > 0 ? 'forward' : 'backward', book, rendition);
    });
  }

  // ---- 鍵盤 ----
  function _createKeyListener(book, rendition) {
    return function (e) {
      var code = e.keyCode || e.which;
      if (code === KEY_LEFT) {
        _navigate('backward', book, rendition);
      } else if (code === KEY_RIGHT) {
        _navigate('forward', book, rendition);
      }
    };
  }

  // ---- 箭嘴按鈕 ----
  function _bindArrowButton(id, direction, book, rendition) {
    var el = _getElementById(id);
    if (!el) return;
    el.addEventListener('click', function (e) {
      _navigate(direction, book, rendition);
      e.preventDefault();
    }, false);
  }

  // ---- Resize debounce ----
  function _createResizeHandler(prevEl, nextEl, rendition) {
    var timeout = null;
    return function () {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = window.setTimeout(function () {
        _updateArrowVisibility(prevEl, nextEl);
        rendition.resize();
      }, RESIZE_DEBOUNCE_MS);
    };
  }

  // ---- Relocated：箭嘴 visibility（根據位置） ----
  function _onRelocated(prevEl, nextEl, location) {
    if (_isNarrowScreen()) return;
    if (nextEl) {
      nextEl.style.visibility = location.atEnd ? 'hidden' : 'visible';
    }
    if (prevEl) {
      prevEl.style.visibility = location.atStart ? 'hidden' : 'visible';
    }
  }

  // ---- 主入口 ----
  window.hosReader = window.hosReader || {};

  window.hosReader._initNavigation = function () {
    var H = window.hosReader;
    if (!H || !H.book) return;
    var book = H.book;
    var rendition = H.rendition;

    var prevEl = _getElementById('prev');
    var nextEl = _getElementById('next');

    // 箭嘴按鈕
    _bindArrowButton('prev', 'backward', book, rendition);
    _bindArrowButton('next', 'forward', book, rendition);

    // Swipe 事件（注入到每個 content iframe document）
    rendition.hooks.content.register(function (contents) {
      _registerSwipeListeners(contents, book, rendition);
    });

    // 鍵盤（只喺 document 層註冊一次，唔再雙重綁定）
    var keyListener = _createKeyListener(book, rendition);
    document.addEventListener('keyup', keyListener, false);

    // Relocated：動態顯示/隱藏箭嘴
    rendition.on('relocated', function (location) {
      _onRelocated(prevEl, nextEl, location);
    });

    // Resize
    var onResize = _createResizeHandler(prevEl, nextEl, rendition);
    window.addEventListener('resize', onResize);

    // 初始化箭嘴 visibility
    _updateArrowVisibility(prevEl, nextEl);
  };
})();
