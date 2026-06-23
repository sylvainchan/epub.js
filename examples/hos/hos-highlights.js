/* eslint-disable */
// hos-highlights.js — Highlight / Note / Underline、CFI 標註持久化、Popup UI
(function () {
  // =====================================================================
  // 常數
  // =====================================================================
  var HIGHLIGHT_COLORS = [
    { name: "黃", cls: "hl-yellow", bg: "#ffeb3b", label: "🟡" },
    { name: "綠", cls: "hl-green", bg: "#a5d6a7", label: "🟢" },
    { name: "藍", cls: "hl-cyan", bg: "#80deea", label: "🔵" },
    { name: "粉", cls: "hl-pink", bg: "#f48fb1", label: "🩷" },
    { name: "橙", cls: "hl-orange", bg: "#ffcc80", label: "🟠" },
  ];

  // =====================================================================
  // HighlightStore — localStorage 持久化
  // =====================================================================
  function _createHighlightStore(storageKey) {
    var cache = null;

    function load() {
      if (cache !== null) return cache;
      try {
        var raw = localStorage.getItem(storageKey);
        cache = raw ? JSON.parse(raw) : [];
      } catch (_e) {
        cache = [];
      }
      return cache;
    }

    function save(data) {
      cache = data;
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (_e) {
        /* ignore quota exceeded */
      }
    }

    function add(item) {
      var list = load();
      // 避免重複（同一個 cfi）
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i].cfi === item.cfi) {
          list.splice(i, 1);
        }
      }
      list.push(item);
      save(list);
    }

    function removeByCfi(cfi) {
      var list = load();
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i].cfi === cfi) {
          list.splice(i, 1);
          break;
        }
      }
      save(list);
    }

    function findByCfi(cfi) {
      var list = load();
      for (var i = 0; i < list.length; i++) {
        if (list[i].cfi === cfi) return list[i];
      }
      return null;
    }

    function getAll() {
      return load().slice();
    }

    return {
      add: add,
      removeByCfi: removeByCfi,
      findByCfi: findByCfi,
      getAll: getAll,
    };
  }

  // =====================================================================
  // Popup UI Builder
  // =====================================================================
  function _createPopup() {
    var el = document.createElement("div");
    el.id = "hos-hl-popup";
    el.className = "hos-hl-popup";
    el.style.cssText =
      "position:absolute;z-index:9999;display:none;background:#fff;border-radius:8px;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.18);padding:8px;user-select:none;" +
      "font-size:14px;line-height:1;white-space:nowrap;border:1px solid #e0e0e0;";

    // 顏色按鈕列
    var colorRow = document.createElement("div");
    colorRow.style.cssText = "display:flex;gap:4px;margin-bottom:6px;align-items:center;";
    for (var c = 0; c < HIGHLIGHT_COLORS.length; c++) {
      var colorBtn = document.createElement("button");
      colorBtn.textContent = HIGHLIGHT_COLORS[c].label;
      colorBtn.setAttribute("data-hl-color", HIGHLIGHT_COLORS[c].cls);
      colorBtn.setAttribute("title", "螢光筆 " + HIGHLIGHT_COLORS[c].name);
      colorBtn.style.cssText =
        "border:none;background:none;cursor:pointer;font-size:18px;padding:2px 4px;" +
        "border-radius:4px;transition:background .15s;";
      colorBtn.addEventListener("mouseenter", function () { this.style.background = "#f0f0f0"; });
      colorBtn.addEventListener("mouseleave", function () { this.style.background = "none"; });
      colorRow.appendChild(colorBtn);
    }

    // 分隔線
    var sep = document.createElement("div");
    sep.style.cssText = "height:1px;background:#e0e0e0;margin:4px 0;";

    // 操作按鈕列
    var actionRow = document.createElement("div");
    actionRow.style.cssText = "display:flex;gap:4px;";

    var noteBtn = document.createElement("button");
    noteBtn.textContent = "📝 筆記";
    noteBtn.setAttribute("data-action", "note");
    noteBtn.style.cssText =
      "border:1px solid #ddd;background:#fafafa;cursor:pointer;padding:4px 10px;" +
      "border-radius:4px;font-size:13px;color:#555;transition:background .15s;";
    noteBtn.addEventListener("mouseenter", function () { this.style.background = "#e3f2fd"; });
    noteBtn.addEventListener("mouseleave", function () { this.style.background = "#fafafa"; });

    var undoBtn = document.createElement("button");
    undoBtn.textContent = "↩️ 移除";
    undoBtn.setAttribute("data-action", "remove");
    undoBtn.style.cssText = noteBtn.style.cssText;
    undoBtn.addEventListener("mouseenter", function () { this.style.background = "#ffebee"; });
    undoBtn.addEventListener("mouseleave", function () { this.style.background = "#fafafa"; });

    actionRow.appendChild(noteBtn);
    actionRow.appendChild(undoBtn);

    el.appendChild(colorRow);
    el.appendChild(sep);
    el.appendChild(actionRow);

    // 預設隱藏
    document.body.appendChild(el);
    return el;
  }

  // =====================================================================
  // Note Editor Modal
  // =====================================================================
  function _createNoteEditor() {
    var overlay = document.createElement("div");
    overlay.className = "hos-note-overlay";
    overlay.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.35);" +
      "z-index:10000;display:none;justify-content:center;align-items:center;";

    var box = document.createElement("div");
    box.style.cssText =
      "background:#fff;border-radius:12px;padding:20px;width:320px;max-width:90vw;" +
      "box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:12px;";

    var title = document.createElement("div");
    title.textContent = "✏️ 新增筆記";
    title.style.cssText = "font-size:16px;font-weight:600;color:#333;";

    var preview = document.createElement("div");
    preview.style.cssText =
      "font-size:13px;color:#777;max-height:48px;overflow:hidden;line-height:1.4;" +
      "padding:8px;background:#f5f5f5;border-radius:6px;border-left:3px solid #ffcc80;";

    var textarea = document.createElement("textarea");
    textarea.placeholder = "輸入筆記內容…";
    textarea.style.cssText =
      "width:100%;height:100px;border:1px solid #ddd;border-radius:6px;padding:10px;" +
      "font-size:14px;resize:vertical;font-family:inherit;box-sizing:border-box;";

    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";

    var cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText =
      "padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;";
    cancelBtn.addEventListener("click", function () { overlay.style.display = "none"; });

    var saveBtn = document.createElement("button");
    saveBtn.textContent = "儲存";
    saveBtn.style.cssText =
      "padding:8px 16px;border:none;border-radius:6px;background:#1976d2;color:#fff;" +
      "cursor:pointer;font-size:14px;font-weight:500;";

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);

    box.appendChild(title);
    box.appendChild(preview);
    box.appendChild(textarea);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.style.display = "none";
    });

    document.body.appendChild(overlay);

    return {
      show: function (selectedText, onSave) {
        preview.textContent = "「" + selectedText.substring(0, 120) + "」";
        textarea.value = "";
        overlay.style.display = "flex";
        textarea.focus();
        saveBtn.onclick = function () {
          var note = textarea.value.trim();
          if (note) {
            onSave(note);
          }
          overlay.style.display = "none";
        };
        cancelBtn.onclick = function () {
          overlay.style.display = "none";
        };
      },
      hide: function () {
        overlay.style.display = "none";
      },
    };
  }

  // =====================================================================
  // Highlight CSS 注入（注入到每個 content iframe）
  // =====================================================================
  function _buildHighlightCss() {
    var css = "";
    // 為每個顏色生成 CSS rule
    for (var i = 0; i < HIGHLIGHT_COLORS.length; i++) {
      var c = HIGHLIGHT_COLORS[i];
      css +=
        "." + c.cls + " { background-color: " + c.bg + " !important; " +
        "border-radius: 2px; padding: 0 1px; cursor: pointer; transition: background-color .2s; }\n";
      css +=
        "." + c.cls + ":hover { filter: brightness(0.92); }\n";
    }
    // 附有筆記嘅 highlight 加底線
    css +=
      ".hl-has-note { border-bottom: 2px dotted #e91e63 !important; }\n";
    return css;
  }

  // =====================================================================
  // 主入口 — _initHighlights
  // =====================================================================
  window.hosReader = window.hosReader || {};

  window.hosReader._initHighlights = function () {
    var H = window.hosReader;
    if (!H || !H.rendition) return;
    var rendition = H.rendition;
    var url = H.url || "./ex.epub";
    var STORAGE_KEY = "epub-hl-" + url;

    var store = _createHighlightStore(STORAGE_KEY);
    var popup = _createPopup();
    var noteEditor = _createNoteEditor();
    var highlightCss = _buildHighlightCss();

    // ---- 內部狀態 ----
    var currentSelectionCfi = null;
    var currentSelectionText = "";
    var currentContents = null;
    var _restored = false;

    // ---- 隱藏 popup（點其他地方）----
    document.addEventListener("click", function (e) {
      if (popup.style.display !== "none" && !popup.contains(e.target)) {
        popup.style.display = "none";
      }
    });
    document.addEventListener("touchend", function (e) {
      setTimeout(function () {
        if (popup.style.display !== "none" && !popup.contains(e.target)) {
          popup.style.display = "none";
        }
      }, 300);
    });

    // ---- 注入 highlight CSS 到每個 content ----
    rendition.hooks.content.register(function (contents) {
      contents.addStylesheetCss(highlightCss, "hos-highlights");
      // 首次恢復已儲存嘅 highlight
      if (!_restored) {
        _restored = true;
        _restoreHighlightsForContents(contents, store, rendition);
      }
    });

    // ---- Popup 位置計算 ----
    function _positionPopup(range, iframeWin) {
      var rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        popup.style.display = "none";
        return;
      }

      // 取得 iframe 相對於主 window 嘅偏移
      var iframe = iframeWin.frameElement;
      var iframeRect = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 };

      var left = iframeRect.left + rect.left + rect.width / 2;
      var top = iframeRect.top + rect.top - 50;

      // 屏幕邊界檢查
      var popupW = 260; // 估計 popup 寬度
      if (left - popupW / 2 < 10) left = 10 + popupW / 2;
      if (left + popupW / 2 > window.innerWidth - 10) left = window.innerWidth - 10 - popupW / 2;
      if (top < 10) top = iframeRect.top + rect.bottom + 10; // 如果上面唔夠位，放下面

      popup.style.left = left + "px";
      popup.style.top = top + "px";
      popup.style.transform = "translateX(-50%)";
      popup.style.display = "block";
    }

    // ---- Popup 按鈕事件 ----
    // 顏色按鈕：highlight
    var colorBtns = popup.querySelectorAll("[data-hl-color]");
    for (var i = 0; i < colorBtns.length; i++) {
      colorBtns[i].addEventListener("click", function (e) {
        e.stopPropagation();
        var colorCls = this.getAttribute("data-hl-color");
        _applyHighlight(currentSelectionCfi, currentSelectionText, colorCls, "");
        popup.style.display = "none";
      });
    }

    // 筆記按鈕
    var noteAction = popup.querySelector("[data-action='note']");
    if (noteAction) {
      noteAction.addEventListener("click", function (e) {
        e.stopPropagation();
        popup.style.display = "none";
        noteEditor.show(currentSelectionText, function (noteText) {
          _applyHighlight(currentSelectionCfi, currentSelectionText, "hl-yellow", noteText);
        });
      });
    }

    // 移除按鈕
    var removeAction = popup.querySelector("[data-action='remove']");
    if (removeAction) {
      removeAction.addEventListener("click", function (e) {
        e.stopPropagation();
        _removeHighlight(currentSelectionCfi);
        popup.style.display = "none";
      });
    }

    // ---- Highlight 操作 ----
    function _applyHighlight(cfi, text, colorCls, note) {
      if (!cfi) return;

      var existing = store.findByCfi(cfi);

      // 如果已有 highlight，先移除舊嘅
      if (existing) {
        rendition.annotations.remove(cfi, "highlight");
      }

      // 組裝 className
      var className = colorCls;
      if (note) {
        className += " hl-has-note";
      }

      // 組裝 styles（背景色）
      var bgColor = "";
      for (var j = 0; j < HIGHLIGHT_COLORS.length; j++) {
        if (HIGHLIGHT_COLORS[j].cls === colorCls) {
          bgColor = HIGHLIGHT_COLORS[j].bg;
          break;
        }
      }

      var styles = {};
      if (bgColor) {
        styles["background-color"] = bgColor;
      }

      // 調用 epub.js annotations API
      rendition.annotations.highlight(
        cfi,
        { text: text, note: note, color: colorCls, timestamp: Date.now() },
        null,
        className,
        styles,
      );

      // 儲存到 localStorage
      store.add({
        cfi: cfi,
        text: text,
        note: note,
        color: colorCls,
        timestamp: Date.now(),
      });
    }

    function _removeHighlight(cfi) {
      if (!cfi) return;
      rendition.annotations.remove(cfi, "highlight");
      store.removeByCfi(cfi);
    }

    // ---- 監聽文字選取（用 epub.js built-in "selected" event + CFI）----
    // epub.js 內部已監聽 selectionchange/mouseup → emit "selected" 連同 CFI
    rendition.on("selected", function (cfiRange, contents) {
      if (!cfiRange) return;

      var win = contents.window || (contents.document && contents.document.defaultView);
      if (!win) return;

      var sel = win.getSelection();
      if (!sel || sel.isCollapsed) return;

      var text = sel.toString().trim();
      if (!text) return;

      var range = sel.getRangeAt(0);
      if (!range) return;

      currentSelectionCfi = cfiRange;
      currentSelectionText = text;
      currentContents = contents;

      _positionPopup(range, win);
    });

    // ---- 隱藏 popup（當選取被清除時）----
    rendition.hooks.content.register(function (contents) {
      var doc = contents.document;
      if (!doc) return;

      doc.addEventListener("mouseup", function () {
        setTimeout(function () {
          var win = contents.window || (contents.document && contents.document.defaultView);
          var sel = win ? win.getSelection() : null;
          if (!sel || sel.isCollapsed) {
            popup.style.display = "none";
          }
        }, 10);
      });

      doc.addEventListener("touchend", function () {
        setTimeout(function () {
          var win = contents.window || (contents.document && contents.document.defaultView);
          var sel = win ? win.getSelection() : null;
          if (!sel || sel.isCollapsed) {
            popup.style.display = "none";
          }
        }, 300);
      });
    });

    // ---- 恢復已儲存 highlight（每當 content 加載時）----
    function _restoreHighlightsForContents(contents, highlightStore, rend) {
      var allItems = highlightStore.getAll();
      if (allItems.length === 0) return;

      // 延遲確保 content 已完全 render
      setTimeout(function () {
        for (var i = 0; i < allItems.length; i++) {
          var item = allItems[i];
          var className = item.color;
          if (item.note) {
            className += " hl-has-note";
          }

          var bgColor = "";
          for (var j = 0; j < HIGHLIGHT_COLORS.length; j++) {
            if (HIGHLIGHT_COLORS[j].cls === item.color) {
              bgColor = HIGHLIGHT_COLORS[j].bg;
              break;
            }
          }

          var styles = {};
          if (bgColor) {
            styles["background-color"] = bgColor;
          }

          try {
            rend.annotations.highlight(
              item.cfi,
              { text: item.text, note: item.note, color: item.color, timestamp: item.timestamp },
              null,
              className,
              styles,
            );
          } catch (_e) {
            /* CFI 唔對應當前 content，跳過 */
          }
        }
      }, 300);
    }

    // ---- 點擊已有 highlight 顯示筆記 ----
    rendition.hooks.content.register(function (contents) {
      var doc = contents.document;
      if (!doc) return;

      doc.addEventListener("click", function (e) {
        var target = e.target;
        // 檢查係咪 highlight element
        var isHl = false;
        for (var j = 0; j < HIGHLIGHT_COLORS.length; j++) {
          if (target.classList && target.classList.contains(HIGHLIGHT_COLORS[j].cls)) {
            isHl = true;
            break;
          }
        }
        if (!isHl) return;

        // 取得 CFI
        var cfi;
        try {
          cfi = contents.cfiFromNode(target);
        } catch (_e) {
          return;
        }
        if (!cfi) return;

        var item = store.findByCfi(cfi);
        if (item && item.note) {
          _showNoteTooltip(item, e, contents.window || contents.document.defaultView);
        }
      });
    });

    // ---- Note tooltip ----
    var _noteTooltip = null;
    function _showNoteTooltip(item, event, win) {
      if (_noteTooltip) {
        _noteTooltip.parentNode && _noteTooltip.parentNode.removeChild(_noteTooltip);
      }

      var tip = document.createElement("div");
      tip.style.cssText =
        "position:absolute;z-index:10001;background:#fffde7;border:1px solid #f9a825;" +
        "border-radius:8px;padding:10px 14px;max-width:280px;font-size:13px;color:#555;" +
        "box-shadow:0 4px 12px rgba(0,0,0,.15);line-height:1.5;word-break:break-word;";
      tip.textContent = "📝 " + item.note;

      var rect = event.target.getBoundingClientRect();
      var iframe = win.frameElement;
      var iframeRect = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 };

      tip.style.left = (iframeRect.left + rect.left) + "px";
      tip.style.top = (iframeRect.top + rect.bottom + 6) + "px";

      document.body.appendChild(tip);
      _noteTooltip = tip;

      // 3 秒後自動消失
      setTimeout(function () {
        if (_noteTooltip === tip) {
          tip.parentNode && tip.parentNode.removeChild(tip);
          _noteTooltip = null;
        }
      }, 3000);

      // 點其他地方消失
      var dismiss = function () {
        if (_noteTooltip === tip) {
          tip.parentNode && tip.parentNode.removeChild(tip);
          _noteTooltip = null;
        }
        document.removeEventListener("click", dismiss);
      };
      setTimeout(function () {
        document.addEventListener("click", dismiss);
      }, 100);
    }
  };
})();
