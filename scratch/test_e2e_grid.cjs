const fs = require('fs');

function testEndToEndGrid() {
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

  const results = [];
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const yc = c.yCenter;

    // Col 1 words
    c.words.sort((a, b) => a.left - b.left);
    const rawProg = c.words.map(w => w.text).join(' ');

    // Col 2 TH
    const mTh = wordsTh.filter(w => Math.abs(w.yCenter - yc) < 35).sort((a, b) => a.left - b.left);
    const rawTh = mTh.map(w => w.text).join(' ');

    // Col 3 Target
    const mTgt = wordsTgt.filter(w => Math.abs(w.yCenter - yc) < 35).sort((a, b) => a.left - b.left);
    const rawTgt = mTgt.map(w => w.text).join(' ');

    // Col 4 Bar (% HT)
    const mBar = wordsBar.filter(w => Math.abs(w.yCenter - yc) < 35 && (w.text.includes('%') || /\d/.test(w.text))).sort((a, b) => a.left - b.left);
    const rawBar = mBar.length > 0 ? mBar[0].text : '';

    // Col 5 % Du kien
    const mDk = wordsDk.filter(w => Math.abs(w.yCenter - yc) < 35).sort((a, b) => a.left - b.left);
    const rawDk = mDk.map(w => w.text).join(' ');

    // Col 6 Rank
    const mRank = wordsRank.filter(w => Math.abs(w.yCenter - yc) < 35).sort((a, b) => a.left - b.left);
    const rawRank = mRank.map(w => w.text).join(' ');

    results.push({
      idx: i + 1,
      rawProg,
      rawTh,
      rawTgt,
      rawBar,
      rawDk,
      rawRank,
    });
  }

  console.log('Processed', results.length, 'rows.');
  console.log(JSON.stringify(results.slice(0, 5), null, 2));
}

testEndToEndGrid();

