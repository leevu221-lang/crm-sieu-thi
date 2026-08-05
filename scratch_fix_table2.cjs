const fs = require('fs');
const content = fs.readFileSync('src/pages/TnbLeader.tsx', 'utf8');
const lines = content.split('\n');

const start = 1075;
const end = 1400;
const replacement = `                              {/* Province/Store name - sticky */}
                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={\`bg-white text-[#0f172a] uppercase px-3 py-[6px] border-r border-b border-slate-300 whitespace-nowrap lg:sticky z-10 text-[14px] \${activeTab === 'SIEU_THI' ? 'truncate lg:left-[280px]' : 'lg:left-[40px]'}\`}>
                                {row.prov}
                              </td>
                              {/* ĐẠT - sticky */}
                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={\`bg-white text-[#0f172a] px-2 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky z-10 text-[14px] \${activeTab === 'SIEU_THI' ? 'lg:left-[520px]' : 'lg:left-[160px]'}\`}>
                                {row.datCount}/{totalCats}
                              </td>
                              {/* TỶ LỆ - sticky */}
                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={\`bg-white \${row.tyLe < 50 ? 'text-red-600' : 'text-[#059669]'} px-2 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky z-10 text-[14px] \${activeTab === 'SIEU_THI' ? 'lg:left-[590px]' : 'lg:left-[230px]'}\`}>
                                {row.tyLe < 50 && '🚨'} {row.tyLe.toFixed(0)}%
                              </td>
                              
                              {row.catPercents.map((c, colIndex) => (
                                <td key={colIndex} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={\`category-col bg-white \${c.textColor} px-1 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap w-[70px] min-w-[70px] max-w-[70px] text-[14px]\`} title={c.displayVal}>
                                  {c.displayVal}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pivot Pagination Footer */}
                  {Math.ceil(searchedRows.length / rowsPerPage) > 1 && !isExporting && (
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between rounded-b-xl mt-2">
                      <span className="text-sm text-slate-500 font-medium">
                        Hiển thị <span className="font-bold text-slate-700">{((currentPage - 1) * rowsPerPage) + 1}</span> - <span className="font-bold text-slate-700">{Math.min(currentPage * rowsPerPage, searchedRows.length)}</span> trên <span className="font-bold text-slate-700">{searchedRows.length}</span>
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm">
                          Trang trước
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(searchedRows.length / rowsPerPage)))}
                          disabled={currentPage >= Math.ceil(searchedRows.length / rowsPerPage)}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm">
                          Trang sau
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            };

            const renderChiTietTable = () => {
              if (dataRtSieuThi.length === 0) return null;
              
              const nganhHangSet = new Set();
              dataRtSieuThi.forEach(row => {
                const nh = (row[9] || '').trim().toUpperCase();
                if (nh && nh !== '-') nganhHangSet.add(nh);
              });
              const dsNganhHang = Array.from(nganhHangSet).sort();
              
              const dsTinhList = [
                'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 
                'Trà Vinh', 'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 
                'Bến Tre', 'Đồng Tháp', 'An Giang'
              ];

              const filtered = dataRtSieuThi.filter(row => {
                const rowTinh = (row[0] || '').trim();
                if (!rowTinh) return false;
                
                if (rtFilterTinh && rtFilterTinh !== 'TẤT CẢ TỈNH') {
                  if (rowTinh.toLowerCase() !== rtFilterTinh.toLowerCase()) return false;
                }
                
                const rowNganhHang = (row[9] || '').trim().toUpperCase();
                if (rtFilterNganhHang && rtFilterNganhHang !== 'TẤT CẢ NGÀNH HÀNG') {
                  if (rowNganhHang !== rtFilterNganhHang) return false;
                }
                return true;
              });

              if (filtered.length === 0) return null;

              const kenhOrder = { 'ĐML': 1, 'ĐMM': 2, 'ĐMS': 3, 'TGD': 4 };
              
              const sortedData = [...filtered].sort((a, b) => {
                const kenhA = (a[5] || '').trim().toUpperCase();
                const kenhB = (b[5] || '').trim().toUpperCase();
                const orderA = kenhOrder[kenhA] || 99;
                const orderB = kenhOrder[kenhB] || 99;
                
                if (orderA !== orderB) return orderA - orderB;
                
                const htA = parseFloat((a[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                const htB = parseFloat((b[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                return htB - htA;
              });
              
              const now = new Date();
              const todayStr = \`\${String(now.getDate()).padStart(2, '0')}/\${String(now.getMonth() + 1).padStart(2, '0')}\`;
              const timeStr = \`\${todayStr} || \${String(now.getHours()).padStart(2, '0')}:\${String(now.getMinutes()).padStart(2, '0')}\`;

              return (
                <div className="w-full bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 mt-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">CHI TIẾT</h2>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <select 
                        className="w-full sm:w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={rtFilterTinh}
                        onChange={(e) => setRtFilterTinh(e.target.value)}
                      >
                        <option value="">TẤT CẢ TỈNH</option>
                        {dsTinhList.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select 
                        className="w-full sm:w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={rtFilterNganhHang}
                        onChange={(e) => setRtFilterNganhHang(e.target.value)}
                      >
                        <option value="">TẤT CẢ NGÀNH HÀNG</option>
                        {dsNganhHang.map(nh => <option key={nh} value={nh}>{nh}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="w-full xl:w-[900px] overflow-hidden shadow-lg shadow-slate-200/50 rounded-xl border border-slate-200">
                    <div className="w-full overflow-x-auto custom-scrollbar">
                      <table className="w-full border-collapse text-[14px] font-sans">
                        <thead className="sticky top-0 z-20 bg-[#0f6075]">
                          <tr>
                            <th colSpan={4} className="bg-[#0f6075] text-white px-4 py-3.5 text-left font-black text-[20px] uppercase tracking-wider whitespace-nowrap">
                              REAL T.ĐUA LỌC NƯỚC
                            </th>
                            <th colSpan={3} className="bg-[#0f6075] text-[#f97316] px-4 py-3.5 text-right font-black text-[20px] whitespace-nowrap">
                              {timeStr}
                            </th>
                          </tr>
                          <tr className="bg-white text-slate-700 border-b-2 border-slate-300 shadow-sm">
                            <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-slate-200">TỈNH</th>
                            <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-slate-200">BOSS</th>
                            <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-slate-200">NGÀNH HÀNG</th>
                            <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-slate-200">SIÊU THỊ</th>
                            <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-slate-200 min-w-[80px] max-w-[80px] w-[80px] bg-amber-50">TAR</th>
                            <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-slate-200 min-w-[80px] max-w-[80px] w-[80px] bg-amber-50">Real</th>
                            <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap min-w-[80px] max-w-[80px] w-[80px] bg-amber-50">%HT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedData.map((row, idx) => {
                            const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                            const htVal = parseFloat(htValStr);
                            const isRedHT = isNaN(htVal) || htVal < 100;
                            
                            const realValStr = (row[2] || '0').trim(); // Real is row[2]
                            const realVal = parseFloat(realValStr);
                            const isZeroReal = isNaN(realVal) || realVal === 0;

                            return (
                              <tr key={idx} className="bg-white font-black text-[13px] border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 border-r border-slate-200 text-slate-900 whitespace-nowrap">{row[0]}</td>
                                <td className="px-3 py-2 border-r border-slate-200 text-[#b45309] whitespace-nowrap">{row[7]}</td>
                                <td className="px-3 py-2 border-r border-slate-200 text-indigo-700 whitespace-nowrap">{row[9]}</td>
                                <td className="px-3 py-2 border-r border-slate-200 text-[#0f766e] truncate max-w-[250px]" title={row[6]}>{row[6]}</td>
                                <td className="px-3 py-2 border-r border-slate-200 text-center text-amber-700 bg-amber-50/20">{row[3]}</td>
                                <td className={\`px-3 py-2 border-r border-slate-200 text-center \${isZeroReal ? 'text-slate-300' : 'text-slate-900'}\`}>{row[2]}</td>
                                <td className={\`px-3 py-2 text-center \${isRedHT ? 'text-red-600' : 'text-[#0369a1]'}\`}>{row[4]}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            };

            if (activeTab === 'NHAN_VIEN') {
              return (
                <div className="flex flex-col gap-8 w-full">
                  {renderPivotTable(false)}
                </div>
              );
            }

            if (activeTab === 'VUNG') {
              return (
                <div className="flex flex-col gap-8 w-full">
                  {renderPivotTable(true, rtTableRef)}
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-8 w-full items-start">
                {renderPivotTable(false, tableRef)}
                {renderChiTietTable()}
              </div>
            );
          })()}
            </div>
          </div>`;

lines.splice(start, end - start + 1, replacement);
fs.writeFileSync('src/pages/TnbLeader.tsx', lines.join('\n'), 'utf8');
console.log('Fixed successfully');
