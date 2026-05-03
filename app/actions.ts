"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { composeCard } from "@/lib/compose-card";
import { computeDedupKey } from "@/lib/dedup-key";
import {
  isKvConfigured,
  kvDeleteCard,
  kvLoadGallery,
  kvUpsertCard,
} from "@/lib/kv-storage";
import { extractFromUrl, extractFallbackHints, type UrlFallbackHints } from "@/lib/url-extractor";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import type { ActionState } from "@/lib/actions-types";

// ---------------------------------------------------------------------------
// 관리자 비밀번호 — 환경변수 필수, 미설정 시 모든 인증 거부
// ---------------------------------------------------------------------------

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

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

  // ─── Rate limit: IP당 분당 5회 ───
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 5,
    windowSec: 60,
    keyPrefix: "ratelimit:create",
  });
  if (!rl.allowed) {
    log.warn("createCard", "rate-limited", { ipMasked: maskIp(ip), resetSec: rl.resetSeconds });
    return {
      ok: false,
      error: `잠시만요. 짧은 시간에 요청이 많아 ${rl.resetSeconds}초 후 다시 시도 부탁드립니다.`,
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
    log.info("createCard", "stored", { mode: result.mode, dedupKey });
    return { ok: true, mode: result.mode, dedupKey, card };
  } catch (err) {
    log.error("createCard", "store:failed", { error: err instanceof Error ? err.message : String(err) });
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
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 10,
    windowSec: 60,
    keyPrefix: "ratelimit:hints",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `잠시만요. 짧은 시간에 요청이 많아 ${rl.resetSeconds}초 후 다시 시도 부탁드립니다.`,
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

  // Rate limit (자동 추출과 동일 한도 공유)
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 5,
    windowSec: 60,
    keyPrefix: "ratelimit:create",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `잠시만요. 짧은 시간에 요청이 많아 ${rl.resetSeconds}초 후 다시 시도 부탁드립니다.`,
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
  const dedupKey = computeDedupKey(normalizedUrl);

  try {
    const result = await kvUpsertCard(dedupKey, card);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
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

  // Rate limit (재추출은 외부 fetch 필요해서 보수적)
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    limit: 5,
    windowSec: 60,
    keyPrefix: "ratelimit:refresh",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `잠시만요. 짧은 시간에 요청이 많아 ${rl.resetSeconds}초 후 다시 시도 부탁드립니다.`,
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

    const card = composeCard({ urlResult });
    await kvUpsertCard(id, card);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    revalidatePath(`/${id}`);
    log.info("refreshCardActionDirect", "success", { id: id.slice(0, 8), domain: urlResult.domain });
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
    limit: 5,
    windowSec: 60,
    keyPrefix: "ratelimit:refresh",
  });
  if (!rl.allowed) {
    return {
      ok: false,
      error: `잠시만요. 짧은 시간에 요청이 많아 ${rl.resetSeconds}초 후 다시 시도 부탁드립니다.`,
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

    // 새 카드 데이터 생성 → 같은 dedup key로 upsert (createdAt 보존)
    const card = composeCard({ urlResult });
    await kvUpsertCard(id, card);
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    revalidatePath(`/${id}`);
    log.info("refreshCardAction", "success", { id: id.slice(0, 8), domain: urlResult.domain });
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
  if (password !== ADMIN_PASSWORD) {
    log.warn("refreshAllAction", "wrong password");
    return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  }
  if (!isKvConfigured()) return { ok: false, error: "저장소가 설정되지 않았습니다." };

  // Rate limit (offset 0인 시작점만 체크 — 후속 배치는 같은 작업)
  if (offset === 0) {
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
  if (!detail) return "URL에서 본문을 가져올 수 없습니다. 공개 페이지인지 확인해주세요.";
  if (/^JS_CHALLENGE/.test(detail))
    return "이 사이트는 JavaScript 챌린지로 자동 추출이 차단됩니다 (예: rf.gd 등 무료 호스팅). 다음 단계에서 표시되는 [수동 입력] 폼으로 소개를 직접 작성할 수 있습니다.";
  if (/^EMPTY_CONTENT/.test(detail))
    return "페이지에서 본문을 찾을 수 없습니다. 다른 URL을 시도하거나 [수동 입력]을 사용하세요.";
  if (/^FORBIDDEN_(401|403)/.test(detail)) return "해당 사이트가 자동 접근을 차단합니다. 로그인 필요한 페이지는 지원하지 않습니다.";
  if (/^NOT_FOUND_404/.test(detail)) return "페이지를 찾을 수 없습니다. URL을 확인해주세요.";
  if (/^RATE_LIMITED_429/.test(detail)) return "요청이 일시 제한되었습니다. 잠시 후 다시 시도해주세요.";
  if (/^SERVER_ERROR_/.test(detail)) return "원본 사이트에 오류가 발생했습니다.";
  if (/^TIMEOUT/.test(detail))
    return "응답이 너무 느려 자동 추출이 시간 안에 완료되지 못했습니다. 다음 단계에서 표시되는 [수동 입력] 폼으로 소개를 직접 작성할 수 있습니다.";
  if (/^WRONG_CONTENT_TYPE/.test(detail)) return "HTML 페이지가 아닙니다.";
  return "URL에서 본문을 가져올 수 없습니다.";
}
