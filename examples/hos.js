/* eslint-disable */
// hos.js — 核心：params、book/rendition 初始化、CFI save/resume、TOC、lifecycle
(function () {
  // ---- URL params ----
  var params =
    URLSearchParams &&
    new URLSearchParams(document.location.search.substring(1));
  var url =
    params && params.get("url") && decodeURIComponent(params.get("url"));

  // ---- 自動儲存 CFI 同 Resume ----
  var STORAGE_KEY = "epub-cfi-" + (url || "./ex.epub");
  var savedCfi =
    !params || !params.get("loc") ? localStorage.getItem(STORAGE_KEY) : null;
  var startCfi = (params && params.get("loc")) || savedCfi || undefined;

  var _saveTimeout = null;
  function _saveCurrentCfi(rendition) {
    try {
      var loc = rendition.currentLocation();
      if (loc && loc.start && loc.start.cfi) {
        localStorage.setItem(STORAGE_KEY, loc.start.cfi);
      }
    } catch (e) {
      /* ignore */
    }
  }
  function _debouncedSaveCfi(rendition) {
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(function () {
      _saveCurrentCfi(rendition);
    }, 500);
  }

  // ---- Book + Rendition ----
  var book = ePub(url || "./ex.epub");
  var rendition = book.renderTo("viewer", {
    width: "100%",
    height: "100%",
    spread: "none",
    layout: "reflowable",
    manager: "default",
    flow: "paginated",
  });

  // ---- 暴露畀其他 module ----
  window.hosReader = {
    book: book,
    rendition: rendition,
    url: url,
  };

  // ---- Display ----
  book.ready
    .then(function () {
      return book.locations.generate(1000);
    })
    .then(function () {
      if (startCfi) {
        rendition.display(startCfi);
      } else {
        rendition.display();
      }
    });

  // ---- Wire up modules ----
  book.ready.then(function () {
    if (window.hosReader._initSettings) window.hosReader._initSettings();
    if (window.hosReader._initNavigation) window.hosReader._initNavigation();
  });

  // ---- TOC sync ----
  rendition.on("rendered", function (section) {
    var current = book.navigation && book.navigation.get(section.href);
    if (current) {
      var $select = document.getElementById("toc");
      var $selected = $select.querySelector("option[selected]");
      if ($selected) $selected.removeAttribute("selected");
      var $options = $select.querySelectorAll("option");
      for (var i = 0; i < $options.length; ++i) {
        if ($options[i].getAttribute("ref") === current.href) {
          $options[i].setAttribute("selected", "");
        }
      }
    }
  });

  // ---- CFI auto-save on page turn ----
  rendition.on("relocated", function (location) {
    _debouncedSaveCfi(rendition);
    console.log(location);
  });

  // ---- Spread class ----
  rendition.on("layout", function (layout) {
    var viewer = document.getElementById("viewer");
    if (layout.spread) {
      viewer.classList.remove("single");
    } else {
      viewer.classList.add("single");
    }
  });

  // ---- Save on exit ----
  window.addEventListener("beforeunload", function () {
    _saveCurrentCfi(rendition);
  });

  window.addEventListener("unload", function () {
    console.log("unloading");
    book.destroy();
  });

  // ---- TOC dropdown ----
  book.loaded.navigation.then(function (toc) {
    var $select = document.getElementById("toc");
    var docfrag = document.createDocumentFragment();
    toc.forEach(function (chapter) {
      var option = document.createElement("option");
      option.textContent = chapter.label;
      option.setAttribute("ref", chapter.href);
      docfrag.appendChild(option);
    });
    $select.appendChild(docfrag);
    $select.onchange = function () {
      var index = $select.selectedIndex;
      var url = $select.options[index].getAttribute("ref");
      rendition.display(url);
      return false;
    };
  });
})();
