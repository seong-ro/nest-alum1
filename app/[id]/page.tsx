import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { kvLoadGallery } from "@/lib/kv-storage";
import { migrateCard } from "@/lib/migrate";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildCardOrganizationJsonLd,
  buildFaqPageJsonLd,
  buildImageObjectJsonLd,
  buildCardMetadata,
  jsonLdScript,
  SITE,
} from "@/lib/seo";
import { EditorialCard } from "@/components/EditorialCard";

// SEO 핵심: ISR 캐싱 (5분) — Vercel이 정적 페이지로 생성하여 검색엔진이 빠르게 인덱싱
// dynamic 옵션 명시 제거 — Next.js 15가 revalidate 값으로 자동 ISR 적용
// (이전 force-dynamic + revalidate=300 충돌 → ISR 무효화되어 검색 노출 지연)
export const revalidate = 300;  // 5분 ISR — 검색엔진 인덱싱 최적화 + 카드 갱신 반영

// ---------------------------------------------------------------------------
// generateMetadata — 카드별 동적 메타데이터
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const gallery = await kvLoadGallery();
  const rawStored = gallery.find((c) => c.id === id);
  if (!rawStored) {
    return {
      title: "기업 소개를 찾을 수 없습니다",
      description: "갤러리에서 해당 기업 소개를 찾을 수 없습니다.",
      robots: { index: false, follow: false },
    };
  }
  const stored = migrateCard(rawStored);

  const cardUrl = `${SITE.url}/${id}`;
  return buildCardMetadata(stored, cardUrl);
}

// ---------------------------------------------------------------------------
// Card Page — SSR 렌더링
// ---------------------------------------------------------------------------

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gallery = await kvLoadGallery();
  const rawStored = gallery.find((c) => c.id === id);

  if (!rawStored) {
    notFound();
    return;  // narrowing 보장 (notFound는 never이지만 일부 환경에서 미인식)
  }
  const stored = migrateCard(rawStored);

  const cardUrl = `${SITE.url}/${id}`;
  const articleLd = buildArticleJsonLd(stored, cardUrl);
  const breadcrumbLd = buildBreadcrumbJsonLd(stored, cardUrl);
  // v2.53.0: 풍부한 SERP 노출용 추가 schemas
  const organizationLd = buildCardOrganizationJsonLd(stored, cardUrl);
  const faqLd = buildFaqPageJsonLd(stored, cardUrl);
  const imageLd = buildImageObjectJsonLd(stored, cardUrl);

  // GEO 핵심: 첫 200자에 명확한 답변 — LLM이 추출 가능한 형태로 노출
  // (이 텍스트는 article의 description 필드와도 매핑되어 검색엔진에 일관 신호 전달)
  const heroAnswer = stored.card.dek || stored.card.lead;
  const company = stored.card.sourceSiteName || stored.card.sourceDomain;

  return (
    <>
      {/* JSON-LD 구조화 데이터 — Article + Breadcrumb + Organization + FAQ + Image (v2.53.0)
          풍부한 SERP 노출 (Google AI Overview, Naver, Bing rich snippet)
          AI Overview 인용 가능성↑, 검색 결과 sidebar 정보 보강 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(articleLd)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbLd)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(organizationLd)}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(faqLd)}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(imageLd)}
      />

      <main id="main">
        {/* Breadcrumb 시각 (semantic <nav>) */}
        <nav
          aria-label="페이지 경로"
          className="border-b border-border bg-surface"
        >
          <div className="max-w-container mx-auto px-6 md:px-10 py-3">
            <ol className="flex items-center gap-2 text-[0.825rem] text-fg-muted">
              <li>
                <Link
                  href="/"
                  className="hover:text-fg hover:underline focus-ring rounded-sm"
                >
                  홈
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link
                  href="/#gallery"
                  className="hover:text-fg hover:underline focus-ring rounded-sm"
                >
                  갤러리
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li
                className="text-fg font-medium truncate max-w-[60vw]"
                aria-current="page"
              >
                {stored.card.headline}
              </li>
            </ol>
          </div>
        </nav>

        {/* GEO 핵심 영역 — 첫 200자에 답변 (LLM 인용 친화) */}
        <article className="max-w-container mx-auto px-6 md:px-10 py-8">
          {/* Hidden semantic summary — 검색엔진/LLM은 읽지만 디자인엔 영향 없음 */}
          <div className="sr-only">
            <h1>{stored.card.headline}</h1>
            <p>
              {company}는 {heroAnswer}
            </p>
          </div>

          {/* 갤러리로 돌아가기 — 시인성 강화 */}
          <div className="mb-6">
            <Link
              href="/#gallery"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 text-[0.875rem] font-semibold transition-all focus-ring shadow-sm hover:shadow"
              style={{
                borderColor: "var(--color-accent)",
                color: "var(--color-accent)",
                backgroundColor: "var(--color-accent-subtle)",
              }}
              aria-label="갤러리로 돌아가서 다른 기업 소개 보기"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              갤러리로 돌아가기
            </Link>
          </div>

          <EditorialCard card={stored.card} />

          {/* v2.57.0: 관련 카드 추천 — 같은 업종 또는 같은 도메인 카드 (internal linking·UX) */}
          <RelatedCards
            currentId={id}
            currentCard={stored.card}
            allGallery={gallery}
          />

          {/* 끝부분 — 다른 카드 보기 + 소개 추가 */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-[0.875rem] text-fg-muted">
                이 기업 소개를 모두 확인하셨다면
              </p>
              <Link
                href="/#gallery"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md text-[0.95rem] font-semibold text-white transition-all focus-ring shadow-raised hover:shadow-overlay active:scale-[0.98]"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                갤러리에서 다른 기업 소개 보기
              </Link>
            </div>
          </div>
        </article>
      </main>
    </>
  );
}

