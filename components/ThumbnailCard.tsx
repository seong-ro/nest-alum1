import type { StoredCard } from "@/lib/types";
import { HeroImage } from "./HeroImage";
import { IndustryBadge } from "./IndustryBadge";

interface Props {
  stored: StoredCard;
  onOpen: () => void;
  onDelete: () => void;
  onEdit?: () => void;  // v2.44.0: 카드 직접 편집
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function ThumbnailCard({
  stored,
  onOpen,
  onDelete,
  onEdit,
  isFavorite = false,
  onToggleFavorite,
}: Props) {
  const card = stored.card;
  const paletteClass =
    card.palette === "ink"
      ? "palette-slate"
      : card.palette === "clay"
      ? "palette-indigo"
      : "palette-neutral";

  return (
    <article
      className={`${paletteClass} group relative flex flex-col h-full rounded-lg border bg-surface overflow-hidden
                  hover:shadow-float hover:-translate-y-0.5 transition-all duration-200`}
      style={{ borderColor: "var(--card-border)" }}
    >
      {/* 좌상단 업종 배지 — 갤러리에서 동일 업종 그루핑 시각화 */}
      {card.industry ? (
        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
          <IndustryBadge industry={card.industry} size="xs" />
        </div>
      ) : null}

      {/* SEO crawler용 hidden anchor — 검색엔진은 카드별 URL 발견 가능
          사용자에게는 보이지 않고 button 모달 동작이 유지됨 */}
      <a
        href={`/${stored.id}`}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      >
        {card.headline} 자세히 보기
      </a>

      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col h-full text-left focus-ring rounded-lg"
        aria-label={`${card.headline} 카드 열기`}
      >
        <HeroImage
          heroImage={card.heroImage}
          headline={card.headline}
          sourceSiteName={card.sourceSiteName}
          sourceDomain={card.sourceDomain}
          aspectRatio="16/9"
        />

        <div className="flex flex-col flex-1 p-5">
          <div className="flex items-center gap-2 mb-3">
            {card.kicker ? (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-mono font-semibold"
                style={{
                  backgroundColor: "var(--card-accent)",
                  color: "#ffffff",
                }}
              >
                {card.kicker}
              </span>
            ) : null}
            <span
              className="eyebrow truncate"
              style={{ color: "var(--card-ink)", opacity: 0.55, fontSize: "0.65rem" }}
            >
              {card.eyebrow}
            </span>
          </div>

          <h3
            className="font-display font-bold tracking-tight leading-[1.15] clamp-3 mb-2"
            style={{
              fontSize: "1.05rem",
              color: "var(--card-ink)",
            }}
          >
            {card.headline}
          </h3>

          <p
            className="text-[0.85rem] leading-[1.5] clamp-3 flex-1"
            style={{ color: "var(--card-ink)", opacity: 0.65 }}
          >
            {card.dek}
          </p>

          <div
            className="mt-4 pt-3 border-t flex items-center justify-between gap-2 text-[0.7rem] font-mono"
            style={{ borderColor: "var(--card-border)" }}
          >
            <span className="truncate" style={{ color: "var(--card-accent)" }}>
              {card.sourceDomain}
            </span>
            <span className="nums-tabular shrink-0" style={{ color: "var(--card-ink)", opacity: 0.4 }}>
              {formatDate(stored.updatedAt)}
            </span>
          </div>
        </div>
      </button>

      {/* 우상단 액션 버튼들 — 즐겨찾기 + 삭제 */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
        {/* 즐겨찾기 토글 — 활성 시 항상 표시 (별이 사용자에게 의미있는 정보) */}
        {onToggleFavorite ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`w-7 h-7 rounded-md bg-white/95 border shadow-sm
                       flex items-center justify-center transition-all focus-ring
                       ${isFavorite
                         ? "opacity-100 border-amber-400 text-amber-500"
                         : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 border-border text-fg-muted hover:text-amber-500 hover:border-amber-300"}`}
            aria-label={isFavorite ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"}
            aria-pressed={isFavorite}
            title={isFavorite ? "즐겨찾기 ★ (해제)" : "즐겨찾기에 추가"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ) : null}
        {/* v2.44.0: 편집 버튼 (hover 시 표시) — 등록된 카드 내용 수정 */}
        {onEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-7 h-7 rounded-md bg-white/95 border border-border shadow-sm
                       opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                       flex items-center justify-center text-fg-muted hover:text-accent hover:border-accent
                       transition-all focus-ring"
            aria-label="이 기업 소개 내용 편집"
            title="내용 편집"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        ) : null}
        {/* 삭제 버튼 (hover 시 표시) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-7 h-7 rounded-md bg-white/95 border border-border shadow-sm
                     opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                     flex items-center justify-center text-fg-muted hover:text-danger hover:border-danger
                     transition-all focus-ring"
          aria-label="이 기업 소개를 갤러리에서 내리기"
          title="갤러리에서 내리기"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
    </article>
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
