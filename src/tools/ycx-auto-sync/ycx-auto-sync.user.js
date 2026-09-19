// ==UserScript==
// @name         🎁 CRM ⇄ BCNB: Tự Động Đồng Bộ Điểm Thưởng NV
// @namespace    https://crm-sieu-thi.pages.dev/
// @version      0.1.3
// @description  Tự động lấy bảng "Điểm thưởng nhân viên" từ BCNB (newinsite.thegioididong.com) và dán vào đúng ô "Dán dữ liệu từ BI" tương ứng trên CRM Siêu Thị. KHÔNG tự bấm nút Cập Nhật/Đồng Bộ — chỉ điền dữ liệu, người dùng tự bấm nút cuối cùng.
// @author       CRM Supermarket Dev
// @match        https://crm-sieu-thi.pages.dev/*
// @match        https://newinsite.thegioididong.com/office/thuong-nhan-vien*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-idle
// ==/UserScript==

/**
 * ============================================================================
 * TÌNH TRẠNG: CHƯA TEST VỚI DOM THẬT.
 * Script này được viết dựa trên 2 ảnh chụp màn hình (không phải DOM/HTML thật),
 * nên nhiều chỗ selector là DỰ ĐOÁN dựa trên chữ hiển thị (text-matching) thay vì
 * class/id thật. Mọi chỗ như vậy được đánh dấu "⚠️ KIỂM TRA".
 *
 * QUY TRÌNH TEST BẮT BUỘC (đọc kỹ trước khi chạy full):
 *   1. Cài script này vào Tampermonkey.
 *   2. Mở 2 tab: 1 tab CRM (đang ở tab "Thưởng NV"), 1 tab BCNB
 *      (newinsite.thegioididong.com/office/thuong-nhan-vien).
 *   3. Để CONFIG.DEBUG = true và CONFIG.TEST_SINGLE_ID = "71132" (đã sẵn bên dưới).
 *   4. Trên tab CRM, mở Console (F12), bấm nút nổi "🎁 Auto Đồng Bộ Thưởng NV"
 *      (script tự chèn góc dưới phải trang CRM).
 *   5. Theo dõi console log ở CẢ 2 tab — mỗi bước đều log ra để biết đang kẹt ở đâu.
 *   6. So sánh nội dung được điền vào ô "Dán dữ liệu..." với việc tự tay bôi đen
 *      bảng bên BCNB rồi Ctrl+C, dán vào Notepad để đối chiếu — phải khớp nhau.
 *   7. Sửa các chỗ "⚠️ KIỂM TRA" theo DOM thật, lặp lại tới khi đúng 1 người.
 *   8. Xoá TEST_SINGLE_ID (để '' hoặc null), chạy full, xác nhận đủ 13 NV × 2 kỳ
 *      (Tháng trước + Hiện tại) đều được điền, không sót ai.
 * ============================================================================
 */

