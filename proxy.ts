/**
 * スタッフ専用ページ（/iei-photo, /funeral-script）と API（/api/*）を Basic 認証で保護する。
 *
 * トップページ（祭壇シミュレーター = 見積もり）は一般公開の想定のため対象外。
 * 各 Route Handler でも同じチェックを行う（多層防御）。
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { checkStaffBasicAuth } from "@/lib/security/basic-auth";

export function proxy(request: NextRequest) {
  const denied = checkStaffBasicAuth(request);
  if (denied) return denied;
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/iei-photo",
    "/iei-photo/:path*",
    "/funeral-script",
    "/funeral-script/:path*",
    "/api/:path*",
  ],
};
