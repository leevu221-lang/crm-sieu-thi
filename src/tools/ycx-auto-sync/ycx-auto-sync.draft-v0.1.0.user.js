// ==UserScript==
// @name         YCX - Auto Đồng Bộ Thưởng NV (BCNB -> CRM Siêu Thị)
// @namespace    son-ycx
// @version      0.1.0
// @description  Tự động lấy dữ liệu "Điểm thưởng nhân viên" từ BCNB (newinsite.thegioididong.com) rồi tự điền vào các ô "Dán dữ liệu từ BI" bên CRM Siêu Thị, cho toàn bộ NV, không cần copy/paste tay từng người.
// @match        https://newinsite.thegioididong.com/office/thuong-nhan-vien*
// @match        https://crm-sieu-thi.pages.dev/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-idle
// ==/UserScript==

/*
  ============================================================================
  CÁCH HOẠT ĐỘNG (đọc trước khi dùng)
  ============================================================================
  Script này chạy trên CẢ HAI trang, đóng 2 vai trò khác nhau, nói chuyện
  với nhau qua bộ nhớ dùng chung của Tampermonkey (GM_setValue/GM_getValue -
  giống một "hộp thư" mà tab nào cũng đọc/ghi được, không cần 2 tab mở cùng lúc
  vẫn ok vì dữ liệu được lưu lại).

  BÊN CRM SIÊU THỊ (crm-sieu-thi.pages.dev):
    - Tự quét trang để tìm danh sách NV (dạng "mã số - Tên NV") và ô input
      "Dán dữ liệu..." tương ứng của từng người trong khối "THƯỞNG HIỆN TẠI".
    - Hiện 1 bảng điều khiển nhỏ góc màn hình: bấm "Bắt đầu đồng bộ".
    - Ghi danh sách NV cần lấy dữ liệu vào "hộp thư" cho tab BCNB xử lý.
    - Theo dõi hộp thư, hễ có dữ liệu mới của NV nào là tự điền vào đúng ô
      input của NV đó (KHÔNG tự bấm nút Cập nhật/Đồng bộ - bạn tự kiểm tra
      rồi bấm tay lần cuối cho chắc, tránh sai sót không kiểm soát được).

  BÊN BCNB (newinsite.thegioididong.com/office/thuong-nhan-vien):
    - Tự phát hiện có danh sách NV cần lấy trong "hộp thư".
    - Lần lượt: gõ mã NV vào ô tìm kiếm -> bấm Tìm kiếm -> đợi bảng load xong
      -> đọc bảng kết quả, chuyển thành dạng văn bản giống hệt như khi bạn
      bôi đen cả bảng rồi Ctrl+C -> bỏ vào "hộp thư" cho CRM lấy.
    - Lặp lại cho từng NV trong danh sách.

  ============================================================================
  QUAN TRỌNG - PHẢI TỰ KIỂM TRA/CHỈNH LẠI TRƯỚC KHI CHẠY THẬT
  ============================================================================
  Mình không đăng nhập được vào 2 trang nội bộ này nên không tự test trực
  tiếp được. Script được viết dựa trên các gì nhìn thấy trong video bạn gửi,
  có thể sai lệch nếu trang có cấu trúc phức tạp hơn (autocomplete, v.v).
  Toàn bộ chỗ CẦN KIỂM TRA LẠI được đánh dấu bằng comment "// ⚠️ KIỂM TRA".

  CÁCH TEST AN TOÀN:
  1. Bật CONFIG.DEBUG = true (mặc định đã bật) - script sẽ dừng lại và log
     ra Console (F12) sau MỖI bước, không chạy ồ ạt 13 người liền.
  2. Test với 1 NV trước (sửa CONFIG.TEST_SINGLE_ID = "71132" chẳng hạn).
  3. Khi chắc chắn đúng rồi, đổi CONFIG.DEBUG = false và bỏ TEST_SINGLE_ID
     để chạy full 13 người.
  4. Nếu bước nào sai (VD: không gõ được vào ô tìm kiếm vì nó là ô
     autocomplete cần chọn từ danh sách gợi ý), gửi lại đoạn code này +
     ảnh chụp DevTools (chuột phải -> Inspect vào đúng ô đó) cho Claude Code
     để sửa lại đúng selector.
  ============================================================================
*/

