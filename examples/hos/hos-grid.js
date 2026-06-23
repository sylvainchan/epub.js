/* eslint-disable */
// hos-grid.js — 九宮格 Tap Zone：coordinate-based hit-test（無 DOM overlay）
// Swipe gesture 不受影響、highlight 共存
(function () {
  // =====================================================================
  // 可用動作定義
  // =====================================================================
  var ACTIONS = {
    prev: { id: "prev", label: "上一頁", icon: "◀" },
    next: { id: "next", label: "下一頁", icon: "▶" },
    toc: { id: "toc", label: "目錄", icon: "📑" },
    settings: { id: "settings", label: "功能列", icon: "⚙️" },
    gridCfg: { id: "gridCfg", label: "網格設定", icon: "⊞" },
    none: { id: "none", label: "無（穿透）", icon: "—" },
  };

  // Highlight CSS class 列表（同 hos-highlights.js 同步）
  var HL_CLASSES = ["hl-yellow", "hl-green", "hl-cyan", "hl-pink", "hl-orange"];

  // 預設網格配置（3x3 = 9 格，row-major）
  var DEFAULT_GRID = [
    "prev",
    "settings",
    "next",
    "prev",
    "none",
    "next",
    "prev",
    "gridCfg",
    "next",
  ];

  // =====================================================================
  // GridStore — localStorage 持久化
  // =====================================================================
  function _createGridStore(storageKey) {
    function load() {
      try {
        var raw = localStorage.getItem(storageKey);
        if (raw) {
          var arr = JSON.parse(raw);
          if (arr.length === 9) return arr;
        }
      } catch (_e) {
        /* ignore */
      }
      return DEFAULT_GRID.slice();
    }

    function save(config) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
      } catch (_e) {
        /* ignore */
      }
    }

    return { load: load, save: save };
  }

  // =====================================================================
  // Grid Config Panel（設定 9 格動作嘅 UI）
  // =====================================================================
  function _createConfigPanel(onSave) {
    var overlay = document.createElement("div");
    overlay.className = "hos-grid-config-overlay";
    overlay.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);" +
      "z-index:10000;display:none;justify-content:center;align-items:center;";

    var panel = document.createElement("div");
    panel.style.cssText =
      "background:#fff;border-radius:16px;padding:20px 24px;width:340px;max-width:90vw;" +
      "box-shadow:0 8px 32px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:16px;" +
      "max-height:90vh;overflow-y:auto;";

    var header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;";

    var title = document.createElement("span");
    title.textContent = "⊞ 九宮格動作設定";
    title.style.cssText = "font-size:16px;font-weight:600;color:#333;";

    var hint = document.createElement("span");
    hint.textContent = "點擊格仔設定動作";
    hint.style.cssText = "font-size:12px;color:#999;";

    header.appendChild(title);
    header.appendChild(hint);

    // 3x3 grid preview
    var gridPreview = document.createElement("div");
    gridPreview.style.cssText =
      "display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr;" +
      "gap:6px;aspect-ratio:3/4;background:#f0f0f0;border-radius:10px;padding:8px;";

    var cellSelects = [];
    for (var i = 0; i < 9; i++) {
      var cell = document.createElement("div");
      cell.style.cssText =
        "display:flex;align-items:center;justify-content:center;" +
        "background:#fff;border-radius:8px;border:2px dashed #ddd;position:relative;cursor:pointer;" +
        "min-height:56px;transition:border-color .2s;";

      var select = document.createElement("select");
      select.setAttribute("data-cell", String(i));
      select.style.cssText =
        "width:100%;height:100%;border:none;background:transparent;font-size:18px;" +
        "text-align:center;cursor:pointer;-webkit-appearance:none;-moz-appearance:none;" +
        "appearance:none;padding:0;";

      var actionKeys = Object.keys(ACTIONS);
      for (var k = 0; k < actionKeys.length; k++) {
        var act = ACTIONS[actionKeys[k]];
        var opt = document.createElement("option");
        opt.value = act.id;
        opt.textContent = act.icon + " " + act.label;
        select.appendChild(opt);
      }

      cell.appendChild(select);
      gridPreview.appendChild(cell);
      cellSelects.push(select);
    }

    // 按鈕列
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";

    var resetBtn = document.createElement("button");
    resetBtn.textContent = "還原預設";
    resetBtn.style.cssText =
      "padding:8px 14px;border:1px solid #ddd;border-radius:8px;background:#fff;" +
      "cursor:pointer;font-size:13px;color:#888;";
    resetBtn.addEventListener("click", function () {
      for (var ri = 0; ri < 9; ri++) {
        cellSelects[ri].value = DEFAULT_GRID[ri];
      }
    });

    var saveBtn = document.createElement("button");
    saveBtn.textContent = "儲存";
    saveBtn.style.cssText =
      "padding:8px 18px;border:none;border-radius:8px;background:#1976d2;color:#fff;" +
      "cursor:pointer;font-size:14px;font-weight:500;";

    var cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = resetBtn.style.cssText;

    cancelBtn.addEventListener("click", function () {
      overlay.style.display = "none";
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.style.display = "none";
    });

    btnRow.appendChild(resetBtn);
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);

    panel.appendChild(header);
    panel.appendChild(gridPreview);
    panel.appendChild(btnRow);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function show(currentConfig) {
      for (var i = 0; i < 9; i++) {
        cellSelects[i].value = currentConfig[i];
      }
      overlay.style.display = "flex";
      saveBtn.onclick = function () {
        var newConfig = [];
        for (var j = 0; j < 9; j++) {
          newConfig.push(cellSelects[j].value);
        }
        onSave(newConfig);
        overlay.style.display = "none";
      };
    }

    function hide() {
      overlay.style.display = "none";
    }

    return { show: show, hide: hide };
  }

  // =====================================================================
  // Coordinate-based hit-test
  // =====================================================================
  function _getCellIndex(clientX, clientY) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    // 底部留 56px 畀 bottom bar + safe area
    var usableH = h - 56;
    var col = Math.floor(clientX / (w / 3));
    var row = Math.floor(clientY / (usableH / 3));
    if (col < 0) col = 0;
    if (col > 2) col = 2;
    if (row < 0) row = 0;
    if (row > 2) row = 2;
    return row * 3 + col;
  }

  function _isHighlightTarget(target) {
    if (!target || !target.classList) return false;
    for (var i = 0; i < HL_CLASSES.length; i++) {
      if (target.classList.contains(HL_CLASSES[i])) return true;
    }
    return false;
  }

  // =====================================================================
  // 主入口 — _initGrid
  // =====================================================================
  window.hosReader = window.hosReader || {};

  window.hosReader._initGrid = function () {
    var H = window.hosReader;
    if (!H || !H.rendition) return;
    var rendition = H.rendition;
    var STORAGE_KEY = H._makeStorageKey("grid");

    var store = _createGridStore(STORAGE_KEY);
    var config = store.load();

    // ---- Config Panel ----
    function _onConfigSave(newConfig) {
      config = newConfig;
      store.save(config);
    }

    var configPanel = _createConfigPanel(_onConfigSave);

    // ---- 動作執行 ----
    function _executeAction(actionId) {
      switch (actionId) {
        case "prev":
          H._isRtl() ? rendition.next() : rendition.prev();
          break;
        case "next":
          H._isRtl() ? rendition.prev() : rendition.next();
          break;
        case "toc":
          var toc = document.getElementById("toc");
          if (toc) toc.classList.toggle("hidden");
          break;
        case "settings":
          var ov = document.getElementById("settings-overlay");
          if (ov) ov.classList.toggle("show");
          break;
        case "gridCfg":
          configPanel.show(config);
          break;
        default:
          break;
      }
    }

    // ---- 注入 click handler 到每個 content iframe document ----
    rendition.hooks.content.register(function (contents) {
      var doc = contents.document;
      if (!doc) return;

      doc.addEventListener(
        "click",
        function (e) {
          // 唔干擾 highlight 點擊（click on highlight → show note）
          if (_isHighlightTarget(e.target)) return;

          // 如果有文字選取 → skip grid action（畀 highlight popup 處理）
          var win =
            contents.window ||
            (contents.document && contents.document.defaultView);
          var sel = win ? win.getSelection() : null;
          if (sel && !sel.isCollapsed && sel.toString().trim()) return;

          // 計算 iframe 內 click 嘅絕對坐標
          var iframe = win ? win.frameElement : null;
          var iframeRect = iframe
            ? iframe.getBoundingClientRect()
            : { left: 0, top: 0 };
          var absX = iframeRect.left + e.clientX;
          var absY = iframeRect.top + e.clientY;

          var index = _getCellIndex(absX, absY);
          var actionId = config[index];

          if (actionId && actionId !== "none") {
            e.stopPropagation();
            e.preventDefault();
            _executeAction(actionId);
          }
          // actionId === "none" → event passes through（text selection, links 等）
        },
        true,
      );
    });

    // ---- 暴露 API ----
    window.hosReader.grid = {
      showConfig: function () {
        configPanel.show(config);
      },
      setCell: function (index, actionId) {
        if (index >= 0 && index < 9 && ACTIONS[actionId]) {
          config[index] = actionId;
          store.save(config);
        }
      },
      getConfig: function () {
        return config.slice();
      },
    };
  };
})();
