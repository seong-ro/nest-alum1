"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { composeCard } from "@/lib/compose-card";
import { computeDedupKey } from "@/lib/dedup-key";
import {
  isKvConfigured,
  kvDeleteCard,
  kvFindCard,
  kvLoadGallery,
  kvUpsertCard,
} from "@/lib/kv-storage";
import { extractFromUrl, extractFallbackHints, type UrlFallbackHints } from "@/lib/url-extractor";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { INDUSTRIES } from "@/lib/industry";
import { pingIndexNowFireAndForget } from "@/lib/indexnow";
import { getSiteUrl } from "@/lib/site-url";
import type { ActionState, PreviewState } from "@/lib/actions-types";
import type { EditorialCardData } from "@/lib/types";

// ---------------------------------------------------------------------------
// 관리자 비밀번호 — 환경변수 필수, 미설정 시 모든 인증 거부
// ---------------------------------------------------------------------------

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// ---------------------------------------------------------------------------
// v2.53.0: 카드 변경 시 IndexNow 자동 ping (Bing/Naver/Yandex/Seznam/Yep)
//
// 카드 등록·편집·삭제·복원 시 호출 → 변경된 URL을 즉시 검색엔진에 알림.
// fire-and-forget이라 동작에 영향 0, INDEXNOW_KEY 미설정 시 silent skip.
// Google은 IndexNow 미지원 → sitemap 통해 추후 자연 발견.
// ---------------------------------------------------------------------------

function pingCardChange(cardId: string): void {
  try {
    const siteUrl = getSiteUrl();
    const cardUrl = `${siteUrl}/${cardId}`;
    pingIndexNowFireAndForget([siteUrl, cardUrl, `${siteUrl}/sitemap.xml`]);
  } catch {
    // getSiteUrl 실패 (env 미설정) — 무시
  }
}

// ---------------------------------------------------------------------------
// IP 추출 (Vercel + 일반 프록시 환경 모두 지원)
// ---------------------------------------------------------------------------

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-vercel-forwarded-for") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// 기업 소개 추가 — Rate limit → 검증 → URL 수집 → 요약 → Redis 저장
// ---------------------------------------------------------------------------

export async function createCard(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const rawUrl = (formData.get("url") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!ADMIN_PASSWORD) {
    log.error("createCard", "ADMIN_PASSWORD env not configured");
    return {
      ok: false,
      error: "서버 인증이 구성되지 않았습니다. 운영자에게 문의하세요.",
    };
  }

  if (!rawUrl) return { ok: false, error: "URL을 입력해주세요." };

  if (
    !/^https?:\/\/\S+/i.test(rawUrl) &&
    !/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(rawUrl)
  ) {
    return { ok: false, error: "유효한 URL 형식이 아닙니다." };
  }

  if (password !== ADMIN_PASSWORD) {
    log.warn("createCard", "wrong password", { ipMasked: maskIp(await getClientIp()) });
    return { ok: false, error: "관리자 비밀번호가 올바르지 않습니다." };
  }

  if (!isKvConfigured()) {
    return {
      ok: false,
      error:
        "저장소가 연결되지 않았습니다. Vercel Marketplace에서 Upstash Redis를 연결하세요.",
    };
  }

  // ─── Rate limit: IP당 분당 20회 (v2.23.0 상향: 5→20)
  // Vercel Hobby 1M invocations/월 + Upstash 10K commands/day 한도 내 안전.
  // 동문이 동시에 카드 등록 시도해도 큐 부담 최소화. ───
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 20,
    windowSec: 60,
    keyPrefix: "ratelimit:create",
  });
  if (!rl.allowed) {
    log.warn("createCard", "rate-limited", { ipMasked: maskIp(ip), resetSec: rl.resetSeconds });
    return {
      ok: false,
      error: `요청이 너무 많이 몰렸습니다. ${rl.resetSeconds}초 후 자동으로 다시 시도하면 등록됩니다.`,
    };
  }

  // 1. URL → 콘텐츠 추출
  log.info("createCard", "extract:start", { rawUrl });
  let errorDetail: string | null = null;
  const urlResult = await extractFromUrl(rawUrl).catch((e) => {
    log.error("createCard", "extract:failed", { error: e instanceof Error ? e.message : String(e) });
    if (e instanceof Error) errorDetail = e.message;
    return undefined;
  });

  if (!urlResult) {
    return { ok: false, error: mapExtractError(errorDetail) };
  }

  // 2. 카드 구성
  const card = composeCard({ urlResult });

  // 3. dedup key 생성
  const dedupKey = computeDedupKey(urlResult.finalUrl);

  // 4. Redis 저장
  try {
    const result = await kvUpsertCard(dedupKey, card);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    pingCardChange(dedupKey);  // v2.53.0: IndexNow 즉시 인덱싱 ping
    log.info("createCard", "stored", { mode: result.mode, dedupKey });
    return { ok: true, mode: result.mode, dedupKey, card };
  } catch (err) {
    log.error("createCard", "store:failed", { error: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: "저장소에 기록하지 못했습니다." };
  }
}

