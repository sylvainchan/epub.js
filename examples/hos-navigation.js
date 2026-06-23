/* eslint-disable */
// hos-navigation.js — 導航：Swipe / 窄螢幕偵測 / 箭嘴 / 鍵盤 / Resize
(function () {
  var H = window.hosReader;
  if (!H) return;

  H._initNavigation = function () {
    var book = H.book;
    var rendition = H.rendition;

    // ---- 窄螢幕偵測 ----
    var NARROW_BREAKPOINT = 768;
    function _isNarrowScreen() {
      return window.innerWidth <= NARROW_BREAKPOINT;
    }

    // ---- Swipe 翻頁（直接 attach listener 到 iframe document）----
    rendition.hooks.content.register(function (contents) {
      var doc = contents.document;
      if (!doc) return;

      var startX = 0,
        startY = 0,
        startTime = 0;
      var dragging = false;

      doc.addEventListener(
        "touchstart",
        function (e) {
          if (e.touches.length > 1) return;
          dragging = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          startTime = Date.now();
        },
        { passive: true },
      );

      doc.addEventListener(
        "touchend",
        function (e) {
          if (!dragging) return;
          dragging = false;
          var dx = e.changedTouches[0].clientX - startX;
          var dy = e.changedTouches[0].clientY - startY;
          if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
          var dt = Date.now() - startTime;
          var vel = dt > 0 ? Math.abs(dx) / dt : 0;
          if (Math.abs(dx) < 30 && vel < 0.3) return;
          var isRtl = book.package.metadata.direction === "rtl";
          if (dx > 0) {
            isRtl ? rendition.next() : rendition.prev();
          } else {
            isRtl ? rendition.prev() : rendition.next();
          }
        },
        { passive: true },
      );

      doc.addEventListener("touchcancel", function () {
        dragging = false;
      });

      // Mouse drag for desktop
      doc.addEventListener("mousedown", function (e) {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
      });

      doc.addEventListener("mouseup", function (e) {
        if (!dragging) return;
        dragging = false;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
        if (Math.abs(dx) < 30) return;
        var isRtl = book.package.metadata.direction === "rtl";
        if (dx > 0) {
          isRtl ? rendition.next() : rendition.prev();
        } else {
          isRtl ? rendition.prev() : rendition.next();
        }
      });
    });

    // ---- 箭嘴顯示 ----
    function _updateArrowVisibility() {
      var prev = document.getElementById("prev");
      var next = document.getElementById("next");
      if (_isNarrowScreen()) {
        prev.style.display = "none";
        next.style.display = "none";
      } else {
        prev.style.display = "";
        next.style.display = "";
      }
    }

    // ---- Resize debounce ----
    var _resizeTimeout = null;
    function _onResize() {
      if (_resizeTimeout) clearTimeout(_resizeTimeout);
      _resizeTimeout = setTimeout(function () {
        _updateArrowVisibility();
        rendition.resize();
      }, 200);
    }

    // ---- 鍵盤 ----
    var keyListener = function (e) {
      if ((e.keyCode || e.which) == 37) {
        book.package.metadata.direction === "rtl"
          ? rendition.next()
          : rendition.prev();
      }
      if ((e.keyCode || e.which) == 39) {
        book.package.metadata.direction === "rtl"
          ? rendition.prev()
          : rendition.next();
      }
    };

    // ---- Arrow buttons ----
    var next = document.getElementById("next");
    next.addEventListener(
      "click",
      function (e) {
        book.package.metadata.direction === "rtl"
          ? rendition.prev()
          : rendition.next();
        e.preventDefault();
      },
      false,
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
      false,
    );

    rendition.on("keyup", keyListener);
    document.addEventListener("keyup", keyListener, false);

    // ---- Relocated: 箭嘴 visibility ----
    rendition.on("relocated", function (location) {
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

    // ---- Init ----
    window.addEventListener("resize", _onResize);
    _updateArrowVisibility();
  };
})();
