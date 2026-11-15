const fs = require('fs');
const { createWorker } = require('tesseract.js');

async function testFull6Slice() {
  const worker = await createWorker(['vie', 'eng'], 1, {
    corePath: './public/ocr/core',
    langPath: './public/ocr/lang',
    gzip: true,
  });

  console.log('Testing full 6-slice recognition on scratch/test_thi_dua.png...');
  
  // We already have the 6 cropped strips in scratch/
  // Let's verify reading them and parsing them into 39 complete rows
  const tsvProg = fs.readFileSync('scratch/col1_prog_tsv.tsv', 'utf-8');
  const tsvTh = fs.readFileSync('scratch/col2_th_tsv.tsv', 'utf-8');
  const tsvTgt = fs.readFileSync('scratch/col3_tgt_tsv.tsv', 'utf-8');
  const tsvBar = fs.readFileSync('scratch/col4_bar_tsv.tsv', 'utf-8');
  const tsvDk = fs.readFileSync('scratch/col5_pctdk_tsv.tsv', 'utf-8');
  const tsvRank = fs.readFileSync('scratch/col6_rank_tsv.tsv', 'utf-8');

  function parseWords(tsv, offX, offY) {
    const words = [];
    for (const line of tsv.split('\n')) {
      const p = line.split('\t');
      if (p.length >= 12 && p[0] === '5' && p[11].trim()) {
        words.push({
          text: p[11].trim(),
          left: parseInt(p[6]) + offX,
          top: parseInt(p[7]) + offY,
          w: parseInt(p[8]),
          h: parseInt(p[9]),
          conf: parseFloat(p[10]),
          yCenter: parseInt(p[7]) + offY + parseInt(p[9]) / 2,
        });
      }
    }
    return words;
  }

  const y0 = 230;
  const wordsProg = parseWords(tsvProg, 0, y0);
  const wordsTh = parseWords(tsvTh, 740, y0);
  const wordsTgt = parseWords(tsvTgt, 1000, y0);
  const wordsBar = parseWords(tsvBar, 1240, y0);
  const wordsDk = parseWords(tsvDk, 1700, y0);
  const wordsRank = parseWords(tsvRank, 1880, y0);

  // Cluster Prog words by y
  const progSorted = [...wordsProg].sort((a, b) => a.yCenter - b.yCenter);
  const clusters = [];
  for (const w of progSorted) {
    let matched = clusters.find(c => Math.abs(c.yCenter - w.yCenter) < 35);
    if (matched) {
      matched.words.push(w);
      matched.yCenter = matched.words.reduce((sum, item) => sum + item.yCenter, 0) / matched.words.length;
    } else {
      clusters.push({ yCenter: w.yCenter, words: [w] });
    }
  }

  clusters.sort((a, b) => a.yCenter - b.yCenter);
  console.log('Total clusters:', clusters.length);

  await worker.terminate();
}

testFull6Slice().catch(console.error);
