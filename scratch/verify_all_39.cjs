const fs = require('fs');

// Verify our 39 rows against the user's reference standards in Section IV:
const referenceRows = {
  'Điện tử Samsung': { th: 16.76, tgt: 242.00, ht: 6.9, dk: 14.3, kenh: 'DT' },
  'Tivi TCL': { th: 82.09, tgt: 307.00, ht: 26.7, dk: 55.2, kenh: 'DT' },
  'CE LG': { th: 290.68, tgt: 658.00, ht: 44.2, dk: 91.2, kenh: 'DT' },
  'Bảo hiểm Thợ ICT': { th: 10.08, tgt: 198.57, kenh: 'DT' },
  'Máy giặt': { th: 103.18, tgt: 606.00, kenh: 'DT' },
  'Nạp rút': { th: 63, tgt: 208, kenh: 'SL' },
  'Máy Lạnh': { th: 39, tgt: 102, kenh: 'SL' },
  'Camera': { th: 16.70, tgt: 38.00, kenh: 'DT' },
  'Trả chậm FECREDIT, SAMSUNG': { th: 387.38, tgt: 527.49, kenh: 'DT' },
};

console.log('Reference rows loaded:', Object.keys(referenceRows).length);

