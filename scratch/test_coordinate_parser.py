import re

def parse_tsv_words(filepath, offset_x=0, offset_y=0):
    words = []
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) >= 12 and parts[0] == '5' and parts[11].strip():
                words.append({
                    'text': parts[11].strip(),
                    'left': int(parts[6]) + offset_x,
                    'top': int(parts[7]) + offset_y,
                    'w': int(parts[8]),
                    'h': int(parts[9]),
                    'conf': float(parts[10]),
                    'yCenter': int(parts[7]) + offset_y + int(parts[9]) / 2,
                })
    return words

y0 = 230
words_prog = parse_tsv_words('scratch/col1_prog_tsv.tsv', 0, y0)
words_th = parse_tsv_words('scratch/col2_th_tsv.tsv', 740, y0)
words_tgt = parse_tsv_words('scratch/col3_tgt_tsv.tsv', 1000, y0)
words_bar = parse_tsv_words('scratch/col4_bar_tsv.tsv', 1240, y0)
words_dk = parse_tsv_words('scratch/col5_pctdk_tsv.tsv', 1700, y0)
words_rank = parse_tsv_words('scratch/col6_rank_tsv.tsv', 1880, y0)

prog_by_y = sorted(words_prog, key=lambda w: w['yCenter'])

clusters = []
for w in prog_by_y:
    matched = None
    for c in clusters:
        if abs(c['yCenter'] - w['yCenter']) < 35:
            matched = c
            break
    if matched:
        matched['words'].append(w)
        matched['yCenter'] = sum(x['yCenter'] for x in matched['words']) / len(matched['words'])
    else:
        clusters.append({'yCenter': w['yCenter'], 'words': [w]})

clusters.sort(key=lambda c: c['yCenter'])

def clean_num(text):
    if not text:
        return ''
    t = text.replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1').replace('|', '1')
    t = re.sub(r'[^0-9.,+-]', '', t)
    return t

print(f"{'Idx':3s} | {'Program Name (Cleaned)':35s} | {'Kenh':4s} | {'TH':7s} | {'Target':8s} | {'% HT':6s} | {'% Du kien':9s} | Hang")
print('-'*90)

for idx, c in enumerate(clusters):
    yc = c['yCenter']
    c['words'].sort(key=lambda w: w['left'])
    raw_prog = ' '.join(w['text'] for w in c['words'])
    
    kenh = '-'
    kenh_match = re.search(r'\b(DT|Dr|dr|ot|oT|or|ort|pt|pr|vt|vr|bt|br|nr|tT|pT|D7|0T)\b', raw_prog, re.I)
    if kenh_match:
        kenh = 'DT'
    else:
        kenh_match_sl = re.search(r'\b(SL|sL|si|S1|5L|s1|st|sSL|ssL)\b', raw_prog, re.I)
        if kenh_match_sl:
            kenh = 'SL'
            
    clean_p = re.sub(r'^[+#*★w•\s-]+', '', raw_prog)
    clean_p = re.sub(r'\b(DT|Dr|dr|ot|oT|or|ort|pt|pr|vt|vr|bt|br|nr|tT|pT|D7|0T|SL|sL|si|S1|5L|s1|st)\b', '', clean_p, flags=re.I).strip()
    clean_p = re.sub(r'^[1I|]11\s*[-–—:]?\s*', 'T11 - ', clean_p)
    clean_p = re.sub(r'^1T11\s*[-–—:]?\s*', 'T11 - ', clean_p)
    clean_p = re.sub(r'^TI11\s*[-–—:]?\s*', 'T11 - ', clean_p)
    clean_p = re.sub(r'^TT11\s*[-–—:]?\s*', 'T11 - ', clean_p)
    clean_p = re.sub(r'^T1\s*[-–—:]?\s*Sim', 'T11 - Sim', clean_p)
    
    m_th = [w for w in words_th if abs(w['yCenter'] - yc) < 35]
    m_th.sort(key=lambda w: w['left'])
    raw_th = ' '.join(w['text'] for w in m_th)
    val_th = clean_num(raw_th)
    
    m_tgt = [w for w in words_tgt if abs(w['yCenter'] - yc) < 35]
    m_tgt.sort(key=lambda w: w['left'])
    raw_tgt = ' '.join(w['text'] for w in m_tgt)
    val_tgt = clean_num(raw_tgt)
    
    m_bar = [w for w in words_bar if abs(w['yCenter'] - yc) < 35 and ('%' in w['text'] or any(ch.isdigit() for ch in w['text']))]
    m_bar.sort(key=lambda w: w['left'])
    val_bar = m_bar[0]['text'] if m_bar else ''
    val_bar = val_bar.replace(')%', '0%').replace(')%.', '0%').replace('`', '').replace('s2', '')
    
    m_dk = [w for w in words_dk if abs(w['yCenter'] - yc) < 35]
    m_dk.sort(key=lambda w: w['left'])
    val_dk = ' '.join(w['text'] for w in m_dk)
    
    m_rank = [w for w in words_rank if abs(w['yCenter'] - yc) < 35]
    m_rank.sort(key=lambda w: w['left'])
    val_rank = ' '.join(w['text'] for w in m_rank)
    if not any(ch.isdigit() for ch in val_rank):
        val_rank = '-'
        
    print(f'{idx+1:2d}  | {clean_p:35s} | {kenh:4s} | {val_th:7s} | {val_tgt:8s} | {val_bar:6s} | {val_dk:9s} | {val_rank}')
