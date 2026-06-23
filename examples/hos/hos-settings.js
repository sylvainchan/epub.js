/* eslint-disable */
// hos-settings.js — 自訂面板：Theme / Font / Font Size / Line Height / Margin / 單多欄
// 重構版 v2：Popup-based UI、chip selectors、toggle switches
(function () {
  // =====================================================================
  // 常數
  // =====================================================================
  var THEME_NAMES = [
    "day",
    "night",
    "sepia",
    "green",
    "gray",
    "contrast",
    "dark-sepia",
  ];
  var THEME_CSS = {
    day: "body { background: #fff !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #333 !important; }",
    night:
      "body { background: #1a1a1a !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #ccc !important; }",
    sepia:
      "body { background: #f4ecd8 !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #5b4636 !important; }",
    green:
      "body { background: #c8dcc8 !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #2d3e2d !important; }",
    gray: "body { background: #e8e8e8 !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #333 !important; }",
    contrast:
      "body { background: #000 !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #fff !important; }",
    "dark-sepia":
      "body { background: #3e3524 !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #d4c5a9 !important; }",
  };

  var FONT_SIZES = [80, 90, 100, 110, 120, 140, 160, 180, 200];
  var FONT_SIZE_DEFAULT_INDEX = 2; // 100%

  var LINE_HEIGHTS = [1.4, 1.8, 2.2];

  var MARGINS = [
    { padding: "4px 8px" },
    { padding: "12px 24px" },
    { padding: "24px 48px" },
  ];

  var FONT_OVERRIDE_SELECTOR =
    "body, p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre";

  // =====================================================================
  // PreferencesStore — 封裝 localStorage + prefix
  // =====================================================================
  function _createPreferencesStore(prefix) {
    return {
      get: function (key, fallback) {
        var v = localStorage.getItem(prefix + key);
        return v !== null ? v : fallback;
      },
      getInt: function (key, fallback) {
        var raw = localStorage.getItem(prefix + key);
        if (raw === null) return fallback;
        var parsed = parseInt(raw, 10);
        return isNaN(parsed) ? fallback : parsed;
      },
      set: function (key, value) {
        localStorage.setItem(prefix + key, value);
      },
    };
  }

  // =====================================================================
  // Font face CSS builder
  // =====================================================================
  function _buildFontFaceCss() {
    var baseUrl = window.location.href.replace(/\/[^/]*$/, "/");
    var fonts = [
      { family: "Chiron Hei HK", file: "ChironHeiHK-Regular.ttf" },
      { family: "Chiron Sung HK", file: "ChironSungHK-Regular.ttf" },
      { family: "LXGW WenKai TC", file: "LXGWWenKaiTC-Regular.ttf" },
      { family: "Noto Serif HK", file: "NotoSerifHK-Regular.ttf" },
    ];
    var css = "";
    for (var i = 0; i < fonts.length; i++) {
      var f = fonts[i];
      css +=
        "@font-face { font-family: '" +
        f.family +
        "'; src: url('" +
        baseUrl +
        "fonts/" +
        f.file +
        "') format('truetype'); font-weight: normal; font-style: normal; }";
    }
    return css;
  }

  // =====================================================================
  // Theme Manager
  // =====================================================================
  function _createThemeManager(rendition, pref) {
    // 註冊所有 theme CSS
    for (var i = 0; i < THEME_NAMES.length; i++) {
      rendition.themes.registerCss(THEME_NAMES[i], THEME_CSS[THEME_NAMES[i]]);
    }
    var currentTheme = pref.get("theme", "day");
    rendition.themes.select(currentTheme);

    function _updateButtons(activeTheme) {
      var btns = document.querySelectorAll("button[data-theme]");
      for (var j = 0; j < btns.length; j++) {
        var btn = btns[j];
        if (btn.getAttribute("data-theme") === activeTheme) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      }
    }

    function setTheme(name) {
      currentTheme = name;
      pref.set("theme", name);
      rendition.themes.select(name);
      _updateButtons(name);
    }

    function bindEvents() {
      var btns = document.querySelectorAll("button[data-theme]");
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener("click", function (e) {
          e.preventDefault();
          var theme = this.getAttribute("data-theme");
          if (theme) setTheme(theme);
        });
      }
    }

    return {
      setTheme: setTheme,
      updateButtons: function () {
        _updateButtons(currentTheme);
      },
      bindEvents: bindEvents,
    };
  }

  // =====================================================================
  // Font Family Manager
  // =====================================================================
  function _createFontManager(rendition, pref) {
    var currentFont = pref.get("font", "");
    var fontFaceCss = _buildFontFaceCss();

    // 注入 font-face（hook 到每個 content）
    rendition.hooks.content.register(function (contents) {
      if (fontFaceCss) {
        contents.addStylesheetCss(fontFaceCss, "custom-font-face");
      }
      if (currentFont) {
        contents.addStylesheetCss(
          FONT_OVERRIDE_SELECTOR +
            " { font-family: " +
            currentFont +
            " !important; }",
          "font-override",
        );
      }
    });

    function applyFont(family) {
      var list = rendition.getContents();
      for (var i = 0; i < list.length; i++) {
        if (family) {
          list[i].addStylesheetCss(
            FONT_OVERRIDE_SELECTOR +
              " { font-family: " +
              family +
              " !important; }",
            "font-override",
          );
        } else {
          // 清空 font-override 以還原預設字型
          list[i].addStylesheetCss("", "font-override");
        }
      }
    }

    function setFont(family) {
      currentFont = family;
      pref.set("font", family);
      applyFont(family);
    }

    function initSelect() {
      var sel = document.getElementById("font-select");
      if (sel) {
        sel.value = currentFont;
      }
    }

    function bindEvents() {
      var sel = document.getElementById("font-select");
      if (sel) {
        sel.addEventListener("change", function () {
          setFont(this.value);
        });
      }
    }

    return {
      getCurrentFont: function () {
        return currentFont;
      },
      setFont: setFont,
      applyFont: applyFont,
      initSelect: initSelect,
      bindEvents: bindEvents,
    };
  }

  // =====================================================================
  // Font Size Manager
  // =====================================================================
  function _createFontSizeManager(rendition, pref) {
    var currentSize = pref.getInt("fontSize", 100);
    rendition.themes.fontSize(currentSize + "%");

    function updateLabel() {
      var label = document.getElementById("font-size-label");
      if (label) {
        label.textContent = currentSize + "%";
      }
    }

    function adjust(delta) {
      var idx = FONT_SIZES.indexOf(currentSize);
      if (idx === -1) idx = FONT_SIZE_DEFAULT_INDEX;
      var newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
      if (newIdx === idx) return;
      currentSize = FONT_SIZES[newIdx];
      pref.set("fontSize", String(currentSize));
      rendition.themes.fontSize(currentSize + "%");
      updateLabel();
    }

    function bindEvents() {
      var downBtn = document.getElementById("font-size-down");
      var upBtn = document.getElementById("font-size-up");
      if (downBtn) {
        downBtn.addEventListener("click", function (e) {
          e.preventDefault();
          adjust(-1);
        });
      }
      if (upBtn) {
        upBtn.addEventListener("click", function (e) {
          e.preventDefault();
          adjust(1);
        });
      }
    }

    return { updateLabel: updateLabel, adjust: adjust, bindEvents: bindEvents };
  }

  // =====================================================================
  // Line Height Manager（改用 option chips）
  // =====================================================================
  function _createLineHeightManager(rendition, pref) {
    var currentIndex = pref.getInt("lineHeight", 1);
    rendition.themes.override("line-height", LINE_HEIGHTS[currentIndex], true);

    function updateChips() {
      var chips = document.querySelectorAll(".line-height-chip");
      for (var i = 0; i < chips.length; i++) {
        var idx = parseInt(chips[i].getAttribute("data-index"), 10);
        if (idx === currentIndex) {
          chips[i].classList.add("active");
        } else {
          chips[i].classList.remove("active");
        }
      }
    }

    function setIndex(index) {
      if (index < 0 || index >= LINE_HEIGHTS.length) return;
      currentIndex = index;
      pref.set("lineHeight", String(currentIndex));
      rendition.themes.override(
        "line-height",
        LINE_HEIGHTS[currentIndex],
        true,
      );
      updateChips();
    }

    function bindEvents() {
      var chips = document.querySelectorAll(".line-height-chip");
      for (var i = 0; i < chips.length; i++) {
        chips[i].addEventListener("click", function (e) {
          e.preventDefault();
          var idx = parseInt(this.getAttribute("data-index"), 10);
          setIndex(idx);
        });
      }
    }

    return {
      updateChips: updateChips,
      setIndex: setIndex,
      bindEvents: bindEvents,
    };
  }

  // =====================================================================
  // Margin Manager（改用 option chips）
  // =====================================================================
  function _createMarginManager(rendition, pref) {
    var currentIndex = pref.getInt("margin", 1);
    rendition.themes.override("padding", MARGINS[currentIndex].padding, true);

    function updateChips() {
      var chips = document.querySelectorAll(".margin-chip");
      for (var i = 0; i < chips.length; i++) {
        var idx = parseInt(chips[i].getAttribute("data-index"), 10);
        if (idx === currentIndex) {
          chips[i].classList.add("active");
        } else {
          chips[i].classList.remove("active");
        }
      }
    }

    function setIndex(index) {
      if (index < 0 || index >= MARGINS.length) return;
      currentIndex = index;
      pref.set("margin", String(currentIndex));
      rendition.themes.override("padding", MARGINS[currentIndex].padding, true);
      updateChips();
    }

    function bindEvents() {
      var chips = document.querySelectorAll(".margin-chip");
      for (var i = 0; i < chips.length; i++) {
        chips[i].addEventListener("click", function (e) {
          e.preventDefault();
          var idx = parseInt(this.getAttribute("data-index"), 10);
          setIndex(idx);
        });
      }
    }

    return {
      updateChips: updateChips,
      setIndex: setIndex,
      bindEvents: bindEvents,
    };
  }

  // =====================================================================
  // Column Mode Manager（hook 版：render 時 check setting 先 inject CSS）
  // =====================================================================
  function _createColumnManager(rendition, pref) {
    var isSingleColumn = pref.get("singleColumn", "true") !== "false";
    // 單欄 ON 先 inject CSS 鎖死 1 欄
    // 單欄 OFF → 唔 inject 任何嘢，由 contents.columns() 原生 CSS 控制多欄
    var COLUMN_CSS = "body { column-count: 1 !important; }";
    var CSS_ID = "single-column-override";

    rendition.hooks.content.register(function (contents) {
      if (isSingleColumn) {
        contents.addStylesheetCss(COLUMN_CSS, CSS_ID);
      }
      // OFF mode：唔 inject，contents.columns() 嘅 inline CSS 自然生效
    });

    function updateToggle() {
      var cb = document.getElementById("column-toggle");
      if (cb) {
        cb.checked = isSingleColumn;
      }
    }

    function _reloadPage() {
      // beforeunload handler 喺 hos.js 會自動 save CFI → reload 後 resume
      window.location.reload();
    }

    function toggle() {
      isSingleColumn = !isSingleColumn;
      pref.set("singleColumn", isSingleColumn ? "true" : "false");
      _reloadPage();
    }

    function bindEvents() {
      var cb = document.getElementById("column-toggle");
      if (cb) {
        updateToggle();
        cb.addEventListener("change", function () {
          isSingleColumn = cb.checked;
          pref.set("singleColumn", isSingleColumn ? "true" : "false");
          _reloadPage();
        });
      }
    }

    return {
      updateToggle: updateToggle,
      toggle: toggle,
      bindEvents: bindEvents,
    };
  }

  // =====================================================================
  // Writing Mode Manager（改用 toggle switch）
  // =====================================================================
  function _createWritingModeManager(rendition, pref) {
    var isVertical = pref.get("writingMode", "horizontal") === "vertical";

    var WRITING_MODE_CSS =
      "body { writing-mode: vertical-rl !important; " +
      "-webkit-writing-mode: vertical-rl !important; " +
      "text-orientation: mixed !important; " +
      "-webkit-text-orientation: mixed !important; " +
      "max-height: 100% !important; " +
      "overflow-x: auto !important; }";

    function apply() {
      var list = rendition.getContents();
      for (var i = 0; i < list.length; i++) {
        if (isVertical) {
          list[i].addStylesheetCss(WRITING_MODE_CSS, "writing-mode-override");
        } else {
          list[i].addStylesheetCss("", "writing-mode-override");
        }
      }
    }

    // 注入到新 content
    rendition.hooks.content.register(function (contents) {
      if (isVertical) {
        contents.addStylesheetCss(WRITING_MODE_CSS, "writing-mode-override");
      }
    });

    function updateToggle() {
      var cb = document.getElementById("writing-mode-toggle");
      if (cb) {
        cb.checked = isVertical;
      }
    }

    function toggle() {
      isVertical = !isVertical;
      pref.set("writingMode", isVertical ? "vertical" : "horizontal");
      apply();
      updateToggle();
      rendition.resize();
    }

    function bindEvents() {
      var cb = document.getElementById("writing-mode-toggle");
      if (cb) {
        updateToggle();
        cb.addEventListener("change", function () {
          isVertical = cb.checked;
          pref.set("writingMode", isVertical ? "vertical" : "horizontal");
          apply();
          rendition.resize();
        });
      }
    }

    return {
      apply: apply,
      updateToggle: updateToggle,
      toggle: toggle,
      bindEvents: bindEvents,
    };
  }

  // =====================================================================
  // Settings Popup Controller
  // =====================================================================
  function _createSettingsPopup() {
    var overlay = document.getElementById("settings-overlay");
    var closeBtn = document.getElementById("settings-close");
    var triggerBtn = document.getElementById("bottom-settings");

    function open() {
      if (overlay) {
        overlay.classList.add("show");
      }
    }

    function close() {
      if (overlay) {
        overlay.classList.remove("show");
      }
    }

    function bindEvents() {
      if (closeBtn) {
        closeBtn.addEventListener("click", function (e) {
          e.preventDefault();
          close();
        });
      }
      if (overlay) {
        overlay.addEventListener("click", function (e) {
          if (e.target === overlay) {
            close();
          }
        });
      }
      if (triggerBtn) {
        triggerBtn.addEventListener("click", function (e) {
          e.preventDefault();
          open();
        });
      }
    }

    return { open: open, close: close, bindEvents: bindEvents };
  }

  // =====================================================================
  // TOC + Bottom Bar Controller
  // =====================================================================
  function _createBottomBarController(rendition, book) {
    var tocEl = document.getElementById("toc");
    var tocBtn = document.getElementById("bottom-toc");
    var prevBtn = document.getElementById("bottom-prev");
    var nextBtn = document.getElementById("bottom-next");
    var pageInfo = document.getElementById("page-info");
    var viewer = document.getElementById("viewer");
    var bottomBar = document.getElementById("bottom-bar");

    function _isRtl() {
      return (
        book &&
        book.package &&
        book.package.metadata &&
        book.package.metadata.direction === "rtl"
      );
    }

    function updatePageInfo() {
      if (!pageInfo || !rendition) return;
      try {
        var loc = rendition.currentLocation();
        if (loc && loc.start) {
          var pct = loc.start.percentage || 0;
          pageInfo.textContent = Math.round(pct * 100) + "%";
        }
      } catch (_e) {
        pageInfo.textContent = "—";
      }
    }

    function bindEvents() {
      // TOC toggle
      if (tocBtn && tocEl) {
        tocBtn.addEventListener("click", function (e) {
          e.preventDefault();
          if (tocEl.classList.contains("hidden")) {
            tocEl.classList.remove("hidden");
          } else {
            tocEl.classList.add("hidden");
          }
        });
      }

      // Prev / Next
      if (prevBtn) {
        prevBtn.addEventListener("click", function (e) {
          e.preventDefault();
          _isRtl() ? rendition.next() : rendition.prev();
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function (e) {
          e.preventDefault();
          _isRtl() ? rendition.prev() : rendition.next();
        });
      }

      // 監聽 relocate 更新頁碼
      rendition.on("relocated", function () {
        updatePageInfo();
      });
    }

    // 初始更新
    updatePageInfo();

    return { updatePageInfo: updatePageInfo, bindEvents: bindEvents };
  }

  // =====================================================================
  // 主入口 — _initSettings
  // =====================================================================
  window.hosReader = window.hosReader || {};

  window.hosReader._initSettings = function () {
    var H = window.hosReader;
    if (!H || !H.book) return;
    var rendition = H.rendition;
    var book = H.book;
    var url = H.url || "./ex.epub";
    var PREF_PREFIX = "epub-pref-" + url + "-";

    var pref = _createPreferencesStore(PREF_PREFIX);

    // --- Settings Popup ---
    var popup = _createSettingsPopup();
    popup.bindEvents();

    // --- Bottom Bar ---
    var bottomBar = _createBottomBarController(rendition, book);
    bottomBar.bindEvents();

    // --- Theme ---
    var themeManager = _createThemeManager(rendition, pref);
    themeManager.updateButtons();
    themeManager.bindEvents();

    // --- Font Family ---
    var fontManager = _createFontManager(rendition, pref);
    fontManager.initSelect();
    fontManager.applyFont(fontManager.getCurrentFont());
    fontManager.bindEvents();

    // --- Font Size ---
    var fontSizeManager = _createFontSizeManager(rendition, pref);
    fontSizeManager.updateLabel();
    fontSizeManager.bindEvents();

    // --- Line Height ---
    var lineHeightManager = _createLineHeightManager(rendition, pref);
    lineHeightManager.updateChips();
    lineHeightManager.bindEvents();

    // --- Margin ---
    var marginManager = _createMarginManager(rendition, pref);
    marginManager.updateChips();
    marginManager.bindEvents();

    // --- Column Mode ---
    var columnManager = _createColumnManager(rendition, pref);
    columnManager.updateToggle();
    columnManager.bindEvents();

    // --- Writing Mode (直排/橫排) ---
    var writingModeManager = _createWritingModeManager(rendition, pref);
    writingModeManager.apply();
    writingModeManager.updateToggle();
    writingModeManager.bindEvents();
  };
})();
