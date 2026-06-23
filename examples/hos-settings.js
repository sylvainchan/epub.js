/* eslint-disable */
// hos-settings.js — 自訂面板：Theme / Font / Font Size / Line Height / Margin / 單多欄
// 重構版：提取 PreferencesStore、消除重複 pattern、var→let/const
(function () {
  // =====================================================================
  // 常數
  // =====================================================================
  var THEME_NAMES = ["day", "night", "sepia"];
  var THEME_CSS = {
    day: "body { background: #fff !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #333 !important; }",
    night:
      "body { background: #1a1a1a !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #ccc !important; }",
    sepia:
      "body { background: #f4ecd8 !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #5b4636 !important; }",
  };

  var FONT_SIZES = [80, 90, 100, 110, 120, 140, 160, 180, 200];
  var FONT_SIZE_DEFAULT_INDEX = 2; // 100%

  var LINE_HEIGHTS = [1.4, 1.8, 2.2];
  var LINE_HEIGHT_LABELS = ["行高: 窄", "行高: 標準", "行高: 闊"];

  var MARGINS = [
    { padding: "0 8px" },
    { padding: "0 24px" },
    { padding: "0 48px" },
  ];
  var MARGIN_LABELS = ["邊距: 窄", "邊距: 標準", "邊距: 闊"];

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
      var btns = document.querySelectorAll("#settings-bar button[data-theme]");
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
      var btns = document.querySelectorAll("#settings-bar button[data-theme]");
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
  // Line Height Manager
  // =====================================================================
  function _createLineHeightManager(rendition, pref) {
    var currentIndex = pref.getInt("lineHeight", 1);
    rendition.themes.override("line-height", LINE_HEIGHTS[currentIndex], true);

    function updateLabel() {
      var btn = document.getElementById("line-height-btn");
      if (btn) {
        btn.title = LINE_HEIGHT_LABELS[currentIndex];
      }
    }

    function cycle() {
      currentIndex = (currentIndex + 1) % LINE_HEIGHTS.length;
      pref.set("lineHeight", String(currentIndex));
      rendition.themes.override(
        "line-height",
        LINE_HEIGHTS[currentIndex],
        true,
      );
      updateLabel();
    }

    function bindEvents() {
      var btn = document.getElementById("line-height-btn");
      if (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          cycle();
        });
      }
    }

    return { updateLabel: updateLabel, cycle: cycle, bindEvents: bindEvents };
  }

  // =====================================================================
  // Margin Manager
  // =====================================================================
  function _createMarginManager(rendition, pref) {
    var currentIndex = pref.getInt("margin", 1);
    rendition.themes.override("padding", MARGINS[currentIndex].padding, true);

    function updateLabel() {
      var btn = document.getElementById("margin-btn");
      if (btn) {
        btn.title = MARGIN_LABELS[currentIndex];
      }
    }

    function cycle() {
      currentIndex = (currentIndex + 1) % MARGINS.length;
      pref.set("margin", String(currentIndex));
      rendition.themes.override("padding", MARGINS[currentIndex].padding, true);
      updateLabel();
    }

    function bindEvents() {
      var btn = document.getElementById("margin-btn");
      if (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          cycle();
        });
      }
    }

    return { updateLabel: updateLabel, cycle: cycle, bindEvents: bindEvents };
  }

  // =====================================================================
  // Column Mode Manager（單欄 / 多欄切換）
  // =====================================================================
  function _createColumnManager(rendition, pref) {
    var isSingleColumn = pref.get("singleColumn", "true") !== "false";
    var originalFormat = null;

    function apply(layout) {
      if (!layout) {
        layout = rendition.manager && rendition.manager.layout;
      }
      if (!layout) return;

      if (!originalFormat) {
        originalFormat = layout.format.bind(layout);
      }

      if (isSingleColumn) {
        layout.format = function (contents, section, axis) {
          if (this._flow === "paginated") {
            return contents.columns(
              this.width,
              this.height,
              99999,
              0,
              this.settings.direction,
            );
          }
          return originalFormat(contents, section, axis);
        };
      } else {
        layout.format = originalFormat;
      }
    }

    function updateLabel() {
      var btn = document.getElementById("column-toggle");
      if (btn) {
        btn.title = isSingleColumn ? "單欄模式" : "多欄模式";
        if (isSingleColumn) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      }
    }

    function toggle() {
      isSingleColumn = !isSingleColumn;
      pref.set("singleColumn", isSingleColumn ? "true" : "false");
      apply();
      updateLabel();

      var loc = rendition.currentLocation();
      if (loc && loc.start && loc.start.cfi) {
        rendition.display(loc.start.cfi);
      } else {
        rendition.resize();
      }
    }

    function bindEvents() {
      var btn = document.getElementById("column-toggle");
      if (btn) {
        updateLabel();
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          toggle();
        });
      }
    }

    return {
      apply: apply,
      updateLabel: updateLabel,
      toggle: toggle,
      bindEvents: bindEvents,
    };
  }

  // =====================================================================
  // 主入口 — _initSettings
  // =====================================================================
  window.hosReader = window.hosReader || {};

  window.hosReader._initSettings = function () {
    var H = window.hosReader;
    if (!H || !H.book) return;
    var rendition = H.rendition;
    var url = H.url || "./ex.epub";
    var PREF_PREFIX = "epub-pref-" + url + "-";

    var pref = _createPreferencesStore(PREF_PREFIX);

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
    lineHeightManager.updateLabel();
    lineHeightManager.bindEvents();

    // --- Margin ---
    var marginManager = _createMarginManager(rendition, pref);
    marginManager.updateLabel();
    marginManager.bindEvents();

    // --- Column Mode ---
    var columnManager = _createColumnManager(rendition, pref);
    columnManager.apply();
    columnManager.updateLabel();
    columnManager.bindEvents();
  };
})();
