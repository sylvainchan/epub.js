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
			btn.textContent = _isSingleColumn ? "📖 單欄" : "📚 多欄";
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