// ---------------------------------------------------------------------------
// v2.25.0: 등록 전 미리보기 — URL → 추출 → composeCard 결과 반환 (저장 X)
//
// 사용자가 수정·검토한 후 createCardEdited()로 최종 저장하는 두 단계 흐름.
// 자동 추출 결과(특히 자동 분류된 industry)가 잘못된 케이스를 사용자가 등록
// 전에 직접 수정할 수 있도록 추가됨.
// ---------------------------------------------------------------------------

export async function previewCard(
  _prev: PreviewState | null,
  formData: FormData,
): Promise<PreviewState> {
  const rawUrl = (formData.get("url") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!ADMIN_PASSWORD) {
    log.error("previewCard", "ADMIN_PASSWORD env not configured");
    return {
      ok: false,
      error: "서버 인증이 구성되지 않았습니다. 운영자에게 문의하세요.",
    };
  }
  if (!rawUrl) return { ok: false, error: "URL을 입력해주세요." };
  if (
    !/^https?:\/\/\S+/i.test(rawUrl) &&
    !/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(rawUrl)
  ) {
    return { ok: false, error: "유효한 URL 형식이 아닙니다." };
  }
  if (password !== ADMIN_PASSWORD) {
    log.warn("previewCard", "wrong password", { ipMasked: maskIp(await getClientIp()) });
    return { ok: false, error: "관리자 비밀번호가 올바르지 않습니다." };
  }

  // Rate limit (createCard와 같은 키 — 미리보기·등록 합산 분당 20회)
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 20,
    windowSec: 60,
    keyPrefix: "ratelimit:create",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `요청이 너무 많이 몰렸습니다. ${rl.resetSeconds}초 후 다시 시도하세요.`,
    };
  }

  // URL 추출 + 카드 조립
  log.info("previewCard", "extract:start", { rawUrl });
  let errorDetail: string | null = null;
  const urlResult = await extractFromUrl(rawUrl).catch((e) => {
    log.error("previewCard", "extract:failed", { error: e instanceof Error ? e.message : String(e) });
    if (e instanceof Error) errorDetail = e.message;
    return undefined;
  });
  if (!urlResult) {
    return { ok: false, error: mapExtractError(errorDetail) };
  }

  const card = composeCard({ urlResult });
  const dedupKey = computeDedupKey(urlResult.finalUrl);

  // 이미 등록된 사이트인지 확인 — UI에서 "덮어쓰기 등록" 경고 표시용
  let isExisting = false;
  if (isKvConfigured()) {
    try {
      const existing = await kvFindCard(dedupKey);
      isExisting = existing !== null;
    } catch {
      // KV 일시 오류여도 미리보기는 진행 — false로 안전하게 처리
      isExisting = false;
    }
  }

  log.info("previewCard", "previewed", {
    dedupKey,
    isExisting,
    industry: card.industry,
    contentSignal: urlResult.contentSignal ?? "(none)",
    rawParagraphsCount: urlResult.paragraphs.length,
    rawKeywordsCount: urlResult.keywords?.length ?? 0,
    finalBodyCount: card.bodyParagraphs.length,
    finalKeyPointsCount: card.keyPoints.length,
  });
  return {
    ok: true,
    card,
    dedupKey,
    canonicalUrl: urlResult.finalUrl,  // v2.43.0: 중복 등록 방지용 정규 URL
    isExisting,
    previewedAt: new Date().toISOString(),
    debug: {
      contentSignal: urlResult.contentSignal ?? "(none)",
      rawParagraphsCount: urlResult.paragraphs.length,
      rawHeadingsCount: urlResult.headings.length,
      rawKeywordsCount: urlResult.keywords?.length ?? 0,
      rawDescriptionLen: urlResult.description?.length ?? 0,
      finalBodyCount: card.bodyParagraphs.length,
      finalKeyPointsCount: card.keyPoints.length,
      // v2.28.0 추가
      finalUrl: urlResult.finalUrl,
      redirected: urlResult.finalUrl !== rawUrl &&
        !urlResult.finalUrl.replace(/\/$/, "").endsWith(rawUrl.replace(/\/$/, "")),
      htmlBytesSize: urlResult.htmlBytesSize,
      rawOgDescriptionLen: urlResult.rawOgDescription?.length ?? 0,
      rawTwitterDescriptionLen: urlResult.rawTwitterDescription?.length ?? 0,
      rawMetaDescriptionLen: urlResult.rawDescription?.length ?? 0,
      rawMetaKeywordsLen: urlResult.rawMetaKeywords?.length ?? 0,
      rawMetaKeywordsCount: urlResult.rawMetaKeywords
        ? urlResult.rawMetaKeywords.split(/[,，、]/).filter((k) => k.trim().length >= 2).length
        : 0,
      descriptionAccepted: !!urlResult.description && urlResult.description.length > 0,
      firstBodyPreview: card.bodyParagraphs[0]?.slice(0, 80),
      firstKeyPointPreview: card.keyPoints[0]?.slice(0, 80),
      // v2.40.0: lead/dek preview — 깨진 도메인 표시 진단
      leadPreview: card.lead?.slice(0, 200),
      dekPreview: card.dek?.slice(0, 200),
      ogImagePresent: !!urlResult.ogImage,
      // v2.33.0: HTML 구조 진단
      metaTagCount: urlResult.metaTagCount,
      headChildrenCount: urlResult.headChildrenCount,
      scriptTagCount: urlResult.scriptTagCount,
      bodyTextLen: urlResult.bodyTextLen,
      scriptToHtmlRatio: urlResult.scriptToHtmlRatio,
      // v2.34.0: meta 태그 이름들
      metaNamesList: urlResult.metaNamesList,
      // v2.38.0: 추출 단계 가시성
      rawParagraphSamples: urlResult.rawParagraphSamples,
      sanitizedRemovedSamples: urlResult.sanitizedRemovedSamples,
      bruteForceTriggered: urlResult.bruteForceTriggered,
      bruteForceAddedCount: urlResult.bruteForceAddedCount,
      // v2.39.0: trigger 진단
      mainContentLen: urlResult.mainContentLen,
      needsEnrichment: urlResult.needsEnrichment,
      builderSignature: urlResult.builderSignature,
      finalUrlHost: urlResult.finalUrlHost,
    },
  };
}

