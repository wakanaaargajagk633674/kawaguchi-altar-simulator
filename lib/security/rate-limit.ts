/**
 * ベストエフォートの IP 単位レート制限（インメモリ）。
 *
 * 注意: Vercel Functions はインスタンスごとにメモリが分かれ、コールドスタートで
 * リセットされるため、これは「簡易的な歯止め」にすぎない。
 * 確実な制限には Vercel Firewall（WAF）の Rate Limiting ルールを併用すること
 * （例: /api/iei-photo/ai-image と /api/funeral-script/* に IP 単位で 1分あたり N 回）。
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export type RateLimitOptions = {
  /** 制限の名前空間（API ごとに分ける）。 */
  name: string;
  /** ウィンドウ内の最大リクエスト数。 */
  limit: number;
  /** ウィンドウ長（ミリ秒）。 */
  windowMs: number;
};

export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // それでも多すぎる場合は古いものから捨てる（メモリ保護）。
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

/**
 * 制限内なら null、超過時は 429 の Response を返す。
 */
export function checkRateLimit(
  request: Request,
  { name, limit, windowMs }: RateLimitOptions,
): Response | null {
  const now = Date.now();
  sweep(now);

  const key = `${name}:${getClientIp(request)}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;

  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const message =
    "短時間にリクエストが集中しています。しばらく待ってから再試行してください。";
  return Response.json(
    { ok: false, error: message, message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}
