/**
 * v2.53.0: IndexNow 키 검증 endpoint.
 *
 * 사용법:
 *   환경변수 INDEXNOW_KEY 설정 후
 *   환경변수 INDEXNOW_KEY_LOCATION을
 *     https://nest-alum1.vercel.app/api/indexnow-key/{key}로 설정
 *
 * IndexNow 검색엔진(Bing/Naver/Yandex 등)이 ping 시 keyLocation URL을 GET 호출,
 * 응답 본문이 정확히 key와 일치해야 ping 성공.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key: pathKey } = await params;
  const requestedKey = pathKey.replace(/\.txt$/i, "");

  const expected = process.env.INDEXNOW_KEY?.trim();
  if (!expected) {
    return new NextResponse("IndexNow not configured", { status: 404 });
  }

  if (requestedKey !== expected) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(expected, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
