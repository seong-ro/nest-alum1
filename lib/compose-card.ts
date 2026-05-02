/**
 * URL 스크래핑 결과를 에디토리얼 카드 데이터로 조립한다.
 *
 * 설계 원칙 (v1.3, 문서 업로드 제거):
 *   - URL 본문(paragraphs)만을 요약 소스로 사용
 *   - 짧은 메타 정보는 헤드라인/데크/아이브라우로 직접 매핑
 *   - 톤(palette)은 소스 특성에 따라 자동 선택
 *   - 요약 분량은 summarizer v1.3에서 2.5배 확장된 기본값 사용
 */

import type { EditorialCardData, UrlExtractResult } from "./types";
import { summarize } from "./summarizer";
import { detectLang, clampByWord } from "./text-utils";
import { maskSensitive } from "./sanitize";
import { classifyIndustry } from "./industry";
import { extractContactInfo } from "./contact-info";

interface ComposeInput {
  urlResult: UrlExtractResult;
}

export function composeCard(input: ComposeInput): EditorialCardData {
  const { urlResult } = input;

  // -----------------------------------------------------------------------
  // 1. 요약 소스 — URL 본문 단락 + 헤딩 일부 포함해 문장 수 확보
  // -----------------------------------------------------------------------
  const urlBodyText = urlResult.paragraphs.join("\n\n");

  // 헤딩은 원본 본문이 부족할 때만 보조 문장으로 추가 (본문 ≥12문장이면 생략)
  const richBody = urlResult.paragraphs.length >= 12;
  const headingsAsSentences = richBody
    ? ""
    : urlResult.headings
        .filter((h) => h.length >= 12 && h.length <= 100)
        .map((h) => h.trim().replace(/[.。]+$/, "") + ".")
        .join(" ");

  const summarySource = headingsAsSentences
    ? `${urlBodyText}\n\n${headingsAsSentences}`
    : urlBodyText;

  const titleForSummary = urlResult.title;
  const descForSummary = urlResult.description;

  const summary = summarize({
    title: titleForSummary,
    description: descForSummary,
    fulltext: summarySource || `${titleForSummary}\n\n${descForSummary}`,
  });

  // -----------------------------------------------------------------------
  // 2. 헤드라인
  // -----------------------------------------------------------------------
  const headlineRaw = urlResult.title || urlResult.domain;

  const { cleanTitle, detectedSite } = splitTitleAndSite(
    headlineRaw,
    urlResult.siteName,
  );
  const headline = clampByWord(cleanTitle, 140);

  // -----------------------------------------------------------------------
  // 3. 데크
  // -----------------------------------------------------------------------
  const dekRaw =
    urlResult.description && urlResult.description.length >= 20
      ? urlResult.description
      : summary.lead;
  const dek = clampByWord(dekRaw, 280);

  // -----------------------------------------------------------------------
  // 4. 리드 단락
  // -----------------------------------------------------------------------
  const lead =
    summary.lead && summary.lead !== dek
      ? summary.lead
      : urlResult.paragraphs[0] ?? dekRaw;

  // -----------------------------------------------------------------------
  // 5. 아이브라우/키커
  // -----------------------------------------------------------------------
  const eyebrow = deriveEyebrow({
    siteName: detectedSite ?? urlResult.siteName,
    domain: urlResult.domain,
    headings: urlResult.headings,
    lang: detectLang(headline),
  });

  const kicker = "DISPATCH";

  // -----------------------------------------------------------------------
  // 6. 팔레트: 테크 계열이면 clay, 일반은 paper
  // -----------------------------------------------------------------------
  const palette: EditorialCardData["palette"] =
    /tech|ai|platform|startup|edge|npu|cpu|software|engineering|lab|research/i.test(
      `${urlResult.title} ${urlResult.description} ${headline}`,
    )
      ? "clay"
      : "paper";

  // -----------------------------------------------------------------------
  // 7. 최종 언어
  // -----------------------------------------------------------------------
  const lang = detectLang(
    `${headline} ${dek} ${lead} ${summary.bodyParagraphs.join(" ")}`,
  );

  // 8. 회사 기본정보 자동 추출 — 마스킹 전 원본에서 (대표자·전화·이메일·주소)
  // -----------------------------------------------------------------------
  const contactInfo = extractContactInfo([
    headline,
    dek,
    lead,
    ...summary.bodyParagraphs,
    ...summary.keyPoints,
  ]);
  const hasContact =
    contactInfo.representative ||
    contactInfo.phone ||
    contactInfo.email ||
    contactInfo.address;

  // 9. 민감 정보 자동 마스킹 — 사업자등록번호·통신판매업신고번호만 (전화·이메일은 보존)
  // -----------------------------------------------------------------------
  const cleanHeadline = maskSensitive(headline);
  const cleanDek = maskSensitive(dek);
  const cleanLead = maskSensitive(lead);
  const cleanBody = summary.bodyParagraphs
    .map(maskSensitive)
    .filter((p) => p.length > 0);
  const cleanKeyPoints = summary.keyPoints
    .map(maskSensitive)
    .filter((p) => p.length > 0);
  const cleanPullQuote = summary.pullQuote
    ? maskSensitive(summary.pullQuote)
    : undefined;

  // 10. 업종 자동 분류 — 협업 발견용 색상 그루핑
  // -----------------------------------------------------------------------
  const industry = classifyIndustry({
    headline: cleanHeadline,
    dek: cleanDek,
    body: cleanBody,
    keyPoints: cleanKeyPoints,
    sourceDomain: urlResult.domain,
    sourceSiteName: detectedSite ?? urlResult.siteName,
  });

  return {
    sourceUrl: urlResult.finalUrl || urlResult.url,
    sourceDomain: urlResult.domain,
    sourceSiteName: detectedSite ?? urlResult.siteName,
    fetchedAt: new Date().toISOString(),

    eyebrow,
    kicker,
    headline: cleanHeadline,
    dek: cleanDek,

    lead: cleanLead,
    bodyParagraphs: cleanBody,
    pullQuote: cleanPullQuote,
    keyPoints: cleanKeyPoints,

    heroImage: urlResult.ogImage,
    palette,
    lang,
    industry,
    contactInfo: hasContact ? contactInfo : undefined,
  };
}

