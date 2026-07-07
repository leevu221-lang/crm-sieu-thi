import XLSX from 'xlsx';

try {
  const workbook = XLSX.readFile('mock_thuong_st.xlsx');
  console.log("SheetNames:", workbook.SheetNames);
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Sheet "${sheetName}" has ${data.length} rows`);
    console.log("First 5 rows:");
    console.log(data.slice(0, 5));
  }
} catch (e) {
  console.error(e);
}
