import { parseMarketData } from './src/pages/RTST/utils';

const inputData = `Tên miền	DTLK	DTQĐ	Target (QĐ)	% HT Target (QĐ)	Lãi gộp QĐ	%HT Target Dự kiến (LNTT)	Lượt Khách LK	Lượt bill	Lượt Bill Bán Hàng	Lượt Bill Thu Hộ	TLPVTC LK	Tỷ Trọng Trả Chậm
Tổng	52	70	221	31.71%	0	0.00%	205	61	22	39	10.73%	39.94%
ĐML_CMA_CMA - 155A Nguyễn Tất Thành	52	70	221	31.71%	0	0.00%	205	61	22	39	10.73%	39.94%`;

const results = parseMarketData(inputData, 0, 'RTST');
console.log("Parsed results:", JSON.stringify(results, null, 2));