// ---------------------------------------------------------------------------
// 보조 함수
// ---------------------------------------------------------------------------

function splitTitleAndSite(
  raw: string,
  siteHint?: string,
): { cleanTitle: string; detectedSite?: string } {
  const separators = [" | ", " - ", " — ", " · ", " :: ", " • "];
  for (const sep of separators) {
    const idx = raw.lastIndexOf(sep);
    if (idx > 10 && raw.length - idx < 40) {
      const left = raw.slice(0, idx).trim();
      const right = raw.slice(idx + sep.length).trim();
      if (left.length >= 8) {
        return { cleanTitle: left, detectedSite: siteHint ?? right };
      }
    }
  }
  return { cleanTitle: raw.trim(), detectedSite: siteHint };
}

function deriveEyebrow(args: {
  siteName?: string;
  domain?: string;
  headings: string[];
  lang: "ko" | "en" | "mixed";
}): string {
  if (args.siteName) {
    return toEyebrow(args.siteName);
  }
  const labelLike = args.headings.find(
    (h) => h.length <= 24 && !/[.,。]/.test(h),
  );
  if (labelLike) return toEyebrow(labelLike);

  if (args.domain) {
    const parts = args.domain.split(".");
    const core = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return toEyebrow(core);
  }
  return args.lang === "ko" ? "편집 노트" : "DISPATCH";
}

function toEyebrow(s: string): string {
  const trimmed = s.trim().slice(0, 28);
  if (/[가-힣]/.test(trimmed)) return trimmed;
  return trimmed.toUpperCase();
}
