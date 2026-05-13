/**
 * v2.56.0: 모든 카드를 IndexNow에 재ping — 검색 노출 보장
 *
 * 시나리오:
 *  - 카드 등록 시 INDEXNOW_KEY가 없거나 ping이 실패한 카드
 *  - 검색엔진(Bing/Naver/Yandex)에서 일부 카드가 안 보이는 경우
 *  - 도메인 변경·sitemap 갱신 후 재인덱싱 강제 필요
 *
 * 동작:
 *  1. ADMIN_DASHBOARD_PASSWORD로 인증
 *  2. KV에서 모든 카드 로드
 *  3. 메인 + sitemap + 모든 카드 URL을 IndexNow에 일괄 ping
 *  4. 결과 반환 (성공/실패 수, 처리된 URL 수)
 *
 * IndexNow 제한:
 *  - host당 최대 10,000 URL/req
 *  - rate limit (분당 수십 req 정도, 대량 ping에 안전)
 */

import { NextResponse } from "next/server";
import { kvLoadGallery, isKvConfigured } from "@/lib/kv-storage";
import { pingIndexNow } from "@/lib/indexnow";
import { getSiteUrl } from "@/lib/site-url";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_DASHBOARD_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD ?? "";

export async function POST(req: Request) {
  // 1. 인증
  const url = new URL(req.url);
  const password = url.searchParams.get("password") ?? "";

  if (!ADMIN_DASHBOARD_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_DASHBOARD_PASSWORD 환경변수가 설정되지 않았습니다." },
      { status: 503 },
    );
  }
  if (password !== ADMIN_DASHBOARD_PASSWORD) {
    return NextResponse.json({ ok: false, error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  // 2. INDEXNOW_KEY 확인
  const indexNowKey = process.env.INDEXNOW_KEY?.trim();
  if (!indexNowKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "INDEXNOW_KEY 환경변수가 설정되지 않았습니다. " +
          "Vercel Dashboard → Settings → Environment Variables → INDEXNOW_KEY 추가 후 Redeploy.",
      },
      { status: 503 },
    );
  }

  // 3. KV 확인
  if (!isKvConfigured()) {
    return NextResponse.json(
      { ok: false, error: "KV 저장소가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  // 4. 모든 카드 로드
  let cards;
  try {
    cards = await kvLoadGallery();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "KV 로드 실패" },
      { status: 500 },
    );
  }

  // 5. URL 목록 생성 — 메인 + sitemap + 모든 카드
  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "NEXT_PUBLIC_SITE_URL 환경변수가 설정되지 않았습니다.",
      },
      { status: 503 },
    );
  }

  const urls = [
    siteUrl,
    `${siteUrl}/sitemap.xml`,
    `${siteUrl}/about`,
    ...cards.map((c) => `${siteUrl}/${c.id}`),
  ];

  // 6. IndexNow ping (한 번에 최대 10,000개 — 500개 카드 충분)
  const result = await pingIndexNow(urls);

  if (result.ok) {
    log.info("admin-reindex-all", "success", {
      totalCards: cards.length,
      urlsCount: urls.length,
      indexNowStatus: result.status,
    });
    return NextResponse.json({
      ok: true,
      totalCards: cards.length,
      urlsCount: urls.length,
      indexNowStatus: result.status,
      message:
        `${urls.length}개 URL이 IndexNow에 ping됨 (HTTP ${result.status}). ` +
        `Bing/Naver/Yandex/Seznam/Yep 검색 결과 반영까지 1~5분 소요. ` +
        `Google은 IndexNow 미지원이지만 sitemap.xml 갱신으로 1~7일 내 재인덱싱됨.`,
      providers: ["Bing", "Naver", "Yandex", "Seznam", "Yep"],
    });
  }

  log.warn("admin-reindex-all", "ping-failed", {
    error: result.error,
    status: result.status,
  });
  return NextResponse.json(
    {
      ok: false,
      error: result.error || `IndexNow ping 실패 (HTTP ${result.status})`,
      indexNowStatus: result.status,
      totalCards: cards.length,
      urlsCount: urls.length,
    },
    { status: 502 },
  );
}