// ---------------------------------------------------------------------------
// v2.25.0: 사용자 편집 후 카드 저장 — previewCard로 받은 데이터를 사용자가
// 수정한 후 최종 등록하는 경로.
//
// 입력 폼 필드:
//   - url, password, dedupKey (변경 불가, 미리보기 단계에서 결정)
//   - sourceSiteName, headline, dek, lead, pullQuote, industry (편집 가능)
//   - bodyParagraphs, keyPoints (JSON 배열, 편집 가능)
//   - heroImage (편집 가능 — URL 검증)
//   - 회사 정보(대표자/전화/이메일/주소)는 contactInfoJson 필드 (편집 가능)
//   - palette, lang은 클라이언트에서 hidden 필드로 전달 (변경 가능)
// ---------------------------------------------------------------------------

const VALID_INDUSTRY_KEYS = new Set(INDUSTRIES.map((i) => i.key));
const VALID_PALETTES = new Set(["paper", "ink", "clay"]);
const VALID_LANGS = new Set(["ko", "en", "mixed"]);

export async function createCardEdited(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const password = (formData.get("password") as string | null) ?? "";
  const url = (formData.get("url") as string | null)?.trim() ?? "";
  const dedupKey = (formData.get("dedupKey") as string | null)?.trim() ?? "";
  // v2.43.0: previewCard에서 받은 finalUrl (중복 등록 방지용 정규 URL)
  const canonicalUrl = (formData.get("canonicalUrl") as string | null)?.trim() ?? "";

  if (!ADMIN_PASSWORD) {
    return { ok: false, error: "서버 인증이 구성되지 않았습니다." };
  }
  if (!url || !dedupKey) {
    return { ok: false, error: "미리보기 단계가 누락되었습니다. 처음부터 다시 시도해주세요." };
  }
  if (password !== ADMIN_PASSWORD) {
    return { ok: false, error: "관리자 비밀번호가 올바르지 않습니다." };
  }
  if (!isKvConfigured()) {
    return { ok: false, error: "저장소가 연결되지 않았습니다." };
  }

  // Rate limit (createCard와 동일 키)
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 20,
    windowSec: 60,
    keyPrefix: "ratelimit:create",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `요청이 너무 많이 몰렸습니다. ${rl.resetSeconds}초 후 다시 시도하세요.`,
    };
  }

  // 편집 가능 필드 수집 + 검증
  const headline = (formData.get("headline") as string | null)?.trim() ?? "";
  const dek = (formData.get("dek") as string | null)?.trim() ?? "";
  const lead = (formData.get("lead") as string | null)?.trim() ?? "";
  const pullQuote = (formData.get("pullQuote") as string | null)?.trim() ?? "";
  const eyebrow = (formData.get("eyebrow") as string | null)?.trim() ?? "";
  const kicker = (formData.get("kicker") as string | null)?.trim() || "DISPATCH";
  const sourceSiteName = (formData.get("sourceSiteName") as string | null)?.trim() ?? "";

  if (!headline) return { ok: false, error: "헤드라인을 입력해주세요." };
  if (!dek) return { ok: false, error: "데크(부제)를 입력해주세요." };
  if (!lead) return { ok: false, error: "리드 단락을 입력해주세요." };

  // industry — 화이트리스트 검증
  const industryRaw = (formData.get("industry") as string | null)?.trim() ?? "other";
  const industry = VALID_INDUSTRY_KEYS.has(industryRaw) ? industryRaw : "other";

  // palette / lang — 화이트리스트 검증
  const paletteRaw = (formData.get("palette") as string | null)?.trim() ?? "paper";
  const palette = (
    VALID_PALETTES.has(paletteRaw) ? paletteRaw : "paper"
  ) as EditorialCardData["palette"];
  const langRaw = (formData.get("lang") as string | null)?.trim() ?? "ko";
  const lang = (
    VALID_LANGS.has(langRaw) ? langRaw : "ko"
  ) as EditorialCardData["lang"];

  // 배열 필드 — JSON 문자열로 전달, 파싱 실패 시 빈 배열
  function parseArrayField(name: string): string[] {
    const raw = formData.get(name);
    if (typeof raw !== "string" || !raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } catch {
      return [];
    }
  }
  const bodyParagraphs = parseArrayField("bodyParagraphs");
  const keyPoints = parseArrayField("keyPoints");

  if (bodyParagraphs.length === 0) {
    return { ok: false, error: "본문 단락을 최소 1개 이상 입력해주세요." };
  }

  // heroImage URL 검증 (http/https만 허용)
  const heroImageRaw = (formData.get("heroImage") as string | null)?.trim() ?? "";
  const heroImage = /^https?:\/\/.+/i.test(heroImageRaw) ? heroImageRaw : undefined;

  // contactInfo JSON 필드 — 옵션
  let contactInfo: EditorialCardData["contactInfo"] = undefined;
  const contactRaw = formData.get("contactInfoJson");
  if (typeof contactRaw === "string" && contactRaw.trim()) {
    try {
      const parsed = JSON.parse(contactRaw);
      if (parsed && typeof parsed === "object") {
        const trimOrUndef = (v: unknown): string | undefined => {
          if (typeof v !== "string") return undefined;
          const t = v.trim();
          return t.length > 0 ? t : undefined;
        };
        contactInfo = {
          representative: trimOrUndef(parsed.representative),
          phone: trimOrUndef(parsed.phone),
          email: trimOrUndef(parsed.email),
          address: trimOrUndef(parsed.address),
        };
        // 모두 비어있으면 undefined로 정리
        if (!contactInfo.representative && !contactInfo.phone &&
            !contactInfo.email && !contactInfo.address) {
          contactInfo = undefined;
        }
      }
    } catch {
      // 잘못된 JSON은 무시
    }
  }

  // URL 정규화
  let normalizedUrl = url;
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = "https://" + normalizedUrl;
  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return { ok: false, error: "유효한 URL 형식이 아닙니다." };
  }
  const sourceDomain = parsed.hostname.replace(/^www\./, "");

  // 최종 카드 데이터 조립 — composeCard 우회. 사용자 편집본을 그대로 신뢰.
  // (단, 민감정보 마스킹은 한 번 더 적용 — 사용자가 깜빡 입력했을 때 안전망)
  // v2.37.0: userEdited=true로 플래그 — 자동 새로고침 시 덮어쓰기 방지
  const card: EditorialCardData = {
    sourceUrl: normalizedUrl,
    sourceDomain,
    sourceSiteName: sourceSiteName || sourceDomain,
    fetchedAt: new Date().toISOString(),

    eyebrow: eyebrow || sourceSiteName || sourceDomain,
    kicker,
    headline,
    dek,

    lead,
    bodyParagraphs,
    pullQuote: pullQuote || undefined,
    keyPoints,

    heroImage,
    palette,
    lang,
    industry,
    contactInfo,

    // v2.37.0: 사용자 편집 표시
    userEdited: true,
    userEditedAt: new Date().toISOString(),
  };

  // dedupKey 검증 — 클라이언트에서 위조 못 하도록 서버에서 재계산
  // v2.43.0: previewCard의 finalUrl 우선 — redirect 후 URL이 다를 때 동일한 사이트가
  // 다른 dedupKey로 저장되는 중복 등록 버그 방지. canonicalUrl 없으면 사용자 입력 URL 사용.
  const urlForDedup = canonicalUrl || normalizedUrl;
  const expectedDedupKey = computeDedupKey(urlForDedup);
  if (dedupKey !== expectedDedupKey) {
    log.warn("createCardEdited", "dedup mismatch", {
      sent: dedupKey,
      expected: expectedDedupKey,
      usedCanonical: !!canonicalUrl,
    });
    // 위조 가능성 — 서버 계산값 사용
  }

  try {
    const result = await kvUpsertCard(expectedDedupKey, card);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    pingCardChange(expectedDedupKey);  // v2.53.0
    log.info("createCardEdited", "stored", {
      mode: result.mode,
      dedupKey: expectedDedupKey,
      industry: card.industry,
    });
    return { ok: true, mode: result.mode, dedupKey: expectedDedupKey, card };
  } catch (err) {
    log.error("createCardEdited", "store:failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "저장소에 기록하지 못했습니다." };
  }
}

