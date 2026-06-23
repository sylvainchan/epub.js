(function () {
	var params =
		URLSearchParams &&
		new URLSearchParams(document.location.search.substring(1));
	var url =
		params && params.get("url") && decodeURIComponent(params.get("url"));
	var currentSectionIndex =
		params && params.get("loc") ? params.get("loc") : undefined;

	// ---- 自動儲存 CFI 同 Resume ----
	var STORAGE_KEY = "epub-cfi-" + (url || "./ex.epub");
	// URL 嘅 loc param 優先過 localStorage 嘅 saved CFI
	var savedCfi = !currentSectionIndex ? localStorage.getItem(STORAGE_KEY) : null;
	var startCfi = currentSectionIndex || savedCfi || undefined;

	var _saveTimeout = null;
	function _saveCurrentCfi() {
		try {
			var loc = rendition.currentLocation();
			if (loc && loc.start && loc.start.cfi) {
				localStorage.setItem(STORAGE_KEY, loc.start.cfi);
			}
		} catch (e) {
			// ignore quota / private-browsing errors
		}
	}
	function _debouncedSaveCfi() {
		if (_saveTimeout) clearTimeout(_saveTimeout);
		_saveTimeout = setTimeout(_saveCurrentCfi, 500);
	}
	// ---- End ----

	// ---- 窄螢幕偵測 ----
	var NARROW_BREAKPOINT = 768;
	function _isNarrowScreen() {
		return window.innerWidth <= NARROW_BREAKPOINT;
	}

	// Touch swipe 手勢（窄螢幕用）
	var _touchStartX = 0;
	var _touchStartY = 0;
	var _swipeThreshold = 50; // 最少滑動距離先當 swipe

	function _onTouchStart(e) {
		if (!_isNarrowScreen()) return;
		var t = e.touches[0];
		_touchStartX = t.clientX;
		_touchStartY = t.clientY;
	}

	function _onTouchEnd(e) {
		if (!_isNarrowScreen()) return;
		var t = e.changedTouches[0];
		var dx = t.clientX - _touchStartX;
		var dy = t.clientY - _touchStartY;

		// 垂直滑動太大就唔當 swipe（容許 scroll）
		if (Math.abs(dy) > Math.abs(dx)) return;
		if (Math.abs(dx) < _swipeThreshold) return;

		var isRtl = book.package.metadata.direction === "rtl";
		if (dx > 0) {
			// 向右滑 → 上一頁
			isRtl ? rendition.next() : rendition.prev();
		} else {
			// 向左滑 → 下一頁
			isRtl ? rendition.prev() : rendition.next();
		}
	}

	function _updateArrowVisibility() {
		var prev = document.getElementById("prev");
		var next = document.getElementById("next");
		if (_isNarrowScreen()) {
			// 窄螢幕：隱藏箭嘴，靠 swipe 翻頁
			prev.style.display = "none";
			next.style.display = "none";
		} else {
			prev.style.display = "";
			next.style.display = "";
		}
	}

	// Resize debounce
	var _resizeTimeout = null;
	function _onResize() {
		if (_resizeTimeout) clearTimeout(_resizeTimeout);
		_resizeTimeout = setTimeout(function () {
			_updateArrowVisibility();
			rendition.resize();
		}, 200);
	}
	// ---- End 窄螢幕 ----

	// Load the opf
	var book = ePub(url || "./ex.epub");
	var rendition = book.renderTo("viewer", {
		width: "100%",
		height: "100%",
		spread: "none",
		layout: "reflowable",
		manager: "default",
		flow: "paginated",
	});

	// ================================================================
	//  自訂面板：Theme / Font / Font Size / Line Height / Margin
	// ================================================================
	var PREF_PREFIX = "epub-pref-" + (url || "./ex.epub") + "-";

	// --- Theme（日間 / 夜間 / 懷舊）---
	var THEME_CSS = {
		day:   "body { background: #fff !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #333 !important; }",
		night: "body { background: #1a1a1a !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #ccc !important; }",
		sepia: "body { background: #f4ecd8 !important; } body, p, div, span, h1, h2, h3, h4, h5, h6 { color: #5b4636 !important; }"
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

	// 計絕對路徑：iframe 入面 relative URL 會指咗去 EPUB 內部，所以要用 absolute
	var _fontBaseUrl = window.location.href.replace(/\/[^/]*$/, "/");

	// 自訂 @font-face（examples/fonts/ 字型檔）
	var _customFontFaceCss =
		"@font-face { font-family: 'Chiron Hei HK'; src: url('" + _fontBaseUrl + "fonts/ChironHeiHK-Regular.ttf') format('truetype'); font-weight: normal; font-style: normal; }" +
		"@font-face { font-family: 'Chiron Sung HK'; src: url('" + _fontBaseUrl + "fonts/ChironSungHK-Regular.ttf') format('truetype'); font-weight: normal; font-style: normal; }" +
		"@font-face { font-family: 'LXGW WenKai TC'; src: url('" + _fontBaseUrl + "fonts/LXGWWenKaiTC-Regular.ttf') format('truetype'); font-weight: normal; font-style: normal; }" +
		"@font-face { font-family: 'Noto Serif HK'; src: url('" + _fontBaseUrl + "fonts/NotoSerifHK-Regular.ttf') format('truetype'); font-weight: normal; font-style: normal; }";

	// 每個 chapter iframe 注入 @font-face + 當前字型 CSS
	// 唔用 themes.registerCss 因為佢只 inject current/default theme，
	// 換章節時 "font-override" 唔係 current theme 所以唔會 re-apply
	rendition.hooks.content.register(function (contents) {
		if (_customFontFaceCss) {
			contents.addStylesheetCss(_customFontFaceCss, "custom-font-face");
		}
		if (_currentFont) {
			contents.addStylesheetCss(
				"body, p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre { " +
				"font-family: " + _currentFont + " !important; }",
				"font-override"
			);
		}
	});

	function _applyFont(family) {
		if (family) {
			// 遍歷所有已載入嘅 iframe 即時套用字型
			var contents = rendition.getContents();
			contents.forEach(function (c) {
				c.addStylesheetCss(
					"body, p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre { " +
					"font-family: " + family + " !important; }",
					"font-override"
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
	// --- End Font Family ---

	// --- Font Size ---
	var FONT_SIZES = [80, 90, 100, 110, 120, 140, 160, 180, 200];
	var _currentFontSize = parseInt(localStorage.getItem(PREF_PREFIX + "fontSize") || "100", 10);
	rendition.themes.fontSize(_currentFontSize + "%");

	function _updateFontSizeLabel() {
		var label = document.getElementById("font-size-label");
		if (label) {
			label.textContent = _currentFontSize + "%";
		}
	}

	function _adjustFontSize(delta) {
		var idx = FONT_SIZES.indexOf(_currentFontSize);
		if (idx === -1) idx = 2; // default 100% = index 2
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
	var _currentLineHeight = parseInt(localStorage.getItem(PREF_PREFIX + "lineHeight") || "1", 10);
	rendition.themes.override("line-height", LINE_HEIGHTS[_currentLineHeight], true);

	function _cycleLineHeight() {
		_currentLineHeight = (_currentLineHeight + 1) % LINE_HEIGHTS.length;
		localStorage.setItem(PREF_PREFIX + "lineHeight", _currentLineHeight);
		rendition.themes.override("line-height", LINE_HEIGHTS[_currentLineHeight], true);
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
		{ padding: "0 48px" }
	];
	var MARGIN_LABELS = ["邊距: 窄", "邊距: 標準", "邊距: 闊"];
	var _currentMargin = parseInt(localStorage.getItem(PREF_PREFIX + "margin") || "1", 10);
	rendition.themes.override("padding", MARGINS[_currentMargin].padding, true);

	function _cycleMargin() {
		_currentMargin = (_currentMargin + 1) % MARGINS.length;
		localStorage.setItem(PREF_PREFIX + "margin", _currentMargin);
		rendition.themes.override("padding", MARGINS[_currentMargin].padding, true);
		_updateMarginLabel();
	}

	function _updateMarginLabel() {
		var btn = document.getElementById("margin-btn");
		if (btn) {
			btn.title = MARGIN_LABELS[_currentMargin];
		}
	}
	// ================================================================

	// ---- 單欄 / 多欄切換 ----
	var COLUMN_STORAGE_KEY = "epub-single-col-" + (url || "./ex.epub");
	// 預設單欄，除非 localStorage 記錄咗 false
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
			// 強制一頁一欄：columnWidth 設到極大 → CSS 只出一欄
			layout.format = function (contents, section, axis) {
				if (this._flow === "paginated") {
					return contents.columns(this.width, this.height, 99999, 0, this.settings.direction);
				}
				return _originalFormat(contents, section, axis);
			};
		} else {
			// 還原原版 format → 多欄
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
		localStorage.setItem(COLUMN_STORAGE_KEY, _isSingleColumn ? "true" : "false");
		_applySingleColumn();
		_updateColumnToggleLabel();

		// 記錄當前位置，重新 display 令新嘅 columns 設定生效
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
	// ---- End 單欄 / 多欄切換 ----

	// 等 locations generate 完先 display，確保 saved CFI resume 準確
	book.ready.then(function () {
		return book.locations.generate(1000);
	}).then(function () {
		if (startCfi) {
			rendition.display(startCfi);
		} else {
			rendition.display();
		}
	});

	book.ready.then(function () {
		var next = document.getElementById("next");

		next.addEventListener(
			"click",
			function (e) {
				book.package.metadata.direction === "rtl"
					? rendition.prev()
					: rendition.next();
				e.preventDefault();
			},
			false
		);

		var prev = document.getElementById("prev");
		prev.addEventListener(
			"click",
			function (e) {
				book.package.metadata.direction === "rtl"
					? rendition.next()
					: rendition.prev();
				e.preventDefault();
			},
			false
		);

		var keyListener = function (e) {
			// Left Key
			if ((e.keyCode || e.which) == 37) {
				book.package.metadata.direction === "rtl"
					? rendition.next()
					: rendition.prev();
			}

			// Right Key
			if ((e.keyCode || e.which) == 39) {
				book.package.metadata.direction === "rtl"
					? rendition.prev()
					: rendition.next();
			}
		};

		rendition.on("keyup", keyListener);
		document.addEventListener("keyup", keyListener, false);

		// ---- 窄螢幕 touch swipe + resize ----
		var viewerEl = document.getElementById("viewer");
		viewerEl.addEventListener("touchstart", _onTouchStart, { passive: true });
		viewerEl.addEventListener("touchend", _onTouchEnd, { passive: true });
		window.addEventListener("resize", _onResize);

		// 初始檢查箭嘴顯示狀態
		_updateArrowVisibility();
		// ---- End ----

		// ---- 單欄/多欄切換掣 ----
		var columnToggle = document.getElementById("column-toggle");
		if (columnToggle) {
			_updateColumnToggleLabel();
			columnToggle.addEventListener("click", function (e) {
				e.preventDefault();
				_toggleColumnMode();
			});
		}
		// ---- End ----

		// ---- 自訂面板 event binding ----
		_updateThemeButtons();
		_updateFontSizeLabel();
		_updateLineHeightLabel();
		_updateMarginLabel();
		_initFontSelect();

		// 首次套用字型（等 content load 咗先 inject CSS）
		_applyFont(_currentFont);

		// Theme buttons
		var themeBtns = document.querySelectorAll("#settings-bar button[data-theme]");
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
		// ---- End 自訂面板 ----
	});

	rendition.on("rendered", function (section) {
		var current = book.navigation && book.navigation.get(section.href);

		if (current) {
			var $select = document.getElementById("toc");
			var $selected = $select.querySelector("option[selected]");
			if ($selected) {
				$selected.removeAttribute("selected");
			}

			var $options = $select.querySelectorAll("option");
			for (var i = 0; i < $options.length; ++i) {
				let selected = $options[i].getAttribute("ref") === current.href;
				if (selected) {
					$options[i].setAttribute("selected", "");
				}
			}
		}
	});

	rendition.on("relocated", function (location) {
		// 每次換頁自動儲存 CFI（debounce 500ms 避免頻繁寫入）
		_debouncedSaveCfi();

		// eslint-disable-next-line no-console
		console.log(location);

		var next =
			book.package.metadata.direction === "rtl"
				? document.getElementById("prev")
				: document.getElementById("next");
		var prev =
			book.package.metadata.direction === "rtl"
				? document.getElementById("next")
				: document.getElementById("prev");

		// 窄螢幕模式下箭嘴已隱藏，唔需要改 visibility
		if (!_isNarrowScreen()) {
			if (location.atEnd) {
				next.style.visibility = "hidden";
			} else {
				next.style.visibility = "visible";
			}

			if (location.atStart) {
				prev.style.visibility = "hidden";
			} else {
				prev.style.visibility = "visible";
			}
		}
	});

	rendition.on("layout", function (layout) {
		let viewer = document.getElementById("viewer");

		if (layout.spread) {
			viewer.classList.remove("single");
		} else {
			viewer.classList.add("single");
		}
	});

	window.addEventListener("beforeunload", function () {
		// 離開頁面前最後一次 save CFI（唔 debounce，直接寫）
		_saveCurrentCfi();
	});

	window.addEventListener("unload", function () {
		// eslint-disable-next-line no-console
		console.log("unloading");
		this.book.destroy();
	});

	book.loaded.navigation.then(function (toc) {
		var $select = document.getElementById("toc"),
				docfrag = document.createDocumentFragment();

		toc.forEach(function (chapter) {
			var option = document.createElement("option");
			option.textContent = chapter.label;
			option.setAttribute("ref", chapter.href);

			docfrag.appendChild(option);
		});

		$select.appendChild(docfrag);

		$select.onchange = function () {
			var index = $select.selectedIndex,
					url = $select.options[index].getAttribute("ref");
			rendition.display(url);
			return false;
		};
	});
})();