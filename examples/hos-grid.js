/* eslint-disable */
// hos-grid.js — 九宮格 Tap Zone：3x3 grid overlay、可設定單元格動作、localStorage 持久化
(function () {
  // =====================================================================
  // 可用動作定義
  // =====================================================================
  var ACTIONS = {
    prev:    { id: "prev",    label: "上一頁",     icon: "◀" },
    next:    { id: "next",    label: "下一頁",     icon: "▶" },
    toc:     { id: "toc",     label: "目錄",        icon: "📑" },
    settings:{ id: "settings",label: "功能列",     icon: "⚙️" },
    gridCfg: { id: "gridCfg", label: "網格設定",   icon: "⊞" },
    none:    { id: "none",    label: "無（穿透）", icon: "—" },
  };

  // =====================================================================
  // 預設網格配置（3x3 = 9 格，row-major）
  //   [0] prev     [1] settings  [2] next
  //   [3] prev     [4] none      [5] next
  //   [6] prev     [7] gridCfg   [8] next
  var DEFAULT_GRID = [
    "prev", "settings", "next",
    "prev", "none",     "next",
    "prev", "gridCfg",  "next",
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
      } catch (_e) { /* ignore */ }
      return DEFAULT_GRID.slice();
    }

    function save(config) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
      } catch (_e) { /* ignore */ }
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

      // 填充動作選項
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

    // ---- Public API ----
    function show(currentConfig) {
      // 設定目前值
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
  // Grid Overlay（3x3 透明 tap zone）
  // =====================================================================
  function _createGridOverlay(readerEl) {
    var container = document.createElement("div");
    container.id = "hos-grid";
    container.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;z-index:15;" +
      "display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr;" +
      "pointer-events:none;" +
      "padding:8px 8px 48px 8px;box-sizing:border-box;";

    var cells = [];
    for (var i = 0; i < 9; i++) {
      var cell = document.createElement("div");
      cell.setAttribute("data-grid-cell", String(i));
      cell.style.cssText =
        "pointer-events:auto;position:relative;";
      container.appendChild(cell);
      cells.push(cell);
    }

    document.body.appendChild(container);
    return { container: container, cells: cells };
  }

  // =====================================================================
  // 主入口 — _initGrid
  // =====================================================================
  window.hosReader = window.hosReader || {};

  window.hosReader._initGrid = function () {
    var H = window.hosReader;
    if (!H || !H.rendition) return;
    var rendition = H.rendition;
    var book = H.book;
    var url = H.url || "./ex.epub";
    var STORAGE_KEY = "epub-grid-" + url;

    var store = _createGridStore(STORAGE_KEY);
    var config = store.load();

    var viewerEl = document.getElementById("viewer");
    var grid = _createGridOverlay(viewerEl);

    var _gridVisible = true;

    // ---- Config Panel ----
    function _onConfigSave(newConfig) {
      config = newConfig;
      store.save(config);
      _applyCellPointers();
    }

    var configPanel = _createConfigPanel(_onConfigSave);

    // ---- 根據 config 設定每個 cell 嘅 pointer-events ----
    function _applyCellPointers() {
      for (var i = 0; i < 9; i++) {
        if (config[i] === "none") {
          grid.cells[i].style.pointerEvents = "none";
        } else {
          grid.cells[i].style.pointerEvents = "auto";
        }
      }
    }

    // ---- 執行指定動作 ----
    function _executeAction(actionId) {
      switch (actionId) {
        case "prev":
          _isRtl() ? rendition.next() : rendition.prev();
          break;
        case "next":
          _isRtl() ? rendition.prev() : rendition.next();
          break;
        case "toc":
          _toggleToc();
          break;
        case "settings":
          _toggleSettings();
          break;
        case "gridCfg":
          configPanel.show(config);
          break;
        default:
          break;
      }
    }

    function _isRtl() {
      return book && book.package && book.package.metadata &&
        book.package.metadata.direction === "rtl";
    }

    function _toggleToc() {
      var toc = document.getElementById("toc");
      if (toc) {
        toc.style.display = toc.style.display === "none" ? "" : "none";
      }
    }

    function _toggleSettings() {
      var bar = document.getElementById("settings-bar");
      if (bar) {
        bar.style.display = bar.style.display === "none" ? "" : "none";
      }
    }

    // ---- Bind cell click ----
    function _onCellClick(index) {
      return function (e) {
        e.stopPropagation();
        e.preventDefault();
        var actionId = config[index];
        if (actionId && actionId !== "none") {
          _executeAction(actionId);
        }
      };
    }

    for (var i = 0; i < 9; i++) {
      // 只用 click event（desktop + mobile 通用）
      // mobile 依靠 touch-action: manipulation 消除 300ms 延遲
      grid.cells[i].addEventListener("click", _onCellClick(i));
    }

    // ---- 初始化 ----
    _applyCellPointers();

    // 暴露 API
    window.hosReader.grid = {
      showConfig: function () { configPanel.show(config); },
      setCell: function (index, actionId) {
        if (index >= 0 && index < 9 && ACTIONS[actionId]) {
          config[index] = actionId;
          store.save(config);
          _applyCellPointers();
        }
      },
      getConfig: function () { return config.slice(); },
    };
  };
})();
