/**
 * スタッフ用ページ・API の Basic 認証（proxy.ts と各 Route Handler で共用）。
 *
 * - 環境変数 STAFF_BASIC_USER / STAFF_BASIC_PASS で認証情報を設定する。
 * - 本番（NODE_ENV=production。Vercel の Preview も含む）で未設定なら 503 を返して閉じる（fail closed）。
 * - ローカル開発（next dev）で未設定の場合のみ認証なしで通す。
 * - 比較は定数時間で行い、認証情報はログに出さない。
 */

const REALM = "Kawaguchi Staff";

/** 長さに依存して早期 return しない定数時間比較。 */
function timingSafeEqualString(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  const length = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < length; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

function decodeBasicCredentials(
  header: string | null,
): { user: string; pass: string } | null {
  if (!header) return null;
  const match = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(header);
  if (!match) return null;
  try {
    const binary = atob(match[1]);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    return { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

function jsonDenied(message: string, status: number, headers?: HeadersInit) {
  return Response.json(
    { ok: false, error: message, message },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

/**
 * 認証 OK なら null、NG ならそのまま返せる Response を返す。
 */
export function checkStaffBasicAuth(request: Request): Response | null {
  const expectedUser = process.env.STAFF_BASIC_USER;
  const expectedPass = process.env.STAFF_BASIC_PASS;

  if (!expectedUser || !expectedPass) {
    if (process.env.NODE_ENV !== "production") {
      // ローカル開発のみ認証なしで許可する。
      return null;
    }
    console.error(
      "[security] STAFF_BASIC_USER / STAFF_BASIC_PASS が未設定のため、スタッフ用ページ・APIを閉じています。",
    );
    return jsonDenied(
      "サーバーの認証設定が未完了のため利用できません。管理者にお問い合わせください。",
      503,
    );
  }

  const credentials = decodeBasicCredentials(
    request.headers.get("authorization"),
  );
  // ユーザー名・パスワードの両方を必ず比較する（短絡評価しない）。
  const userOk = timingSafeEqualString(credentials?.user ?? "", expectedUser);
  const passOk = timingSafeEqualString(credentials?.pass ?? "", expectedPass);
  if (credentials && userOk && passOk) {
    return null;
  }

  return jsonDenied("認証が必要です。", 401, {
    "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
  });
}