// ---------------------------------------------------------------------------
// 카드 삭제
// ---------------------------------------------------------------------------

export async function deleteCardAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!ADMIN_PASSWORD) {
    log.error("deleteCardAction", "ADMIN_PASSWORD env not configured");
    return { ok: false, error: "서버 인증이 구성되지 않았습니다." };
  }

  if (!id) return { ok: false, error: "기업 소개 식별자가 없습니다." };
  if (password !== ADMIN_PASSWORD) {
    log.warn("deleteCardAction", "wrong password", { ipMasked: maskIp(await getClientIp()) });
    return { ok: false, error: "관리자 비밀번호가 올바르지 않습니다." };
  }
  if (!isKvConfigured()) {
    return { ok: false, error: "저장소가 연결되지 않았습니다." };
  }

  // 삭제는 비밀번호 인증된 행위이고 자원 부담이 없어
  // 추가/추출보다 관대하게 (60s에 20회). 의도적 무차별 삭제만 차단.
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 20,
    windowSec: 60,
    keyPrefix: "ratelimit:delete",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `잠시만요. 짧은 시간에 너무 많이 삭제하셨습니다. ${rl.resetSeconds}초 후 다시 시도해주세요.`,
    };
  }

  try {
    await kvDeleteCard(id);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    pingCardChange(id);  // v2.53.0: 삭제도 IndexNow에 알림 (URL deleted 시그널)
    log.info("deleteCardAction", "deleted", { id });
    return { ok: true, mode: "deleted" };
  } catch (err) {
    log.error("deleteCardAction", "failed", { error: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: "삭제 중 오류가 발생했습니다." };
  }
}

