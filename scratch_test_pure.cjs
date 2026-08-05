const mockCleanNum = col => parseFloat(col.replace(/[^\d.-]/g, '')) || 0;

const parseStaffValueList = (text, targetHeaderKeyword) => {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results = [];

  const norm = s => s ? s.toLowerCase() : '';

  lines.forEach(line => {
    let cols = line.split('\t').map(c => c.trim());
    if (cols.length < 2) {
      cols = line.split(/ {2,}/).map(c => c.trim()).filter(Boolean);
    }
    if (cols.length < 2) return;

    let id = '';
    let name = '';
    let value = 0;

    cols.forEach(col => {
      if (!col) return;
      const m1 = col.match(/(.+)[\s-–—]+(\d{4,8})$/);
      const m2 = col.match(/^(\d{4,8})[\s-–—]+(.+)$/);
      if (m1) {
        id = m1[2].trim();
        name = m1[1].trim();
      } else if (m2) {
        id = m2[1].trim();
        name = m2[2].trim();
      }
    });

    const pureNumbers = [];
    const textColumns = [];

    cols.forEach((col, idx) => {
      if (!col) return;
      const colCleaned = col.trim().toLowerCase().replace(/(h|tr|đ|vnd|hours|tr\.|đ\.)/g, '').trim();
      const cleanCol = colCleaned.replace(/[^\d,.-]/g, '');
      const isNum = cleanCol.length > 0 && /^\s*[-+]?[0-9,.]+\s*$/.test(colCleaned);

      if (isNum) {
        pureNumbers.push({ val: mockCleanNum(col), colIdx: idx, raw: col.trim() });
      } else {
        textColumns.push({ val: col, colIdx: idx });
      }
    });

    if (targetHeaderKeyword === 'LAST_COLUMN' && pureNumbers.length > 0) {
      const nonIdNumbers = pureNumbers.filter(pn => !/^\d{4,8}$/.test(pn.raw));
      if (nonIdNumbers.length > 0) {
        value = nonIdNumbers[nonIdNumbers.length - 1].val;
      } else {
        value = pureNumbers[pureNumbers.length - 1].val;
      }
      
      if (!id) {
        const idIndex = pureNumbers.findIndex(pn => /^\d{4,8}$/.test(pn.raw));
        if (idIndex !== -1) id = pureNumbers[idIndex].raw;
      }
    }

    if (!name) {
      const nameCandidates = textColumns
        .filter(tc => !tc.val.includes(id) && tc.val !== id && /[a-zA-Z]/.test(norm(tc.val)))
        .map(tc => tc.val);
      if (nameCandidates.length > 0) {
        name = nameCandidates[0];
      }
    }

    if (name || id) {
      results.push({
        id: id || name,
        name: name || id,
        value
      });
    }
  });

  return results;
};

const input = "Trần Văn Duy	98.38	61.74	60.97	38.26							298.17	53.44";
console.log(parseStaffValueList(input, 'LAST_COLUMN'));
