const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/pages/SucKhoeNhanVien.tsx');
let content = fs.readFileSync(file, 'utf8');

const searchStr = `                                         {showThuNhapGroup && (
                                           <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-orange-50/20">
                                             {tbTn.top > 0 ? (
                                               <span className="px-2.5 py-1 rounded bg-orange-100 text-orange-800 font-black text-xs">TOP</span>
                                             ) : tbTn.bot > 0 ? (
                                               <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>
                                             ) : (
                                               <span className="text-slate-300 font-normal text-xs">-</span>
                                             )}
                                           </td>
                                         )}`;

const replaceStr = `                                         {showThuNhapGroup && (
                                           <>
                                             {showMonthlyDtqd && (
                                               <>
                                                 <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                   "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                   rank3TThuNhapTopBotStats.sets?.botM1Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                   rank3TThuNhapTopBotStats.sets?.topM1Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                   "bg-orange-50/10 text-[#00965e]"
                                                 )}>
                                                   {(() => {
                                                     const val = row.thunhap1 || 0;
                                                     if (!val) return '0';
                                                     return val >= 1000000 
                                                       ? \`\${(val / 1000000).toFixed(1).replace('.', ',')} tr\`
                                                       : Math.round(val).toLocaleString('vi-VN');
                                                   })()}
                                                 </td>
                                                 <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                   "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                   rank3TThuNhapTopBotStats.sets?.botM2Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                   rank3TThuNhapTopBotStats.sets?.topM2Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                   "bg-orange-50/10 text-[#00965e]"
                                                 )}>
                                                   {(() => {
                                                     const val = row.thunhap2 || 0;
                                                     if (!val) return '0';
                                                     return val >= 1000000 
                                                       ? \`\${(val / 1000000).toFixed(1).replace('.', ',')} tr\`
                                                       : Math.round(val).toLocaleString('vi-VN');
                                                   })()}
                                                 </td>
                                                 <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                   "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                   rank3TThuNhapTopBotStats.sets?.botM3Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                   rank3TThuNhapTopBotStats.sets?.topM3Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                   "bg-orange-50/10 text-[#00965e]"
                                                 )}>
                                                   {(() => {
                                                     const val = row.thunhap3 || 0;
                                                     if (!val) return '0';
                                                     return val >= 1000000 
                                                       ? \`\${(val / 1000000).toFixed(1).replace('.', ',')} tr\`
                                                       : Math.round(val).toLocaleString('vi-VN');
                                                   })()}
                                                 </td>
                                               </>
                                             )}
                                             <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-[#00965e] font-black bg-orange-50/10 whitespace-nowrap">
                                               {(() => {
                                                 const avgTn = row.thunhap / 3;
                                                 return avgTn >= 1000000 
                                                   ? \`\${(avgTn / 1000000).toFixed(1).replace('.', ',')} tr\`
                                                   : Math.round(avgTn).toLocaleString('vi-VN');
                                               })()}
                                             </td>
                                             <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-orange-50/20">
                                               {tbTn.top > 0 ? (
                                                 <span className="px-2.5 py-1 rounded bg-orange-100 text-orange-800 font-black text-xs">TOP</span>
                                               ) : tbTn.bot > 0 ? (
                                                 <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>
                                               ) : (
                                                 <span className="text-slate-300 font-normal text-xs">-</span>
                                               )}
                                             </td>
                                           </>
                                         )}`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully replaced!');
} else {
  console.log('Search string not found, attempting regex replacement...');
  const regex = /\{showThuNhapGroup\s*&&\s*\(\s*<td[\s\S]*?<\/td>\s*\)\}/;
  if (regex.test(content)) {
    content = content.replace(regex, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully replaced with regex!');
  } else {
    console.log('Regex match failed!');
  }
}