// v2.57.0: 관련 카드 추천 컴포넌트 — internal linking 강화 (SEO·UX)
// 우선순위: 같은 도메인 > 같은 산업 카테고리 > 최근 등록 (최대 3장)
function RelatedCards({
  currentId,
  currentCard,
  allGallery,
}: {
  currentId: string;
  currentCard: { sourceDomain?: string; industry?: string };
  allGallery: Array<{
    id: string;
    card: {
      headline?: string;
      dek?: string;
      sourceDomain?: string;
      industry?: string;
      sourceSiteName?: string;
    };
    updatedAt?: string;
  }>;
}) {
  const candidates = allGallery.filter((c) => c.id !== currentId);
  const sameDomain = candidates.filter(
    (c) => c.card.sourceDomain === currentCard.sourceDomain,
  );
  const sameIndustry = candidates.filter(
    (c) =>
      c.card.industry === currentCard.industry &&
      c.card.sourceDomain !== currentCard.sourceDomain,
  );
  const recent = candidates
    .filter(
      (c) =>
        c.card.sourceDomain !== currentCard.sourceDomain &&
        c.card.industry !== currentCard.industry,
    )
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  const related = [...sameDomain, ...sameIndustry, ...recent].slice(0, 3);
  if (related.length === 0) return null;

  return (
    <section
      aria-labelledby="related-heading"
      className="mt-16 pt-10 border-t border-border"
    >
      <h2
        id="related-heading"
        className="text-[1.25rem] md:text-[1.5rem] font-semibold text-fg mb-2"
      >
        함께 보면 좋은 동문 기업
      </h2>
      <p className="text-[0.875rem] text-fg-muted mb-6">
        같은 산업·도메인 또는 최근 등록된 NEST 동문 기업 카드를 추천합니다.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {related.map((c) => (
          <Link
            key={c.id}
            href={`/${c.id}`}
            className="group block p-4 rounded-lg border border-border bg-white hover:bg-stone-50 transition-colors focus-ring"
          >
            <div className="flex flex-col h-full">
              {c.card.industry ? (
                <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-stone-500 mb-1">
                  {c.card.industry}
                </span>
              ) : null}
              <h3 className="font-semibold text-[0.95rem] text-fg group-hover:text-accent line-clamp-2 mb-1.5">
                {c.card.headline || c.card.sourceSiteName || "기업 소개"}
              </h3>
              {c.card.dek ? (
                <p className="text-[0.8rem] text-fg-muted line-clamp-3 flex-1">
                  {c.card.dek}
                </p>
              ) : null}
              <p className="mt-2 text-[10px] text-stone-400">
                {c.card.sourceDomain}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
