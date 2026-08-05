const https = require('https');
const url = "https://docs.google.com/spreadsheets/d/1ZZl-jfKgGqD65-J293B3eW5R_f-T0kFqgXj4sO8l9E/gviz/tq?tqx=out:csv&sheet=data%20SI%C3%8AU%20TH%E1%BB%8A";

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };
    
    const lines = data.split('\n');
    const headers = parseCSVLine(lines[0]);
    
    const colLetterToIndex = (col) => {
      let idx = 0;
      for (let i = 0; i < col.length; i++) {
        idx = idx * 26 + (col.charCodeAt(i) - 64);
      }
      return idx - 1;
    };
    
    const rtSTCols = ['U','V','W','X','Y','Z','AB','AC','AD','AG'].map(colLetterToIndex);
    console.log("Headers for rtSTCols:");
    rtSTCols.forEach((idx, i) => {
      console.log(`CỘT ${i + 1} (${idx}):`, headers[idx]);
    });
    
    // Check first data row
    const row1 = parseCSVLine(lines[1]);
    console.log("Row 1 rtSTCols:", rtSTCols.map(idx => row1[idx]));
    console.log("Row 1 C (Siêu thị?):", row1[colLetterToIndex('C')]);
  });
});
