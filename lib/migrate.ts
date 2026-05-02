/**
 * 카드 사후 처리 마이그레이션
 *
 * Redis에 저장된 기존 카드 데이터에 최신 추출/마스킹/분류 로직을 적용.
 * Redis 자체는 변경하지 않고 갤러리 로드 시점에 메모리에서만 변환하여
 * 표시 → 사용자는 코드 업데이트 즉시 효과 확인 가능.
 *
 * 적용 항목:
 *   1. 민감정보 마스킹 (사업자/통신판매번호) — v2.9.0+
 *   2. 업종 자동 분류 — v2.9.0+
 *   3. 회사 기본정보 추출 (대표·전화·이메일·주소) — v2.9.1+
 *   4. 잘못된 주소 정리 (본문 오인식 차단) — v2.10.3+
 */

import type { StoredCard } from "./types";
import { maskSensitive } from "./sanitize";
import { classifyIndustry } from "./industry";
import { extractContactInfo } from "./contact-info";

/**
 * 단일 카드를 최신 로직으로 후처리.
 * 입력 카드는 변경하지 않고 새 객체 반환.
 */
export function migrateCard(stored: StoredCard): StoredCard {
  const card = stored.card;

  // 1. 마스킹 — 이미 적용된 카드도 멱등 (idempotent)
  const cleanHeadline = maskSensitive(card.headline);
  const cleanDek = maskSensitive(card.dek);
  const cleanLead = maskSensitive(card.lead);
  const cleanBody = card.bodyParagraphs
    .map(maskSensitive)
    .filter((p) => p.length > 0);
  const cleanKeyPoints = card.keyPoints
    .map(maskSensitive)
    .filter((p) => p.length > 0);
  const cleanPullQuote = card.pullQuote
    ? maskSensitive(card.pullQuote)
    : undefined;

  // 2. 업종 분류 — industry 필드 없으면 자동 분류, 있으면 보존
  const industry =
    card.industry ??
    classifyIndustry({
      headline: cleanHeadline,
      dek: cleanDek,
      body: cleanBody,
      keyPoints: cleanKeyPoints,
      sourceDomain: card.sourceDomain,
      sourceSiteName: card.sourceSiteName,
    });

  // 3. 회사 기본정보 — 항상 다시 추출 (최신 로직 적용)
  // 본문 오인식이 있을 수 있는 기존 contactInfo는 무시하고 재추출
  const contactInfo = extractContactInfo([
    cleanHeadline,
    cleanDek,
    cleanLead,
    ...cleanBody,
    ...cleanKeyPoints,
  ]);
  const hasContact =
    contactInfo.representative ||
    contactInfo.phone ||
    contactInfo.email ||
    contactInfo.address;

  return {
    ...stored,
    card: {
      ...card,
      headline: cleanHeadline,
      dek: cleanDek,
      lead: cleanLead,
      bodyParagraphs: cleanBody,
      keyPoints: cleanKeyPoints,
      pullQuote: cleanPullQuote,
      industry,
      contactInfo: hasContact ? contactInfo : undefined,
    },
  };
}

/**
 * 갤러리 전체를 최신 로직으로 후처리
 * page.tsx의 kvLoadGallery 직후에 호출
 */
export function migrateGallery(gallery: StoredCard[]): StoredCard[] {
  return gallery.map(migrateCard);
}
