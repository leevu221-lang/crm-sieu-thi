const fs = require('fs');
const path = './src/pages/SucKhoeNhanVien.tsx';

let content = fs.readFileSync(path, 'utf8');

const oldChunk = `<td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-orange-50/20">
                                           </td>
                                           </>
                                         )}
                                         <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center text-[12px] whitespace-nowrap bg-slate-900/5">
                                           {(() => {
                                             const tbTn = rank3TThuNhapTopBotStats.stats[key] || { top: 0, bot: 0 };
                                             const totalTop = tbDtqd.top + tbNh.top + tbEff.top + tbTn.top;
                                             const totalBot = tbDtqd.bot + tbNh.bot + tbEff.bot + tbTn.bot;`;

const newChunk = `<td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-orange-50/20">
                                                {tbTn.top > 0 ? (
                                                  <span className="px-2.5 py-1 rounded bg-orange-100 text-orange-800 font-black text-xs">TOP</span>
                                                ) : tbTn.bot > 0 ? (
                                                  <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>
                                                ) : (
                                                  <span className="text-slate-300 font-normal text-xs">-</span>
                                                )}
                                              </td>
                                            </>
                                          )}
                                         <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center text-[12px] whitespace-nowrap bg-slate-900/5">
                                           {(() => {
                                             const tbTn = rank3TThuNhapTopBotStats.stats[key] || { top: 0, bot: 0 };
                                             const totalTop = (showDtqdGroup ? tbDtqd.top : 0) + 
                                                              (showNganhHangGroup ? tbNh.top : 0) + 
                                                              (showEffGroup ? tbEff.top : 0) + 
                                                              (showThuNhapGroup ? tbTn.top : 0);

                                             const totalBot = (showDtqdGroup ? tbDtqd.bot : 0) + 
                                                              (showNganhHangGroup ? tbNh.bot : 0) + 
                                                              (showEffGroup ? tbEff.bot : 0) + 
                                                              (showThuNhapGroup ? tbTn.bot : 0);`;

if (!content.includes(oldChunk)) {
  console.error("ERROR: oldChunk not found in content");
  process.exit(1);
}

content = content.replace(oldChunk, newChunk);
fs.writeFileSync(path, content, 'utf8');
console.log("Successfully updated SucKhoeNhanVien.tsx");
