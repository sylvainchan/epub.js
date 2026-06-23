/* eslint-disable */
// hos-settings.js — 自訂面板：Theme / Font / Font Size / Line Height / Margin / 單多欄 / 直橫排
// 重構版 v3：抽出通用 helper（chip / toggle / radioGroup），dedup 各 manager
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
  var MARGINS = [4, 12, 24];

  // 文字對齊：left / center / right / justify
  var TEXT_ALIGNS = ["left", "center", "right", "justify"];

  // 段落間距：p margin-bottom
  var PARA_SPACING = ["0.4em", "0.8em", "1.6em"]; // 只存 px 值，用時砌 padding

  var FONT_OVERRIDE_SELECTOR =
    "body, p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre";

  // =====================================================================
  // Generic helpers
  // =====================================================================

  // Preferences store（localStorage + prefix）
  function _createStore(prefix) {
    return {
      get: function (key, def) {
        var v = localStorage.getItem(prefix + key);
        return v !== null ? v : def;
      },
      getInt: function (key, def) {
        var raw = localStorage.getItem(prefix + key);
        if (raw === null) return def;
        var n = parseInt(raw, 10);
        return isNaN(n) ? def : n;
      },
      getBool: function (key, def) {
        var raw = localStorage.getItem(prefix + key);
        if (raw === null) return def;
        return raw !== "false";
      },
      set: function (key, val) {
        localStorage.setItem(prefix + key, val);
      },
    };
  }

  // Chip group：click chip → set active → call onChange(index, value)
  function _bindChipGroup(selector, onChange) {
    var chips = document.querySelectorAll(selector);
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener("click", function (e) {
        e.preventDefault();
        var idx = parseInt(this.getAttribute("data-index"), 10);
        if (isNaN(idx)) return;
        // 更新 active
        for (var j = 0; j < chips.length; j++) {
          chips[j].classList.toggle(
            "active",
            parseInt(chips[j].getAttribute("data-index"), 10) === idx,
          );
        }
        onChange(idx);
      });
    }
    return {
      syncActive: function (activeIdx) {
        for (var k = 0; k < chips.length; k++) {
          chips[k].classList.toggle(
            "active",
            parseInt(chips[k].getAttribute("data-index"), 10) === activeIdx,
          );
        }
      },
    };
  }

  // Radio button group：click button[data-*] → set active → call onChange(value)
  function _bindRadioGroup(selector, attr, onChange) {
    var btns = document.querySelectorAll(selector);
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function (e) {
        e.preventDefault();
        var val = this.getAttribute(attr);
        if (!val) return;
        for (var j = 0; j < btns.length; j++) {
          btns[j].classList.toggle(
            "active",
            btns[j].getAttribute(attr) === val,
          );
        }
        onChange(val);
      });
    }
    return {
      syncActive: function (activeVal) {
        for (var k = 0; k < btns.length; k++) {
          btns[k].classList.toggle(
            "active",
            btns[k].getAttribute(attr) === activeVal,
          );
        }
      },
    };
  }

  // Toggle switch：checkbox change → call onChange(isChecked)
  function _bindToggle(checkboxId, onChange) {
    var cb = document.getElementById(checkboxId);
    if (!cb) return { sync: function () {}, onChange: function () {} };
    cb.addEventListener("change", function () {
      onChange(cb.checked);
    });
    return {
      sync: function (checked) {
        cb.checked = checked;
      },
      get checked() {
        return cb.checked;
      },
    };
  }

  // CSS injector：hook 自動注入 + applyToAll 手動同步
  // cssBuilder(isActive) 返回 CSS string
  // inactive 時 inject "body {}"（non-empty）做 replace-clear
  function _createCssInjector(rendition, cssId, cssBuilder) {
    var _active = false;

    function _applyToAll() {
      var css = cssBuilder(_active);
      var list = rendition.getContents();
      for (var i = 0; i < list.length; i++) {
        list[i].addStylesheetCss(css, cssId);
      }
    }

    rendition.hooks.content.register(function (contents) {
      contents.addStylesheetCss(cssBuilder(_active), cssId);
    });

    return {
      updateActive: function (val) {
        _active = val;
        _applyToAll();
      },
      applyToAll: _applyToAll,
      get active() {
        return _active;
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
  function _createThemeManager(rendition, store) {
    for (var i = 0; i < THEME_NAMES.length; i++) {
      rendition.themes.registerCss(THEME_NAMES[i], THEME_CSS[THEME_NAMES[i]]);
    }
    var currentTheme = store.get("theme", "day");
    rendition.themes.select(currentTheme);

    var radio = _bindRadioGroup(
      "button[data-theme]",
      "data-theme",
      function (name) {
        currentTheme = name;
        store.set("theme", name);
        rendition.themes.select(name);
      },
    );

    radio.syncActive(currentTheme);

    return {
      syncActive: function () {
        radio.syncActive(currentTheme);
      },
    };
  }

  // =====================================================================
  // Font Family Manager
  // =====================================================================
  function _createFontManager(rendition, store) {
    var currentFont = store.get("font", "");
    var fontFaceCss = _buildFontFaceCss();
    var CSS_ID = "font-override";

    var injector = _createCssInjector(rendition, CSS_ID, function (isActive) {
      // font-face 永遠 inject（isActive 唔影響）
      return null; // font-face 另外處理
    });

    // font-face 永遠注入
    rendition.hooks.content.register(function (contents) {
      if (fontFaceCss) {
        contents.addStylesheetCss(fontFaceCss, "custom-font-face");
      }
    });

    function _fontCss(family) {
      return family
        ? FONT_OVERRIDE_SELECTOR +
            " { font-family: " +
            family +
            " !important; }"
        : "body {}";
    }

    function _applyToAll(family) {
      var css = _fontCss(family);
      var list = rendition.getContents();
      for (var i = 0; i < list.length; i++) {
        list[i].addStylesheetCss(css, CSS_ID);
      }
    }

    rendition.hooks.content.register(function (contents) {
      var css = _fontCss(currentFont);
      if (css) {
        contents.addStylesheetCss(css, CSS_ID);
      }
    });

    function setFont(family) {
      currentFont = family;
      store.set("font", family);
      _applyToAll(family);
    }

    function initSelect() {
      var sel = document.getElementById("font-select");
      if (sel) sel.value = currentFont;
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
      applyAll: function () {
        _applyToAll(currentFont);
      },
      initSelect: initSelect,
      bindEvents: bindEvents,
    };
  }

  // =====================================================================
  // Font Size Manager
  // =====================================================================
  function _createFontSizeManager(rendition, store) {
    var currentSize = store.getInt("fontSize", 100);
    rendition.themes.fontSize(currentSize + "%");

    function _updateLabel() {
      var el = document.getElementById("font-size-label");
      if (el) el.textContent = currentSize + "%";
    }

    function adjust(delta) {
      var idx = FONT_SIZES.indexOf(currentSize);
      if (idx === -1) idx = FONT_SIZE_DEFAULT_INDEX;
      var newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
      if (newIdx === idx) return;
      currentSize = FONT_SIZES[newIdx];
      store.set("fontSize", String(currentSize));
      rendition.themes.fontSize(currentSize + "%");
      _updateLabel();
    }

    function bindEvents() {
      var down = document.getElementById("font-size-down");
      var up = document.getElementById("font-size-up");
      var reset = document.getElementById("font-size-reset");
      if (down)
        down.addEventListener("click", function (e) {
          e.preventDefault();
          adjust(-1);
        });
      if (up)
        up.addEventListener("click", function (e) {
          e.preventDefault();
          adjust(1);
        });
      if (reset)
        reset.addEventListener("click", function (e) {
          e.preventDefault();
          currentSize = 100;
          store.set("fontSize", "100");
          rendition.themes.fontSize("100%");
          _updateLabel();
          window.location.reload();
        });
    }

    return { syncLabel: _updateLabel, bindEvents: bindEvents };
  }

  // =====================================================================
  // Line Height Manager
  // =====================================================================
  function _createLineHeightManager(rendition, store) {
    var currentIndex = store.getInt("lineHeight", -1);
    if (currentIndex >= 0 && currentIndex < LINE_HEIGHTS.length) {
      rendition.themes.override(
        "line-height",
        LINE_HEIGHTS[currentIndex],
        true,
      );
    }

    var chip = _bindChipGroup(".line-height-chip", function (idx) {
      if (idx !== -1 && (idx < 0 || idx >= LINE_HEIGHTS.length)) return;
      store.set("lineHeight", String(idx));
      window.location.reload();
    });

    chip.syncActive(currentIndex);

    return {
      syncActive: function () {
        chip.syncActive(currentIndex);
      },
    };
  }

  // =====================================================================
  // Margin Manager
  // =====================================================================
  function _createMarginManager(rendition, store) {
    var currentIndex = store.getInt("margin", -1);
    var _apply = function (idx) {
      if (idx >= 0 && idx < MARGINS.length) {
        rendition.themes.override(
          "padding",
          MARGINS[idx] + "px " + MARGINS[idx] * 2 + "px",
          true,
        );
      }
    };
    _apply(currentIndex);

    var chip = _bindChipGroup(".margin-chip", function (idx) {
      if (idx !== -1 && (idx < 0 || idx >= MARGINS.length)) return;
      store.set("margin", String(idx));
      window.location.reload();
    });

    chip.syncActive(currentIndex);

    return {
      syncActive: function () {
        chip.syncActive(currentIndex);
      },
    };
  }

  // =====================================================================
  // Text Alignment Manager
  // =====================================================================
  function _createTextAlignManager(rendition, store) {
    var currentIndex = store.getInt("textAlign", -1);
    var CSS_ID = "text-align-override";
    var TEXT_SELECTOR =
      "body, p, div, li, td, th, h1, h2, h3, h4, h5, h6, blockquote";

    var injector = _createCssInjector(rendition, CSS_ID, function () {
      if (currentIndex < 0 || currentIndex >= TEXT_ALIGNS.length)
        return "body {}";
      return (
        TEXT_SELECTOR +
        " { text-align: " +
        TEXT_ALIGNS[currentIndex] +
        " !important; }"
      );
    });
    injector.updateActive(true);

    var chip = _bindChipGroup(".align-chip", function (idx) {
      if (idx !== -1 && (idx < 0 || idx >= TEXT_ALIGNS.length)) return;
      store.set("textAlign", String(idx));
      window.location.reload();
    });

    chip.syncActive(currentIndex);

    return {
      syncActive: function () {
        chip.syncActive(currentIndex);
      },
    };
  }

  // =====================================================================
  // Paragraph Spacing Manager
  // =====================================================================
  function _createParaSpacingManager(rendition, store) {
    var currentIndex = store.getInt("paraSpacing", -1);
    var CSS_ID = "para-spacing-override";

    var injector = _createCssInjector(rendition, CSS_ID, function () {
      if (currentIndex < 0 || currentIndex >= PARA_SPACING.length)
        return "body {}";
      return (
        "p { margin-bottom: " + PARA_SPACING[currentIndex] + " !important; }"
      );
    });
    injector.updateActive(true);

    var chip = _bindChipGroup(".para-chip", function (idx) {
      if (idx !== -1 && (idx < 0 || idx >= PARA_SPACING.length)) return;
      store.set("paraSpacing", String(idx));
      window.location.reload();
    });

    chip.syncActive(currentIndex);

    return {
      syncActive: function () {
        chip.syncActive(currentIndex);
      },
    };
  }

  // =====================================================================
  // Column Mode Manager（toggle → page reload → hook 注入）
  // =====================================================================
  function _createColumnManager(rendition, store) {
    var isSingleColumn = store.getBool("singleColumn", true);
    var CSS_ID = "single-column-override";

    rendition.hooks.content.register(function (contents) {
      if (isSingleColumn) {
        contents.addStylesheetCss(
          "body { column-count: 1 !important; }",
          CSS_ID,
        );
      }
      // OFF mode：唔 inject，contents.columns() 原生 CSS 控制多欄
    });

    var toggle = _bindToggle("column-toggle", function (checked) {
      store.set("singleColumn", checked ? "true" : "false");
      // beforeunload handler 喺 hos.js 自動 save CFI → reload 後 resume
      window.location.reload();
    });

    toggle.sync(isSingleColumn);

    return {
      syncToggle: function () {
        toggle.sync(isSingleColumn);
      },
    };
  }

  // =====================================================================
  // Writing Mode Manager
  // =====================================================================
  function _createWritingModeManager(rendition, store) {
    var isVertical = store.get("writingMode", "horizontal") === "vertical";
    var CSS_ID = "writing-mode-override";
    var WRITING_MODE_CSS =
      "body { writing-mode: vertical-rl !important; " +
      "-webkit-writing-mode: vertical-rl !important; " +
      "text-orientation: mixed !important; " +
      "-webkit-text-orientation: mixed !important; " +
      "max-height: 100% !important; " +
      "overflow-x: auto !important; }";

    var injector = _createCssInjector(rendition, CSS_ID, function (active) {
      return active ? WRITING_MODE_CSS : "body {}";
    });
    injector.updateActive(isVertical);

    var toggle = _bindToggle("writing-mode-toggle", function (checked) {
      var vert = checked;
      store.set("writingMode", vert ? "vertical" : "horizontal");
      injector.updateActive(vert);
      rendition.resize();
    });

    toggle.sync(isVertical);

    return {
      syncToggle: function () {
        toggle.sync(isVertical);
      },
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
      if (overlay) overlay.classList.add("show");
    }
    function close() {
      if (overlay) overlay.classList.remove("show");
    }

    function bindEvents() {
      if (closeBtn)
        closeBtn.addEventListener("click", function (e) {
          e.preventDefault();
          close();
        });
      if (triggerBtn)
        triggerBtn.addEventListener("click", function (e) {
          e.preventDefault();
          open();
        });
      if (overlay)
        overlay.addEventListener("click", function (e) {
          if (e.target === overlay) close();
        });
    }

    return { open: open, close: close, bindEvents: bindEvents };
  }

  // =====================================================================
  // Bottom Bar Controller（TOC toggle / Prev / Next / Page info）
  // =====================================================================
  function _createBottomBarController(rendition, book) {
    var tocEl = document.getElementById("toc");
    var tocBtn = document.getElementById("bottom-toc");
    var prevBtn = document.getElementById("bottom-prev");
    var nextBtn = document.getElementById("bottom-next");
    var pageInfo = document.getElementById("page-info");
    var H = window.hosReader;

    function updatePageInfo() {
      if (!pageInfo || !rendition) return;
      try {
        var loc = rendition.currentLocation();
        pageInfo.textContent =
          loc && loc.start
            ? Math.round((loc.start.percentage || 0) * 100) + "%"
            : "—";
      } catch (_e) {
        pageInfo.textContent = "—";
      }
    }

    function bindEvents() {
      if (tocBtn && tocEl) {
        tocBtn.addEventListener("click", function (e) {
          e.preventDefault();
          tocEl.classList.toggle("hidden");
        });
      }
      if (prevBtn)
        prevBtn.addEventListener("click", function (e) {
          e.preventDefault();
          H._isRtl() ? rendition.next() : rendition.prev();
        });
      if (nextBtn)
        nextBtn.addEventListener("click", function (e) {
          e.preventDefault();
          H._isRtl() ? rendition.prev() : rendition.next();
        });
      rendition.on("relocated", updatePageInfo);
    }

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
    var store = _createStore(H._makeStorageKey("pref"));

    // --- Popup + Bottom Bar ---
    _createSettingsPopup().bindEvents();
    _createBottomBarController(rendition, book).bindEvents();

    // --- Theme ---
    _createThemeManager(rendition, store);

    // --- Font Family ---
    var font = _createFontManager(rendition, store);
    font.initSelect();
    font.applyAll();
    font.bindEvents();

    // --- Font Size ---
    var fontSize = _createFontSizeManager(rendition, store);
    fontSize.syncLabel();
    fontSize.bindEvents();

    // --- Line Height ---
    _createLineHeightManager(rendition, store);

    // --- Margin ---
    _createMarginManager(rendition, store);

    // --- Text Alignment ---
    _createTextAlignManager(rendition, store);

    // --- Paragraph Spacing ---
    _createParaSpacingManager(rendition, store);

    // --- Column Mode ---
    _createColumnManager(rendition, store);

    // --- Writing Mode ---
    _createWritingModeManager(rendition, store);
  };
})();
