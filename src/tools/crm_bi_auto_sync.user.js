// ==UserScript==
// @name         ⚡ [BI MWG & CRM] Tự Động Kết Nối 2 Chiều: Auto Copy & Dán Tự Động
// @namespace    https://bi.thegioididong.com/
// @version      11.0
// @description  Bấm nút [CẬP NHẬT DATA] trên CRM sẽ tự động điều khiển trang BI mở 5 cấp, copy dữ liệu và dán ngược lại vào CRM
// @author       CRM Supermarket Dev
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const url = window.location.href.toLowerCase();
    const isCrmPage = url.includes('crm-sieu-thi') || url.includes('localhost') || url.includes('127.0.0.1');

    console.log('⚡ [CRM BI Auto Sync] Khởi chạy trên:', window.location.href);

    // ═══════════════════════════════════════════════════════════
    // 🌐 XỬ LÝ TRÊN TRANG WEB CRM
    // ═══════════════════════════════════════════════════════════
    if (isCrmPage) {
        window.CRM_TAMPERMONKEY_ACTIVE = true;

        // 1. Khi người dùng bấm [CẬP NHẬT DATA] trên CRM -> Gửi lệnh sang trang BI
        const triggerSyncToBi = () => {
            if (typeof GM_setValue === 'function') {
                GM_setValue('CRM_BI_CMD_TRIGGER', {
                    action: 'EXPAND_5_LEVELS_AND_COPY',
                    timestamp: Date.now()
                });
            }
        };

        document.addEventListener('CRM_REQUEST_BI_NGANHHANG_SYNC', triggerSyncToBi);
        document.addEventListener('CRM_TRIGGER_AUTO_COPY_NGANHHANG', triggerSyncToBi);
        document.addEventListener('CRM_AUTO_COPY_NHANG_CHINH', triggerSyncToBi);
        window.addEventListener('message', (e) => {
            if (e.data && (e.data.type === 'CRM_REQUEST_BI_NGANHHANG_SYNC' || e.data.type === 'CRM_TRIGGER_AUTO_COPY_NGANHHANG')) {
                triggerSyncToBi();
            }
        });

        try {
            const bc = new BroadcastChannel('crm_bi_sync_channel');
            bc.onmessage = (e) => {
                if (e.data && (e.data.action === 'AUTO_COPY_NGANHHANG_CHINH' || e.data.type === 'CRM_REQUEST_BI_NGANHHANG_SYNC')) {
                    triggerSyncToBi();
                }
            };
        } catch (e) {}

        // 2. Nhận dữ liệu kết quả từ trang BI truyền về -> Dán vào Web CRM
        const handleBiResult = (text) => {
            if (text && typeof text === 'string' && text.trim().length > 10) {
                document.dispatchEvent(new CustomEvent('CRM_RECEIVE_BI_NGANHHANG_DATA', {
                    detail: text
                }));
                window.postMessage({ type: 'CRM_RECEIVE_BI_NGANHHANG_DATA', data: text }, '*');
                localStorage.setItem('crm_bi_nganhhang_copied_data', text);
                localStorage.setItem('nganhhangchinh_nv_data', text);
                
                try {
                    const bc = new BroadcastChannel('crm_bi_sync_channel');
                    bc.postMessage({ action: 'RECEIVE_BI_NGANHHANG_DATA', text });
                } catch (e) {}
            }
        };

        if (typeof GM_addValueChangeListener === 'function') {
            GM_addValueChangeListener('CRM_BI_RESULT_DATA', function (name, oldVal, newVal) {
                if (newVal && newVal.text) {
                    handleBiResult(newVal.text);
                }
            });
        }

        // Fast Polling Backup for CRM
        let lastReceivedResultTime = 0;
        setInterval(() => {
            const res = typeof GM_getValue === 'function' ? GM_getValue('CRM_BI_RESULT_DATA', null) : null;
            if (res && res.timestamp && res.timestamp > lastReceivedResultTime && (Date.now() - res.timestamp < 30000)) {
                lastReceivedResultTime = res.timestamp;
                if (res.text) {
                    handleBiResult(res.text);
                }
            }
        }, 300);

        return;
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 XỬ LÝ TRÊN TRANG BÁO CÁO BI / TRANG NGOÀI CRM
    // ═══════════════════════════════════════════════════════════
    let isRunning = false;

    // 1. Lắng nghe lệnh từ Web CRM qua GM_addValueChangeListener
    if (typeof GM_addValueChangeListener === 'function') {
        GM_addValueChangeListener('CRM_BI_CMD_TRIGGER', function (name, oldVal, newVal) {
            if (newVal && newVal.action === 'EXPAND_5_LEVELS_AND_COPY') {
                if (!isRunning) {
                    runAutoExpandAndCopyAll(true);
                }
            }
        });
    }

    // 2. High-speed polling backup trên tab BI để nhận lệnh từ CRM tức thì (250ms)
    let lastProcessedCmdTime = 0;
    setInterval(() => {
        const cmd = typeof GM_getValue === 'function' ? GM_getValue('CRM_BI_CMD_TRIGGER', null) : null;
        if (cmd && cmd.timestamp && cmd.timestamp > lastProcessedCmdTime && (Date.now() - cmd.timestamp < 15000)) {
            lastProcessedCmdTime = cmd.timestamp;
            if (!isRunning) {
                runAutoExpandAndCopyAll(true);
            }
        }
    }, 250);

    function checkAndInjectButton() {
        const btn = document.getElementById('tm-bi-auto-expand-btn');
        if (btn) return;
        if (!document.body && !document.documentElement) return;

        const newBtn = document.createElement('div');
        newBtn.id = 'tm-bi-auto-expand-btn';
        newBtn.innerHTML = `
            <div style="display:flex;align-items:center;gap:7px;">
                <span style="font-size:16px;">⚡</span>
                <span id="tm-bi-btn-label" style="font-weight:900;letter-spacing:0.5px;">AUTO COPY N.HÀNG CHÍNH</span>
            </div>
        `;

        newBtn.style.cssText = `
            position: fixed !important;
            bottom: 30px !important;
            right: 30px !important;
            z-index: 2147483647 !important;
            background: linear-gradient(135deg, #ea580c, #f97316, #fb923c) !important;
            color: #ffffff !important;
            padding: 13px 24px !important;
            border-radius: 9999px !important;
            cursor: pointer !important;
            box-shadow: 0 12px 28px -5px rgba(234, 88, 12, 0.6), 0 0 0 2.5px rgba(255, 255, 255, 0.6) !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 13px !important;
            user-select: none !important;
            transition: all 0.2s ease !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;

        newBtn.onmouseover = () => {
            newBtn.style.transform = 'translateY(-3px) scale(1.03)';
            newBtn.style.boxShadow = '0 16px 32px -5px rgba(234, 88, 12, 0.8), 0 0 0 3px rgba(255, 255, 255, 0.8)';
        };
        newBtn.onmouseout = () => {
            newBtn.style.transform = 'translateY(0) scale(1)';
            newBtn.style.boxShadow = '0 12px 28px -5px rgba(234, 88, 12, 0.6), 0 0 0 2.5px rgba(255, 255, 255, 0.6)';
        };

        newBtn.addEventListener('click', () => runAutoExpandAndCopyAll(false));
        (document.body || document.documentElement).appendChild(newBtn);
    }

    setInterval(checkAndInjectButton, 500);

    // ═══════════════════════════════════════════════════════════
    // 🔄 MỞ 5 CẤP [+] ➔ COPY & TRUYỀN VỀ CRM
    // ═══════════════════════════════════════════════════════════
    async function runAutoExpandAndCopyAll(fromCrmCommand) {
        if (isRunning) return;
        isRunning = true;

        const btn = document.getElementById('tm-bi-auto-expand-btn');
        const label = document.getElementById('tm-bi-btn-label');
        if (btn) btn.style.background = 'linear-gradient(135deg, #0284c7, #0ea5e9)';
        if (label) label.innerText = 'ĐANG MỞ CÁC CẤP [+]...';

        try {
            const MAX_LEVELS = 6; // Đảm bảo mở đủ từ Tổng -> BP -> Cấp 1 (NV) -> Cấp 2 (NNH) -> Cấp 3 (Ngành) -> Cấp 4 (Hãng) -> Cấp 5 (Sản phẩm)

            for (let level = 1; level <= MAX_LEVELS; level++) {
                let plusElements = findAllPlusIcons();

                if (plusElements.length === 0) {
                    break;
                }

                if (label) label.innerText = `ĐANG MỞ CẤP ${level}/${MAX_LEVELS}...`;

                for (let el of plusElements) {
                    try {
                        el.scrollIntoView({ block: 'nearest' });
                        el.click();
                        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    } catch (e) {}
                }

                await sleep(350);
            }

            await sleep(450);

            // Bôi đen toàn trang & Lấy chuỗi raw text
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(document.body);
            selection.removeAllRanges();
            selection.addRange(range);

            const rawPageText = selection.toString() || document.body.innerText;

            // Đẩy vào Clipboard
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(rawPageText, 'text');
            }
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(rawPageText).catch(() => {});
            }
            document.execCommand('copy');

            selection.removeAllRanges();

            // 🚀 BẮN DỮ LIỆU SANG CHO WEB CRM NHẬN TỰ ĐỘNG
            GM_setValue('CRM_BI_RESULT_DATA', {
                text: rawPageText,
                timestamp: Date.now()
            });

            if (!fromCrmCommand) {
                showCenterModalNotification();
            }

        } catch (err) {
            console.error('[TM BI Error]', err);
            alert("❌ Lỗi: " + err.message);
        } finally {
            isRunning = false;
            if (btn) btn.style.background = 'linear-gradient(135deg, #ea580c, #f97316, #fb923c)';
            if (label) label.innerText = 'AUTO COPY N.HÀNG CHÍNH';
        }
    }

    function findAllPlusIcons() {
        let list = [];

        let firstCells = document.querySelectorAll('table tr td:first-child, table tr td:nth-child(2)');
        firstCells.forEach(cell => {
            let text = cell.innerText ? cell.innerText.trim() : '';
            if (text === '+' || text.startsWith('+ ') || text === '➕' || text === '▶' || text === '►') {
                if (isClickablePlus(cell) && !list.includes(cell)) {
                    list.push(cell);
                }
            } else {
                let subIcons = cell.querySelectorAll('span, i, a, div, button');
                subIcons.forEach(icon => {
                    let subText = icon.innerText ? icon.innerText.trim() : '';
                    if (subText === '+' || subText === '➕' || icon.classList.contains('fa-plus') || icon.classList.contains('k-plus')) {
                        if (isClickablePlus(icon) && !list.includes(icon)) {
                            list.push(icon);
                        }
                    }
                });
            }
        });

        return list;
    }

    function isClickablePlus(el) {
        if (!el || el.offsetParent === null) return false;
        let style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;

        let text = el.innerText ? el.innerText.trim() : '';
        if (text === '-' || text.startsWith('- ') || text === '➖' || text === '▼') return false;
        if (el.getAttribute('aria-expanded') === 'true') return false;
        if (el.classList.contains('fa-minus') || el.classList.contains('bi-dash') || el.classList.contains('k-i-collapse')) return false;

        return true;
    }

    function showCenterModalNotification() {
        let old = document.getElementById('tm-bi-center-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'tm-bi-center-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.45);
                backdrop-filter: blur(4px);
                z-index: 2147483646;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: tmFadeIn 0.25s ease-out;
            ">
                <div style="
                    background: #ffffff;
                    border-radius: 24px;
                    padding: 32px 36px;
                    text-align: center;
                    max-width: 520px;
                    width: 90vw;
                    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 3px rgba(16, 185, 129, 0.3);
                    border: 1px solid rgba(226, 232, 240, 0.9);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    transform: scale(1);
                    animation: tmPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                ">
                    <div style="
                        width: 72px;
                        height: 72px;
                        margin: 0 auto 18px auto;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #10b981, #059669);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 36px;
                        color: #ffffff;
                        box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.5);
                    ">
                        ✓
                    </div>

                    <h3 style="
                        font-size: 20px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 0 0 10px 0;
                        letter-spacing: -0.3px;
                    ">
                        ĐÃ COPY DỮ LIỆU XONG (5 CẤP)
                    </h3>

                    <p style="
                        font-size: 15px;
                        font-weight: 700;
                        color: #059669;
                        margin: 0 0 22px 0;
                        line-height: 1.5;
                        background: #ecfdf5;
                        padding: 12px 18px;
                        border-radius: 14px;
                        border: 1px dashed #6ee7b7;
                    ">
                        Dữ liệu đã được tự động truyền về CRM Siêu Thị!
                    </p>

                    <button id="tm-close-modal-btn" style="
                        background: linear-gradient(135deg, #059669, #10b981);
                        color: #ffffff;
                        border: none;
                        padding: 11px 28px;
                        border-radius: 12px;
                        font-size: 13.5px;
                        font-weight: 900;
                        cursor: pointer;
                        box-shadow: 0 8px 16px -4px rgba(5, 150, 105, 0.4);
                        transition: all 0.2s ease;
                    ">
                        ĐÃ HIỂU (ĐÓNG)
                    </button>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes tmFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes tmPopIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        modal.appendChild(style);
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#tm-close-modal-btn');
        if (closeBtn) closeBtn.onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal.firstElementChild) modal.remove();
        };

        setTimeout(() => {
            if (document.body.contains(modal)) {
                modal.remove();
            }
        }, 4000);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    window.addEventListener('keydown', function (e) {
        if (!isCrmPage && (e.altKey && (e.key === 'c' || e.key === 'C'))) {
            e.preventDefault();
            runAutoExpandAndCopyAll(false);
        }
    });

    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('⚡ Auto Copy N.Hàng Chính (Alt+C)', () => runAutoExpandAndCopyAll(false));
    }

    checkAndInjectButton();

})();
