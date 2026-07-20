const testRows = [
  // Case 1: standalone sign in separate cell
  ["-", "NNH Điện gia dụng", "414", "634", "1,031"],
  ["+", "Chảo", "67", "18", "15"],
  
  // Case 2: prefix inside category cell
  ["- NNH Điện lạnh", "132", "1,422", "4,568"],
  ["+ Máy lạnh (IMEI)", "40", "404", "2,891"],
  
  // Case 3: no sign prefix
  ["Tổng", "1,390", "4,087", "7,879"],
  ["Bảo hiểm", "2", "0", "0"]
];

const processRowSignAndAlign = (row) => {
  if (!row || row.length === 0) return null;
  
  let sign = null;
  let cleanRow = [...row];
  
  const firstCell = String(row[0] || '').trim();
  
  if (firstCell === '+' || firstCell === '-' || firstCell === '—' || firstCell === '–') {
    sign = (firstCell === '+') ? '+' : '-';
    cleanRow = row.slice(1);
  } else {
    // Check if it starts with the sign prefix (e.g. "+ Chảo", "- NNH Điện gia dụng")
    if (firstCell.startsWith('+') || firstCell.startsWith('-') || firstCell.startsWith('—') || firstCell.startsWith('–')) {
      sign = firstCell.startsWith('+') ? '+' : '-';
      cleanRow[0] = firstCell.replace(/^[+\-—–]\s*/, '');
    } else {
      // Guess sign: if starts with "NNH ", it's parent (-), else child (+)
      if (firstCell.toLowerCase().startsWith('nnh ')) {
        sign = '-';
      } else {
        sign = '+';
      }
    }
  }
  
  return { sign, cleanRow };
};

testRows.forEach(r => {
  const res = processRowSignAndAlign(r);
  console.log(`Original: ${JSON.stringify(r)} -> Sign: ${res.sign}, Cleaned: ${JSON.stringify(res.cleanRow)}`);
});
