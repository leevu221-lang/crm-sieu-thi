const fs = require('fs');

async function test() {
  const sheetId = '1ZJFuvDQF5-7R_RKXOmlR0_GrhzQmGuYZG_BJCoqY-kM';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('data SIÊU THỊ')}`;
  console.log("Fetching:", url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("HTTP Error:", res.status);
      return;
    }
    const text = await res.text();
    // Use line split to parse CSV simply
    const rows = text.split('\n').filter(l => l.trim()).map(line => {
      return line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    });
    console.log("Total rows:", rows.length);
    if (rows.length > 0) {
      console.log("Headers (length " + rows[0].length + "):", rows[0]);
      console.log("Row 1 (length " + rows[1].length + "):", rows[1]);
      console.log("Row 2 (length " + rows[2].length + "):", rows[2]);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
