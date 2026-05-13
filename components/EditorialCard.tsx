import type { EditorialCardData } from "@/lib/types";
import { HeroImage } from "./HeroImage";
import { IndustryBadge } from "./IndustryBadge";
import { ContactPanel } from "./ContactPanel";

interface Props {
  card: EditorialCardData;
  asArticle?: boolean;
}

/**
 * 모던 코퍼레이트 스타일 카드 렌더러.
 *
 * 주요 특징:
 *   - 상단 + 하단 모두에서 홈페이지 방문 CTA 제공 (새 탭 오픈)
 *   - Header (eyebrow + 메타)
 *   - Headline + Dek
 *   - Lead (강조 박스)
 *   - Body (5단락 2열)
 *   - Pull quote (callout)
 *   - Key points (넘버링 리스트)
 *   - Footer (대형 방문 CTA)
 */
export function EditorialCard({ card, asArticle = true }: Props) {
  const paletteClass =
    card.palette === "ink"
      ? "palette-slate"
      : card.palette === "clay"
      ? "palette-indigo"
      : "palette-neutral";

  const Wrapper = asArticle ? "article" : "div";

  return (
    <Wrapper
      className={`${paletteClass} rounded-xl border overflow-hidden shadow-subtle`}
      style={{
        borderColor: "var(--card-border)",
        backgroundColor: "var(--card-bg)",
        color: "var(--card-ink)",
      }}
    >
      <HeroImage
        heroImage={card.heroImage}
        headline={card.headline}
        sourceSiteName={card.sourceSiteName}
        sourceDomain={card.sourceDomain}
        aspectRatio="16/9"
      />

      <div className="p-8 md:p-12">
        {/* Header ─ eyebrow + meta + 소형 방문 링크 */}
        <header
          className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-6 border-b"
          style={{ borderColor: "var(--card-border)" }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            {card.kicker ? (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-mono font-medium"
                style={{
                  backgroundColor: "var(--card-accent)",
                  color: "#ffffff",
                }}
              >
                {card.kicker}
              </span>
            ) : null}
            <span
              className="eyebrow"
              style={{ color: "var(--card-ink)", opacity: 0.7 }}
            >
              {card.eyebrow}
            </span>
            {card.industry ? <IndustryBadge industry={card.industry} size="sm" /> : null}
          </div>
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[0.8rem] font-mono font-medium hover:underline"
            style={{ color: "var(--card-accent)" }}
            title="새 탭으로 홈페이지 열기"
          >
            {card.sourceDomain}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        </header>

        {/* Headline */}
        <h2
          className="font-display font-bold tracking-tight leading-[1.1]"
          style={{
            fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
            color: "var(--card-ink)",
          }}
        >
          {card.headline}
        </h2>

        {/* Dek */}
        <p
          className="mt-5 text-[1.1rem] md:text-[1.2rem] leading-[1.55] font-medium"
          style={{ color: "var(--card-ink)", opacity: 0.75 }}
        >
          {card.dek}
        </p>

        {/* 상단 CTA — 홈페이지 방문 (눈에 띄는 primary 버튼) */}
        <div className="mt-6">
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-medium text-[0.9rem] transition-all hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--card-accent)",
              color: "#ffffff",
            }}
          >
            홈페이지 방문
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <p className="mt-2 text-[0.75rem] font-mono" style={{ color: "var(--card-ink)", opacity: 0.4 }}>
            클릭 시 새 탭으로 {card.sourceDomain} 열림
          </p>
        </div>

        {/* Contact 패널 — 회사 기본정보 정돈 표시 */}
        <div className="mt-8">
          <ContactPanel contactInfo={card.contactInfo} />
        </div>

        {/* Lead */}
        <div
          className="mt-10 pl-5 border-l-2"
          style={{ borderColor: "var(--card-accent)" }}
        >
          <span className="eyebrow mb-2 block" style={{ color: "var(--card-accent)" }}>
            Lead
          </span>
          <p
            className="text-[1rem] md:text-[1.05rem] leading-[1.65]"
            style={{ color: "var(--card-ink)" }}
          >
            {card.lead}
          </p>
        </div>

        {/* Body */}
        {card.bodyParagraphs.length > 0 ? (
          <section className="mt-10">
            <span
              className="eyebrow mb-4 block"
              style={{ color: "var(--card-ink)", opacity: 0.5 }}
            >
              Body · {card.bodyParagraphs.length}단락
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {card.bodyParagraphs.map((p, i) => (
                <p
                  key={i}
                  className="text-[0.95rem] leading-[1.7]"
                  style={{ color: "var(--card-ink)", opacity: 0.85 }}
                >
                  <span className="num-marker mr-2" style={{ color: "var(--card-accent)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {p}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {/* Pull quote */}
        {card.pullQuote ? (
          <blockquote
            className="mt-10 p-6 md:p-8 rounded-lg border-l-4"
            style={{
              backgroundColor: "var(--card-bg-soft)",
              borderColor: "var(--card-accent)",
              color: "var(--card-ink)",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: "var(--card-accent)", opacity: 0.3 }}
            >
              <path d="M7 7h4v10H5V11a4 4 0 014-4V7zm10 0h4v10h-6V11a4 4 0 014-4V7z" />
            </svg>
            <p
              className="mt-3 text-[1.1rem] md:text-[1.25rem] font-display leading-[1.45] font-medium"
              style={{ color: "var(--card-ink)" }}
            >
              {card.pullQuote}
            </p>
          </blockquote>
        ) : null}

        {/* Key points */}
        {card.keyPoints.length > 0 ? (
          <section
            className="mt-10 p-6 md:p-8 rounded-lg"
            style={{ backgroundColor: "var(--card-bg-soft)" }}
          >
            <span className="eyebrow mb-4 block" style={{ color: "var(--card-accent)" }}>
              Key Points · {card.keyPoints.length}
            </span>
            <ul className="space-y-3">
              {card.keyPoints.map((p, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="num-marker shrink-0 pt-0.5 w-6"
                    style={{ color: "var(--card-accent)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="text-[0.95rem] leading-[1.55] flex-1"
                    style={{ color: "var(--card-ink)", opacity: 0.9 }}
                  >
                    {p}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Footer — 대형 방문 CTA */}
        <footer
          className="mt-12 pt-8 border-t"
          style={{ borderColor: "var(--card-border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {card.sourceSiteName ? (
                <div
                  className="text-[0.75rem] font-mono mb-1"
                  style={{ color: "var(--card-ink)", opacity: 0.5 }}
                >
                  {card.sourceSiteName}
                </div>
              ) : null}
              <div
                className="text-[0.875rem] font-mono font-medium"
                style={{ color: "var(--card-accent)" }}
              >
                {card.sourceDomain}
              </div>
              <time
                dateTime={card.fetchedAt}
                className="text-[0.7rem] font-mono nums-tabular mt-1 inline-block"
                style={{ color: "var(--card-ink)", opacity: 0.45 }}
              >
                수집 {formatDate(card.fetchedAt)}
              </time>
              {/* v2.37.0: 사용자 직접 편집 카드 표시 — 자동 새로고침 시 본문 보존됨 */}
              {card.userEdited ? (
                <span
                  className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-mono"
                  style={{
                    backgroundColor: "var(--card-bg-soft)",
                    color: "var(--card-accent)",
                  }}
                  title="사용자 직접 편집 카드 — 자동 새로고침 시 본문 보존"
                >
                  ✎ 사용자 편집
                </span>
              ) : null}
            </div>

            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-[0.95rem] transition-all hover:-translate-y-0.5 shadow-subtle"
              style={{
                backgroundColor: "var(--card-accent)",
                color: "#ffffff",
              }}
              aria-label={`${card.sourceDomain} 홈페이지를 새 탭으로 열기`}
            >
              홈페이지 방문하기
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </Wrapper>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  } catch {
    return iso.slice(0, 10);
  }
}
