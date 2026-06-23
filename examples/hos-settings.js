/* eslint-disable */
// hos-settings.js — 自訂面板：Theme / Font / Font Size / Line Height / Margin / 單多欄
(function () {
  var H = window.hosReader;
  if (!H) return;

  H._initSettings = function () {
    var book = H.book;
    var rendition = H.rendition;
    var url = H.url;
    var PREF_PREFIX = "epub-pref-" + (url || "./ex.epub") + "-";

    // --- Theme（日間 / 夜間 / 懷舊）---
    var THEME_CSS = {
      day: "body { background: #fff !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #333 !important; }",
      night:
        "body { background: #1a1a1a !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #ccc !important; }",
      sepia:
        "body { background: #f4ecd8 !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #5b4636 !important; }",
    };
    var THEME_NAMES = ["day", "night", "sepia"];
    var _currentTheme = localStorage.getItem(PREF_PREFIX + "theme") || "day";

    THEME_NAMES.forEach(function (name) {
      rendition.themes.registerCss(name, THEME_CSS[name]);
    });
    rendition.themes.select(_currentTheme);

    function _setTheme(name) {
      _currentTheme = name;
      localStorage.setItem(PREF_PREFIX + "theme", name);
      rendition.themes.select(name);
      _updateThemeButtons();
    }

    function _updateThemeButtons() {
      var btns = document.querySelectorAll("#settings-bar button[data-theme]");
      for (var i = 0; i < btns.length; i++) {
        var btn = btns[i];
        if (btn.getAttribute("data-theme") === _currentTheme) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      }
    }

    // --- Font Family ---
    var _currentFont = localStorage.getItem(PREF_PREFIX + "font") || "";
    var _fontBaseUrl = window.location.href.replace(/\/[^/]*$/, "/");

    var _customFontFaceCss =
      "@font-face { font-family: 'Chiron Hei HK'; src: url('" +
      _fontBaseUrl +
      "fonts/ChironHeiHK-Regular.ttf') format('truetype'); font-weight: normal; font-style: normal; }" +
      "@font-face { font-family: 'Chiron Sung HK'; src: url('" +
      _fontBaseUrl +
      "fonts/ChironSungHK-Regular.ttf') format('truetype'); font-weight: normal; font-style: normal; }" +
      "@font-face { font-family: 'LXGW WenKai TC'; src: url('" +
      _fontBaseUrl +
      "fonts/LXGWWenKaiTC-Regular.ttf') format('truetype'); font-weight: normal; font-style: normal; }" +
      "@font-face { font-family: 'Noto Serif HK'; src: url('" +
      _fontBaseUrl +
      "fonts/NotoSerifHK-Regular.ttf') format('truetype'); font-weight: normal; font-style: normal; }";

    rendition.hooks.content.register(function (contents) {
      if (_customFontFaceCss) {
        contents.addStylesheetCss(_customFontFaceCss, "custom-font-face");
      }
      if (_currentFont) {
        contents.addStylesheetCss(
          "body, p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre { " +
            "font-family: " +
            _currentFont +
            " !important; }",
          "font-override",
        );
      }
    });

    function _applyFont(family) {
      if (family) {
        var contents = rendition.getContents();
        contents.forEach(function (c) {
          c.addStylesheetCss(
            "body, p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre { " +
              "font-family: " +
              family +
              " !important; }",
            "font-override",
          );
        });
      } else {
        var contents2 = rendition.getContents();
        contents2.forEach(function (c) {
          c.addStylesheetCss("", "font-override");
        });
      }
    }

    function _setFont(family) {
      _currentFont = family;
      localStorage.setItem(PREF_PREFIX + "font", family);
      _applyFont(family);
    }

    function _initFontSelect() {
      var sel = document.getElementById("font-select");
      if (sel) {
        sel.value = _currentFont;
      }
    }

    // --- Font Size ---
    var FONT_SIZES = [80, 90, 100, 110, 120, 140, 160, 180, 200];
    var _currentFontSize = parseInt(
      localStorage.getItem(PREF_PREFIX + "fontSize") || "100",
      10,
    );
    rendition.themes.fontSize(_currentFontSize + "%");

    function _updateFontSizeLabel() {
      var label = document.getElementById("font-size-label");
      if (label) {
        label.textContent = _currentFontSize + "%";
      }
    }

    function _adjustFontSize(delta) {
      var idx = FONT_SIZES.indexOf(_currentFontSize);
      if (idx === -1) idx = 2;
      var newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
      if (newIdx === idx) return;
      _currentFontSize = FONT_SIZES[newIdx];
      localStorage.setItem(PREF_PREFIX + "fontSize", _currentFontSize);
      rendition.themes.fontSize(_currentFontSize + "%");
      _updateFontSizeLabel();
    }

    // --- Line Height ---
    var LINE_HEIGHTS = [1.4, 1.8, 2.2];
    var LINE_HEIGHT_LABELS = ["行高: 窄", "行高: 標準", "行高: 闊"];
    var _currentLineHeight = parseInt(
      localStorage.getItem(PREF_PREFIX + "lineHeight") || "1",
      10,
    );
    rendition.themes.override(
      "line-height",
      LINE_HEIGHTS[_currentLineHeight],
      true,
    );

    function _cycleLineHeight() {
      _currentLineHeight = (_currentLineHeight + 1) % LINE_HEIGHTS.length;
      localStorage.setItem(PREF_PREFIX + "lineHeight", _currentLineHeight);
      rendition.themes.override(
        "line-height",
        LINE_HEIGHTS[_currentLineHeight],
        true,
      );
      _updateLineHeightLabel();
    }

    function _updateLineHeightLabel() {
      var btn = document.getElementById("line-height-btn");
      if (btn) {
        btn.title = LINE_HEIGHT_LABELS[_currentLineHeight];
      }
    }

    // --- Margin / Padding ---
    var MARGINS = [
      { padding: "0 8px" },
      { padding: "0 24px" },
      { padding: "0 48px" },
    ];
    var MARGIN_LABELS = ["邊距: 窄", "邊距: 標準", "邊距: 闊"];
    var _currentMargin = parseInt(
      localStorage.getItem(PREF_PREFIX + "margin") || "1",
      10,
    );
    rendition.themes.override("padding", MARGINS[_currentMargin].padding, true);

    function _cycleMargin() {
      _currentMargin = (_currentMargin + 1) % MARGINS.length;
      localStorage.setItem(PREF_PREFIX + "margin", _currentMargin);
      rendition.themes.override(
        "padding",
        MARGINS[_currentMargin].padding,
        true,
      );
      _updateMarginLabel();
    }

    function _updateMarginLabel() {
      var btn = document.getElementById("margin-btn");
      if (btn) {
        btn.title = MARGIN_LABELS[_currentMargin];
      }
    }

    // ---- 單欄 / 多欄切換 ----
    var COLUMN_STORAGE_KEY = "epub-single-col-" + (url || "./ex.epub");
    var _isSingleColumn = localStorage.getItem(COLUMN_STORAGE_KEY) !== "false";
    var _originalFormat = null;

    function _applySingleColumn(layout) {
      if (!layout) {
        layout = rendition.manager && rendition.manager.layout;
      }
      if (!layout) return;

      if (!_originalFormat) {
        _originalFormat = layout.format.bind(layout);
      }

      if (_isSingleColumn) {
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
          return _originalFormat(contents, section, axis);
        };
      } else {
        layout.format = _originalFormat;
      }
    }

    function _updateColumnToggleLabel() {
      var btn = document.getElementById("column-toggle");
      if (btn) {
        btn.title = _isSingleColumn ? "單欄模式" : "多欄模式";
        if (_isSingleColumn) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      }
    }

    function _toggleColumnMode() {
      _isSingleColumn = !_isSingleColumn;
      localStorage.setItem(
        COLUMN_STORAGE_KEY,
        _isSingleColumn ? "true" : "false",
      );
      _applySingleColumn();
      _updateColumnToggleLabel();

      var loc = rendition.currentLocation();
      if (loc && loc.start && loc.start.cfi) {
        rendition.display(loc.start.cfi);
      } else {
        rendition.resize();
      }
    }

    rendition.on("attached", function () {
      _applySingleColumn();
    });

    // ---- Event binding ----
    _updateThemeButtons();
    _updateFontSizeLabel();
    _updateLineHeightLabel();
    _updateMarginLabel();
    _initFontSelect();
    _applyFont(_currentFont);

    // Theme buttons
    var themeBtns = document.querySelectorAll(
      "#settings-bar button[data-theme]",
    );
    for (var ti = 0; ti < themeBtns.length; ti++) {
      themeBtns[ti].addEventListener("click", function (e) {
        e.preventDefault();
        _setTheme(this.getAttribute("data-theme"));
      });
    }

    // Font select
    var fontSelect = document.getElementById("font-select");
    if (fontSelect) {
      fontSelect.addEventListener("change", function () {
        _setFont(this.value);
      });
    }

    // Font size
    var fsDown = document.getElementById("font-size-down");
    var fsUp = document.getElementById("font-size-up");
    if (fsDown) {
      fsDown.addEventListener("click", function (e) {
        e.preventDefault();
        _adjustFontSize(-1);
      });
    }
    if (fsUp) {
      fsUp.addEventListener("click", function (e) {
        e.preventDefault();
        _adjustFontSize(1);
      });
    }

    // Line height
    var lhBtn = document.getElementById("line-height-btn");
    if (lhBtn) {
      lhBtn.addEventListener("click", function (e) {
        e.preventDefault();
        _cycleLineHeight();
      });
    }

    // Margin
    var marginBtn = document.getElementById("margin-btn");
    if (marginBtn) {
      marginBtn.addEventListener("click", function (e) {
        e.preventDefault();
        _cycleMargin();
      });
    }

    // Column toggle
    var columnToggle = document.getElementById("column-toggle");
    if (columnToggle) {
      _updateColumnToggleLabel();
      columnToggle.addEventListener("click", function (e) {
        e.preventDefault();
        _toggleColumnMode();
      });
    }
  };
})();
