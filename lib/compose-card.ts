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
import { maskSensitive, cleanDescriptionText, looksLikeJustAddress, cleanBrokenDomainArtifacts } from "./sanitize";
import { classifyIndustry } from "./industry";
import { extractContactInfo } from "./contact-info";
import { log } from "./logger";

interface ComposeInput {
  urlResult: UrlExtractResult;
}

export function composeCard(input: ComposeInput): EditorialCardData {
  const { urlResult } = input;

  // -----------------------------------------------------------------------
  // v2.30.0: 모든 description 소스를 종합한 effective description 결정.
  //
  // urlResult.description은 isCleanDescriptionText(strict)에서 통째로 거부돼
  // 빈 문자열인 경우가 흔함 (사용자 보고: imweb 사이트에서 desc length: 0).
  // 그러나 raw 소스(rawOgDescription, rawTwitterDescription, rawDescription)에는
  // "자연과 인류의 공존을 위해 ..." 같은 풍부한 회사 소개 텍스트가 보존돼 있음.
  //
  // 이를 effectiveDescription으로 합성해서 summarize 입력의 fulltext에 prepend
  // → summarizer가 회사 소개를 lead로 우선 선택. 본문이 주소 라인뿐인 사이트에서도
  // dek/lead가 의미있는 회사 설명으로 채워짐.
  // -----------------------------------------------------------------------
  const allDescriptionSources = [
    urlResult.description,
    urlResult.rawOgDescription,
    urlResult.rawTwitterDescription,
    urlResult.rawDescription,
  ].filter((s): s is string => !!s && s.trim().length >= 20);

  let effectiveDescription = "";
  for (const source of allDescriptionSources) {
    // 1순위: cleanDescriptionText(관대 모드) 통과
    const cleaned = cleanDescriptionText(source);
    if (cleaned && cleaned.length >= 20) {
      effectiveDescription = cleaned;
      break;
    }
  }
  // 그래도 비어있으면 가장 긴 raw 소스를 그대로 사용 (cleanDescriptionText가 너무
  // 공격적이었을 케이스 — 짧은 정제 결과를 fail시키는 것보다 raw가 낫다)
  if (!effectiveDescription && allDescriptionSources.length > 0) {
    effectiveDescription = allDescriptionSources
      .reduce((longest, s) => (s.length > longest.length ? s : longest), "");
  }

  // v2.35.0: description이 진짜로 다 비어있을 때 (사용자 보고: imweb 사이트가
  // og:description·twitter:description·meta description 모두 미설정) 본문에서
  // 가장 긴 의미있는 단락을 effectiveDescription으로 사용. 본문이 풍부하다면
  // dek/lead가 의미있는 콘텐츠로 채워짐.
  if (!effectiveDescription && urlResult.paragraphs.length > 0) {
    const longBodyParagraph = urlResult.paragraphs
      .filter((p) => p.length >= 30 && p.length <= 400)
      .reduce<string>((longest, p) => (p.length > longest.length ? p : longest), "");
    if (longBodyParagraph) {
      effectiveDescription = longBodyParagraph;
    }
  }

  // -----------------------------------------------------------------------
  // 1. 요약 소스 — URL 본문 단락 + 헤딩 일부 포함해 문장 수 확보
  //    v2.30.0: effectiveDescription을 fulltext 맨 앞에 prepend → summarizer가
  //    회사 소개를 lead로 우선 선택 (주소 라인이 lead되는 케이스 방지)
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

  // v2.30.0: effectiveDescription이 본문에 이미 없다면 맨 앞에 prepend
  let summarySource = urlBodyText;
  if (
    effectiveDescription &&
    !summarySource.includes(effectiveDescription.slice(0, 30))
  ) {
    summarySource = effectiveDescription + "\n\n" + summarySource;
  }
  if (headingsAsSentences) {
    summarySource = summarySource + "\n\n" + headingsAsSentences;
  }

  const titleForSummary = urlResult.title;
  // descForSummary는 effectiveDescription 우선 사용
  const descForSummary = effectiveDescription || urlResult.description;

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
  // 3. 데크 — v2.30.0: effectiveDescription 우선 (urlResult.description은 거부됐을 수)
  // -----------------------------------------------------------------------
  const dekRaw =
    effectiveDescription && effectiveDescription.length >= 20
      ? effectiveDescription
      : urlResult.description && urlResult.description.length >= 20
        ? urlResult.description
        : summary.lead;
  const dek = clampByWord(dekRaw, 280);

  // -----------------------------------------------------------------------
  // 4. 리드 단락 — v2.30.0: address-only lead 감지 시 effectiveDescription으로 대체
  // -----------------------------------------------------------------------
  let lead =
    summary.lead && summary.lead !== dek
      ? summary.lead
      : urlResult.paragraphs[0] ?? dekRaw;

  // 리드가 주소 정보뿐이면 (사용자 보고 케이스) effectiveDescription 또는 dek로 대체
  if (looksLikeJustAddress(lead)) {
    if (effectiveDescription && effectiveDescription !== dek) {
      lead = effectiveDescription;
    } else if (dek) {
      lead = dek;
    }
    log.info("composeCard", "address-only-lead-replaced", {
      domain: urlResult.domain,
      replacedWith: effectiveDescription ? "description" : "dek",
    });
  }

  // v2.40.0: 깨진 도메인 패턴 정리 (예: "..co.kr )." 잔재)
  const leadBefore = lead;
  const dekBefore = dek;
  lead = cleanBrokenDomainArtifacts(lead);
  const dekClean = cleanBrokenDomainArtifacts(dek);
  if (leadBefore !== lead || dekBefore !== dekClean) {
    log.info("composeCard", "broken-domain-cleaned", {
      domain: urlResult.domain,
      leadBefore: leadBefore.slice(0, 80),
      leadAfter: lead.slice(0, 80),
      dekBefore: dekBefore.slice(0, 80),
      dekAfter: dekClean.slice(0, 80),
    });
  }

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
    dekClean,
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
  const cleanDek = maskSensitive(dekClean);
  const cleanLead = maskSensitive(lead);
  let cleanBody = summary.bodyParagraphs
    .map(maskSensitive)
    .filter((p) => p.length > 0);
  let cleanKeyPoints = summary.keyPoints
    .map(maskSensitive)
    .filter((p) => p.length > 0);
  const cleanPullQuote = summary.pullQuote
    ? maskSensitive(summary.pullQuote)
    : undefined;

  // -----------------------------------------------------------------------
  // 9-A. v2.26.0 / v2.27.0 본문 보강 — 웹빌더·SPA 사이트 대응
  //
  // imweb·Wix 같은 SPA·웹빌더 사이트는 본문이 이미지 안 텍스트로 렌더링되거나 매우 짧아
  // cheerio 기반 추출로는 본문 단락을 거의 못 만듦. 그러나 메타데이터(og:description,
  // meta keywords, og:title, h1·h2)는 풍부. 본문이 부족할 때 메타·헤딩에서
  // 본문 단락과 keyPoints를 합성.
  //
  // v2.27.0 변경:
  //   - 임계값 완화: paragraphs < 3 또는 총 본문 < 400자면 trigger (기존 0개 또는 < 200자)
  //   - 진단 로그 추가: 어떤 조건이 fallback을 트리거했는지 Vercel function logs에서 확인 가능
  //   - keyPoints fallback 임계값도 < 3 → < 5로 완화
  // -----------------------------------------------------------------------
  const totalBodyLen = cleanBody.reduce((s, p) => s + p.length, 0);

  // v2.30.0: cleanBody에서 address-only 단락은 의미있는 본문으로 카운트 X.
  // (사용자 보고: 사이트가 주소 라인만 본문으로 가짐 → 카드가 빈약)
  const meaningfulBodyCount = cleanBody.filter((p) => !looksLikeJustAddress(p)).length;

  const isThinContent =
    urlResult.contentSignal === "thin" ||
    urlResult.contentSignal === "meta-only" ||
    cleanBody.length < 3 ||
    meaningfulBodyCount < 1 ||  // v2.30.0: 의미있는 단락 0개면 fallback 강제
    totalBodyLen < 400;

  // v2.27.0 진단 로그 — Vercel function logs에서 본문 부족 케이스 디버깅용
  log.info("composeCard", "fallback-decision", {
    domain: urlResult.domain,
    contentSignal: urlResult.contentSignal ?? "(none)",
    paragraphsCount: urlResult.paragraphs.length,
    cleanBodyCount: cleanBody.length,
    meaningfulBodyCount,
    totalBodyLen,
    descriptionLen: urlResult.description?.length ?? 0,
    effectiveDescriptionLen: effectiveDescription.length,
    keywordsCount: urlResult.keywords?.length ?? 0,
    headingsCount: urlResult.headings.length,
    isThinContent,
  });

  if (isThinContent) {
    // v2.30.0: address-only 단락 제거 — 회사 소개 본문으로 보강 후 다시 추가
    // (주소는 contactInfo로 이미 추출됐으므로 본문 중복 불필요)
    const fallbackBody: string[] = cleanBody.filter((p) => !looksLikeJustAddress(p));
    const beforeBodyCount = fallbackBody.length;

    // v2.28.0 / v2.30.0: description fallback chain.
    // v2.30.0: 위에서 effectiveDescription을 이미 모든 소스에서 합성했으므로 그것 우선,
    // 그 다음 raw 소스 차례대로 시도.
    let descUsed: string | null = effectiveDescription || null;
    if (!descUsed) {
      const descriptionCandidates: string[] = [];
      if (urlResult.description) descriptionCandidates.push(urlResult.description);
      if (urlResult.rawOgDescription) descriptionCandidates.push(urlResult.rawOgDescription);
      if (urlResult.rawTwitterDescription) descriptionCandidates.push(urlResult.rawTwitterDescription);
      if (urlResult.rawDescription) descriptionCandidates.push(urlResult.rawDescription);
      for (const candidate of descriptionCandidates) {
        const cleaned = cleanDescriptionText(candidate);
        if (cleaned && cleaned.length >= 20) {
          descUsed = cleaned;
          break;
        }
      }
    }

    // (1) description fallback 본문화
    if (
      descUsed &&
      !fallbackBody.some((p) => p.includes(descUsed!.slice(0, 30)))
    ) {
      fallbackBody.push(maskSensitive(descUsed));
    }

    // (2) lead가 본문에 없으면 추가 — 단, address-only lead는 제외
    if (
      cleanLead &&
      cleanLead.length >= 20 &&
      !looksLikeJustAddress(cleanLead) &&
      !fallbackBody.some((p) => p.includes(cleanLead.slice(0, 30)))
    ) {
      fallbackBody.unshift(cleanLead);
    }

    // (3) siteName / title이 의미있고 본문에 없으면 안내문 합성
    if (urlResult.siteName && urlResult.siteName.length >= 3 &&
        !fallbackBody.some((p) => p.includes(urlResult.siteName!))) {
      // siteName 단독은 너무 짧으니 안내 합성
      if (descUsed) {
        // 이미 description 있음 - 추가 안 함
      } else if (cleanHeadline && cleanHeadline !== urlResult.siteName) {
        // headline + siteName 합성
        fallbackBody.push(`${urlResult.siteName} — ${cleanHeadline}`);
      }
    }

    // (4) 의미 있는 헤딩(h1·h2·h3) → 본문 보강
    //     너무 짧은 헤딩(메뉴 가능성)은 제외, 너무 긴 헤딩(제목 다발)도 제외
    for (const h of urlResult.headings) {
      const trimmed = maskSensitive(h.trim());
      if (trimmed.length < 15 || trimmed.length > 200) continue;
      // 이미 같은 내용이 본문에 있으면 스킵
      if (fallbackBody.some((p) => p.includes(trimmed.slice(0, 20)))) continue;
      // headline·dek와 거의 같으면 스킵
      if (cleanHeadline.includes(trimmed) || trimmed.includes(cleanHeadline)) continue;
      if (cleanDek.includes(trimmed.slice(0, 30))) continue;
      fallbackBody.push(trimmed);
      if (fallbackBody.length >= 5) break;  // 너무 많이 추가하지 않음
    }

    // (5) 그래도 본문이 1개 미만이면 — siteName + 도메인 안내 합성
    //     v2.31.0: "headline — domain )" 같은 의미없는 합성 대신 자연스러운 문장으로
    if (fallbackBody.length === 0) {
      const siteName = urlResult.siteName || cleanHeadline || urlResult.domain;
      const cleanDomain = urlResult.domain;

      // dek 또는 description 후보가 의미있으면 그것 활용
      const meaningfulDek =
        cleanDek && cleanDek.length >= 20 && !looksLikeJustAddress(cleanDek)
          ? cleanDek
          : descUsed && descUsed.length >= 20
            ? descUsed
            : null;

      if (meaningfulDek) {
        // siteName과 dek가 너무 비슷하면 dek만 사용
        if (
          siteName.length >= 5 &&
          meaningfulDek.toLowerCase().includes(siteName.toLowerCase().slice(0, 5))
        ) {
          fallbackBody.push(meaningfulDek);
        } else {
          fallbackBody.push(`${siteName} — ${meaningfulDek}`);
        }
      } else {
        // 전부 빈약: 사이트명 + 도메인 안내 문장 (자연스럽게)
        fallbackBody.push(
          `${siteName} 공식 사이트입니다. 자세한 정보는 ${cleanDomain}에서 확인해 주세요.`,
        );
      }
    }

    log.info("composeCard", "thin-content-fallback-applied", {
      domain: urlResult.domain,
      bodyBefore: beforeBodyCount,
      bodyAfter: fallbackBody.length,
      addedFromDescription: !!urlResult.description && urlResult.description.length >= 30,
      addedFromHeadings: urlResult.headings.length > 0,
    });

    cleanBody = fallbackBody;
  }

  // 9-B. v2.26.0 / v2.27.0 / v2.28.0 keyPoints 보강 — meta keywords / article:tag 활용
  //
  // 일반 케이스: 본문은 비어도 meta keywords는 풍부할 수 있음. 이런 경우 keywords를
  // 직접 keyPoints로 사용. 본문이 풍부해도 keyPoints가 부족하면 보강.
  // v2.27.0: 임계값 < 3 → < 5로 완화 (사용자 보고 "핵심 포인트 1개" 케이스 대응)
  // v2.28.0: keywords가 비어있어도 rawMetaKeywords (extractor 미정제 원본)에서 직접 split
  //          → extractor의 keywords 수집이 제대로 안 된 케이스에도 보강
  const beforeKpCount = cleanKeyPoints.length;

  // 후보 keywords 수집 — keywords[]와 rawMetaKeywords 모두 활용
  const candidateKeywords: string[] = [];
  if (urlResult.keywords) candidateKeywords.push(...urlResult.keywords);
  if (urlResult.rawMetaKeywords) {
    urlResult.rawMetaKeywords
      .split(/[,，、]/)
      .map((k) => k.trim())
      .filter((k) => k.length >= 2 && k.length <= 50)
      .forEach((k) => {
        if (!candidateKeywords.includes(k)) candidateKeywords.push(k);
      });
  }

  if (cleanKeyPoints.length < 5 && candidateKeywords.length > 0) {
    const existing = new Set(
      cleanKeyPoints.map((p) => p.replace(/\s+/g, "").toLowerCase()),
    );
    for (const kw of candidateKeywords) {
      const masked = maskSensitive(kw);
      if (masked.length < 2 || masked.length > 50) continue;
      const key = masked.replace(/\s+/g, "").toLowerCase();
      if (existing.has(key)) continue;
      // 단순 도메인명·사이트명 중복 방지
      if (key === urlResult.domain.replace(/[.-]/g, "").toLowerCase()) continue;
      cleanKeyPoints.push(masked);
      existing.add(key);
      if (cleanKeyPoints.length >= 8) break;  // 적정 개수
    }
    if (cleanKeyPoints.length !== beforeKpCount) {
      log.info("composeCard", "keypoints-fallback-applied", {
        domain: urlResult.domain,
        before: beforeKpCount,
        after: cleanKeyPoints.length,
        sourceKeywordsCount: candidateKeywords.length,
        usedRawMetaKeywords: !!urlResult.rawMetaKeywords,
      });
    }
  }

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
