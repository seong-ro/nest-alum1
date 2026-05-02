"use client";

import { useState } from "react";

interface Props {
  heroImage?: string;
  headline: string;
  sourceSiteName?: string;
  sourceDomain: string;
  /** 비율 — "16/9" 권장 (이전 21/9는 너무 와이드해서 빈 공간 큼) */
  aspectRatio?: string;
}

/**
 * 카드 상단 hero 영역.
 * - heroImage가 없거나 로드 실패하면 도메인 이니셜 + 그라디언트 fallback
 * - background-image는 onError 감지 불가하므로 <img> 태그 + onError로 처리
 * - ThumbnailCard fallback과 시각적으로 통일
 */
export function HeroImage({
  heroImage,
  headline,
  sourceSiteName,
  sourceDomain,
  aspectRatio = "16/9",
}: Props) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const showFallback = !heroImage || imageLoadFailed;

  if (showFallback) {
    // 이니셜 + 그라디언트 fallback
    return (
      <div
        className="w-full border-b flex items-center justify-center relative overflow-hidden"
        style={{
          aspectRatio,
          backgroundColor: "var(--card-bg-soft)",
          borderColor: "var(--card-border)",
        }}
        role="img"
        aria-label={`${headline} 대표 이미지 없음`}
      >
        {/* 패턴 그라디언트 — ThumbnailCard와 동일 디자인 */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, var(--card-accent) 0%, transparent 40%), radial-gradient(circle at 80% 80%, var(--card-accent) 0%, transparent 35%)`,
          }}
        />
        {/* 이니셜 + 도메인 */}
        <div className="relative flex flex-col items-center justify-center gap-2">
          <span
            className="font-display font-bold tracking-tight"
            style={{
              color: "var(--card-accent)",
              opacity: 0.25,
              fontSize: "clamp(3rem, 8vw, 5rem)",
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            {initials(sourceSiteName ?? sourceDomain)}
          </span>
          <span
            className="font-mono text-[0.75rem] tracking-wider uppercase"
            style={{
              color: "var(--card-ink)",
              opacity: 0.5,
            }}
          >
            {sourceSiteName ?? sourceDomain}
          </span>
        </div>
      </div>
    );
  }

  // 정상 이미지 표시 — img 태그 + onError 자동 fallback
  return (
    <div
      className="w-full border-b overflow-hidden"
      style={{
        aspectRatio,
        backgroundColor: "var(--card-bg-soft)",
        borderColor: "var(--card-border)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroImage}
        alt={headline}
        className="w-full h-full object-cover"
        onError={() => setImageLoadFailed(true)}
        loading="lazy"
      />
    </div>
  );
}

function initials(source: string): string {
  const cleaned = source.replace(/\.(com|net|org|io|co|kr|ai|app|dev|xyz|me)$/i, "");
  return cleaned.slice(0, 2).toUpperCase();
}