(function () {
  'use strict';

  // (Đã xác nhận script chạy tốt trên cả 2 trang qua alert() chẩn đoán — nhưng
  // alert() chặn luồng chính đúng lúc trang BCNB (jQuery cũ, tải script tuần tự)
  // đang khởi tạo, làm vỡ trang (jQuery is not defined...). Đã gỡ bỏ, chỉ còn
  // dùng khung log không-chặn-luồng (logToPanel) bên dưới để theo dõi.)

  const CONFIG = {
    // Bật log chi tiết ra console — LUÔN bật khi đang test/sửa selector.
    DEBUG: true,
    // Chỉ chạy đúng 1 mã NV này để test an toàn. Đặt '' hoặc null khi chạy full.
    TEST_SINGLE_ID: '71132',
    // KHÔNG tự bấm nút Cập Nhật/Đồng Bộ Thưởng — giữ nguyên false theo yêu cầu.
    AUTO_SUBMIT: false,
    // Các độ trễ chờ UI phản hồi (ms). Tăng lên nếu mạng/máy chậm và script
    // đọc dữ liệu bị hụt (đọc bảng lúc UI chưa kịp cập nhật xong).
    WAIT_AFTER_TYPE_MS: 700,       // sau khi gõ tên NV vào ô tìm kiếm, trước khi tìm gợi ý
    WAIT_AFTER_PICK_SUGGEST_MS: 400, // sau khi click chọn gợi ý autocomplete
    WAIT_AFTER_SEARCH_MS: 1800,    // sau khi bấm "Tìm kiếm", trước khi đọc bảng kết quả
    WAIT_BETWEEN_EMPLOYEES_MS: 1200, // nghỉ giữa 2 nhân viên để tránh dồn request
  };

  // In log trực tiếp lên 1 khung nổi trên trang (không phụ thuộc DevTools Console —
  // một số bản Tampermonkey chạy script trong sandbox riêng khiến console.log không
  // ghi vào console của trang, nên khung này là nguồn đáng tin cậy nhất để xem log).
  function logToPanel(text, isError) {
    let panel = document.getElementById('thuongnv-sync-log-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'thuongnv-sync-log-panel';
      // Đặt ở góc dưới-trái (thay vì trên-trái) để không che hàng filter/bảng
      // kết quả của trang BCNB — hàng đó thường nằm sát mép trên trang.
      panel.style.cssText = 'position:fixed;bottom:10px;left:10px;width:560px;max-height:60vh;overflow-y:auto;background:#0f172a;color:#e2e8f0;font:11px/1.5 monospace;padding:10px;border-radius:10px;z-index:2147483647;box-shadow:0 4px 20px rgba(0,0,0,.5);white-space:pre-wrap;word-break:break-all;';
      const titleBar = document.createElement('div');
      titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #334155;padding-bottom:4px;';
      const title = document.createElement('div');
      title.textContent = `📋 ThuongNV-Sync log (${location.hostname})`;
      title.style.cssText = 'font-weight:bold;color:#34d399;';
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ ẩn';
      closeBtn.style.cssText = 'background:#334155;color:#e2e8f0;border:none;border-radius:6px;padding:2px 8px;cursor:pointer;font:11px monospace;';
      closeBtn.onclick = () => { panel.style.display = 'none'; };
      titleBar.appendChild(title);
      titleBar.appendChild(closeBtn);
      panel.appendChild(titleBar);
      (document.body || document.documentElement).appendChild(panel);
    }
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    line.style.color = isError ? '#f87171' : '#e2e8f0';
    panel.appendChild(line);
    panel.scrollTop = panel.scrollHeight;
  }

  const log = (...args) => {
    const text = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (CONFIG.DEBUG) console.log('%c[ThuongNV-Sync]', 'color:#059669;font-weight:bold', ...args);
    logToPanel(text, false);
  };
  const warn = (...args) => {
    const text = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    console.warn('%c[ThuongNV-Sync]', 'color:#dc2626;font-weight:bold', ...args);
    logToPanel('⚠️ ' + text, true);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Chạy ngay khi script nạp — nếu dòng này KHÔNG hiện trên khung log của trang,
  // nghĩa là Tampermonkey không chạy script này trên trang này (kiểm tra icon
  // Tampermonkey trên thanh công cụ có báo lỗi/số đỏ không, và script có đang bật không).
  logToPanel(`✅ Script đã nạp trên ${location.hostname}${location.pathname}`, false);

  const isCrm = location.hostname.includes('crm-sieu-thi');
  const isBcnb = location.hostname.includes('newinsite.thegioididong.com');

  const KEY_REQUEST = 'THUONGNV_SYNC_REQUEST_V1';   // CRM -> BCNB: "tìm dữ liệu cho NV X, kỳ Y"
  const KEY_RESPONSE = 'THUONGNV_SYNC_RESPONSE_V1';  // BCNB -> CRM: "đây là dữ liệu TSV của request đó"

  // ══════════════════════════════════════════════════════════════════════
  // TIỆN ÍCH DÙNG CHUNG
  // ══════════════════════════════════════════════════════════════════════

  /** Set giá trị cho input/textarea React-controlled sao cho React nhận được thay đổi. */
  function setReactValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Tìm element mà textContent (chỉ của chính nó, không tính con) khớp với 1 pattern/text. */
  function findElementsByOwnText(root, matcher, tagFilter = null) {
    const all = root.querySelectorAll(tagFilter || '*');
    const results = [];
    all.forEach((el) => {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent)
        .join('')
        .trim();
      const text = ownText || (el.children.length === 0 ? (el.textContent || '').trim() : '');
      if (!text) return;
      const isMatch = typeof matcher === 'function' ? matcher(text, el) : matcher.test(text);
      if (isMatch) results.push(el);
    });
    return results;
  }

  /** Chuyển 1 <table> thành text TSV (tab-separated), mô phỏng đúng những gì trình
   * duyệt tạo ra khi Ctrl+A bôi đen bảng rồi Copy rồi dán vào 1 ô text thường. */
  function tableToTsv(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll('th,td'));
        return cells.map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim()).join('\t');
      })
      .join('\n');
  }

  /** Định dạng ngày dd/mm/yyyy theo đúng format thấy trên BCNB. */
  function fmtDate(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /** Khoảng ngày cho 1 trong 2 kỳ: 'current' = đầu tháng này -> cuối tháng này,
   * 'previous' = đầu tháng trước -> cuối tháng trước.
   * ⚠️ KIỂM TRA: xác nhận "THƯỞNG HIỆN TẠI" có đúng là NGUYÊN tháng hiện tại
   * (kể cả những ngày chưa tới) hay chỉ tính tới hôm nay. Ảnh chụp cho thấy
   * mặc định đang là 01/08 -> 31/08 dù hôm nay mới 27/08, nên tạm coi là
   * NGUYÊN THÁNG cho cả 2 kỳ. */
  function getPeriodRange(period) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-based
    if (period === 'previous') {
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 0); // ngày 0 của tháng này = ngày cuối tháng trước
      return { from: fmtDate(from), to: fmtDate(to) };
    }
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0);
    return { from: fmtDate(from), to: fmtDate(to) };
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHÍA CRM (crm-sieu-thi.pages.dev)
  // ══════════════════════════════════════════════════════════════════════
  if (isCrm) {
    log('Đã nạp trên trang CRM:', location.href);

    /** Quét danh sách "mã NV - Tên NV" xuất hiện trên trang, kèm theo textarea
     * "Dán dữ liệu..." gần nó nhất, TÁCH RIÊNG theo 2 cột "THƯỞNG THÁNG TRƯỚC"
     * và "THƯỞNG HIỆN TẠI" để không bị nhầm cột.
     * ⚠️ KIỂM TRA: cấu trúc thật — hiện đang giả định mỗi khối NV là:
     *   <div>
     *     <div>MÃ - TÊN</div>          <-- label, khớp regex /^\d{3,8}\s*-\s*.+/
     *     <textarea placeholder="Dán dữ liệu...">   <-- hoặc <input>
     *   </div>
     * Nếu label & textarea KHÔNG nằm cùng 1 parent trực tiếp, hàm findNearestField
     * bên dưới sẽ dò lên tối đa 4 cấp cha rồi tìm textarea/input đầu tiên bên trong.
     */
    function findPeriodColumn(periodLabelText) {
      // Tìm heading chứa đúng chữ (vd "THƯỞNG THÁNG TRƯỚC" / "THƯỞNG HIỆN TẠI")
      const headingCandidates = findElementsByOwnText(
        document,
        (t) => t.toUpperCase().includes(periodLabelText)
      );
      if (headingCandidates.length === 0) {
        warn(`Không tìm thấy heading chứa chữ "${periodLabelText}". ⚠️ KIỂM TRA text thật trên trang.`);
        return null;
      }
      // Cột chứa danh sách NV thường là ancestor gần nhất mà bên trong có nhiều
      // dòng "mã - tên". Đi ngược lên tối đa 6 cấp cha để tìm khối chứa >= 3 label NV.
      let node = headingCandidates[0];
      for (let i = 0; i < 6 && node; i++) {
        const labelCount = findElementsByOwnText(node, /^\d{3,8}\s*-\s*.+/).length;
        if (labelCount >= 3) return node;
        node = node.parentElement;
      }
      warn(`Tìm thấy heading "${periodLabelText}" nhưng không xác định được khối chứa danh sách NV. ⚠️ KIỂM TRA cấu trúc DOM.`);
      return headingCandidates[0].parentElement;
    }

    function findFieldForEmployee(columnRoot, maNv) {
      if (!columnRoot) return null;
      const labels = findElementsByOwnText(columnRoot, new RegExp(`^${maNv}\\s*-`));
      if (labels.length === 0) return null;
      const label = labels[0];
      // Dò lên tối đa 4 cấp cha, mỗi cấp thử tìm textarea/input bên trong.
      let container = label;
      for (let i = 0; i < 4 && container; i++) {
        const field = container.querySelector('textarea, input[type="text"]');
        if (field) return field;
        container = container.parentElement;
      }
      return null;
    }

    /** Lấy danh sách {maNv, tenNv} từ 1 cột (dùng cột "Tháng trước" làm nguồn danh
     * sách chuẩn vì 2 cột phải giống hệt nhau). */
    function extractEmployeeList(columnRoot) {
      const labels = findElementsByOwnText(columnRoot, /^\d{3,8}\s*-\s*.+/);
      const seen = new Set();
      const list = [];
      labels.forEach((el) => {
        const text = (el.textContent || '').trim();
        const m = text.match(/^(\d{3,8})\s*-\s*(.+)$/);
        if (!m) return;
        const maNv = m[1];
        if (seen.has(maNv)) return;
        seen.add(maNv);
        list.push({ maNv, tenNv: m[2].trim() });
      });
      return list;
    }

    let pendingResolve = null;

    // Nhận dữ liệu trả về từ tab BCNB
    if (typeof GM_addValueChangeListener === 'function') {
      GM_addValueChangeListener(KEY_RESPONSE, (_key, _old, newVal) => {
        if (!newVal) return;
        let payload;
        try { payload = JSON.parse(newVal); } catch { return; }
        log('Nhận phản hồi từ BCNB:', payload.maNv, payload.period, `(${(payload.tsv || '').length} ký tự)`);
        if (pendingResolve) {
          const resolve = pendingResolve;
          pendingResolve = null;
          resolve(payload);
        }
      });
    }

    function requestFromBcnb(maNv, tenNv, period) {
      return new Promise((resolve, reject) => {
        pendingResolve = resolve;
        const range = getPeriodRange(period);
        GM_setValue(KEY_REQUEST, JSON.stringify({
          maNv, tenNv, period, from: range.from, to: range.to, ts: Date.now(),
        }));
        // Timeout an toàn nếu tab BCNB không phản hồi (chưa mở tab, hoặc lỗi selector).
        setTimeout(() => {
          if (pendingResolve === resolve) {
            pendingResolve = null;
            reject(new Error('Timeout chờ phản hồi từ tab BCNB — kiểm tra đã mở đúng tab BCNB & console tab đó có lỗi không.'));
          }
        }, 20000);
      });
    }

    async function runSyncForPeriod(periodKey, periodLabel) {
      const columnRoot = findPeriodColumn(periodLabel);
      if (!columnRoot) return;
      const employees = extractEmployeeList(columnRoot);
      log(`Cột "${periodLabel}": tìm thấy ${employees.length} nhân viên.`);

      const targets = CONFIG.TEST_SINGLE_ID
        ? employees.filter((e) => e.maNv === String(CONFIG.TEST_SINGLE_ID))
        : employees;

      if (CONFIG.TEST_SINGLE_ID && targets.length === 0) {
        warn(`TEST_SINGLE_ID="${CONFIG.TEST_SINGLE_ID}" không khớp NV nào trong danh sách. Kiểm tra lại mã NV.`);
        return;
      }

      for (const emp of targets) {
        const field = findFieldForEmployee(columnRoot, emp.maNv);
        if (!field) {
          warn(`Không tìm thấy ô "Dán dữ liệu" cho ${emp.maNv} - ${emp.tenNv}. ⚠️ KIỂM TRA findFieldForEmployee().`);
          continue;
        }
        try {
          log(`Đang lấy dữ liệu cho ${emp.maNv} - ${emp.tenNv} (${periodLabel})...`);
          const result = await requestFromBcnb(emp.maNv, emp.tenNv, periodKey);
          if (!result.tsv || !result.tsv.trim()) {
            warn(`Dữ liệu trả về RỖNG cho ${emp.maNv} - ${emp.tenNv}. Có thể BCNB không tìm thấy NV này hoặc bảng chưa kịp load.`);
            continue;
          }
          setReactValue(field, result.tsv);
          log(`✅ Đã điền dữ liệu cho ${emp.maNv} - ${emp.tenNv}.`);
        } catch (err) {
          warn(`❌ Lỗi khi xử lý ${emp.maNv} - ${emp.tenNv}:`, err.message);
        }
        await sleep(CONFIG.WAIT_BETWEEN_EMPLOYEES_MS);
      }
    }

    async function runFullSync() {
      log('=== BẮT ĐẦU ĐỒNG BỘ THƯỞNG NV ===', CONFIG.TEST_SINGLE_ID ? `(CHỈ TEST mã ${CONFIG.TEST_SINGLE_ID})` : '(FULL toàn bộ danh sách)');
      await runSyncForPeriod('previous', 'THƯỞNG THÁNG TRƯỚC');
      await runSyncForPeriod('current', 'THƯỞNG HIỆN TẠI');
      log('=== HOÀN TẤT. Vui lòng tự kiểm tra lại dữ liệu trước khi bấm Cập Nhật/Đồng Bộ. ===');
    }

    // Chèn nút nổi để người dùng chủ động bấm chạy (KHÔNG tự chạy khi tải trang).
    function injectFloatingButton() {
      if (document.getElementById('thuongnv-sync-btn')) return;
      const btn = document.createElement('button');
      btn.id = 'thuongnv-sync-btn';
      btn.textContent = '🎁 Auto Đồng Bộ Thưởng NV' + (CONFIG.TEST_SINGLE_ID ? ` (test ${CONFIG.TEST_SINGLE_ID})` : '');
      btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;padding:12px 18px;border-radius:12px;border:none;background:linear-gradient(90deg,#047857,#10B981);color:#fff;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);';
      btn.onclick = () => {
        btn.disabled = true;
        btn.textContent = '⏳ Đang đồng bộ...';
        runFullSync().finally(() => {
          btn.disabled = false;
          btn.textContent = '🎁 Auto Đồng Bộ Thưởng NV' + (CONFIG.TEST_SINGLE_ID ? ` (test ${CONFIG.TEST_SINGLE_ID})` : '');
        });
      };
      document.body.appendChild(btn);
      log('Đã chèn nút "🎁 Auto Đồng Bộ Thưởng NV" ở góc dưới phải trang.');
    }

    // Chờ trang CRM (React) render xong rồi mới chèn nút.
    const readyCheck = setInterval(() => {
      if (document.querySelector('body')) {
        clearInterval(readyCheck);
        setTimeout(injectFloatingButton, 1000);
      }
    }, 300);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHÍA BCNB (newinsite.thegioididong.com/office/thuong-nhan-vien)
  // ══════════════════════════════════════════════════════════════════════
  if (isBcnb) {
    log('Đã nạp trên trang BCNB:', location.href);

    /** Nút "Tìm kiếm" — mốc neo đáng tin cậy nhất vì text nhìn thấy rõ trên ảnh.
     * SỬA: bản trước chỉ đọc text nằm TRỰC TIẾP trong <button>, nên bị rỗng nếu
     * chữ "Tìm kiếm" nằm trong 1 <span>/icon con bên trong nút (rất phổ biến với
     * nút có icon kính lúp). Giờ đọc toàn bộ textContent (kể cả con cháu),
     * chuẩn hoá khoảng trắng, khớp lỏng (không bắt buộc đúng y nguyên). */
    function findSearchButton() {
      const candidates = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]'));
      const match = candidates.find((el) => {
        const raw = el.tagName === 'INPUT' ? (el.getAttribute('value') || '') : (el.textContent || '');
        const text = raw.replace(/\s+/g, ' ').trim();
        return /tìm\s*kiếm/i.test(text);
      });
      return match || null;
    }

    /** ⚠️ KIỂM TRA TRỌNG TÂM: ô tìm/chọn nhân viên là dạng tag/chip multi-select
     * (ảnh cho thấy có chip "Thạch Vũ ×" xoá được). Đây thường là 1 thư viện kiểu
     * select2/Choices.js: click vào để mở input ẩn bên trong, gõ chữ, đợi dropdown
     * gợi ý hiện ra, rồi CLICK vào đúng gợi ý khớp tên (không phải chỉ set value).
     * Cách định vị: tìm input text nằm gần nút "Tìm kiếm" nhất (cùng hàng filter).
     */
    function findEmployeeSearchInput() {
      const searchBtn = findSearchButton();
      if (!searchBtn) {
        warn('Không tìm thấy nút "Tìm kiếm" để làm mốc neo. ⚠️ KIỂM TRA text nút thật.');
        return null;
      }
      // Hàng filter (chứa 2 ô ngày, ô chọn NV, dropdown vị trí thưởng, nút Tìm kiếm)
      // thường là 1 flex/grid container chung — tìm ancestor gần nhất có chứa
      // >= 1 input text VÀ chính là cha (hoặc ông) của nút Tìm kiếm.
      let row = searchBtn;
      for (let i = 0; i < 5 && row; i++) {
        const textInputs = row.querySelectorAll('input[type="text"], input:not([type])');
        if (textInputs.length > 0) return textInputs[textInputs.length - 1]; // ô NV thường nằm gần cuối, sát nút Tìm kiếm
        row = row.parentElement;
      }
      warn('Không xác định được ô tìm nhân viên. ⚠️ KIỂM TRA cấu trúc hàng filter thật.');
      return null;
    }

    /** ⚠️ KIỂM TRA: xoá các chip nhân viên đang chọn sẵn (nếu có) trước khi chọn
     * người mới, để không bị cộng dồn nhiều NV trong 1 lần tìm kiếm. Ảnh cho
     * thấy mỗi chip có dấu "×" để xoá — tìm mọi phần tử có text đúng 1 ký tự "×"
     * nằm trong cùng khối với ô tìm kiếm rồi bấm hết. */
    function clearSelectedChips(searchInput) {
      const container = searchInput.closest('div')?.parentElement || searchInput.parentElement;
      if (!container) return;
      const closeButtons = findElementsByOwnText(container, /^[×xX]$/, 'span, button, i');
      log(`clearSelectedChips: gỡ ${closeButtons.length} chip đang chọn sẵn.`);
      closeButtons.forEach((btn) => btn.click());
    }

    function describeEl(el) {
      if (!el) return 'null';
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').filter(Boolean).slice(0, 3).join('.')}` : '';
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `<${el.tagName.toLowerCase()}${id}${cls}> "${txt}"`;
    }

    async function pickEmployeeSuggestion(searchInput, tenNv) {
      clearSelectedChips(searchInput);
      searchInput.focus();
      searchInput.click();
      setReactValue(searchInput, tenNv);
      log(`Đã gõ "${tenNv}" vào ô: ${describeEl(searchInput)}`);
      await sleep(CONFIG.WAIT_AFTER_TYPE_MS);

      // ⚠️ KIỂM TRA: dropdown gợi ý thường là 1 <ul>/<div role="listbox"> mới xuất
      // hiện SAU khi gõ, chứa các item text trùng/khớp gần đúng tên đang gõ.
      // Tìm mọi phần tử có text CHỨA tên NV (không phân biệt hoa/thường, bỏ dấu
      // cách thừa) xuất hiện SAU input trong DOM, ưu tiên phần tử nhỏ nhất khớp.
      const normalizedTarget = tenNv.trim().toLowerCase();
      const candidates = findElementsByOwnText(
        document,
        (t) => t.trim().toLowerCase().includes(normalizedTarget)
      ).filter((el) => el !== searchInput && !el.contains(searchInput));

      log(`Tìm thấy ${candidates.length} phần tử chứa "${tenNv}": ${candidates.slice(0, 5).map(describeEl).join(' | ')}`);

      if (candidates.length === 0) {
        warn(`Không thấy gợi ý autocomplete nào chứa tên "${tenNv}" sau khi gõ. ⚠️ KIỂM TRA: có thể cần gõ chậm hơn (event keydown/keyup thay vì set value 1 lần), hoặc dropdown dùng Shadow DOM.`);
        return false;
      }
      // Ưu tiên phần tử KHÔNG có element con (lá của cây DOM) — thường là item gợi ý thật.
      const leaf = candidates.find((el) => el.children.length === 0) || candidates[0];
      log(`👉 Sẽ bấm vào: ${describeEl(leaf)}`);
      leaf.click();
      await sleep(CONFIG.WAIT_AFTER_PICK_SUGGEST_MS);
      log(`Sau khi bấm, giá trị ô tìm kiếm: "${searchInput.value}"`);
      return true;
    }

    /** ⚠️ KIỂM TRA: 2 ô ngày "01/08/2026" / "31/08/2026" — chưa rõ là input text
     * thường hay input có gắn datepicker overlay (click mở lịch, không gõ tay
     * được trực tiếp). Thử set value trực tiếp trước; nếu ảnh thực tế cho thấy
     * UI có mở lịch popup, cách này sẽ CẦN đổi sang mô phỏng click ngày trên lịch. */
    function setDateRangeInputs(fromStr, toStr) {
      const searchBtn = findSearchButton();
      if (!searchBtn) return false;
      let row = searchBtn;
      let dateInputs = [];
      for (let i = 0; i < 5 && row; i++) {
        dateInputs = Array.from(row.querySelectorAll('input')).filter((inp) => {
          const v = (inp.value || inp.placeholder || '').trim();
          return /^\d{2}\/\d{2}\/\d{4}$/.test(v) || inp.type === 'date' || /ngày|date/i.test(inp.name || inp.id || '');
        });
        if (dateInputs.length >= 2) break;
        row = row.parentElement;
      }
      if (dateInputs.length < 2) {
        warn('Không xác định được 2 ô ngày (từ - đến). ⚠️ KIỂM TRA selector ô ngày thật. Sẽ dùng khoảng ngày mặc định đang hiển thị trên trang (có thể sai kỳ).');
        return false;
      }
      setReactValue(dateInputs[0], fromStr);
      setReactValue(dateInputs[1], toStr);
      return true;
    }

    /** ⚠️ KIỂM TRA: có thể CÓ HƠN 1 <table> trong khu vực kết quả (vd 1 bảng cho
     * header nhóm cột dính "sticky" + 1 bảng cho phần thân, hoặc 1 bảng riêng
     * cho cột "Tổng cộng" luôn hiển thị bên trái khi cuộn ngang). Gộp TẤT CẢ
     * bảng tìm thấy trong khu vực kết quả (dưới nút Tìm kiếm) lại, nối bằng
     * dòng trống — khớp với việc Ctrl+A sẽ chọn hết mọi bảng nhìn thấy trên trang. */
    function extractResultTsv() {
      const searchBtn = findSearchButton();
      const scopeRoot = searchBtn?.closest('form')?.parentElement || document.body;
      const tables = Array.from(scopeRoot.querySelectorAll('table'));
      if (tables.length === 0) {
        warn('Không tìm thấy <table> nào trong khu vực kết quả. ⚠️ KIỂM TRA vùng chứa bảng thật.');
        return '';
      }
      log(`Tìm thấy ${tables.length} bảng trong khu vực kết quả.`);
      return tables.map(tableToTsv).join('\n\n');
    }

    async function handleRequest(req) {
      log('Nhận yêu cầu từ CRM:', req.maNv, req.tenNv, req.period, `${req.from} -> ${req.to}`);
      try {
        const searchInput = findEmployeeSearchInput();
        if (!searchInput) throw new Error('Không tìm thấy ô tìm nhân viên.');

        const picked = await pickEmployeeSuggestion(searchInput, req.tenNv);
        if (!picked) throw new Error(`Không chọn được gợi ý cho "${req.tenNv}".`);

        setDateRangeInputs(req.from, req.to);

        const searchBtn = findSearchButton();
        if (!searchBtn) throw new Error('Không tìm thấy nút Tìm kiếm.');
        searchBtn.click();

        await sleep(CONFIG.WAIT_AFTER_SEARCH_MS);

        const tsv = extractResultTsv();
        GM_setValue(KEY_RESPONSE, JSON.stringify({ maNv: req.maNv, period: req.period, tsv, ts: Date.now() }));
        log(`Đã gửi dữ liệu về CRM cho ${req.maNv} - ${req.tenNv} (${tsv.length} ký tự). Nội dung: ${tsv.slice(0, 300)}${tsv.length > 300 ? '...' : ''}`);
      } catch (err) {
        warn(`Lỗi xử lý yêu cầu cho ${req.maNv} - ${req.tenNv}:`, err.message);
        GM_setValue(KEY_RESPONSE, JSON.stringify({ maNv: req.maNv, period: req.period, tsv: '', error: err.message, ts: Date.now() }));
      }
    }

    if (typeof GM_addValueChangeListener === 'function') {
      GM_addValueChangeListener(KEY_REQUEST, (_key, _old, newVal) => {
        if (!newVal) return;
        let req;
        try { req = JSON.parse(newVal); } catch { return; }
        handleRequest(req);
      });
      log('Sẵn sàng nhận yêu cầu từ tab CRM.');
    } else {
      warn('GM_addValueChangeListener không khả dụng — kiểm tra quyền @grant trong Tampermonkey.');
    }
  }
})();
