const fs = require('fs');
const content = fs.readFileSync('src/pages/ToolHoTro.tsx', 'utf8');

// The problematic block starts with handleFileUpload and ends before handleClearData
// We find handleFileUpload at line ~265
// and the corrupted end around ~373

const startSearch = 'const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File, type: \'inventory\' | \'price\', shouldAppend: boolean = false) => {';
const endSearch = 'const handleClearData = () => {';

const startIndex = content.indexOf(startSearch);
const endIndex = content.indexOf(endSearch);

if (startIndex !== -1 && endIndex !== -1) {
    const fixedContent = content.substring(0, startIndex) + `const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File, type: 'inventory' | 'price', shouldAppend: boolean = false) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    if (type === 'inventory') {
      setInventoryFile(file);
    } else if (!shouldAppend) {
      setPriceFile(file);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataBuffer = evt.target?.result as ArrayBuffer;
      const wb = XLSX.read(dataBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' }) as any[][]; 
      
      if (!data || data.length === 0) {
        showNotification('File Excel không có dữ liệu!', 'error');
        return;
      }

      if (type === 'inventory') {
        const storageKeyInv = STORAGE_KEYS.STICKER_INVENTORY_DATA;
        setInventoryData(data);
        const timestamp = new Date().toISOString();
        setLastUpdateInventory(new Date(timestamp).toLocaleString('vi-VN'));
        localStorage.setItem(storageKeyInv, JSON.stringify({
          data,
          timestamp
        }));
        showNotification('Đã tải và lưu tạm file Tồn kho!', 'success');
      } else {
        // Process price data
        const parsedPriceData: any[] = [];
        
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(20, data.length); i++) {
          const row: any = data[i];
          if (!row || !Array.isArray(row)) continue;
          const rowStr = row.join(' ').toLowerCase();
          if (rowStr.includes('tên sản phẩm') || rowStr.includes('tên hàng') || rowStr.includes('mã sản phẩm') || rowStr.includes('giá niêm yết')) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx !== -1) {
          const headerRow = data[headerRowIdx].map((h: any) => String(h || '').toLowerCase().trim());
          const maSpIdx = headerRow.findIndex((h: string) => h === 'mã sản phẩm' || h === 'mã sp' || h === 'mã hàng');
          const nameIdx = headerRow.findIndex((h: string) => h === 'tên sản phẩm' || h === 'tên hàng' || h === 'sản phẩm');
          const originalPriceIdx = headerRow.findIndex((h: string) => h === 'giá niêm yết' || h === 'giá gốc' || h === 'giá cũ');
          const discountPriceIdx = headerRow.findIndex((h: string) => h === 'giá mới' || h === 'giá giảm' || h === 'giá bán' || h === 'giá hiện tại');
          const nganhHangIdx = headerRow.findIndex((h: string) => h === 'ngành hàng');
          const nhomHangIdx = headerRow.findIndex((h: string) => h === 'nhóm hàng');

          for (let i = headerRowIdx + 1; i < data.length; i++) {
            const row: any = data[i];
            if (!row || !Array.isArray(row)) continue;

            const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
            if (!name || name.toLowerCase().includes('tên sản phẩm')) continue;

            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\\d]/g, ''), 10) || 0;
            };

            parsedPriceData.push({
              maSanPham: maSpIdx !== -1 ? String(row[maSpIdx] || '').trim() : '',
              productCode: maSpIdx !== -1 ? String(row[maSpIdx] || '').trim() : '',
              name,
              originalPrice: originalPriceIdx !== -1 ? cleanPrice(row[originalPriceIdx]) : 0,
              discountPrice: discountPriceIdx !== -1 ? cleanPrice(row[discountPriceIdx]) : 0,
              nganhHang: nganhHangIdx !== -1 ? String(row[nganhHangIdx] || '').trim() : '',
              nhomHang: nhomHangIdx !== -1 ? String(row[nhomHangIdx] || '').trim() : ''
            });
          }
        }

        const finalData = shouldAppend ? [...priceData, ...parsedPriceData] : parsedPriceData;
        setPriceData(finalData);
        
        const timestamp = new Date().toISOString();
        if (!shouldAppend) setLastUpdatePrice(new Date(timestamp).toLocaleString('vi-VN'));
        
        const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;
        localStorage.setItem(storageKeyPrice, JSON.stringify({
          data: finalData,
          timestamp
        }));
        
        const message = shouldAppend 
          ? \`Đã thêm \${parsedPriceData.length} sản phẩm vào danh sách!\` 
          : \`Đã tải và đồng bộ \${parsedPriceData.length} sản phẩm bảng giá!\`;
        showNotification(message, 'success');
      }
    };
    reader.readAsArrayBuffer(file);
  };\n\n  ` + content.substring(endIndex);
    fs.writeFileSync('src/pages/ToolHoTro.tsx', fixedContent);
    console.log('File repaired successfully!');
} else {
    console.log('Search strings not found. startIndex:', startIndex, 'endIndex:', endIndex);
}
