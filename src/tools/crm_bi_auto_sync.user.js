// ==UserScript==
// @name         🚀 CRM BI Auto Sync
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Tự động copy dữ liệu từ trang BI và quay lại CRM
// @author       CRM Team
// @match        https://bi.thegioididong.com/khoi-ban-hang-sub*
// @grant        GM_setClipboard
// @grant        window.close
// ==/UserScript==

(function() {
    'use strict';

    // Chỉ chạy khi có tham số auto_sync (được CRM gửi đến)
    const url = new URL(window.location.href);
    if (!url.searchParams.has('auto_sync')) return;

    const syncType = url.searchParams.get('auto_sync'); // 'realtime' hoặc 'luyke'

    // Hiện thanh trạng thái trên trang BI
    const overlay = document.createElement('div');
    overlay.innerHTML = `
        <div id="crm-sync-overlay" style="
            position:fixed; top:20px; right:20px; z-index:99999;
            background:linear-gradient(135deg,#1e293b,#334155);
            color:white; padding:16px 24px; border-radius:16px;
            font-family:-apple-system,sans-serif; font-size:14px;
            box-shadow:0 20px 40px rgba(0,0,0,0.4);
            display:flex; align-items:center; gap:12px;
            border:1px solid rgba(255,255,255,0.1);
        ">
            <div style="width:20px;height:20px;border:3px solid rgba(255,255,255,0.2);border-top:3px solid #fbbf24;border-radius:50%;animation:crm-spin 0.8s linear infinite;"></div>
            <span id="crm-sync-status">⏳ Đang tải dữ liệu ${syncType === 'realtime' ? 'Realtime' : 'Luỹ kế'}...</span>
        </div>
        <style>
            @keyframes crm-spin { to { transform: rotate(360deg); } }
        </style>
    `;
    document.body.appendChild(overlay);

    const statusEl = document.getElementById('crm-sync-status');

    // Đợi bảng dữ liệu tải xong (tối đa 15 giây)
    let attempts = 0;
    const maxAttempts = 15;

    const checkAndCopy = setInterval(() => {
        attempts++;
        const tables = document.querySelectorAll('table');
        let totalRows = 0;

        tables.forEach(t => { totalRows += t.rows.length; });

        statusEl.textContent = `⏳ Đang tải... (${attempts}s) - ${tables.length} bảng, ${totalRows} dòng`;

        // Cần ít nhất 1 bảng với >= 3 dòng dữ liệu
        const hasData = totalRows >= 3;

        if (hasData || attempts >= maxAttempts) {
            clearInterval(checkAndCopy);

            if (!hasData) {
                statusEl.textContent = '❌ Không tìm thấy dữ liệu! Đóng sau 3s...';
                setTimeout(() => window.close(), 3000);
                return;
            }

            // Thu thập toàn bộ dữ liệu từ các bảng
            let allData = '';
            tables.forEach(t => {
                allData += t.innerText + '\n\n';
            });

            // Copy vào clipboard bằng API của Tampermonkey
            GM_setClipboard(allData.trim(), 'text');

            statusEl.textContent = `✅ Đã copy ${totalRows} dòng! Đang quay lại CRM...`;

            // Đóng tab sau 1.5 giây (quay về tab CRM)
            setTimeout(() => {
                window.close();
            }, 1500);
        }
    }, 1000);
})();