(function () {
  'use strict';

  //////////////////////// CONFIG - CHỈNH Ở ĐÂY ////////////////////////////
  const CONFIG = {
    DEBUG: true,              // true = log chi tiết + dừng xác nhận từng bước
    TEST_SINGLE_ID: null,     // VD: "71132" để test 1 người trước khi chạy full
    DELAY_BETWEEN_EMP_MS: 1200, // nghỉ giữa mỗi NV để tránh spam trang BCNB
    AUTO_SUBMIT: false,       // true = tự bấm nút Cập nhật/Đồng bộ sau khi điền (mặc định TẮT cho an toàn)
  };

  const QUEUE_KEY = 'ycx_bonus_queue_v1';     // CRM ghi, BCNB đọc: [{id, name}]
  const RESULTS_KEY = 'ycx_bonus_results_v1'; // BCNB ghi, CRM đọc: { [id]: {tsv, ts} }
  const CONTROL_KEY = 'ycx_bonus_control_v1'; // trạng thái chung: {status, updatedAt}

  const log = (...args) => {
    if (CONFIG.DEBUG) console.log('[YCX-Sync]', ...args);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  //////////////////////// TIỆN ÍCH DÙNG CHUNG //////////////////////////////

  // Set giá trị cho input theo kiểu "native" để React/Vue nhận diện được
  // thay đổi (gán .value bình thường nhiều web framework sẽ không nhận ra).
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Tìm 1 phần tử clickable (button/a/div...) chứa đúng text cần tìm
  function findClickableByText(text) {
    const candidates = document.querySelectorAll('button, a, [role="button"]');
    for (const el of candidates) {
      if (el.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
        return el;
      }
    }
    return null;
  }

  // Đợi cho tới khi DOM ngừng thay đổi (không còn mutation mới) trong 1 vùng,
  // dùng để đoán "bảng đã load xong" mà không cần biết chính xác class loading.
  function waitForDomStable(rootEl, { quietMs = 700, timeoutMs = 8000 } = {}) {
    return new Promise((resolve) => {
      let timer;
      const start = Date.now();
      const done = () => {
        observer.disconnect();
        resolve();
      };
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        if (Date.now() - start > timeoutMs) return done();
        timer = setTimeout(done, quietMs);
      });
      observer.observe(rootEl, { childList: true, subtree: true, characterData: true });
      timer = setTimeout(done, quietMs);
      setTimeout(done, timeoutMs); // an toàn: tối đa chờ timeoutMs
    });
  }

  //////////////////////////////////////////////////////////////////////////
  //  PHẦN 1: CHẠY TRÊN newinsite.thegioididong.com/office/thuong-nhan-vien
  //////////////////////////////////////////////////////////////////////////
  function runOnBCNB() {
    log('Đang chạy trên trang BCNB (thuong-nhan-vien).');

    // ⚠️ KIỂM TRA: selector ô tìm kiếm NV. Trong video có placeholder
    // "Enter username or name..." nên dùng placeholder để tìm cho chắc.
    function getSearchInput() {
      return document.querySelector('input[placeholder*="username" i], input[placeholder*="name" i]');
    }

    // ⚠️ KIỂM TRA: nút "Tìm kiếm"
    function getSearchButton() {
      return findClickableByText('Tìm kiếm');
    }

    // ⚠️ KIỂM TRA: bảng kết quả - hiện lấy đại bảng <table> có nhiều dòng nhất
    // trên trang (giả định trang chỉ có 1 bảng kết quả chính).
    function getResultTable() {
      const tables = Array.from(document.querySelectorAll('table'));
      if (!tables.length) return null;
      tables.sort((a, b) => b.querySelectorAll('tr').length - a.querySelectorAll('tr').length);
      return tables[0];
    }

    // Chuyển bảng thành text giống như khi bôi đen + Ctrl+C rồi dán vào ô
    // text thường (tab giữa các cột, xuống dòng giữa các hàng).
    function extractTableAsTSV(table) {
      const rows = Array.from(table.querySelectorAll('tr'));
      return rows
        .map((tr) =>
          Array.from(tr.querySelectorAll('th, td'))
            .map((cell) => cell.innerText.trim().replace(/\s+/g, ' '))
            .join('\t')
        )
        .join('\n');
    }

    async function searchEmployee(empId) {
      const input = getSearchInput();
      if (!input) {
        log('❌ Không tìm thấy ô tìm kiếm NV. Cần kiểm tra lại selector.');
        return false;
      }
      setNativeValue(input, empId);
      await sleep(400);

      // ⚠️ KIỂM TRA: nếu ô này là autocomplete (gõ xong hiện list gợi ý rồi
      // phải CLICK vào gợi ý mới nhận), thì cần bắt phần tử gợi ý ở đây.
      // Tạm thời thử tìm 1 item gợi ý đang hiện chứa đúng mã NV, nếu có thì click.
      const suggestion = Array.from(document.querySelectorAll('li, [role="option"], .dropdown-item'))
        .find((el) => el.textContent.includes(empId) && el.offsetParent !== null);
      if (suggestion) {
        log(`Có gợi ý autocomplete cho ${empId}, đang click chọn...`);
        suggestion.click();
        await sleep(300);
      }

      const btn = getSearchButton();
      if (!btn) {
        log('❌ Không tìm thấy nút Tìm kiếm.');
        return false;
      }
      btn.click();
      return true;
    }

    async function processOne(empId) {
      log(`--- Bắt đầu lấy dữ liệu cho NV: ${empId} ---`);
      const ok = await searchEmployee(empId);
      if (!ok) return null;

      const container = document.body; // ⚠️ KIỂM TRA: có thể thu hẹp vùng theo dõi cho nhanh hơn
      await waitForDomStable(container);

      const table = getResultTable();
      if (!table) {
        log(`❌ Không tìm thấy bảng kết quả cho ${empId}.`);
        return null;
      }
      const tsv = extractTableAsTSV(table);
      log(`✅ Lấy được dữ liệu cho ${empId}, ${table.querySelectorAll('tr').length} dòng.`);
      return tsv;
    }

    async function processQueue(queue) {
      const results = GM_getValue(RESULTS_KEY, {});
      for (const emp of queue) {
        if (results[emp.id]) {
          log(`Bỏ qua ${emp.id} (đã có dữ liệu rồi).`);
          continue;
        }
        const tsv = await processOne(emp.id);
        if (tsv) {
          results[emp.id] = { tsv, ts: Date.now() };
          GM_setValue(RESULTS_KEY, results);
        }
        if (CONFIG.DEBUG) {
          log(`(DEBUG) Đã xong ${emp.id}. Kiểm tra Console rồi script sẽ tự qua người tiếp theo sau ${CONFIG.DELAY_BETWEEN_EMP_MS}ms.`);
        }
        await sleep(CONFIG.DELAY_BETWEEN_EMP_MS);
      }
      GM_setValue(CONTROL_KEY, { status: 'done', updatedAt: Date.now() });
      log('=== HOÀN TẤT lấy dữ liệu cho toàn bộ NV trong danh sách. ===');
    }

    // Lắng nghe khi bên CRM ghi danh sách NV cần lấy + bật trạng thái running
    GM_addValueChangeListener(CONTROL_KEY, (name, oldVal, newVal) => {
      if (newVal && newVal.status === 'running') {
        let queue = GM_getValue(QUEUE_KEY, []);
        if (CONFIG.TEST_SINGLE_ID) {
          queue = queue.filter((e) => e.id === CONFIG.TEST_SINGLE_ID);
          log('Chế độ TEST 1 NV:', CONFIG.TEST_SINGLE_ID);
        }
        log(`Nhận lệnh chạy từ CRM. Danh sách cần lấy: ${queue.length} NV.`);
        processQueue(queue);
      }
    });

    log('Đã sẵn sàng, đang chờ lệnh từ tab CRM Siêu Thị (mở tab đó và bấm "Bắt đầu đồng bộ").');
  }

  //////////////////////////////////////////////////////////////////////////
  //  PHẦN 2: CHẠY TRÊN crm-sieu-thi.pages.dev
  //////////////////////////////////////////////////////////////////////////
  function runOnCRM() {
    log('Đang chạy trên trang CRM Siêu Thị.');

    // ⚠️ KIỂM TRA: tìm các khối "mã số - Tên NV" trong panel "THƯỞNG HIỆN TẠI"
    // rồi tìm ô input "Dán dữ liệu..." gần nó nhất.
    function scanEmployeeRows() {
      const idNamePattern = /^\s*(\d{4,7})\s*-\s*(.+?)\s*$/;
      const found = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent;
        const m = text.match(idNamePattern);
        if (!m) continue;
        const id = m[1];
        const name = m[2];
        // tìm ngược lên container gần nhất có chứa 1 input/textarea "Dán dữ liệu"
        let container = node.parentElement;
        let input = null;
        for (let i = 0; i < 5 && container; i++) {
          input =
            container.querySelector('input[placeholder*="Dán dữ liệu" i], textarea[placeholder*="Dán dữ liệu" i]') ||
            container.parentElement?.querySelector('input[placeholder*="Dán dữ liệu" i], textarea[placeholder*="Dán dữ liệu" i]');
          if (input) break;
          container = container.parentElement;
        }
        if (input && !found.some((f) => f.id === id)) {
          found.push({ id, name, input });
        }
      }
      return found;
    }

    function buildPanel(rows) {
      const panel = document.createElement('div');
      panel.style.cssText =
        'position:fixed;bottom:16px;right:16px;z-index:99999;background:#111827;color:#fff;' +
        'padding:12px 14px;border-radius:10px;font:13px/1.4 sans-serif;width:280px;box-shadow:0 4px 16px rgba(0,0,0,.3)';
      panel.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px;">YCX Auto Đồng Bộ Thưởng NV</div>
        <div id="ycx-status" style="margin-bottom:8px;color:#9ca3af;">Tìm thấy ${rows.length} NV. Sẵn sàng.</div>
        <button id="ycx-start" style="width:100%;padding:6px;border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;">Bắt đầu đồng bộ</button>
        <div id="ycx-log" style="margin-top:8px;max-height:140px;overflow:auto;font-size:11px;color:#d1d5db;"></div>
      `;
      document.body.appendChild(panel);
      return panel;
    }

    function panelLog(panel, msg) {
      const logEl = panel.querySelector('#ycx-log');
      const line = document.createElement('div');
      line.textContent = msg;
      logEl.prepend(line);
    }

    function fillEmployeeInput(row, tsv) {
      setNativeValue(row.input, tsv);
      row.input.style.outline = '2px solid #22c55e';
      setTimeout(() => (row.input.style.outline = ''), 1500);

      if (CONFIG.AUTO_SUBMIT) {
        // ⚠️ KIỂM TRA: nút cập nhật riêng cho từng NV (nếu có) - đoán tên nút
        const container = row.input.closest('div');
        const updateBtn =
          container?.querySelector('button') ||
          findClickableByText('Cập nhật');
        updateBtn?.click();
      }
    }

    function start() {
      const rows = scanEmployeeRows();
      if (!rows.length) {
        alert('Không tìm thấy danh sách NV trên trang. Cần kiểm tra lại selector (báo Claude Code).');
        return null;
      }
      log(`Tìm thấy ${rows.length} NV:`, rows.map((r) => r.id));

      const queue = rows.map((r) => ({ id: r.id, name: r.name }));
      GM_setValue(RESULTS_KEY, {}); // reset kết quả cũ
      GM_setValue(QUEUE_KEY, queue);
      GM_setValue(CONTROL_KEY, { status: 'running', updatedAt: Date.now() });

      return rows;
    }

    let rowsById = {};

    function init() {
      const rows = scanEmployeeRows();
      rowsById = Object.fromEntries(rows.map((r) => [r.id, r]));
      const panel = buildPanel(rows);

      panel.querySelector('#ycx-start').addEventListener('click', () => {
        const startedRows = start();
        if (!startedRows) return;
        rowsById = Object.fromEntries(startedRows.map((r) => [r.id, r]));
        panel.querySelector('#ycx-status').textContent = 'Đang đợi tab BCNB lấy dữ liệu... (mở tab newinsite.thegioididong.com/office/thuong-nhan-vien song song)';
        panelLog(panel, 'Đã gửi yêu cầu, đang chờ dữ liệu...');
      });

      let filledCount = 0;
      GM_addValueChangeListener(RESULTS_KEY, (name, oldVal, newVal) => {
        if (!newVal) return;
        for (const [id, data] of Object.entries(newVal)) {
          const row = rowsById[id];
          if (!row || row._filled) continue;
          fillEmployeeInput(row, data.tsv);
          row._filled = true;
          filledCount++;
          panelLog(panel, `✅ Đã điền dữ liệu: ${id} - ${row.name}`);
          panel.querySelector('#ycx-status').textContent = `Đã điền ${filledCount}/${Object.keys(rowsById).length} NV.`;
        }
      });

      GM_addValueChangeListener(CONTROL_KEY, (name, oldVal, newVal) => {
        if (newVal && newVal.status === 'done') {
          panelLog(panel, '=== Tab BCNB báo đã lấy xong toàn bộ. Kiểm tra lại rồi bấm Cập nhật/Đồng bộ trên trang. ===');
        }
      });
    }

    // đợi trang CRM load xong UI rồi mới quét (SPA thường render trễ)
    setTimeout(init, 1500);
  }

  //////////////////////////////////////////////////////////////////////////
  if (location.hostname.includes('newinsite.thegioididong.com')) {
    runOnBCNB();
  } else if (location.hostname.includes('crm-sieu-thi.pages.dev')) {
    runOnCRM();
  }
})();
