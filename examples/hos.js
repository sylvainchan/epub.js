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