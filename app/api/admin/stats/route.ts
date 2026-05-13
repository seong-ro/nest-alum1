/**
 * v2.46.0: 관리자 대시보드 통계 API.
 *
 * 응답: 카드 통계, 도메인 분포, 최근 활동, 이상 징후 진단.
 */

import { NextRequest, NextResponse } from "next/server";
import { kvLoadGallery, isKvConfigured } from "@/lib/kv-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: NextRequest, providedPassword: string | null): boolean {
  // v2.48.0: 최고 관리자 비밀번호만 인증 — 일반 ADMIN_PASSWORD fallback 제거.
  // 카드 등록·수정·삭제용 비밀번호는 대시보드 접근 불가.
  const adminDashboardPw = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!adminDashboardPw) return false;
  const headerAuth = req.headers.get("authorization");
  const bearerToken = headerAuth?.startsWith("Bearer ") ? headerAuth.slice(7) : null;
  const candidate = bearerToken ?? providedPassword;
  if (!candidate) return false;
  return candidate === adminDashboardPw;
}

export async function POST(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 503 });
  }

  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body if header auth */
  }

  if (!authorize(req, body.password ?? null)) {
    // v2.48.0: 권한 분리 — admin 대시보드는 ADMIN_DASHBOARD_PASSWORD 전용
    const adminDashboardPwSet = !!process.env.ADMIN_DASHBOARD_PASSWORD;
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        hint: {
          ADMIN_DASHBOARD_PASSWORD: adminDashboardPwSet ? "set" : "missing",
          guide: !adminDashboardPwSet
            ? "ADMIN_DASHBOARD_PASSWORD 환경변수가 Vercel에 설정되지 않았습니다. 최고 관리자 전용 비밀번호로 별도 설정 필수입니다. (카드 등록 비밀번호는 대시보드 접근 불가)"
            : "최고 관리자 비밀번호가 일치하지 않습니다. (카드 등록·수정·삭제 비밀번호는 대시보드 접근 불가 — 별도의 최고 관리자 비밀번호가 필요합니다)",
        },
      },
      { status: 401 },
    );
  }

  const gallery = await kvLoadGallery();
  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const ms7d = 7 * ms24h;

  // 기본 통계
  const total = gallery.length;
  const userEditedCount = gallery.filter((c) => c.card.userEdited).length;
  const autoExtractedCount = total - userEditedCount;

  // 도메인 분포
  const domainCounts = new Map<string, number>();
  for (const c of gallery) {
    const d = c.card.sourceDomain || "unknown";
    domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
  }
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  // 산업 분류 분포
  const industryCounts = new Map<string, number>();
  for (const c of gallery) {
    const i = c.card.industry || "other";
    industryCounts.set(i, (industryCounts.get(i) ?? 0) + 1);
  }
  const industryDistribution = Array.from(industryCounts.entries())
    .map(([industry, count]) => ({ industry, count }))
    .sort((a, b) => b.count - a.count);

  // 최근 활동
  const recentlyCreated = gallery
    .filter((c) => now - new Date(c.createdAt).getTime() < ms24h)
    .length;
  const recentlyUpdated = gallery
    .filter((c) => now - new Date(c.updatedAt).getTime() < ms24h)
    .length;
  const updatedThisWeek = gallery
    .filter((c) => now - new Date(c.updatedAt).getTime() < ms7d)
    .length;

  // 최근 5개 카드 (대시보드 요약용)
  const recentCards = [...gallery]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
    .map((c) => ({
      id: c.id.slice(0, 8),
      headline: c.card.headline,
      domain: c.card.sourceDomain,
      userEdited: !!c.card.userEdited,
      updatedAt: c.updatedAt,
    }));

  // v2.49.0: 전체 카드 목록 (full id) — 카드별 시점 복원 UI에서 사용
  const allCards = [...gallery]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((c) => ({
      id: c.id, // full dedupKey — 시점 복원 API 호출용
      headline: c.card.headline,
      domain: c.card.sourceDomain,
      industry: c.card.industry,
      userEdited: !!c.card.userEdited,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

  // 이상 징후 — 빈약한 카드 (본문 0개 또는 헤드라인 없음)
  const anomalies: Array<{ id: string; reason: string; headline: string }> = [];
  for (const c of gallery) {
    const reasons: string[] = [];
    if (!c.card.headline || c.card.headline.length < 3) reasons.push("헤드라인 누락");
    if (!c.card.bodyParagraphs || c.card.bodyParagraphs.length === 0) reasons.push("본문 없음");
    if (!c.card.industry || c.card.industry === "other") reasons.push("산업 분류 미지정");
    if (c.card.bodyParagraphs?.length === 1 && c.card.bodyParagraphs[0].length < 50) {
      reasons.push("본문 매우 짧음");
    }
    if (reasons.length > 0) {
      anomalies.push({
        id: c.id.slice(0, 8),
        reason: reasons.join(", "),
        headline: c.card.headline ?? "(no headline)",
      });
    }
  }

  // 중복 가능성 검사
  const headlineCounts = new Map<string, number>();
  for (const c of gallery) {
    const k = c.card.headline?.trim().toLowerCase() ?? "";
    if (k.length > 5) {
      headlineCounts.set(k, (headlineCounts.get(k) ?? 0) + 1);
    }
  }
  const possibleDuplicates = Array.from(headlineCounts.entries())
    .filter(([, n]) => n > 1)
    .map(([headline, count]) => ({ headline, count }));

  return NextResponse.json({
    ok: true,
    total,
    userEditedCount,
    autoExtractedCount,
    recentlyCreated,
    recentlyUpdated,
    updatedThisWeek,
    topDomains,
    industryDistribution,
    recentCards,
    allCards,
    anomalies,
    possibleDuplicates,
    // v2.55.7: 환경변수 설정 상태 — admin UI에서 SEO·백업 인프라 점검용
    envStatus: {
      hasIndexNowKey: !!process.env.INDEXNOW_KEY?.trim(),
      hasGithubRepo: !!process.env.GITHUB_REPO?.trim(),
      hasGithubToken: !!process.env.GITHUB_TOKEN?.trim(),
      hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    },
    generatedAt: new Date().toISOString(),
  });
}