// ---------------------------------------------------------------------------
// 폴백 힌트 — JS 챌린지 사이트의 메타데이터 미리보기
// 수동 입력 모달의 placeholder/초기값으로 사용. 비밀번호 불필요(읽기 전용).
// ---------------------------------------------------------------------------

export async function getFallbackHints(
  rawUrl: string,
): Promise<{ ok: true; hints: UrlFallbackHints } | { ok: false; error: string }> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { ok: false, error: "URL이 유효하지 않습니다." };
  }

  // Rate limit (자동 추출과 별도 키 — 메타 가져오기는 더 가벼움)
  // v2.23.0: 10→30 상향 (사이트 둘러보면서 미리보기 자주 발생)
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 30,
    windowSec: 60,
    keyPrefix: "ratelimit:hints",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `요청이 너무 많이 몰렸습니다. ${rl.resetSeconds}초 후 자동으로 다시 시도하면 갱신됩니다.`,
    };
  }

  try {
    const hints = await extractFallbackHints(rawUrl);
    log.info("getFallbackHints", "extracted", {
      domain: hints.domain,
      hasOgTitle: !!hints.rawMeta.ogTitle,
      hasOgDesc: !!hints.rawMeta.ogDescription,
    });
    return { ok: true, hints };
  } catch (err) {
    log.error("getFallbackHints", "failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "메타 정보 가져오기 실패" };
  }
}

// ---------------------------------------------------------------------------
// 수동 기업 소개 추가 — 자동 추출 실패한 사이트(JS 챌린지 등)를 위한 폴백 경로
// ---------------------------------------------------------------------------

export async function createCardManual(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const url = (formData.get("url") as string | null)?.trim() ?? "";
  const headline = (formData.get("headline") as string | null)?.trim() ?? "";
  const dek = (formData.get("dek") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!ADMIN_PASSWORD) {
    log.error("createCardManual", "ADMIN_PASSWORD env not configured");
    return { ok: false, error: "서버 인증이 구성되지 않았습니다." };
  }
  if (!url) return { ok: false, error: "URL을 입력해주세요." };
  if (
    !/^https?:\/\/\S+/i.test(url) &&
    !/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(url)
  ) {
    return { ok: false, error: "유효한 URL 형식이 아닙니다." };
  }
  if (!headline) return { ok: false, error: "헤드라인을 입력해주세요." };
  if (!body || body.length < 30)
    return { ok: false, error: "본문은 최소 30자 이상 입력해주세요." };

  if (password !== ADMIN_PASSWORD) {
    return { ok: false, error: "관리자 비밀번호가 올바르지 않습니다." };
  }
  if (!isKvConfigured()) {
    return { ok: false, error: "저장소가 연결되지 않았습니다." };
  }

  // Rate limit (자동 추출과 동일 한도 공유, v2.23.0: 5→20 상향)
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 20,
    windowSec: 60,
    keyPrefix: "ratelimit:create",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `요청이 너무 많이 몰렸습니다. ${rl.resetSeconds}초 후 자동으로 다시 시도하면 등록됩니다.`,
    };
  }

  // URL 정규화
  let normalizedUrl = url;
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = "https://" + normalizedUrl;
  const parsed = new URL(normalizedUrl);
  const domain = parsed.hostname.replace(/^www\./, "");

  // OG 이미지·사이트명 — 클라이언트가 hints에서 받은 값을 폼으로 전달 (있으면)
  const ogImageRaw = (formData.get("ogImage") as string | null)?.trim() ?? "";
  const siteNameRaw = (formData.get("siteName") as string | null)?.trim() ?? "";

  // OG 이미지 URL 검증 — http/https만 허용 (data: javascript: 등 차단)
  const ogImage = /^https?:\/\/.+/i.test(ogImageRaw) ? ogImageRaw : undefined;
  const siteName = siteNameRaw || domain;

  // 본문을 단락 단위로 분리 (빈 줄 기준)
  const paragraphs = body
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // composeCard에 넘길 UrlExtractResult 형태로 구성
  const urlResult = {
    url,
    finalUrl: normalizedUrl,
    domain,
    title: headline,
    description: dek,
    ogImage,
    siteName,
    lang: "ko",
    headings: [],
    paragraphs,
    publishedTime: undefined,
    author: undefined,
  };

  const card = composeCard({ urlResult });
  // v2.37.0: 수동 입력 카드도 userEdited 플래그 — 자동 새로고침 덮어쓰기 방지
  card.userEdited = true;
  card.userEditedAt = new Date().toISOString();

  // v2.43.0: redirect 추적으로 정규 URL 확보 — 같은 사이트가 다른 URL 변형으로
  // 중복 등록되는 버그 방지. HEAD 실패해도 normalizedUrl 사용 (fallback).
  let canonicalUrl = normalizedUrl;
  try {
    const headController = new AbortController();
    const headTimeout = setTimeout(() => headController.abort(), 5000);
    const headRes = await fetch(normalizedUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: headController.signal,
    });
    clearTimeout(headTimeout);
    if (headRes.url) canonicalUrl = headRes.url;
  } catch {
    // HEAD 차단 사이트는 normalizedUrl 그대로 사용
  }
  const dedupKey = computeDedupKey(canonicalUrl);

  try {
    const result = await kvUpsertCard(dedupKey, card);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    pingCardChange(dedupKey);  // v2.53.0
    log.info("createCardManual", "stored", { mode: result.mode, dedupKey });
    return { ok: true, mode: result.mode, dedupKey, card };
  } catch (err) {
    log.error("createCardManual", "store:failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "저장소에 기록하지 못했습니다." };
  }
}

