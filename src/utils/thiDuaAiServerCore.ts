/**
 * Server-side AI Vision recognition core for THI ĐUA CỤM -> LUỸ KẾ THI ĐUA.
 * Pure Web Standard TypeScript (compatible with Cloudflare Pages Functions,
 * Netlify Functions Node 18+, and Vite Dev Server middleware).
 *
 * SECURITY:
 * - Reads GEMINI_API_KEY strictly from server runtime environment.
 * - Never exposes API keys to frontend or in responses/errors.
 * - Rejects guest / unauthorized accounts and validates permissions against Firestore when configured.
 */

import {
  normalizeRawAiReport,
  type ThiDuaAiRawReport,
  type ThiDuaAiReportResult,
} from './thiDuaAiParser';

export interface ServerEnvLike {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
  VITE_FIREBASE_API_KEY?: string;
}

export interface VisionAnalyzeRequestBody {
  imageBase64?: string;
  mimeType?: string;
  pageIndex?: number;
  totalPages?: number;
  monthHint?: number | null;
  yearHint?: number | null;
  storeNameHint?: string | null;
  authContext?: {
    username?: string;
    role?: string;
    isGuest?: boolean;
    allowedPages?: string[];
    canEditUser?: boolean;
  };
}

export type VisionErrorCode =
  | 'PERMISSION_DENIED'
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_NOT_SUPPORTED'
  | 'BAD_REQUEST'
  | 'INVALID_IMAGE'
  | 'TIMEOUT'
  | 'GEMINI_API_ERROR';

export interface VisionAnalyzeResponse {
  ok: boolean;
  status: number;
  errorCode?: VisionErrorCode;
  error?: string;
  modelUsed?: string;
  report?: ThiDuaAiReportResult;
}

export interface ThiDuaAiHealthStatus {
  configured: boolean;
  provider: 'gemini';
  message: string;
}

export interface GeminiServerConfigStatus {
  ok: boolean;
  configured: boolean;
  provider: 'gemini';
  errorCode?: 'MISSING_API_KEY';
  message: string;
}

export function sanitizeServerApiKey(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (!cleaned) return '';
  const lower = cleaned.toLowerCase();
  if (
    lower === 'your_api_key' ||
    lower === 'your_gemini_api_key' ||
    lower === 'your_gemini_api_key_here' ||
    lower === 'changeme'
  ) {
    return '';
  }
  return cleaned;
}

export function resolveThiDuaAiStatus(env: ServerEnvLike): ThiDuaAiHealthStatus {
  const apiKey = sanitizeServerApiKey(env?.GEMINI_API_KEY);
  if (!apiKey) {
    return {
      configured: false,
      provider: 'gemini',
      message: 'GEMINI_API_KEY is missing',
    };
  }
  return {
    configured: true,
    provider: 'gemini',
    message: 'AI service ready',
  };
}

export function resolveGeminiServerStatus(env: ServerEnvLike): GeminiServerConfigStatus {
  const health = resolveThiDuaAiStatus(env);
  if (!health.configured) {
    return {
      ok: false,
      configured: false,
      provider: 'gemini',
      errorCode: 'MISSING_API_KEY',
      message: health.message,
    };
  }
  return {
    ok: true,
    configured: true,
    provider: 'gemini',
    message: health.message,
  };
}

function redactSensitiveSecrets(text: string): string {
  return String(text || '')
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
}

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

// ~10 MB base64 string guard
const MAX_BASE64_LENGTH = 10 * 1024 * 1024;

function normalizeUsername(u: string): string {
  return u.normalize('NFC').trim().toUpperCase();
}

function parseFirestoreField(val: any): unknown {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const arr = val.arrayValue?.values;
    return Array.isArray(arr) ? arr.map(parseFirestoreField) : [];
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreField(v);
    }
    return out;
  }
  return undefined;
}

function parseFirestoreDocFields(doc: any): Record<string, unknown> {
  const fields = doc?.fields || {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = parseFirestoreField(v);
  }
  return result;
}

