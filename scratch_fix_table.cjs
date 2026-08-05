const fs = require("fs");
const file = "/Users/linhvu/Desktop/APP Antigravity IDE/crm---siêu-thị/src/pages/SucKhoeNhanVien.tsx";
let content = fs.readFileSync(file, "utf8");

// Fix the duplicate line created by the fuzzy matcher on line 4993
const badLine = `"px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",\n"px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",`;
const goodLine = `"px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",`;
content = content.replace(badLine, goodLine);

// The exact string to search for to insert showTraChamGroup logic
const targetStr = `                                         <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center text-[12px] whitespace-nowrap bg-slate-900/5">
                                           {(() => {`;

const insertStr = `                                         {showTraChamGroup && (
                                           <>
                                             {showMonthlyDtqd && (
                                                <>
                                                  <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                    "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                    rank3TTraChamTopBotStats.sets?.botM1Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                    rank3TTraChamTopBotStats.sets?.topM1Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                    "bg-rose-50/10 text-rose-700"
                                                  )}>
                                                    {row.tracham1 ? row.tracham1.toLocaleString('vi-VN') : '0'}
                                                  </td>
                                                  <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                    "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                    rank3TTraChamTopBotStats.sets?.botM2Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                    rank3TTraChamTopBotStats.sets?.topM2Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                    "bg-rose-50/10 text-rose-700"
                                                  )}>
                                                    {row.tracham2 ? row.tracham2.toLocaleString('vi-VN') : '0'}
                                                  </td>
                                                  <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={cn(
                                                    "px-4 py-3 text-center border-r border-slate-200 font-mono font-black transition-colors whitespace-nowrap",
                                                    rank3TTraChamTopBotStats.sets?.botM3Keys.has(key) ? "bg-rose-100/90 text-rose-700 font-black" :
                                                    rank3TTraChamTopBotStats.sets?.topM3Keys.has(key) ? "bg-emerald-100/90 text-emerald-800 font-black" :
                                                    "bg-rose-50/10 text-rose-700"
                                                  )}>
                                                    {row.tracham3 ? row.tracham3.toLocaleString('vi-VN') : '0'}
                                                  </td>
                                                </>
                                              )}
                                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-6 py-3 text-center border-r border-slate-200 font-mono text-rose-700 font-black bg-rose-50/10 whitespace-nowrap">
                                                {(() => {
                                                  const avgTc = Math.round(row.tracham / 3);
                                                  return avgTc > 0 ? avgTc.toLocaleString('vi-VN') : '0';
                                                })()}
                                              </td>
                                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="px-3 py-3 text-center border-r border-slate-200 text-[12px] whitespace-nowrap bg-rose-50/20">
                                                {(() => {
                                                   const avgTc = Math.round(row.tracham / 3);
                                                   if (avgTc === 0) {
                                                     return <span className="text-slate-300 font-normal text-xs">-</span>;
                                                   }
                                                   if (tbTc.top > 0) {
                                                     return <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">TOP</span>;
                                                   }
                                                   if (tbTc.bot > 0) {
                                                     return <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-black text-xs">BOT</span>;
                                                   }
                                                   return <span className="text-slate-300 font-normal text-xs">-</span>;
                                                })()}
                                              </td>
                                           </>
                                         )}
` + targetStr;

if (content.includes("row.tracham3.toLocaleString('vi-VN') : '0'}")) {
  console.log("Already inserted!");
} else {
  if (content.includes(targetStr)) {
    content = content.replace(targetStr, insertStr);
    fs.writeFileSync(file, content, "utf8");
    console.log("Successfully inserted!");
  } else {
    console.log("Could not find target!");
  }
}