// ---------------------------------------------------------------------------
// 카드 새로고침 — 단일 카드 또는 전체 일괄 재추출
// 외부 사이트 fetch를 다시 수행하여 최신 콘텐츠 + 최신 추출 로직 반영
// ---------------------------------------------------------------------------

export type RefreshResult = {
  ok: boolean;
  total?: number;
  succeeded?: number;
  failed?: number;
  errors?: Array<{ id: string; url: string; error: string }>;
  error?: string;
  // 배치 진행용 — Vercel Hobby 10초 timeout 안전을 위해 클라이언트가 반복 호출
  nextOffset?: number;  // 다음 배치 시작점 (undefined면 완료)
  done?: boolean;       // 모든 배치 완료 여부
};

/**
 * 단일 카드 재추출 (직접 호출용)
 * 클라이언트에서 id + password를 직접 전달하여 호출
 */
export async function refreshCardActionDirect(
  id: string,
  password: string,
): Promise<ActionState> {
  if (!id) return { ok: false, error: "카드 ID가 필요합니다." };
  if (!ADMIN_PASSWORD) return { ok: false, error: "관리자 인증이 설정되지 않았습니다." };
  if (password !== ADMIN_PASSWORD) {
    log.warn("refreshCardActionDirect", "wrong password", { idTail: id.slice(-6) });
    return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  }
  if (!isKvConfigured()) return { ok: false, error: "저장소가 설정되지 않았습니다." };

  // Rate limit (재추출은 외부 fetch 필요해서 보수적, v2.23.0: 5→10 상향)
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 10,
    windowSec: 60,
    keyPrefix: "ratelimit:refresh",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `요청이 너무 많이 몰렸습니다. ${rl.resetSeconds}초 후 자동으로 다시 시도하면 갱신됩니다.`,
    };
  }

  try {
    const gallery = await kvLoadGallery();
    const target = gallery.find((c) => c.id === id);
    if (!target) return { ok: false, error: "카드를 찾을 수 없습니다." };

    let urlResult;
    try {
      urlResult = await extractFromUrl(target.card.sourceUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.warn("refreshCardActionDirect", "extract failed", { id: id.slice(0, 8), error: msg });
      return { ok: false, error: mapExtractError(msg) };
    }

    const newCard = composeCard({ urlResult });

    // v2.37.0: userEdited 카드는 본문 보존 — 메타(이미지·사이트명)만 갱신
    // 사용자가 직접 입력한 카드의 본문이 자동 새로고침으로 덮어써지는 사고 방지.
    let card: EditorialCardData;
    if (target.card.userEdited) {
      card = {
        ...target.card,
        // 메타만 갱신 (이미지·fetchedAt) — 본문 모두 보존
        heroImage: newCard.heroImage ?? target.card.heroImage,
        sourceSiteName: newCard.sourceSiteName ?? target.card.sourceSiteName,
        sourceUrl: target.card.sourceUrl,  // URL 보존
        fetchedAt: new Date().toISOString(),
        // userEdited 플래그 유지
      };
      log.info("refreshCardActionDirect", "user-edited-preserved", {
        id: id.slice(0, 8),
        userEditedAt: target.card.userEditedAt,
      });
    } else {
      card = newCard;
    }

    await kvUpsertCard(id, card);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    revalidatePath(`/${id}`);
    pingCardChange(id);  // v2.53.0
    log.info("refreshCardActionDirect", "success", {
      id: id.slice(0, 8),
      domain: urlResult.domain,
      userEdited: !!target.card.userEdited,
    });
    return { ok: true, mode: "overwritten", dedupKey: id, card };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("refreshCardActionDirect", "failed", { id: id.slice(0, 8), error: msg });
    return { ok: false, error: "재추출 중 오류가 발생했습니다." };
  }
}

/**
 * 단일 카드 재추출 (formData 버전 — useFormState 호환)
 * 카드 ID 또는 URL을 받아 외부 사이트를 다시 fetch하고 새 추출 로직 적용
 */