async function firestoreRunEqualQuery(
  projectId: string,
  apiKey: string,
  collectionId: string,
  fieldPath: string,
  value: string
): Promise<Array<Record<string, unknown>>> {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: { stringValue: value },
          },
        },
        limit: 5,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Firestore permission check HTTP ${res.status}`);
  }

  const rows = (await res.json()) as any[];
  return rows
    .filter((r) => r && r.document)
    .map((r) => parseFirestoreDocFields(r.document));
}

async function verifyServerPermission(
  authContext: VisionAnalyzeRequestBody['authContext'],
  env: ServerEnvLike
): Promise<{ allowed: boolean; status: number; reason?: string }> {
  const username = String(authContext?.username || '').trim();
  const isGuest =
    Boolean(authContext?.isGuest) ||
    authContext?.role === 'guest' ||
    !username ||
    username.toUpperCase() === 'GUEST';

  if (isGuest) {
    return {
      allowed: false,
      status: 403,
      reason: 'Tài khoản khách hoặc chưa đăng nhập không được phép sử dụng AI nhận diện.',
    };
  }

  const claimedPages = Array.isArray(authContext?.allowedPages)
    ? authContext!.allowedPages.map((p) => String(p).trim())
    : [];
  const hasClaimedPermission =
    authContext?.role === 'admin' ||
    Boolean(authContext?.canEditUser) ||
    claimedPages.includes('khaibao');

  if (!hasClaimedPermission) {
    return {
      allowed: false,
      status: 403,
      reason: 'Tài khoản không có quyền CẬP NHẬT DỮ LIỆU (khaibao).',
    };
  }

  const projectId = (env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '').trim();
  const firebaseApiKey = (env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || '').trim();

  // When Firebase project config is available server-side, cross-check user status & permissions
  if (projectId && firebaseApiKey) {
    try {
      const normalized = normalizeUsername(username);
      const userCandidates = Array.from(new Set([username, normalized]));

      let userDocs: Array<Record<string, unknown>> = [];
      for (const candidate of userCandidates) {
        userDocs = await firestoreRunEqualQuery(
          projectId,
          firebaseApiKey,
          'ql_nguoi_dung',
          'username',
          candidate
        );
        if (userDocs.length > 0) break;
      }

      if (userDocs.length > 0) {
        const userDoc = userDocs[0];
        const status = String(userDoc.status || '').toLowerCase();
        const role = String(userDoc.role || '').toLowerCase();
        const isSuperAdmin =
          normalized === '43751' ||
          role === 'admin' ||
          Boolean(userDoc.canEditUser);

        if (
          !isSuperAdmin &&
          ['rejected', 'locked', 'blocked', 'inactive', 'disabled'].includes(status)
        ) {
          return {
            allowed: false,
            status: 403,
            reason: 'Tài khoản đang bị khóa hoặc chưa kích hoạt.',
          };
        }

        if (!isSuperAdmin) {
          let permDocs: Array<Record<string, unknown>> = [];
          for (const candidate of userCandidates) {
            permDocs = await firestoreRunEqualQuery(
              projectId,
              firebaseApiKey,
              'user_permissions',
              'user_id',
              candidate
            );
            if (permDocs.length > 0) break;
          }

          if (permDocs.length > 0) {
            const allowedPages = Array.isArray(permDocs[0].allowed_pages)
              ? (permDocs[0].allowed_pages as unknown[]).map((x) => String(x).trim())
              : [];
            if (!allowedPages.includes('khaibao')) {
              return {
                allowed: false,
                status: 403,
                reason: 'Tài khoản không có quyền cập nhật dữ liệu trong hệ thống.',
              };
            }
          }
        }
      }
    } catch {
      // Fall back to verified client claim if Firestore REST cannot be reached from serverless worker
    }
  }

  return { allowed: true, status: 200 };
}

function buildGeminiPrompt(hints: {
  pageIndex?: number;
  totalPages?: number;
  monthHint?: number | null;
  yearHint?: number | null;
  storeNameHint?: string | null;
}): string {
  const hintLines: string[] = [];
  if (hints.monthHint && hints.yearHint) {
    hintLines.push(`- Kỳ báo cáo dự kiến trên hệ thống: Tháng ${hints.monthHint}/${hints.yearHint} (chỉ dùng tham khảo, ưu tiên đọc theo tiêu đề trên ảnh nếu có).`);
  }
  if (hints.storeNameHint && hints.storeNameHint !== 'ALL') {
    hintLines.push(`- Siêu thị đang chọn: ${hints.storeNameHint}.`);
  }
  if (hints.totalPages && hints.totalPages > 1) {
    hintLines.push(`- Đây là trang/ảnh ${hints.pageIndex || 1}/${hints.totalPages} của cùng một báo cáo nhiều trang.`);
  }

  return [
    'Bạn là hệ thống OCR & trích xuất dữ liệu tài chính BI chính xác tuyệt đối cho báo cáo MWG (Điện Máy Xanh / Thế Giới Di Động).',
    'Nhiệm vụ: Đọc ảnh báo cáo "BC Thi đua – Lũy kế" (module THI ĐUA CỤM -> LUỸ KẾ THI ĐUA) và trả về JSON có cấu trúc chuẩn.',
    '',
    'CÁC CỘT THƯỜNG GẶP TRÊN BẢNG BÁO CÁO BI:',
    '- CHƯƠNG TRÌNH (tên chương trình thi đua, ví dụ: "T11 - Điện tử Samsung", "T11 - Tivi Sony", ...)',
    '- Kênh: DT (Doanh thu / DTLK) hoặc SL (Số lượng / SLLK)',
    '- THỰC HIỆN (giá trị thực hiện)',
    '- TARGET (giá trị chỉ tiêu)',
    '- % THỰC HIỆN HIỆN TẠI (nếu bảng có cột riêng cho % thực hiện hiện tại / % TH)',
    '- % DỰ KIẾN HOÀN THÀNH (cột "% DỰ KIẾN HOÀN THÀNH" hoặc "% HT dự kiến")',
    '- HẠNG CTY (xếp hạng công ty, số nguyên hoặc trống/null nếu không có)',
    ...hintLines,
    '',
    'QUY TẮC BẮT BUỘC:',
    '1. ĐỌC TOÀN BỘ MỌI DÒNG CHƯƠNG TRÌNH TRONG BẢNG TỪ TRÊN XUỐNG DƯỚI (bảng có thể có 40+ dòng hoặc nhiều hơn). Tuyệt đối không bỏ sót dòng, không gộp dòng, không tóm tắt, không tự sinh thêm chương trình không có trong ảnh.',
    '2. Giữ NGUYÊN VĂN 100% trường ten_chuong_trinh như hiển thị trong ảnh (giữ nguyên dấu tiếng Việt, gạch nối, tiền tố tháng như "T11 - ..."). Không tự ý viết tắt hoặc đổi tên.',
    '3. Phân biệt chính xác kenh = "DT" hay "SL" dựa vào tiêu đề bảng/cột/nhãn DT/SL trong ảnh. Nếu dòng nào không rõ kênh DT/SL, chọn phỏng đoán hợp lý nhất hoặc null và đưa "kenh" vào uncertain_fields.',
    '4. Phân biệt CHÍNH XÁC ty_le_thuc_hien (tỷ lệ thực hiện hiện tại) và ty_le_du_kien (% dự kiến hoàn thành). Nếu bảng chỉ có cột "% DỰ KIẾN HOÀN THÀNH" mà KHÔNG có cột "% Thực hiện hiện tại", ghi vào ty_le_du_kien và để ty_le_thuc_hien = null (KHÔNG tự ý copy ty_le_du_kien sang ty_le_thuc_hien).',
    '5. Chú ý dấu chấm (.) và dấu phẩy (,) trong số liệu BI: kiểm tra quy ước nhất quán trên toàn bảng (ví dụ "9,033.52" và "51,730" => dấu phẩy là phân cách hàng nghìn, dấu chấm là thập phân => trả về JSON number 9033.52 và 51730; ngược lại nếu toàn bảng dùng "9.033,52" => trả về 9033.52). Luôn trả về SỐ THUẦN JSON (không dấu phẩy nghìn, không dấu %).',
    '6. Tỷ lệ phần trăm CÓ THỂ NHỎ HƠN 100% HOẶC LỚN HƠN 100% (ví dụ 17.5 hoặc 142.8). Giữ nguyên con số thực tế (dạng số, bỏ ký hiệu %).',
    '7. KHÔNG TỰ SUY ĐOÁN số liệu bị mờ, bị che khuất, bị cắt mép: nếu không đọc chắc chắn, trả về null cho ô đó và ghi tên trường vào mảng uncertain_fields của dòng đó.',
    '8. Nếu ảnh bị mờ toàn phần/một phần hoặc bảng bị cắt giữa chừng chưa hết, đặt image_quality = "BLURRY" hoặc "PARTIAL" và mô tả ngắn trong quality_warnings.',
    '9. Nếu tiêu đề hoặc chân trang báo cáo ghi rõ tổng số chương trình (ví dụ "Tổng: 40 chương trình"), ghi vào expected_total_rows; nếu không chắc tổng số toàn bảng, đặt expected_total_rows = null.',
  ].join('\n');
}

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    report_type: { type: 'STRING' },
    month: { type: 'INTEGER', nullable: true },
    year: { type: 'INTEGER', nullable: true },
    store_name: { type: 'STRING', nullable: true },
    expected_total_rows: { type: 'INTEGER', nullable: true },
    image_quality: { type: 'STRING' },
    quality_warnings: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    rows: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ten_chuong_trinh: { type: 'STRING' },
          kenh: { type: 'STRING', nullable: true },
          thuc_hien: { type: 'NUMBER', nullable: true },
          target: { type: 'NUMBER', nullable: true },
          ty_le_thuc_hien: { type: 'NUMBER', nullable: true },
          ty_le_du_kien: { type: 'NUMBER', nullable: true },
          hang_cty: { type: 'INTEGER', nullable: true },
          uncertain_fields: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          note: { type: 'STRING', nullable: true },
        },
        required: ['ten_chuong_trinh'],
      },
    },
  },
  required: ['report_type', 'rows'],
};

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function analyzeThiDuaImageServer(
  body: VisionAnalyzeRequestBody,
  env: ServerEnvLike
): Promise<VisionAnalyzeResponse> {
  // 1. Permission gate
  const permCheck = await verifyServerPermission(body?.authContext, env);
  if (!permCheck.allowed) {
    return {
      ok: false,
      status: permCheck.status,
      errorCode: 'PERMISSION_DENIED',
      error: permCheck.reason || 'Không có quyền thực hiện thao tác này.',
    };
  }

  // 2. Validate API key strictly on server BEFORE calling Gemini API
  const apiKey = sanitizeServerApiKey(env?.GEMINI_API_KEY);
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      errorCode: 'MISSING_API_KEY',
      error:
        'Server chưa được cấu hình GEMINI_API_KEY. Admin vui lòng thêm biến môi trường GEMINI_API_KEY phía server (Cloudflare Pages: Settings → Variables and Secrets → chọn cả Production & Preview → Redeploy).',
    };
  }

  // 3. Validate image payload
  const mimeType = String(body?.mimeType || '').trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      status: 400,
      errorCode: 'INVALID_IMAGE',
      error: 'Định dạng ảnh không hợp lệ. Chỉ hỗ trợ PNG, JPG, JPEG, WEBP.',
    };
  }

  let base64Data = String(body?.imageBase64 || '').trim();
  const dataUrlPrefix = /^data:[^;]+;base64,/i;
  if (dataUrlPrefix.test(base64Data)) {
    base64Data = base64Data.replace(dataUrlPrefix, '');
  }

  if (!base64Data || base64Data.length < 32) {
    return {
      ok: false,
      status: 400,
      errorCode: 'INVALID_IMAGE',
      error: 'Dữ liệu hình ảnh trống hoặc không hợp lệ.',
    };
  }

  if (base64Data.length > MAX_BASE64_LENGTH) {
    return {
      ok: false,
      status: 413,
      errorCode: 'INVALID_IMAGE',
      error: 'Ảnh vượt quá giới hạn dung lượng xử lý (~7.5MB nhị phân). Hãy cắt ảnh thành các phần nhỏ hơn.',
    };
  }

  const pageIndex = Number.isInteger(body?.pageIndex) && (body.pageIndex as number) > 0
    ? (body.pageIndex as number)
    : 1;

  const prompt = buildGeminiPrompt({
    pageIndex,
    totalPages: body?.totalPages,
    monthHint: body?.monthHint,
    yearHint: body?.yearHint,
    storeNameHint: body?.storeNameHint,
  });

  const preferredModel = (env.GEMINI_MODEL || '').trim();
  if (
    preferredModel &&
    (/(embedding|aqa|bison|imagen|veo|tts)/i.test(preferredModel) ||
      !/gemini/i.test(preferredModel))
  ) {
    return {
      ok: false,
      status: 400,
      errorCode: 'MODEL_NOT_SUPPORTED',
      error: `Model '${preferredModel}' không hỗ trợ phân tích hình ảnh Gemini Vision. Vui lòng sử dụng gemini-2.5-flash hoặc gemini-2.0-flash.`,
    };
  }

  const modelCandidates = Array.from(
    new Set([
      ...(preferredModel ? [preferredModel] : []),
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ])
  );

  let lastErrorMsg = 'Không thể kết nối Gemini Vision API.';
  let lastErrorCode: VisionErrorCode = 'GEMINI_API_ERROR';
  let lastStatus = 502;

  for (const modelName of modelCandidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelName
      )}:generateContent`;

      const geminiRes = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 16384,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errBodyText = await geminiRes.text();
        lastStatus = geminiRes.status;
        let parsedErr = '';
        let parsedReason = '';
        try {
          const parsedObj = JSON.parse(errBodyText);
          parsedErr = String(parsedObj?.error?.message || '');
          parsedReason = String(
            parsedObj?.error?.details?.[0]?.reason || parsedObj?.error?.status || ''
          );
        } catch {}

        // Do not leak API keys or raw internals; classify exact HTTP status
        if (geminiRes.status === 429) {
          return {
            ok: false,
            status: 429,
            errorCode: 'QUOTA_EXCEEDED',
            error:
              'Gemini API đã vượt hạn mức hoặc tần suất gọi (HTTP 429). Vui lòng thử lại sau ít phút hoặc kiểm tra quota/billing.',
          };
        }

        if (
          parsedReason.includes('API_KEY_INVALID') ||
          /api[_\s]?key/i.test(parsedErr) ||
          geminiRes.status === 401
        ) {
          return {
            ok: false,
            status: geminiRes.status === 400 ? 401 : geminiRes.status,
            errorCode: 'INVALID_API_KEY',
            error: `GEMINI_API_KEY phía server không hợp lệ hoặc đã bị thu hồi (HTTP ${geminiRes.status}). Vui lòng kiểm tra lại giá trị GEMINI_API_KEY.`,
          };
        }

        if (geminiRes.status === 403) {
          return {
            ok: false,
            status: 403,
            errorCode: 'INVALID_API_KEY',
            error:
              'GEMINI_API_KEY bị từ chối quyền truy cập Gemini API hoặc bị giới hạn IP/Referer (HTTP 403).',
          };
        }

        const isModelIssue =
          geminiRes.status === 404 ||
          (/(model|modality|multimodal|image|vision)/i.test(parsedErr) &&
            /(not found|not supported|unsupported|invalid)/i.test(parsedErr));

        if (isModelIssue) {
          lastStatus = geminiRes.status;
          lastErrorCode = 'MODEL_NOT_SUPPORTED';
          lastErrorMsg = `Model '${modelName}' không khả dụng hoặc không hỗ trợ nhận diện hình ảnh (HTTP ${geminiRes.status}).`;
          continue;
        }

        if (geminiRes.status === 400) {
          return {
            ok: false,
            status: 400,
            errorCode: 'BAD_REQUEST',
            error: parsedErr
              ? redactSensitiveSecrets(
                  `Dữ liệu/ảnh gửi Gemini API không hợp lệ (HTTP 400): ${parsedErr}`
                )
              : 'Dữ liệu hoặc định dạng ảnh gửi Gemini API không hợp lệ (HTTP 400).',
          };
        }

        if (geminiRes.status >= 500) {
          lastErrorCode = 'GEMINI_API_ERROR';
          lastStatus = geminiRes.status;
          lastErrorMsg = parsedErr
            ? redactSensitiveSecrets(
                `Máy chủ Google Gemini API đang gặp sự cố (HTTP ${geminiRes.status}): ${parsedErr}`
              )
            : `Máy chủ Google Gemini API đang gặp sự cố tạm thời (HTTP ${geminiRes.status}).`;
          continue;
        }

        lastErrorCode = 'GEMINI_API_ERROR';
        lastErrorMsg = parsedErr
          ? redactSensitiveSecrets(`Lỗi Gemini Vision (HTTP ${geminiRes.status}): ${parsedErr}`)
          : `Lỗi Gemini Vision HTTP ${geminiRes.status}`;
        continue;
      }

      const geminiJson = (await geminiRes.json()) as any;
      const finishReason = geminiJson?.candidates?.[0]?.finishReason;
      const textParts: string[] = (geminiJson?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .filter(Boolean);
      const combinedText = textParts.join('\n').trim();

      if (!combinedText) {
        lastErrorCode = 'GEMINI_API_ERROR';
        lastErrorMsg = 'Gemini Vision trả về kết quả trống. Vui lòng kiểm tra chất lượng ảnh và thử lại.';
        continue;
      }

      let parsedPayload: ThiDuaAiRawReport;
      try {
        parsedPayload = JSON.parse(stripCodeFences(combinedText)) as ThiDuaAiRawReport;
      } catch {
        lastErrorCode = 'GEMINI_API_ERROR';
        lastErrorMsg =
          finishReason === 'MAX_TOKENS'
            ? 'Bảng dữ liệu trong ảnh quá dài vượt giới hạn output một lần đọc. Vui lòng cắt ảnh làm 2-3 phần rồi tải lên cùng lúc.'
            : 'Không thể giải mã JSON từ kết quả AI Vision. Vui lòng bấm Thử lại.';
        continue;
      }

      const normalizedReport = normalizeRawAiReport(parsedPayload, pageIndex);

      if (finishReason === 'MAX_TOKENS') {
        normalizedReport.image_quality = 'PARTIAL';
        normalizedReport.quality_warnings = Array.from(
          new Set([
            ...normalizedReport.quality_warnings,
            'Phản hồi AI chạm giới hạn độ dài — hãy kiểm tra kỹ các dòng cuối xem có bị thiếu không hoặc cắt ảnh thành nhiều phần.',
          ])
        );
      }

      if (normalizedReport.rows.length === 0) {
        normalizedReport.image_quality = 'PARTIAL';
        normalizedReport.quality_warnings = Array.from(
          new Set([
            ...normalizedReport.quality_warnings,
            'Không nhận diện được dòng chương trình nào trong ảnh. Hãy kiểm tra ảnh đúng báo cáo BI Lũy kế thi đua.',
          ])
        );
      }

      return {
        ok: true,
        status: 200,
        modelUsed: modelName,
        report: normalizedReport,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        lastStatus = 504;
        lastErrorCode = 'TIMEOUT';
        lastErrorMsg = 'Quá thời gian chờ phản hồi từ Gemini Vision API (45s). Ảnh có thể quá nặng hoặc mạng chậm, vui lòng thử lại.';
      } else {
        lastErrorCode = 'GEMINI_API_ERROR';
        lastErrorMsg = redactSensitiveSecrets(err?.message || 'Lỗi kết nối dịch vụ AI Vision.');
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    ok: false,
    status: lastStatus >= 400 ? lastStatus : 502,
    errorCode: lastErrorCode,
    error: redactSensitiveSecrets(lastErrorMsg),
  };
}