export async function refreshCardAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!id) return { ok: false, error: "카드 ID가 필요합니다." };
  if (!ADMIN_PASSWORD) return { ok: false, error: "관리자 인증이 설정되지 않았습니다." };
  if (password !== ADMIN_PASSWORD) {
    log.warn("refreshCardAction", "wrong password", { idTail: id.slice(-6) });
    return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  }

  if (!isKvConfigured()) return { ok: false, error: "저장소가 설정되지 않았습니다." };

  // Rate limit (재추출은 외부 fetch 필요해서 보수적)
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 10,
    windowSec: 60,
    keyPrefix: "ratelimit:refresh",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `요청이 너무 많이 몰렸습니다. ${rl.resetSeconds}초 후 자동으로 다시 시도하면 갱신됩니다.`,
    };
  }

  try {
    const gallery = await kvLoadGallery();
    const target = gallery.find((c) => c.id === id);
    if (!target) return { ok: false, error: "카드를 찾을 수 없습니다." };

    // 외부 사이트 재fetch
    let urlResult;
    try {
      urlResult = await extractFromUrl(target.card.sourceUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.warn("refreshCardAction", "extract failed", { id: id.slice(0, 8), error: msg });
      return { ok: false, error: mapExtractError(msg) };
    }

    // v2.37.0: userEdited 카드는 본문 보존 — 메타만 갱신
    const newCard = composeCard({ urlResult });
    let card: EditorialCardData;
    if (target.card.userEdited) {
      card = {
        ...target.card,
        heroImage: newCard.heroImage ?? target.card.heroImage,
        sourceSiteName: newCard.sourceSiteName ?? target.card.sourceSiteName,
        sourceUrl: target.card.sourceUrl,
        fetchedAt: new Date().toISOString(),
      };
      log.info("refreshCardAction", "user-edited-preserved", {
        id: id.slice(0, 8),
        userEditedAt: target.card.userEditedAt,
      });
    } else {
      card = newCard;
    }
    await kvUpsertCard(id, card);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    revalidatePath(`/${id}`);
    pingCardChange(id);  // v2.53.0
    log.info("refreshCardAction", "success", {
      id: id.slice(0, 8),
      domain: urlResult.domain,
      userEdited: !!target.card.userEdited,
    });
    return { ok: true, mode: "overwritten", dedupKey: id, card };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("refreshCardAction", "failed", { id: id.slice(0, 8), error: msg });
    return { ok: false, error: "재추출 중 오류가 발생했습니다." };
  }
}

/**
 * 전체 카드 일괄 재추출 (배치 방식)
 * Vercel Hobby plan은 server action 기본 timeout 10초이므로
 * 호출당 최대 BATCH_SIZE개 카드만 처리하고 클라이언트가 반복 호출.
 * `offset`으로 다음 배치 시작점 지정.
 */
export async function refreshAllAction(
  password: string,
  offset: number = 0,
): Promise<RefreshResult> {
  if (!ADMIN_PASSWORD) return { ok: false, error: "관리자 인증이 설정되지 않았습니다." };
  // ADMIN_PASSWORD 또는 CRON_SECRET (자동 cron) 허용
  // CRON_SECRET은 Vercel 환경변수로 운영자만 설정. 외부 노출 시 새 값으로 회전 가능.
  const CRON_SECRET = process.env.CRON_SECRET ?? "";
  const isAuthorized =
    password === ADMIN_PASSWORD || (CRON_SECRET && password === CRON_SECRET);
  if (!isAuthorized) {
    log.warn("refreshAllAction", "wrong password");
    return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  }
  if (!isKvConfigured()) return { ok: false, error: "저장소가 설정되지 않았습니다." };

  // Rate limit — Cron 자동 호출에는 적용 안 함, 사용자 호출만 제한
  // v2.23.0: 사용자 직접 호출은 거의 사라짐 (자동 cron으로 대체) → 한도 유지
  if (offset === 0 && password !== CRON_SECRET) {
    const ip = await getClientIp();
    const rl = await checkRateLimit(ip, {
      limit: 1,
      windowSec: 600,  // 10분에 1회만
      keyPrefix: "ratelimit:refresh-all",
    });
    if (!rl.allowed) {
      return {
        ok: false,
        error: `전체 재추출은 10분에 1회만 가능합니다. ${Math.ceil(rl.resetSeconds / 60)}분 후 다시 시도해주세요.`,
      };
    }
  }

  // Vercel Hobby plan 10초 timeout 고려 — 호출당 1개씩만 처리
  // (카드당 최대 9초 fetch + 약간의 overhead)
  const BATCH_SIZE = 1;

  try {
    const gallery = await kvLoadGallery();
    const total = gallery.length;
    const batch = gallery.slice(offset, offset + BATCH_SIZE);
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; url: string; error: string }> = [];

    for (const stored of batch) {
      try {
        // v2.37.0: userEdited 카드는 자동 새로고침에서 본문 보존 (sourceUrl만 fetch해서 메타만 갱신)
        if (stored.card.userEdited) {
          // 메타 갱신을 위해 fetch는 하되 본문은 모두 보존
          let updatedMeta: { heroImage?: string; sourceSiteName?: string } = {};
          try {
            const urlResult = await extractFromUrl(stored.card.sourceUrl);
            updatedMeta = {
              heroImage: urlResult.ogImage ?? stored.card.heroImage,
              sourceSiteName: urlResult.siteName ?? stored.card.sourceSiteName,
            };
          } catch {
            // fetch 실패해도 카드는 그대로 유지 (본문 데이터 보존)
          }
          const preservedCard: EditorialCardData = {
            ...stored.card,
            heroImage: updatedMeta.heroImage ?? stored.card.heroImage,
            sourceSiteName: updatedMeta.sourceSiteName ?? stored.card.sourceSiteName,
            fetchedAt: new Date().toISOString(),
          };
          await kvUpsertCard(stored.id, preservedCard);
          succeeded++;
          log.info("refreshAllAction", "user-edited-preserved", {
            id: stored.id.slice(0, 8),
            userEditedAt: stored.card.userEditedAt,
          });
          continue;
        }

        const urlResult = await extractFromUrl(stored.card.sourceUrl);
        const card = composeCard({ urlResult });
        await kvUpsertCard(stored.id, card);
        succeeded++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failed++;
        errors.push({
          id: stored.id.slice(0, 8),
          url: stored.card.sourceUrl,
          error: mapExtractError(msg),
        });
        log.warn("refreshAllAction", "item failed", {
          id: stored.id.slice(0, 8),
          error: msg,
        });
      }
    }

    const nextOffset = offset + batch.length;
    const done = nextOffset >= total;
    if (done) {
      revalidatePath("/");
      revalidatePath("/sitemap.xml");
      revalidatePath("/llms.txt");
      // v2.53.0: 갤러리 전체 변경 — sitemap.xml만 ping (카드 단위는 너무 많음)
      try {
        const siteUrl = getSiteUrl();
        pingIndexNowFireAndForget([siteUrl, `${siteUrl}/sitemap.xml`]);
      } catch {
        /* env 미설정 무시 */
      }
      log.info("refreshAllAction", "complete", { total, finalOffset: nextOffset });
    }

    return {
      ok: true,
      total,
      succeeded,
      failed,
      errors,
      nextOffset: done ? undefined : nextOffset,
      done,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("refreshAllAction", "failed", { error: msg });
    return { ok: false, error: "일괄 재추출 중 오류가 발생했습니다." };
  }
}

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

function maskIp(ip: string): string {
  // IPv4: 192.168.1.1 → 192.168.*.* / IPv6는 앞 2 그룹만
  if (ip.includes(".")) {
    const parts = ip.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : ip;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}:****` : ip;
  }
  return ip;
}

function mapExtractError(detail: string | null): string {
  if (!detail) return "사이트에서 정보를 가져올 수 없어요. 공개된 페이지 주소가 맞는지 확인해 주세요.";
  if (/^JS_CHALLENGE/.test(detail))
    return "이 사이트는 봇 차단(JavaScript 챌린지)을 사용하고 있어 자동 추출이 어려워요. 다음 단계의 [수동 입력] 폼으로 소개를 직접 작성해 주세요.";
  if (/^EMPTY_CONTENT/.test(detail))
    return "페이지가 비어 있거나 내용을 찾을 수 없어요. 다른 주소를 시도하거나 [수동 입력]을 사용해 주세요.";
  // v2.42.0: 403/401 친화 — 공공·정부 사이트(.go.kr·.or.kr) 자주 발생
  if (/^FORBIDDEN_(401|403)/.test(detail))
    return "사이트가 외부 자동 접근을 차단하고 있어요. (공공기관·정부 사이트에서 자주 발생) 직접 [수동 입력]으로 헤드라인·본문을 작성해 주시면 영구 보존됩니다.";
  // v2.42.0: 매우 짧은 응답 (방화벽 거부 응답)
  if (/^BLOCKED_TINY_RESPONSE/.test(detail))
    return "사이트가 매우 짧은 응답을 반환했어요 — 보안 정책으로 자동 접근을 차단한 것 같습니다 (공공기관·정부 사이트에서 자주 발생). [수동 입력]으로 직접 작성해 주세요.";
  if (/^NOT_FOUND_404/.test(detail))
    return "그런 주소의 페이지가 없어요. 주소(URL)를 다시 확인해 주세요. (예: .or.kr → .co.kr 같은 도메인 확장자가 다른지 확인)";
  if (/^RATE_LIMITED_429/.test(detail))
    return "사이트가 잠시 너무 많은 요청을 받아 응답을 거부했어요. 잠시 후 다시 시도해 주세요.";
  if (/^SERVER_ERROR_/.test(detail))
    return "사이트 자체에 일시적 오류가 있어요. 사이트가 복구된 후 다시 시도하거나 [수동 입력]을 사용해 주세요.";
  if (/^TIMEOUT/.test(detail))
    return "사이트가 응답에 너무 오래 걸려 자동 추출이 시간 안에 끝나지 못했어요. [수동 입력] 폼으로 소개를 직접 작성해 주세요.";
  if (/^WRONG_CONTENT_TYPE/.test(detail))
    return "이 주소는 일반 HTML 페이지가 아니에요. 웹페이지 주소를 입력해 주세요.";
  return "사이트에서 정보를 가져올 수 없어요. [수동 입력]을 사용해 주세요.";
}
