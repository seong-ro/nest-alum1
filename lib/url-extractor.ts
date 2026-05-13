/**
 * 주어진 URL에서 에디토리얼 카드 작성에 필요한 원본 텍스트를 추출한다.
 *
 * v1.5 강화 포인트:
 *   - JSON-LD script[type='application/ld+json']를 stripBoilerplate 전에 먼저 추출
 *   - __NEXT_DATA__ 스크립트에서 Next.js 초기 props 파싱
 *   - H2/H3 뒤 형제 요소를 2개 → 5개로 확대
 *   - <li> 최소 길이 25 → 20 (한국어 대응)
 *   - <div>/<dl>/<dt>/<dd>/<strong>을 포함한 폭넓은 텍스트 수집
 *   - 랜딩페이지 특유의 "hero + 가격표" 패턴 특화 처리
 *   - 다중 소스 결과를 중복 제거 후 길이순 우선 병합
 */

import * as cheerio from "cheerio";
import { createDecipheriv } from "node:crypto";
import type { UrlExtractResult } from "./types";
import { log } from "./logger";
import { sanitizeKoreanFooterNoise, isCleanDescriptionText } from "./sanitize";

// 실제 브라우저 UA — 2026.05 최신 Chrome (한국 사용자 fingerprint).
// imweb·Wix 등 빌더 사이트가 Vercel/AWS server IP를 봇으로 인식하지 않도록
// 가능한 한 정상 사용자처럼 보이는 헤더 세트.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 9000;

// 일부 사이트(네이버 뉴스 포함)는 Referer가 있어야 응답
function inferReferer(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/`;
  } catch {
    return "https://www.google.com/";
  }
}

// v2.33.0: 정상 브라우저 fingerprint 헤더 세트 — 빌더 사이트 봇 차단 우회
function buildBrowserHeaders(url: string): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    // v2.33.0: brotli 제거 — 일부 환경에서 자동 해제 실패 → cheerio 파싱 깨짐
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    DNT: "1",
    Referer: inferReferer(url),
    "Sec-Ch-Ua":
      '"Chromium";v="135", "Not_A Brand";v="24", "Google Chrome";v="135"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
}

// v2.42.0: 정부·공공 사이트는 봇 차단을 종종 적용하지만 Googlebot은 화이트리스트.
// 일반 브라우저 UA로 차단(403/401)되면 Googlebot UA로 1회 재시도.
const GOOGLEBOT_USER_AGENT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// v2.42.0: Googlebot도 차단되면 Bingbot으로 한 번 더 시도 (일부 사이트는 Googlebot은
// 차단해도 Bingbot은 허용)
const BINGBOT_USER_AGENT =
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";

function buildGooglebotHeaders(url: string): Record<string, string> {
  return {
    "User-Agent": GOOGLEBOT_USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate",
    From: "googlebot(at)googlebot.com",
    Referer: inferReferer(url),
  };
}

function buildBingbotHeaders(url: string): Record<string, string> {
  return {
    "User-Agent": BINGBOT_USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate",
    From: "bingbot(at)microsoft.com",
    Referer: inferReferer(url),
  };
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      redirect: "follow",
      headers: buildBrowserHeaders(url),
      signal: controller.signal,
    });

    // v2.42.0: 403/401 응답 시 Googlebot UA로 1회 재시도 (정부·공공 사이트 우회)
    // 한국 공공 사이트(.go.kr·.or.kr 등)는 종종 일반 봇 차단하지만 Googlebot은 허용.
    // 단, 같은 URL로만 재시도 (HTTPS 자동 redirect는 그대로 따름).
    if (!res.ok && (res.status === 403 || res.status === 401)) {
      log.info("fetchHtml", "retry-with-googlebot", {
        url,
        firstStatus: res.status,
      });
      // 새 controller로 재시도 (timeout은 합쳐서 사용)
      const retryController = new AbortController();
      const retryT = setTimeout(() => retryController.abort(), 4000); // 4초 추가 timeout
      try {
        const retryRes = await fetch(url, {
          redirect: "follow",
          headers: buildGooglebotHeaders(url),
          signal: retryController.signal,
        });
        if (retryRes.ok) {
          log.info("fetchHtml", "googlebot-retry-success", { url });
          res = retryRes;
        } else {
          log.info("fetchHtml", "googlebot-retry-failed", {
            url,
            retryStatus: retryRes.status,
          });
          // v2.42.0: Googlebot도 차단되면 Bingbot으로 한 번 더 시도
          // 일부 사이트는 Googlebot 차단하지만 Bingbot은 허용
          const bingController = new AbortController();
          const bingT = setTimeout(() => bingController.abort(), 4000);
          try {
            const bingRes = await fetch(url, {
              redirect: "follow",
              headers: buildBingbotHeaders(url),
              signal: bingController.signal,
            });
            if (bingRes.ok) {
              log.info("fetchHtml", "bingbot-retry-success", { url });
              res = bingRes;
            } else {
              log.info("fetchHtml", "bingbot-retry-failed", {
                url,
                bingStatus: bingRes.status,
              });
            }
          } catch (bingErr) {
            log.info("fetchHtml", "bingbot-retry-error", {
              url,
              error: bingErr instanceof Error ? bingErr.message : String(bingErr),
            });
          } finally {
            clearTimeout(bingT);
          }
        }
      } catch (retryErr) {
        log.info("fetchHtml", "googlebot-retry-error", {
          url,
          error: retryErr instanceof Error ? retryErr.message : String(retryErr),
        });
        // 재시도 실패해도 원래 응답 사용
      } finally {
        clearTimeout(retryT);
      }
    }

    if (!res.ok) {
      // 상세한 에러 메시지 — 사용자가 원인을 파악하도록
      if (res.status === 403 || res.status === 401) {
        throw new Error(
          `FORBIDDEN_${res.status}: 해당 사이트가 자동 접근을 차단했습니다 (${res.status})`,
        );
      }
      if (res.status === 404) {
        throw new Error(`NOT_FOUND_404: 페이지를 찾을 수 없습니다`);
      }
      if (res.status === 429) {
        throw new Error(
          `RATE_LIMITED_429: 요청이 많아 일시 거부되었습니다. 잠시 후 다시 시도하세요`,
        );
      }
      if (res.status >= 500) {
        throw new Error(`SERVER_ERROR_${res.status}: 원본 서버 오류 (${res.status})`);
      }
      throw new Error(`HTTP_${res.status}: ${res.statusText}`);
    }

    const ct = res.headers.get("content-type") ?? "";
    const html = await res.text();

    // v2.42.0: 매우 작은 응답(< 200byte)은 봇 차단/방화벽 거부 응답일 가능성 높음.
    // 예: kodit.or.kr 같은 정부 사이트가 "Host not in allowlist" 21byte 응답.
    // HTML이 아닌 일반 텍스트로 짧게 거부 메시지를 반환하는 케이스.
    const trimmedLen = html.trim().length;
    if (trimmedLen < 200 && !/^<!doctype html|<html|<head/i.test(html.trim().slice(0, 100))) {
      throw new Error(
        `BLOCKED_TINY_RESPONSE_${trimmedLen}: 사이트가 매우 짧은 응답(${trimmedLen}byte)을 반환했습니다 — 봇 차단 또는 방화벽 거부 가능성`,
      );
    }

    // Content-Type이 명시되지 않았거나 애매해도 body가 HTML처럼 보이면 수용
    const isHtmlLike = /^<!doctype html|<html|<head|<body/i.test(html.trim().slice(0, 500));
    if (!/text\/html|application\/xhtml|application\/xml/i.test(ct) && !isHtmlLike) {
      throw new Error(`WRONG_CONTENT_TYPE: HTML이 아닙니다 (${ct || "unknown"})`);
    }

    return { html, finalUrl: res.url || url };
  } catch (err) {
    // AbortError 구분
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`TIMEOUT: ${FETCH_TIMEOUT_MS}ms 내에 응답을 받지 못했습니다`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

/**
 * 짧은 timeout fetcher (5초) — 수동 입력 모달의 메타 미리 가져오기용.
 * 사용자가 이미 자동 추출이 timeout으로 실패한 후 수동 입력 모달이 뜨므로,
 * 메타 fetch도 timeout 가능성 높음. 5초 안에 응답 없으면 빠르게 포기하고
 * 도메인 기반 기본값으로 모달이 열리도록 하여 UX 멈춤 방지.
 */
async function fetchHtmlShort(url: string): Promise<{ html: string; finalUrl: string }> {
  const SHORT_TIMEOUT = 5000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SHORT_TIMEOUT);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: buildBrowserHeaders(url),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`TIMEOUT_SHORT: ${SHORT_TIMEOUT}ms`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

type CheerioAPI = ReturnType<typeof cheerio.load>;
type CheerioSelection = ReturnType<CheerioAPI>;

// ---------------------------------------------------------------------------
// 사전 추출: stripBoilerplate 전에 해야 하는 script 기반 데이터
// ---------------------------------------------------------------------------

interface StructuredSnippets {
  texts: string[];
}

/**
 * schema.org address 필드를 단일 문자열로 정규화
 * - 문자열이면 그대로
 * - PostalAddress 객체면 streetAddress · addressLocality · addressRegion 등 결합
 */
function extractAddressFromSchema(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const s = value.replace(/\s+/g, " ").trim();
    return s.length >= 5 ? s : null;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const r = extractAddressFromSchema(v);
      if (r) return r;
    }
    return null;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    // PostalAddress 우선 처리
    const parts = [
      o.addressCountry,
      o.addressRegion,        // 시·도
      o.addressLocality,      // 시·군·구
      o.streetAddress,        // 도로명+번지
      o.postOfficeBoxNumber,
      o.postalCode,
    ]
      .filter((v) => typeof v === "string" && v.length > 0)
      .map((v) => String(v).trim());
    if (parts.length > 0) {
      const joined = parts.join(" ");
      // 한국 주소 마커가 있으면 채택
      if (/(?:[가-힣]+(?:시|군|구|읍|면|동|로|길)|\d+번지)/.test(joined)) {
        return joined;
      }
      // 영문 주소 (Korea·KR 포함)는 그대로
      if (/Korea|KR|한국/i.test(joined)) {
        return joined;
      }
    }
    // name 필드라도 있으면 사용
    if (typeof o.name === "string" && o.name.length >= 10) {
      return String(o.name).trim();
    }
  }
  return null;
}

function extractStructuredData($: CheerioAPI): StructuredSnippets {
  const texts: string[] = [];

  // 1) JSON-LD (schema.org)
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const txt = $(el).text();
      if (!txt) return;
      const data = JSON.parse(txt);
      const items = Array.isArray(data) ? data : data?.["@graph"] ?? [data];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        for (const key of ["description", "abstract", "articleBody", "headline", "name"]) {
          const v = (item as Record<string, unknown>)[key];
          if (typeof v === "string") {
            const s = v.replace(/\s+/g, " ").trim();
            if (s.length >= 15) texts.push(s);
          }
        }
        // ── schema.org address 추출 (Organization·LocalBusiness·Person·Place) ──
        // PostalAddress 객체 또는 문자열 모두 처리
        const addrField = (item as Record<string, unknown>).address;
        const addrText = extractAddressFromSchema(addrField);
        if (addrText) {
          texts.push(`주소: ${addrText}`);  // 라벨 동반으로 contact-info.ts에 전달
        }
        // ── ContactPoint 안의 주소도 ──
        const cp = (item as Record<string, unknown>).contactPoint;
        if (cp && typeof cp === "object") {
          const cps = Array.isArray(cp) ? cp : [cp];
          for (const c of cps) {
            const a = extractAddressFromSchema(
              (c as Record<string, unknown>)?.address,
            );
            if (a) texts.push(`주소: ${a}`);
          }
        }
        // telephone·email도 활용 (contact-info.ts가 받아서 처리)
        const tel = (item as Record<string, unknown>).telephone;
        if (typeof tel === "string" && tel.length >= 8) {
          texts.push(`Tel: ${tel}`);
        }
        const email = (item as Record<string, unknown>).email;
        if (typeof email === "string" && email.includes("@")) {
          texts.push(`Email: ${email}`);
        }
      }
    } catch {
      // 무시
    }
  });

  // 2) Next.js __NEXT_DATA__ 초기 props
  const nextDataScript = $("#__NEXT_DATA__").text();
  if (nextDataScript) {
    try {
      const data = JSON.parse(nextDataScript);
      const bag = data?.props?.pageProps ?? data?.props ?? {};
      collectStringsFromObject(bag, texts, 0);
    } catch {
      // 무시
    }
  }

  // 3) 기타 application/json 스크립트 (Remix, Gatsby 등)
  $("script[type='application/json']").each((_, el) => {
    const id = ($(el).attr("id") ?? "").toLowerCase();
    // __NEXT_DATA__는 위에서 처리됨. 너무 큰 데이터는 스킵.
    if (id === "__next_data__") return;
    try {
      const txt = $(el).text();
      if (!txt || txt.length > 100_000) return;
      const data = JSON.parse(txt);
      collectStringsFromObject(data, texts, 0);
    } catch {
      // 무시
    }
  });

  // ─── footer / role="contentinfo" 한국 주소 사전 수집 ───
  // stripBoilerplate가 footer·contentinfo·aside를 통째 제거하기 전에
  // 한국 주소 라인을 미리 추출해 본문에 포함시켜야 함.
  // (water-ria.vercel.app 같은 사이트는 footer에만 주소 정보 있음)
  const KOREAN_PROVINCES_RE_EARLY =
    /(?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원(?:도|특별자치도)|충청(?:북도|남도)|전라(?:북도|남도|북특별자치도)|경상(?:북도|남도)|제주특별자치도|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/;
  const ADDRESS_MARKER_RE_EARLY =
    /(?:[가-힣]+(?:시|군|구|읍|면|동|로|길)|\d+번지|\d+호|\d+층|빌딩|타워|센터|아파트|오피스텔|상가|캠퍼스타운|단지|지구|벨리|밸리|블록)/;

  // (a) footer/contact 영역 셀렉터에서 자식까지 검사
  $(
    "footer, [role='contentinfo'], aside, " +
    "[class*='footer'], [class*='Footer'], " +
    "[class*='address'], [class*='Address'], " +
    "[class*='location'], [class*='Location'], " +
    "[class*='contact'], [class*='Contact'], " +
    "[id*='footer'], [id*='address'], [id*='location'], [id*='contact']"
  ).each((_, el) => {
    // 자식 요소 단위로도 검사 (긴 footer 안의 짧은 주소 라인 추출)
    const elements = [el, ...$(el).find("p, div, li, span, address, dd, td").toArray()];
    for (const elem of elements) {
      const text = $(elem).text().replace(/\s+/g, " ").trim();
      if (!text || text.length < 10 || text.length > 500) continue;
      if (!KOREAN_PROVINCES_RE_EARLY.test(text)) continue;
      if (!ADDRESS_MARKER_RE_EARLY.test(text)) continue;
      texts.push(text);
    }
  });

  // (b) body 전체 fallback — 어떤 마크업이든 한국 주소 패턴 가진 텍스트 발견 시 수집
  // water-ria.vercel.app처럼 footer/contentinfo가 아닌 일반 div에 주소가 있어도 잡힘
  // 본문 잡음은 contact-info의 isValidKoreanAddress가 차단
  $("p, div, li, dd, span, address, td, h1, h2, h3, h4, h5, h6").each((_, el) => {
    const $el = $(el);
    // 자식 컨테이너가 너무 많으면 스킵 (큰 컨테이너의 text() 합산은 부정확)
    const containerChildren = $el.children().filter("p, div, li, ul, ol, section, article, footer").length;
    if (containerChildren > 2) return;
    const text = $el.text().replace(/\s+/g, " ").trim();
    if (!text || text.length < 10 || text.length > 300) return;
    if (!KOREAN_PROVINCES_RE_EARLY.test(text)) return;
    if (!ADDRESS_MARKER_RE_EARLY.test(text)) return;
    // 본문 서술어 종결은 차단 (오인식 방지)
    if (/(?:합니다|입니다|됩니다|있습니다)\.?$/.test(text)) return;
    texts.push(text);
  });

  // (c) DOM 무관 최종 fallback — body.text() 전체 평문에서 한국 주소 정규식 직접 매치
  // cheerio 셀렉터가 어떤 이유로든 못 잡아도 body 안에 한국 주소가 있으면 반드시 발견
  // (water-ria.vercel.app처럼 Next.js Suspense/RSC 경계, 동적 className,
  //  br 태그 처리 등 어떤 마크업 변형에도 안전)
  // 본문 잡음은 contact-info의 isValidKoreanAddress가 2단계 검증
  const PROVINCES_FOR_BODY = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
    "대전광역시", "울산광역시", "세종특별자치시",
    "경기도", "강원도", "강원특별자치도",
    "충청북도", "충청남도", "충북", "충남",
    "전라북도", "전라남도", "전북특별자치도", "전북", "전남",
    "경상북도", "경상남도", "경북", "경남",
    "제주특별자치도", "제주도",
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "제주",
  ];
  const provincePatternBody = PROVINCES_FOR_BODY.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  if (bodyText) {
    // 다중 위치 패턴: 광역시·도 + 구분자(· │ |) + 다른 광역시·도
    // (water-ria 4사이트의 핵심 패턴)
    const multiLocRe = new RegExp(
      `(?:${provincePatternBody})[^\\n]{0,150}?[\\u00B7\\u2502|][^\\n]{0,100}?(?:${provincePatternBody})[^\\n]{0,80}`,
      "g",
    );
    const multiMatches = [...bodyText.matchAll(multiLocRe)];
    // 가장 긴 3개 매치만 (잡음 방지)
    const sortedMulti = multiMatches
      .map((m) => m[0])
      .sort((a, b) => b.length - a.length)
      .slice(0, 3);
    for (const m of sortedMulti) {
      if (!texts.some((t) => t.includes(m.slice(0, 30)))) {
        texts.push(m);
      }
    }

    // 단일 주소 패턴: 광역시·도 + 행정구역 마커 (시·군·구·로·길·번지·캠퍼스타운)
    const singleAddrRe = new RegExp(
      `(?:${provincePatternBody})[^\\n]{2,80}?(?:[가-힣]+(?:시|군|구|읍|면|동|로|길)|\\d+번지|\\d+호|\\d+층|빌딩|타워|센터|캠퍼스타운)`,
      "g",
    );
    const singleMatches = [...bodyText.matchAll(singleAddrRe)];
    const sortedSingle = singleMatches
      .map((m) => m[0])
      .filter((s) => s.length >= 10 && s.length <= 150)
      .filter((s) => !/(?:합니다|입니다|됩니다|있습니다)$/.test(s.trim()))
      .sort((a, b) => b.length - a.length)
      .slice(0, 5);
    for (const m of sortedSingle) {
      if (!texts.some((t) => t.includes(m.slice(0, 30)) || m.includes(t.slice(0, 30)))) {
        texts.push(m);
      }
    }
  }

  return { texts };
}

function collectStringsFromObject(
  obj: unknown,
  out: string[],
  depth: number,
): void {
  if (depth > 4) return; // 재귀 제한
  if (!obj) return;
  if (typeof obj === "string") {
    const s = obj.replace(/\s+/g, " ").trim();
    // 품질 있는 문장만: 20~400자, 한국어·영어 글자 비율 체크
    if (s.length >= 20 && s.length <= 400 && /[가-힣A-Za-z]/.test(s)) {
      // URL·코드·긴 영숫자 토큰이 대부분인 경우 제외
      const alphaRatio =
        (s.match(/[가-힣A-Za-z\s,.!?]/g)?.length ?? 0) / s.length;
      if (alphaRatio >= 0.7) {
        out.push(s);
      }
    }
    return;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) collectStringsFromObject(v, out, depth + 1);
    return;
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>))
      collectStringsFromObject(v, out, depth + 1);
  }
}

// ---------------------------------------------------------------------------
// 보일러플레이트 제거 (JSON-LD는 위에서 먼저 추출했으므로 여기서 삭제 OK)
// ---------------------------------------------------------------------------

function stripBoilerplate($: CheerioAPI): void {
  const SELECTORS = [
    "script", "style", "noscript", "template", "iframe",
    "nav", "header nav",
    "[role='navigation']", "[role='banner']",
    "[aria-hidden='true']",
    ".nav", ".navbar", ".menu", ".sidebar",
    ".cookie", ".cookies", ".consent", ".advert", ".ad", ".ads",
    ".social", ".share", ".related", ".recommend",
    ".breadcrumb", ".pagination",
    // footer · aside · [role='contentinfo']은 보존
    // (이미 PHASE 1의 extractStructuredData에서 한국 주소 사전 수집함)
    // 단, footer 안의 카피라이트/링크 모음만 제거
    "footer .copyright", "footer .links",
  ];
  for (const sel of SELECTORS) $(sel).remove();
}

// ---------------------------------------------------------------------------
// 본문 루트 선택
// ---------------------------------------------------------------------------

function pickArticleRoot($: CheerioAPI): CheerioSelection {
  // 뉴스 사이트 특화 셀렉터 우선 시도 (네이버·다음·주요 신문사 공통 패턴)
  const NEWS_SELECTORS = [
    "#newsct_article",         // 네이버 뉴스 (신형)
    "#articleBodyContents",    // 네이버 뉴스 (구형)
    "#dic_area",               // 네이버 뉴스 (본문 div)
    "#harmonyContainer",       // 다음 뉴스
    "#article_body",           // 여러 신문사
    ".article_body",
    ".article-body",
    ".news_content",
    "#articeBody",             // 조선일보 (오타 맞음)
    "[itemprop='articleBody']",
  ];
  for (const sel of NEWS_SELECTORS) {
    const node = $(sel).first();
    if (node.length && node.text().trim().length > 200) return node;
  }

  const article = $("article").first();
  if (article.length) return article;

  const main = $("main").first();
  if (main.length) return main;

  const roleMain = $("[role='main']").first();
  if (roleMain.length) return roleMain;

  let bestSelector = "body";
  let bestCount = 0;
  $("section, div").each((_, el) => {
    const node = $(el);
    const cnt = node.find("> p, > div > p, > ul > li, > ol > li").length;
    if (cnt > bestCount) {
      bestCount = cnt;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (el as any).attribs?.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cls = (el as any).attribs?.class;
      if (id) bestSelector = `#${id}`;
      else if (cls) bestSelector = `.${cls.split(/\s+/)[0]}`;
      else bestSelector = "body";
    }
  });
  if (bestCount >= 2 && bestSelector !== "body") {
    const sel = $(bestSelector).first();
    if (sel.length) return sel;
  }
  return $("body");
}

// ---------------------------------------------------------------------------
// 본문 단락 추출 (다단계 폴백)
// ---------------------------------------------------------------------------

function extractParagraphs(
  $: CheerioAPI,
  root: CheerioSelection,
): string[] {
  const ps: string[] = [];

  // 1단계: <p>, <li>, <dd>, <blockquote>
  root.find("p, li, dd, blockquote").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length >= 15 && text.length <= 800) ps.push(text);  // 20→15자로 완화
  });

  // 2단계: 랜딩페이지 대응 — 직접 텍스트를 가진 <div>, <span>, <section>
  if (ps.length < 12) {
    const fallbackSelectors = [
      "section > div", "div > div",
      "figcaption", "summary", "dt",
      "main > div", "article > div",
      "[class*='card'] > div", "[class*='feature'] > div",  // 카드 컴포넌트 대응
      "[class*='pricing'] > div", "[class*='step'] > div",  // 가격/단계 대응
    ];
    for (const sel of fallbackSelectors) {
      root.find(sel).each((_, el) => {
        const node = $(el);
        if (node.children().length > 4) return;
        if (node.find("p, li").length > 0) return;

        const text = node.text().replace(/\s+/g, " ").trim();
        if (text.length < 15 || text.length > 600) return;
        if (/^[A-Za-z0-9가-힣]{1,4}$/.test(text)) return;
        ps.push(text);
      });
    }
  }

  // 3단계: H2/H3 뒤 형제 요소까지 수집 (hero + 설명 블록 패턴)
  if (ps.length < 15) {
    root.find("h1, h2, h3, h4").each((_, el) => {
      let next = $(el).next();
      let collected = 0;
      while (next.length && collected < 8) {  // 5→8 형제로 확장
        const tag = next.prop("tagName")?.toLowerCase();
        if (tag && /^h[1-6]$/.test(tag)) break;
        const t = next.text().replace(/\s+/g, " ").trim();
        if (t.length >= 10 && t.length <= 500) {  // 15→10자
          ps.push(t);
          collected++;
        }
        next = next.next();
      }
    });
  }

  // 4단계: 짧은 텍스트 블록도 수집 (랜딩 페이지의 키 메시지) — 진짜 부족할 때만
  if (ps.length < 8) {
    root.find("div, span").each((_, el) => {
      const node = $(el);
      // 자식 요소 없이 직접 텍스트만 가진 노드만
      if (node.children().length > 0) return;
      const text = node.text().replace(/\s+/g, " ").trim();
      // 짧지만 의미 있는 메시지 (8~150자)
      if (text.length >= 8 && text.length <= 150) {
        // 단순 라벨/숫자/단어는 제외
        if (/^[\d.,]+$/.test(text)) return;  // 가격 숫자
        if (/^[\w가-힣]{1,5}$/.test(text)) return;  // 짧은 단어
        if (/^(home|menu|로그인|메뉴|닫기|검색)$/i.test(text)) return;
        ps.push(text);
      }
    });
  }

  // 5단계: ul/ol 안의 li를 더 적극적으로 (피처 리스트, 가격 항목)
  root.find("ul li, ol li").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length >= 8 && text.length <= 400) ps.push(text);
  });

  // 6단계: aria-label, title 속성도 수집 (CTA 버튼 등의 의미 있는 텍스트)
  root.find("[aria-label], [title]").each((_, el) => {
    const node = $(el);
    const aria = node.attr("aria-label") ?? "";
    const title = node.attr("title") ?? "";
    for (const text of [aria, title]) {
      const t = text.replace(/\s+/g, " ").trim();
      if (t.length >= 15 && t.length <= 300) ps.push(t);
    }
  });

  // 중복 제거: 시작 80자 기준 + 포함 관계 제거
  const seen = new Set<string>();
  let unique = ps.filter((p) => {
    const key = p.slice(0, 80).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 긴 문장이 짧은 문장을 포함하면 짧은 것 제거 (단, 짧은 게 명확한 단위면 보존)
  unique = unique.filter((shorter, i) => {
    if (shorter.length >= 120) return true;
    return !unique.some(
      (longer, j) => j !== i && longer.length > shorter.length + 30 && longer.includes(shorter),
    );
  });

  return unique;
}

// ---------------------------------------------------------------------------
// 헤딩 추출
// ---------------------------------------------------------------------------

function extractHeadings(
  $: CheerioAPI,
  root: CheerioSelection,
): string[] {
  const hs: string[] = [];
  root.find("h1, h2, h3, h4").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length >= 3 && t.length <= 120) hs.push(t);
  });
  root.find("[role='heading']").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length >= 3 && t.length <= 120) hs.push(t);
  });
  return [...new Set(hs)];
}

function absUrl(base: string, maybeRel?: string): string | undefined {
  if (!maybeRel) return undefined;
  try {
    return new URL(maybeRel, base).toString();
  } catch {
    return undefined;
  }
}

function getMeta($: CheerioAPI, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v =
      $(`meta[property='${k}']`).attr("content") ??
      $(`meta[name='${k}']`).attr("content");
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractFromUrl(rawUrl: string): Promise<UrlExtractResult> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const parsed = new URL(url);
  const fetchStartedAt = Date.now();
  const { html, finalUrl } = await fetchHtml(url);
  const fetchElapsedMs = Date.now() - fetchStartedAt;
  const htmlBytesSize = Buffer.byteLength(html, "utf8");
  const $ = cheerio.load(html);

  const htmlLang = $("html").attr("lang") ?? "";

  // 메타 (head는 stripBoilerplate에 영향받지 않지만 순서상 먼저)
  const title =
    getMeta($, "og:title", "twitter:title") ??
    $("title").first().text().trim() ??
    "";

  // v2.28.0 / v2.34.0: 각 description 소스를 별도로 보존 — 디버그·composeCard fallback용.
  // 일부 사이트(imweb 테마 등)는 og:description은 깔끔하지만 meta description에
  // 회사 정보가 들어가 있는 경우가 있음. 모든 소스를 raw로 보존.
  //
  // v2.34.0: 다양한 selector 변형 시도 — 일부 사이트는 비표준 속성 사용
  //   - meta[property="og:description"] (표준)
  //   - meta[name="og:description"] (잘못 작성된 케이스)
  //   - 대소문자 변형은 cheerio가 자동 처리
  function getMetaContent(...selectors: string[]): string {
    for (const sel of selectors) {
      const v = ($(sel).attr("content") ?? "").trim();
      if (v) return v;
    }
    return "";
  }

  const rawOgDescription = getMetaContent(
    'meta[property="og:description"]',
    'meta[name="og:description"]',
    'meta[property="OG:DESCRIPTION"]',
  );
  const rawTwitterDescription = getMetaContent(
    'meta[name="twitter:description"]',
    'meta[property="twitter:description"]',
  );
  const rawMetaDescription = getMetaContent(
    'meta[name="description"]',
    'meta[property="description"]',
    'meta[itemprop="description"]',
  );
  const rawMetaKeywords = getMetaContent(
    'meta[name="keywords"]',
    'meta[property="keywords"]',
    'meta[name="news_keywords"]',
  );

  const description =
    getMeta($, "og:description", "twitter:description", "description") ?? "";

  const ogImage = absUrl(
    finalUrl,
    getMeta($, "og:image", "og:image:url", "twitter:image"),
  );

  const siteName = getMeta($, "og:site_name", "application-name");
  const publishedTime = getMeta($, "article:published_time", "og:updated_time");
  const author = getMeta($, "article:author", "author");

  // v2.33.0: HTML 구조 진단 — 추출 실패 케이스 원인 파악용
  const metaTagCount = $("meta").length;
  const headChildrenCount = $("head").children().length;
  const scriptTagCount = $("script").length;
  const linkTagCount = $("link").length;
  const totalTextLen = $("body").text().replace(/\s+/g, " ").trim().length;
  const scriptByteLen = $("script")
    .toArray()
    .reduce((s, el) => s + ($(el).html()?.length ?? 0), 0);

  // v2.34.0: meta 태그 이름들 list — 사용자가 어떤 메타가 있는지 직접 확인
  const metaNamesList: string[] = [];
  $("meta").each((_, el) => {
    const $el = $(el);
    const name = ($el.attr("name") ?? $el.attr("property") ?? "").trim();
    if (name && metaNamesList.length < 30) {
      metaNamesList.push(name);
    }
  });

  // v2.28.0: 추출 직후 진단 로그 (Vercel function logs · "extractFromUrl raw-meta-snapshot")
  log.info("extractFromUrl", "raw-meta-snapshot", {
    domain: parsed.hostname,
    finalUrl,
    redirected: finalUrl !== url,
    htmlBytesSize,
    titleLen: title.length,
    rawOgDescriptionLen: rawOgDescription.length,
    rawTwitterDescriptionLen: rawTwitterDescription.length,
    rawMetaDescriptionLen: rawMetaDescription.length,
    rawMetaKeywordsLen: rawMetaKeywords.length,
    rawMetaKeywordsCount: rawMetaKeywords ? rawMetaKeywords.split(",").length : 0,
    h1Count: $("h1").length,
    h2Count: $("h2").length,
    h3Count: $("h3").length,
    h4Count: $("h4").length,
    h5Count: $("h5").length,
    h6Count: $("h6").length,
    pCount: $("p").length,
    // v2.33.0: HTML 구조 진단
    metaTagCount,
    headChildrenCount,
    scriptTagCount,
    linkTagCount,
    totalBodyTextLen: totalTextLen,
    scriptByteLen,
    scriptToHtmlRatio: htmlBytesSize > 0 ? Math.round((scriptByteLen / htmlBytesSize) * 100) : 0,
    hasOgImage: !!ogImage,
    htmlLang,
  });

  // PHASE 1: 구조화 데이터 추출 (script 제거 전에 먼저)
  const structured = extractStructuredData($);

  // PHASE 2: 보일러플레이트 제거 (이 시점에 script는 다 날아감)
  stripBoilerplate($);

  // PHASE 3: 본문 루트 선택 후 paragraph / heading 추출
  const root = pickArticleRoot($);
  const htmlParagraphs = extractParagraphs($, root);
  const headings = extractHeadings($, root);

  // PHASE 4: 다중 소스 병합
  //   우선순위: HTML paragraphs → JSON-LD / __NEXT_DATA__ 텍스트 → description → 긴 headings
  const merged: string[] = [...htmlParagraphs];

  // v2.38.0: 추출 단계 가시성 — 함수 전체 스코프에서 추적
  let bruteForceTriggered = false;
  let bruteForceAddedFinal = 0;
  // v2.39.0: trigger 진단 — outer if 진입 여부 + 빌더 시그니처 추적
  let needsEnrichmentFinal = false;
  let builderSignatureFinal: string | null = null;
  let finalUrlHostFinal = "";

  // JSON-LD + __NEXT_DATA__ 텍스트 중 HTML에 없는 것만 추가
  for (const s of structured.texts) {
    if (!merged.some((m) => m.includes(s) || s.includes(m))) {
      merged.push(s);
    }
  }

  // description (첫 paragraph에 포함 안 됐으면 맨 앞에 삽입)
  const d = description.trim();
  if (d.length >= 20 && !merged.some((p) => p.includes(d.slice(0, 40)))) {
    merged.unshift(d);
  }

  // heading 중 긴 문장 (문장성 있는 것) 승격
  if (merged.length < 10) {
    for (const h of headings) {
      if (h.length >= 25 && !merged.some((p) => p.includes(h))) {
        merged.push(h);
      }
    }
  }

  // ─── mailto: / tel: 링크 직접 수집 ───
  // <a href="mailto:info@example.com"> 같은 명시적 링크가 있으면 본문에 강제 포함
  // boilerplate 제거 단계에서 푸터 영역이 사라져도 컨택 정보는 보존
  const contactLines: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("mailto:")) {
      const addr = href.slice(7).split("?")[0].trim();
      if (addr && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(addr)) {
        contactLines.push(`Email: ${addr}`);
      }
    } else if (href.startsWith("tel:")) {
      const num = href.slice(4).trim();
      if (num && num.length >= 8) {
        contactLines.push(`Tel: ${num}`);
      }
    }
  });
  if (contactLines.length > 0) {
    // 중복 제거 후 본문 끝에 추가 (이미 본문에 같은 정보 있으면 후속 dedup이 정리)
    const uniqContact = Array.from(new Set(contactLines));
    for (const line of uniqContact) {
      if (!merged.some((p) => p.includes(line.split(":")[1].trim()))) {
        merged.push(line);
      }
    }
  }

  // ─── 한국 주소 패턴 명시 수집 ───
  // 광역시·도가 포함된 텍스트는 푸터에 있어도 컨택 정보로 본문에 강제 포함
  // boilerplate 제거가 누락하더라도 주소 정보는 보존
  const KOREAN_PROVINCES_RE =
    /(?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원(?:도|특별자치도)|충청(?:북도|남도)|전라(?:북도|남도|북특별자치도)|경상(?:북도|남도)|제주특별자치도|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/;
  const addressLines = new Set<string>();

  // (1) geo 메타 태그 — geo.placename, geo.region, geo.position
  // SEO·LocalBusiness 사이트에서 자주 사용. 명시적이라 신뢰도 높음
  const geoPlace = $('meta[name="geo.placename"]').attr("content")?.trim();
  const geoRegion = $('meta[name="geo.region"]').attr("content")?.trim();
  if (geoPlace && KOREAN_PROVINCES_RE.test(geoPlace)) {
    addressLines.add(`주소: ${geoPlace}`);
  }
  if (geoRegion && /KR/i.test(geoRegion)) {
    // KR-44 (울산), KR-11 (서울) 같은 ISO 코드는 그 자체로 주소가 아니지만
    // geo.placename 보강 정보로 활용 (현재는 무시 — placename 우선)
  }

  // (2) <address> HTML5 시맨틱 태그
  $("address").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text && text.length >= 10 && text.length <= 300) {
      addressLines.add(text);
    }
  });

  // (3) footer / [class*="address"] 등 주소가 있을 만한 요소 탐색
  // footer 자체가 길면 자식 요소(p·div·li·span)도 분할해서 검사
  // (water-ria.vercel.app처럼 footer에 Family Sites 링크 포함되면 500자 초과)
  const footerSelector =
    "footer, [class*='address'], [class*='Address'], [class*='location'], " +
    "[class*='Location'], [class*='contact'], [class*='Contact'], " +
    "[id*='address'], [id*='location'], [id*='contact']";

  function tryAddAddressFromElement(text: string) {
    if (!text || text.length < 10 || text.length > 500) return;
    if (!KOREAN_PROVINCES_RE.test(text)) return;
    // 이미 본문에 있으면 스킵
    if (merged.some((p) => p.includes(text.slice(0, 30)))) return;
    addressLines.add(text);
  }

  $(footerSelector).each((_, el) => {
    const node = $(el);
    // 전체 텍스트 시도
    const fullText = node.text().replace(/\s+/g, " ").trim();
    if (fullText.length <= 500) {
      tryAddAddressFromElement(fullText);
    }
    // 자식 요소 단위로도 시도 — 긴 footer 안의 짧은 주소 라인 추출
    node.find("p, div, li, span, address").each((_, child) => {
      const childNode = $(child);
      // 자식이 더 많은 children을 갖고 있으면 너무 큰 컨테이너 → skip
      if (childNode.children().length > 3) return;
      const text = childNode.text().replace(/\s+/g, " ").trim();
      tryAddAddressFromElement(text);
    });
  });

  // (4) 본문 어디든 광역시·도 + 시/구/동/로/길 패턴이 있으면 라인 단위로 추출
  $("p, li, dd, span, div").each((_, el) => {
    const node = $(el);
    if (node.children().length > 2) return;  // 단순 텍스트 노드만
    const text = node.text().replace(/\s+/g, " ").trim();
    if (!text || text.length < 10 || text.length > 200) return;
    if (!KOREAN_PROVINCES_RE.test(text)) return;
    // 시·군·구·로·길·번지 같은 한국 주소 마커 동반 시
    if (!/(?:시|군|구|읍|면|동|로|길|번지|호|층|빌딩|타워|센터)/.test(text)) return;
    // 본문 서술어 종결은 제외 (오인식 방지)
    if (/(?:합니다|입니다|됩니다|있습니다)\.?$/.test(text)) return;
    // 이미 본문에 있으면 스킵
    if (merged.some((p) => p.includes(text.slice(0, 30)))) return;
    addressLines.add(text);
  });

  for (const line of addressLines) {
    merged.push(line);
  }

  // ─── 추출 실패 감지: JS 챌린지 / 빈 콘텐츠 사이트 ───
  // InfinityFree(rf.gd, epizy.com 등 무료 호스팅), Cloudflare, DDoS-Guard 등은
  // <noscript>·aes.js·__test=cookie 등으로 봇을 차단해 본문 추출 불가
  const totalContent = merged.join(" ").length + title.length + description.length;
  const htmlLower = html.toLowerCase();
  const isJsChallenge =
    htmlLower.includes("aes.js") ||
    htmlLower.includes("__test=cookie") ||
    /<noscript[^>]*>[\s\S]*?(javascript|enable js|please enable)/i.test(html) ||
    htmlLower.includes("checking your browser") ||
    htmlLower.includes("just a moment") ||
    htmlLower.includes("challenge-platform") ||
    htmlLower.includes("ddos-guard") ||
    htmlLower.includes("infinityfree.net");

  if (isJsChallenge && totalContent < 200) {
    throw new Error(
      `JS_CHALLENGE: 이 사이트는 JavaScript 챌린지로 자동 추출을 차단합니다`,
    );
  }

  // 챌린지가 아니어도 본문이 너무 짧으면 사실상 빈 카드가 됨 → 거부
  if (merged.length === 0 && title.length === 0 && description.length === 0) {
    throw new Error(
      `EMPTY_CONTENT: 페이지에서 본문을 찾을 수 없습니다`,
    );
  }

  // ─── 본문 짧음 감지 → 메타 풍부 보강 + 하위 페이지 자동 fetch ───
  // 메인 페이지 본문이 짧거나 client-side routing SPA 사이트는
  //  (1) 메타 태그(keywords·og:tags·twitter·h1·h2)에 추가 정보가 있을 수 있음
  //  (2) /about · /vision · /company 등 하위 페이지에 본문이 따로 있을 수 있음
  // 두 보강 전략을 순차 적용
  const mainContentLen = merged.reduce((sum, p) => sum + p.length, 0);

  // v2.39.0: 진입 조건 확장 — 본문 글자 합계가 400+여도 단락 수가 적으면 진입.
  // 사용자 보고된 빌더 사이트의 빌더 사이트: 메뉴 텍스트("SNS 바로가기...회사 소개 제품 소개...")가
  // 한 단락에 통째로 들어가서 mainContentLen이 400+가 되지만, 진짜 본문은 거의 없음.
  // 이전(v2.38.0): mainContentLen < 400 → 메뉴가 길면 진입 못 해 walker 트리거 X
  // 이제: 본문이 빈약하거나, body 텍스트 풍부한데 단락 수 적으면 모두 진입
  const needsEnrichment =
    mainContentLen < 400 ||
    (totalTextLen > 50 * 1024 && merged.length < 5);
  needsEnrichmentFinal = needsEnrichment;

  if (needsEnrichment) {
    // (1) 메타 태그 풍부 보강 — SPA·짧은 본문 사이트 핵심
    // client-side routing SPA 사이트는 메타가 거의 유일한 정보원
    const metaParts: string[] = [];

    // og:description (description과 다를 때만)
    const ogDesc = ($('meta[property="og:description"]').attr("content") ?? "").trim();
    if (
      ogDesc &&
      ogDesc !== description &&
      ogDesc.length >= 15 &&
      ogDesc.length <= 400
    ) {
      metaParts.push(ogDesc);
    }

    // twitter:description
    const twDesc = ($('meta[name="twitter:description"]').attr("content") ?? "").trim();
    if (
      twDesc &&
      twDesc !== description &&
      twDesc !== ogDesc &&
      twDesc.length >= 15 &&
      twDesc.length <= 400
    ) {
      metaParts.push(twDesc);
    }

    // keywords (라벨 prefix로 본문에 추가 — 사용자가 키워드 빠르게 식별 가능)
    const keywords = ($('meta[name="keywords"]').attr("content") ?? "").trim();
    if (
      keywords &&
      keywords.length >= 3 &&
      keywords.length <= 300 &&
      !merged.some((p) => p.includes(keywords.slice(0, Math.min(20, keywords.length))))
    ) {
      metaParts.push(`키워드: ${keywords}`);
    }

    // article:tag (블로그·뉴스 사이트의 카테고리 태그)
    const articleTags = $('meta[property="article:tag"]')
      .map((_, el) => $(el).attr("content"))
      .get()
      .filter((t): t is string => Boolean(t && t.trim()));
    if (articleTags.length > 0) {
      const tagStr = articleTags.join(", ").slice(0, 200);
      if (!merged.some((p) => p.includes(tagStr.slice(0, 20)))) {
        metaParts.push(`태그: ${tagStr}`);
      }
    }

    // og:site_name (사이트명, lead snippet 후보)
    const ogSiteName = ($('meta[property="og:site_name"]').attr("content") ?? "").trim();
    if (
      ogSiteName &&
      ogSiteName.length >= 3 &&
      ogSiteName.length <= 80 &&
      ogSiteName !== title &&
      !merged.some((p) => p.includes(ogSiteName))
    ) {
      metaParts.push(ogSiteName);
    }

    // h1·h2·h3 텍스트 (헤딩이 본문 흐름에 의미 있는 정보 담고 있을 때)
    $("h1, h2, h3").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length < 5 || t.length > 200) return;
      // 이미 title 또는 description과 거의 같으면 skip
      if (title.includes(t) || description.includes(t)) return;
      if (metaParts.some((p) => p.includes(t.slice(0, 15)))) return;
      if (merged.some((p) => p.includes(t.slice(0, 15)))) return;
      metaParts.push(t);
    });

    // 메타 보강 — 메인 본문 뒤에 추가
    for (const p of metaParts) {
      if (!merged.some((m) => m.includes(p.slice(0, 25)) || p.includes(m.slice(0, 25)))) {
        merged.push(p);
      }
    }

    if (metaParts.length > 0) {
      log.info("extractFromUrl", "meta enriched", {
        domain: parsed.hostname,
        addedMeta: metaParts.length,
      });
    }

    // ─── v2.31.0~v2.34.0: brute force 본문 추출 — 빌더(imweb·Wix 등) 사이트 핵심 fix ───
    // imweb·Wix 같은 한국 웹빌더는 표준 의미론적 태그(h1·h2·p) 거의 안 쓰고
    // 본문을 div/span 안 일반 텍스트로 렌더링. cheerio가 단락을 거의 못 잡음.
    // 그러나 HTML 자체는 큼(> 50KB) — 콘텐츠는 있는데 추출이 실패한 케이스.
    //
    // 진단 신호 (v2.37.0 강화):
    //   - htmlBytes > 50KB AND merged < 3 AND afterMetaContentLen < 600
    //   - OR body 텍스트 > 10KB지만 paragraphs(merged) < 5
    //   - OR finalUrl이 알려진 빌더 호스팅 도메인 (imweb/wix 등 → 무조건 brute force)
    // 해결: 광범위 selector + img alt + noscript + itemprop + 작은 헤딩 + walker
    const afterMetaContentLen = merged.reduce((sum, p) => sum + p.length, 0);
    const isBuilderLikeSite =
      Buffer.byteLength(html, "utf8") > 50 * 1024 &&
      merged.length < 3 &&
      afterMetaContentLen < 600;
    const hasBodyTextButNoParagraphs =
      totalTextLen > 10 * 1024 && merged.length < 5;

    // v2.37.0: 빌더 호스팅으로 redirect된 사이트는 항상 brute force 적용
    // imweb은 표준 의미론적 태그를 거의 안 쓰므로 standard selector 결과가 부족함
    const BUILDER_DOMAIN_PATTERNS = [
      /\.imweb\.me$/i,
      /\.wix\.com$/i,
      /\.wixsite\.com$/i,
      /\.weebly\.com$/i,
      /\.squarespace\.com$/i,
      /\.cafe24app\.com$/i,
      /\.modoo\.at$/i,
      /\.tistory\.com$/i,
      /\.shopify\.com$/i,
      /\.framer\.app$/i,
      /\.notion\.site$/i,
      /\.webflow\.io$/i,
    ];
    let finalUrlHost = "";
    try {
      finalUrlHost = new URL(finalUrl).hostname.toLowerCase();
    } catch {
      /* ignore */
    }
    const isBuilderDomain = BUILDER_DOMAIN_PATTERNS.some((re) => re.test(finalUrlHost));

    // v2.39.0: HTML 시그니처로 빌더 사이트 감지 — 사용자 도메인(<example>.co.kr 등)으로
    // 호스팅된 imweb·Wix 사이트도 감지. cheerio로 가벼운 패턴 매칭.
    // imweb: <link href="...imweb.me/css">, <script src="...imweb">
    // Wix: <script src="static.wixstatic.com">, html data-wix-*
    // Squarespace: <link href="...squarespace.com">
    let builderSignature: string | null = null;
    if (!isBuilderDomain) {
      const htmlSample = html.slice(0, 50 * 1024); // 처음 50KB만 검사
      if (/imweb\.me|imweb-|imweb_/i.test(htmlSample)) builderSignature = "imweb";
      else if (/wixstatic\.com|wix\.com|data-wix/i.test(htmlSample)) builderSignature = "wix";
      else if (/squarespace\.com|squarespace-/i.test(htmlSample)) builderSignature = "squarespace";
      else if (/cafe24app\.com|cafe24\.com/i.test(htmlSample)) builderSignature = "cafe24";
    } else {
      // v2.40.0: finalUrlHost가 이미 빌더 도메인이면 어떤 빌더인지 표시
      if (/imweb\.me$/i.test(finalUrlHost)) builderSignature = "imweb (호스팅 도메인)";
      else if (/wix\.com$|wixsite\.com$/i.test(finalUrlHost)) builderSignature = "wix (호스팅 도메인)";
      else if (/squarespace\.com$/i.test(finalUrlHost)) builderSignature = "squarespace (호스팅 도메인)";
      else if (/cafe24app\.com$/i.test(finalUrlHost)) builderSignature = "cafe24 (호스팅 도메인)";
      else if (/modoo\.at$/i.test(finalUrlHost)) builderSignature = "modoo (호스팅 도메인)";
      else if (/tistory\.com$/i.test(finalUrlHost)) builderSignature = "tistory (호스팅 도메인)";
      else builderSignature = "builder (호스팅 도메인)";
    }
    builderSignatureFinal = builderSignature;
    finalUrlHostFinal = finalUrlHost;
    const forceBuilderExtract =
      (isBuilderDomain || builderSignature !== null) && totalTextLen > 5 * 1024;

    if (forceBuilderExtract) {
      log.info("extractFromUrl", "builder-detected", {
        domain: parsed.hostname,
        finalUrlHost,
        isBuilderDomain,
        builderSignature,
        totalTextLen,
      });
    }

    if (isBuilderLikeSite || hasBodyTextButNoParagraphs || forceBuilderExtract) {
      bruteForceTriggered = true;
      const bruteFound: string[] = [];

      // (a) noscript 안 SSR fallback 텍스트 — 빌더 사이트가 자주 사용
      $("noscript").each((_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t.length >= 30 && t.length <= 1000 && !/javascript|enable js/i.test(t)) {
          bruteFound.push(t);
        }
      });

      // (b) itemprop 마이크로데이터 — Schema.org 의미 마커
      $('[itemprop="description"], [itemprop="articleBody"], [itemprop="text"], [itemprop="abstract"]')
        .each((_, el) => {
          const t = $(el).text().replace(/\s+/g, " ").trim();
          if (t.length >= 30 && t.length <= 1000) bruteFound.push(t);
        });

      // (c) 공통 콘텐츠 selector — 빌더 사이트 공통 클래스 패턴
      // v2.33.0: imweb·네이버 스마트에디터·스마트스토어 등 한국 빌더 특화 selector 대폭 확장
      const builderSelectors = [
        // 일반 콘텐츠
        ".content", ".description", ".text-block", ".txt-area", ".content-text",
        ".cont", ".body-text", ".article-body", ".article-content",
        ".main-content", ".section-content", ".intro",
        // imweb 빌더 특화
        '[class*="text-block"]', '[class*="txt-block"]', '[class*="content-text"]',
        '[class*="description"]', '[class*="intro"]',
        '[class*="editor-area"]', '[class*="text-area"]',
        // 네이버 스마트에디터 (smartstore·블로그 등)
        ".se-text-paragraph", ".se-component", ".se-section",
        '[class*="se-text"]', '[class*="se-paragraph"]',
        // imweb 위젯 영역
        '[class*="imweb-text"]', '[class*="iw-content"]',
        // Wix
        '[class*="rich-text"]', '[data-testid*="text"]',
        // Squarespace
        '[class*="sqs-block-content"]',
        // Tistory·블로그
        ".tt_article_useless_p_margin", ".article_view",
      ];
      const seenLen = new Set<string>();
      for (const sel of builderSelectors) {
        try {
          $(sel).each((_, el) => {
            const t = $(el).text().replace(/\s+/g, " ").trim();
            // 길이 키로 dedup (정확한 텍스트 비교는 너무 비쌈)
            const key = `${t.length}:${t.slice(0, 30)}`;
            if (t.length >= 30 && t.length <= 800 && !seenLen.has(key)) {
              seenLen.add(key);
              bruteFound.push(t);
            }
          });
        } catch {
          // selector 파싱 에러 무시
        }
        if (bruteFound.length >= 8) break;
      }

      // (d) img alt 텍스트 — 빌더 사이트는 이미지에 대체 텍스트 자주 활용
      $("img[alt]").each((_, el) => {
        const alt = ($(el).attr("alt") ?? "").trim().replace(/\s+/g, " ");
        // 너무 짧거나 너무 일반적인 alt는 제외
        if (alt.length < 20 || alt.length > 300) return;
        if (/^(image|photo|picture|이미지|사진|로고|logo|아이콘|icon)$/i.test(alt)) return;
        if (!bruteFound.some((p) => p.includes(alt) || alt.includes(p.slice(0, 25)))) {
          bruteFound.push(alt);
        }
      });

      // (e) figcaption — 캡션 텍스트
      $("figcaption").each((_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t.length >= 20 && t.length <= 400) bruteFound.push(t);
      });

      // (f) v2.33.0: 작은 헤딩(h4·h5·h6) — imweb·빌더 사이트는 작은 헤딩을
      //     본문 강조 텍스트로 자주 사용 ("Read more", "Overturn the Value." 등)
      $("h4, h5, h6").each((_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t.length >= 10 && t.length <= 200) {
          if (!/^(menu|home|about|contact|login|sign in|search|read more|more)$/i.test(t)) {
            bruteFound.push(t);
          }
        }
      });

      // (g) v2.33.0: blockquote · q · cite — 인용 텍스트
      $("blockquote, q, cite").each((_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t.length >= 30 && t.length <= 600) bruteFound.push(t);
      });

      // (h) v2.33.0: <main> · <article> · <section> 안의 직접 자식 텍스트 노드
      //     상위 컨테이너 내부의 짧은 텍스트들이 단락처럼 보이는 케이스
      $("main, article, section").first().find("p, li").each((_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t.length >= 30 && t.length <= 800) {
          const exists = bruteFound.some((p) => p.includes(t.slice(0, 30)));
          if (!exists) bruteFound.push(t);
        }
      });

      // (i) ⭐ v2.34.0~v2.35.0: 다중 walker — 가장 강력한 fallback.
      //     imweb 같이 div 안 일반 텍스트로 본문을 렌더링하는 사이트 핵심 fix.
      //     body 텍스트가 풍부한데(136KB) paragraphs가 1개뿐인 케이스 직접 해결.
      //
      //     v2.35.0: 3가지 walker를 단계적으로 시도 (직접 자식 → leaf element → body 분할)
      const walkerTexts: string[] = [];
      const seenKeys = new Set<string>();
      function tryAddText(t: string) {
        if (t.length < 30 || t.length > 1000) return;
        if (!/[가-힣A-Za-z]/.test(t)) return;
        if (/^(menu|home|about|contact|login|sign in|search|회사 소개|제품 소개|공지사항|채용|MENU|HOME|지속가능경영|Sustainable Management|Read more|more)$/i.test(t)) return;
        const key = `${t.length}:${t.slice(0, 30)}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        walkerTexts.push(t);
      }

      // walker (1): 직접 자식 텍스트 노드 (자식 element 텍스트 제외)
      $("p, div, li, dd, span, address, td, h1, h2, h3, h4, h5, h6, blockquote").each((_, el) => {
        const $el = $(el);
        let directText = "";
        $el.contents().each((_, child) => {
          const c = child as { type?: string; data?: string };
          if (c.type === "text" && typeof c.data === "string") {
            directText += " " + c.data;
          }
        });
        const t = directText.replace(/\s+/g, " ").trim();
        tryAddText(t);
      });

      // walker (2): v2.35.0 ⭐ leaf element walker — 같은 종류 자식이 없는 leaf만 대상.
      // imweb은 텍스트를 <span>·<i>·<b>·<em>·<strong> 안에 넣는 경우가 많아 직접 자식
      // 텍스트로는 못 잡음. leaf element는 자식 element 없는 element이므로 그 element의
      // 모든 텍스트(자식 텍스트 노드 + inline element 안 텍스트)를 합쳐도 중복 X.
      //
      // 대상: div/p/li/h*/td/dd/blockquote 중 같은 종류 자식이 없는 것
      const leafTags = "div, p, li, h1, h2, h3, h4, h5, h6, td, dd, blockquote, address, article, section, aside, figure";
      $(leafTags).each((_, el) => {
        const $el = $(el);
        // 같은 종류의 자식 element 있으면 leaf 아님 (parent → 자식이 처리)
        if ($el.find(leafTags).length > 0) return;
        const t = $el.text().replace(/\s+/g, " ").trim();
        tryAddText(t);
      });

      // walker (3): v2.35.0 ⭐ body text 직접 분할 — 최후 fallback.
      // walker 1·2가 다 실패해도 body의 raw text를 줄바꿈/들여쓰기 기반으로 분할.
      // imweb이 콘텐츠를 비표준 element로 렌더링해서 selector로 못 잡혀도
      // body.text()는 모든 텍스트를 추출해줌.
      if (walkerTexts.length < 3) {
        const $bodyClone = $("body").clone();
        // nav/header/footer/script/style 제거 (메뉴·푸터 잡음 방지)
        $bodyClone
          .find('nav, header, footer, script, style, [role="navigation"], [class*="nav-"], [class*="-nav"], [id*="header"], [id*="footer"], [id*="menu"], [class*="header"], [class*="footer"], [class*="menu"]')
          .remove();
        const cleanBody = $bodyClone.text();
        // 줄바꿈·연속 공백·탭으로 단락 분리
        const rawBlocks = cleanBody.split(/\n{2,}|\s{4,}|\t{2,}|\r\n{2,}/);
        for (const block of rawBlocks) {
          const t = block.replace(/\s+/g, " ").trim();
          tryAddText(t);
          if (walkerTexts.length >= 30) break;
        }
      }

      // walker 결과를 bruteFound에 추가
      for (const t of walkerTexts) {
        bruteFound.push(t);
      }

      log.info("extractFromUrl", "walker-extracted", {
        domain: parsed.hostname,
        walkerCount: walkerTexts.length,
        bruteFoundTotal: bruteFound.length,
        firstSample: walkerTexts[0]?.slice(0, 60),
      });

      // 중복 제거 + merged에 병합 — sanitize 단계에서 푸터/메뉴는 따로 정제됨
      // v2.34.0: 한도 8→15 상향 (walker로 풍부하게 수집됐을 때 활용)
      let bruteAdded = 0;
      for (const t of bruteFound) {
        if (merged.some((m) => m.includes(t.slice(0, 30)) || t.includes(m.slice(0, 30)))) continue;
        if (metaParts.some((p) => p.includes(t.slice(0, 30)))) continue;
        merged.push(t);
        bruteAdded++;
        if (bruteAdded >= 15) break;
      }
      bruteForceAddedFinal = bruteAdded;

      if (bruteAdded > 0) {
        log.info("extractFromUrl", "brute-force-extracted", {
          domain: parsed.hostname,
          htmlBytesSize: Buffer.byteLength(html, "utf8"),
          mergedBefore: merged.length - bruteAdded,
          mergedAfter: merged.length,
          bruteAdded,
        });
      }
    }

    // (2) 하위 페이지 자동 fetch (메타 보강 후에도 짧으면)
    // ⚠️ Vercel Hobby plan 10초 server action timeout 안전성 보장:
    //    메인 fetch가 5초 이상 걸렸으면 sub-page fetch 시도 자체가 위험 → skip
    //    (sub-page fetch 3.5초 + 처리 시간 = timeout 초과 가능성)
    const afterMetaLen = merged.reduce((sum, p) => sum + p.length, 0);
    if (afterMetaLen < 400 && fetchElapsedMs < 5000) {
      const subpageContent = await tryFetchSubpages($, parsed, finalUrl, merged);
      if (subpageContent.length > 0) {
        for (const p of subpageContent) {
          if (!merged.some((m) => m.includes(p.slice(0, 30)) || p.includes(m.slice(0, 30)))) {
            merged.push(p);
          }
        }
        log.info("extractFromUrl", "subpages enriched", {
          domain: parsed.hostname,
          before: afterMetaLen,
          after: merged.reduce((sum, p) => sum + p.length, 0),
          addedParas: subpageContent.length,
        });
      }
    } else if (afterMetaLen < 400 && fetchElapsedMs >= 5000) {
      log.info("extractFromUrl", "subpage skipped (slow main fetch)", {
        domain: parsed.hostname,
        fetchElapsedMs,
      });
    }
  }

  // ─── v2.24.0 (2026-05): 한국 사이트 푸터·네비 보일러플레이트 정제 ───
  // imweb·grafolio·구형 한국 사이트 다수가 푸터에 사업자정보·약관·SNS 바로가기·
  // Copyright 등을 노출하면서 본문 추출에 잡음이 섞임. 모든 보강 단계가 끝난
  // 시점에 paragraphs 배열을 통째로 정제 (단락별 보일러플레이트 제거 + 메뉴
  // 라인 필터 + 반복 단문 압축 + 중복 단락 제거).
  const sanitizedParagraphs = sanitizeKoreanFooterNoise(merged);

  // v2.38.0: 추출 단계 가시성 — 디버그 패널에 노출용 sample 수집
  const rawParagraphSamples = merged.slice(0, 3).map((p) => p.slice(0, 80));
  const sanitizedRemovedSamples: string[] = [];
  for (const m of merged) {
    if (!sanitizedParagraphs.includes(m) && sanitizedRemovedSamples.length < 3) {
      sanitizedRemovedSamples.push(m.slice(0, 80));
    }
  }

  // v2.37.0: sanitize 단계 진단 — walker 결과가 sanitize에서 너무 공격적으로 제거되는지 추적
  if (merged.length >= 3 && sanitizedParagraphs.length < merged.length / 2) {
    log.info("extractFromUrl", "sanitize-aggressive", {
      domain: parsed.hostname,
      mergedCount: merged.length,
      sanitizedCount: sanitizedParagraphs.length,
      removedCount: merged.length - sanitizedParagraphs.length,
      firstRemovedSample: merged.find((m) => !sanitizedParagraphs.includes(m))?.slice(0, 80),
    });
  }

  // description도 품질 검증 — 푸터 흔적이 묻어있으면 빈 문자열로 (UI에서 첫
  // paragraph가 자동 fallback). 메타가 깔끔한 사이트는 그대로 통과, 일부 imweb
  // 통과, 일부 imweb 테마처럼 description에까지 잡음이 들어간 사이트만 차단.
  const cleanDescription = description.trim();
  const finalDescription =
    cleanDescription && isCleanDescriptionText(cleanDescription)
      ? cleanDescription.replace(/\s+/g, " ")
      : "";

  // ─── v2.26.0: meta keywords + article:tag 수집 ───
  // imweb·Wix 같은 SPA·웹빌더는 본문이 짧지만 keywords가 풍부한 케이스가 흔함
  // (예: 친환경 소재 회사 사이트의 "리사이클링, 생분해, 친환경 소재" 등). composeCard에서
  // keyPoints fallback 소스로 활용.
  const keywords: string[] = [];
  const metaKw = ($('meta[name="keywords"]').attr("content") ?? "").trim();
  if (metaKw) {
    metaKw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length >= 2 && k.length <= 50)
      .forEach((k) => {
        if (!keywords.includes(k)) keywords.push(k);
      });
  }
  $('meta[property="article:tag"]').each((_, el) => {
    const tag = $(el).attr("content")?.trim();
    if (tag && tag.length >= 2 && tag.length <= 50 && !keywords.includes(tag)) {
      keywords.push(tag);
    }
  });

  // ─── v2.26.0: 콘텐츠 풍부도 신호 ───
  // composeCard가 본문 부족 시 메타 보강 활성화 여부를 판단할 수 있도록 신호 전달.
  const totalBodyLen = sanitizedParagraphs.reduce((sum, p) => sum + p.length, 0);
  let contentSignal: "rich" | "thin" | "meta-only" = "rich";
  if (sanitizedParagraphs.length === 0 && (finalDescription || keywords.length > 0)) {
    contentSignal = "meta-only";
  } else if (totalBodyLen < 200 || sanitizedParagraphs.length < 2) {
    contentSignal = "thin";
  }

  if (sanitizedParagraphs.length !== merged.length || finalDescription !== cleanDescription) {
    log.info("extractFromUrl", "korean-footer-sanitized", {
      domain: parsed.hostname,
      before: merged.length,
      after: sanitizedParagraphs.length,
      descriptionFiltered: finalDescription === "" && cleanDescription !== "",
      contentSignal,
      keywordsCount: keywords.length,
    });
  }

  // ─── v2.32.0: 사용자 도메인 보존 — 빌더 호스팅 redirect 케이스 fix ───
  //
  // 사용자가 자기 도메인(`example.com` 등)으로 입력했는데 imweb·Wix 같은 빌더 호스팅으로
  // redirect되면 finalUrl이 빌더 도메인이 됨. 카드의 sourceUrl이 finalUrl을 쓰니
  // 사용자에게 빌더 호스팅 도메인이 노출됨 → 혼란.
  //
  // 또한 사용자가 빌더 도메인을 직접 입력해도 페이지의 <link rel="canonical">·og:url에
  // 정식 도메인이 있을 수 있음 (도메인 forwarding 설정된 빌더 사이트는 보통 canonical에
  // 사용자 도메인 명시).
  //
  // 우선순위:
  //   1. canonical / og:url 호스트가 빌더 호스팅 X면 사용 (사이트 정식 도메인)
  //   2. 입력 호스트가 빌더 호스팅 X 이고 final 호스트가 빌더 호스팅이면 입력 호스트
  //   3. 일반: 입력 호스트
  const BUILDER_HOSTING_PATTERNS: RegExp[] = [
    /\.imweb\.me$/i,
    /\.wix\.com$/i,
    /\.wixsite\.com$/i,
    /\.weebly\.com$/i,
    /\.squarespace\.com$/i,
    /\.cafe24app\.com$/i,
    /\.modoo\.at$/i,           // 네이버 modoo
    /\.tistory\.com$/i,
    /\.blog\.me$/i,
    /\.cyworld\.com$/i,
    /\.shopify\.com$/i,
    /\.framer\.app$/i,
    /\.notion\.site$/i,
    /\.webflow\.io$/i,
    /\.carrd\.co$/i,
    /\.bubbleapps\.io$/i,
    /\.glide\.app$/i,
  ];

  function isBuilderHosting(host: string): boolean {
    if (!host) return false;
    const h = host.toLowerCase();
    return BUILDER_HOSTING_PATTERNS.some((re) => re.test(h));
  }

  function tryParseHost(rawUrlOrPath: string, base: string): string | null {
    try {
      const u = new URL(rawUrlOrPath, base);
      // localhost·IP·내부 호스트 제외
      const h = u.hostname.replace(/^www\./, "").toLowerCase();
      if (!h || h === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
      if (h === parsed.hostname.replace(/^www\./, "").toLowerCase()) return h;
      // 도메인이 적어도 dot 1개 + 길이 4 이상이어야 정상
      if (!h.includes(".") || h.length < 4) return null;
      return h;
    } catch {
      return null;
    }
  }

  // canonical / og:url에서 호스트 추출
  const canonicalHref = ($('link[rel="canonical"]').attr("href") ?? "").trim();
  const ogUrlMeta = ($('meta[property="og:url"]').attr("content") ?? "").trim();
  const canonicalHost = canonicalHref ? tryParseHost(canonicalHref, finalUrl) : null;
  const ogUrlHost = ogUrlMeta ? tryParseHost(ogUrlMeta, finalUrl) : null;

  const inputHost = parsed.hostname.replace(/^www\./, "").toLowerCase();
  let finalUrlHost = inputHost;
  try {
    finalUrlHost = new URL(finalUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    /* ignore */
  }

  // 우선순위 결정
  let displayDomain = inputHost;
  let displayUrl = finalUrl;
  let domainResolveReason: string = "input";

  // 1순위: canonical / og:url에서 빌더 호스팅 X 호스트 발견
  const canonicalNonBuilder =
    canonicalHost && !isBuilderHosting(canonicalHost) ? canonicalHost : null;
  const ogUrlNonBuilder = ogUrlHost && !isBuilderHosting(ogUrlHost) ? ogUrlHost : null;
  const metaNonBuilder = canonicalNonBuilder || ogUrlNonBuilder;

  if (metaNonBuilder && metaNonBuilder !== inputHost) {
    // 입력과 다른 정식 도메인 발견 (사용자가 빌더 URL 입력 시 정식 사용자 도메인 추정)
    displayDomain = metaNonBuilder;
    // 같은 path 유지하되 호스트만 사용자 도메인으로
    try {
      const u = new URL(finalUrl);
      u.hostname = metaNonBuilder;
      u.protocol = "https:";  // 사용자 도메인은 보통 https
      displayUrl = u.toString();
    } catch {
      displayUrl = `https://${metaNonBuilder}/`;
    }
    domainResolveReason = canonicalNonBuilder ? "canonical" : "og-url";
  } else if (
    inputHost !== finalUrlHost &&
    isBuilderHosting(finalUrlHost) &&
    !isBuilderHosting(inputHost)
  ) {
    // 2순위: redirect 후 빌더 호스팅으로 갔는데 입력은 일반 도메인 → 입력 도메인 우선
    displayDomain = inputHost;
    displayUrl = rawUrl;
    domainResolveReason = "input-preserved-from-builder-redirect";
  } else {
    // 3순위: 일반 — input host 유지 (parsed.hostname과 같음)
    displayDomain = inputHost;
    displayUrl = finalUrl;
    domainResolveReason = "input";
  }

  if (domainResolveReason !== "input") {
    log.info("extractFromUrl", "user-domain-resolved", {
      rawUrl,
      finalUrl,
      inputHost,
      finalUrlHost,
      canonicalHost,
      ogUrlHost,
      isInputBuilder: isBuilderHosting(inputHost),
      isFinalBuilder: isBuilderHosting(finalUrlHost),
      displayDomain,
      displayUrl,
      reason: domainResolveReason,
    });
  }

  return {
    url: rawUrl,
    finalUrl: displayUrl,
    domain: displayDomain,
    title: title.replace(/\s+/g, " ").trim(),
    description: finalDescription,
    ogImage,
    siteName,
    lang: htmlLang,
    headings,
    paragraphs: sanitizedParagraphs,
    publishedTime,
    author,
    keywords: keywords.length > 0 ? keywords : undefined,
    contentSignal,
    // v2.28.0: 디버그·composeCard fallback용 raw 필드
    rawDescription: rawMetaDescription || undefined,
    rawOgDescription: rawOgDescription || undefined,
    rawTwitterDescription: rawTwitterDescription || undefined,
    rawMetaKeywords: rawMetaKeywords || undefined,
    htmlBytesSize,
    // v2.33.0: HTML 구조 진단
    metaTagCount,
    headChildrenCount,
    scriptTagCount,
    bodyTextLen: totalTextLen,
    scriptToHtmlRatio:
      htmlBytesSize > 0 ? Math.round((scriptByteLen / htmlBytesSize) * 100) : 0,
    // v2.34.0: meta 태그 이름들 list
    metaNamesList: metaNamesList.length > 0 ? metaNamesList : undefined,
    // v2.38.0: 추출 단계 가시성
    rawParagraphSamples: rawParagraphSamples.length > 0 ? rawParagraphSamples : undefined,
    sanitizedRemovedSamples: sanitizedRemovedSamples.length > 0 ? sanitizedRemovedSamples : undefined,
    bruteForceTriggered,
    bruteForceAddedCount: bruteForceAddedFinal,
    // v2.39.0: trigger 진단
    mainContentLen,
    needsEnrichment: needsEnrichmentFinal,
    builderSignature: builderSignatureFinal,
    finalUrlHost: finalUrlHostFinal,
  };
}

// ---------------------------------------------------------------------------
// 하위 페이지 자동 보강
// ---------------------------------------------------------------------------

/**
 * 메인 페이지 본문이 짧을 때 호출.
 * 1) 메인 페이지의 nav 링크에서 about/vision/company 등 키워드 매칭 후보 추출
 * 2) 표준 경로(/about, /vision, /company, ...) 폴백
 * 3) 후보 URL 최대 2개를 짧은 timeout으로 fetch하고 본문 추출
 * Vercel Hobby 10초 timeout 안전 — 메인 fetch 9초 + 하위 페이지 각 3초 (병렬 처리)
 */
async function tryFetchSubpages(
  $: CheerioAPI,
  baseUrl: URL,
  finalUrl: string,
  existingParagraphs: string[],
): Promise<string[]> {
  // 1) 메인 페이지 nav에서 후보 URL 발견
  const SUBPAGE_KEYWORDS_RE =
    /\b(?:about|about-us|aboutus|company|vision|mission|introduction|introduce|who-we-are|our-story|story|service|services|product|products|platform|business|sustainable|sustainability|csr|esg|소개|회사소개|비전|미션|회사|서비스|제품|사업|지속가능)\b/i;
  const KOREAN_KEYWORD_RE =
    /(?:소개|회사\s*소개|비전|미션|회사|서비스|제품|사업|어바웃|소개합니다|지속가능|지속\s*가능)/;

  // v2.36.0: 영문 nav 텍스트 라벨 매칭 — imweb 사이트는 숫자 경로(/42, /43) 사용해
  // path 매칭 안 되니 nav의 anchor 텍스트로 sub-page 발견. 영문/한글 라벨 모두 매칭.
  const NAV_LABEL_RE =
    /^(?:about(?:\s+us)?|company|introduction|introduce|story|our\s+story|who\s+we\s+are|vision|mission|profile|overview|ceo(?:'s)?\s+message|representative|products?|services?|business|solutions?|platforms?|sustainable\s+management|sustainability|esg|csr|회사\s*소개|회사소개|기업\s*소개|소개|비전|미션|대표\s*인사말|ceo\s*인사말|제품(?:\s*소개)?|서비스(?:\s*소개)?|사업\s*분야|사업영역|지속가능경영|지속가능)$/i;

  const candidates = new Set<string>();
  const candidatesWithLabel: { url: string; label: string }[] = [];

  // nav, header, footer의 a 링크 탐색 (먼저 시맨틱 영역)
  $("nav a, header a, footer a, [role='navigation'] a").each((_, el) => {
    if (candidates.size >= 8) return false;
    const href = $(el).attr("href");
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!href) return;
    try {
      const abs = new URL(href, finalUrl);
      // 같은 도메인만
      if (abs.hostname !== baseUrl.hostname) return;
      // 메인 페이지 자기 자신은 skip
      if (abs.pathname === "/" || abs.pathname === baseUrl.pathname) return;
      // 외부 파일(.pdf, .jpg 등) skip
      if (/\.(pdf|jpg|jpeg|png|gif|svg|mp4|zip|doc|docx)$/i.test(abs.pathname)) return;
      // hash·자바스크립트 link skip
      if (href.startsWith("#") || href.startsWith("javascript:")) return;

      // v2.36.0: 매칭 우선순위
      // (a) nav 텍스트가 라벨 매칭 — imweb 숫자 경로 케이스 (/42, /43, /35 등)
      // (b) URL path 키워드 매칭
      // (c) 한글 텍스트 키워드 매칭
      const labelMatch = NAV_LABEL_RE.test(text);
      const pathMatch = SUBPAGE_KEYWORDS_RE.test(abs.pathname);
      const koreanMatch = KOREAN_KEYWORD_RE.test(text);

      if (labelMatch || pathMatch || koreanMatch) {
        const url = abs.toString();
        if (!candidates.has(url)) {
          candidates.add(url);
          // 라벨 매칭이 가장 신뢰도 높음 (텍스트 의도가 명확)
          const score = labelMatch ? 3 : pathMatch ? 2 : 1;
          candidatesWithLabel.push({ url, label: `${text} [score=${score}]` });
        }
      }
    } catch {
      // invalid URL, ignore
    }
  });

  // 2) nav에서 못 찾으면 표준 경로 폴백 (imweb 같은 숫자 경로 사이트는 위에서 잡힘)
  if (candidates.size === 0) {
    const STANDARD_PATHS = [
      "/about",
      "/about-us",
      "/company",
      "/vision",
      "/introduction",
      "/service",
      "/products",
      "/소개",
    ];
    for (const path of STANDARD_PATHS) {
      try {
        const abs = new URL(path, `${baseUrl.protocol}//${baseUrl.host}`);
        candidates.add(abs.toString());
      } catch {
        // invalid, ignore
      }
      if (candidates.size >= 4) break;
    }
  }

  if (candidates.size === 0) return [];

  // 3) 최대 3개 후보를 병렬로 fetch (Vercel Hobby timeout 안전)
  // v2.36.0: 2개→3개로 확대 (라벨 매칭 신뢰도 높은 후보 더 활용)
  const top = Array.from(candidates).slice(0, 3);
  log.info("tryFetchSubpages", "trying", {
    domain: baseUrl.hostname,
    candidates: top,
    candidatesWithLabel: candidatesWithLabel.slice(0, 5),
  });

  const SUBPAGE_FETCH_TIMEOUT = 3500; // 3.5초씩 (총 7초 미만, 메인 fetch 후에도 timeout 안전)

  async function fetchSinglePage(url: string): Promise<string[]> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SUBPAGE_FETCH_TIMEOUT);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: buildBrowserHeaders(url),
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const ct = res.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml/i.test(ct)) return [];
      const html = await res.text();
      const sub$ = cheerio.load(html);

      // (1) 메타 태그 — paragraph 추출 전에 먼저 수집 (SPA여도 메타는 SSR될 수 있음)
      const metaCollected: string[] = [];
      const subTitle = sub$("title").text().replace(/\s+/g, " ").trim();
      const subDesc = (sub$('meta[name="description"]').attr("content") ?? "").trim();
      const subOgTitle = (sub$('meta[property="og:title"]').attr("content") ?? "").trim();
      const subOgDesc = (sub$('meta[property="og:description"]').attr("content") ?? "").trim();
      const subTwDesc = (sub$('meta[name="twitter:description"]').attr("content") ?? "").trim();
      // h1, h2도 수집
      const subH1 = sub$("h1").first().text().replace(/\s+/g, " ").trim();
      const subH2Texts = sub$("h2")
        .map((_, el) => sub$(el).text().replace(/\s+/g, " ").trim())
        .get()
        .filter((t) => t.length >= 5 && t.length <= 150)
        .slice(0, 3);

      for (const t of [subDesc, subOgDesc, subTwDesc, subOgTitle, subH1, ...subH2Texts]) {
        if (!t || t.length < 15 || t.length > 400) continue;
        if (subTitle === t) continue; // title과 같으면 skip
        if (metaCollected.some((m) => m.includes(t.slice(0, 25)) || t.includes(m.slice(0, 25)))) continue;
        metaCollected.push(t);
      }

      // (2) paragraph 추출
      stripBoilerplate(sub$);
      const subRoot = pickArticleRoot(sub$);
      const subParas = extractParagraphs(sub$, subRoot);
      const filteredParas = subParas
        .filter((p) => {
          if (p.length < 25 || p.length > 600) return false;
          if (/©|copyright|all rights reserved/i.test(p)) return false;
          if (/^[가-힣A-Za-z\s,·]+$/.test(p) && p.split(/[,\s·]+/).length < 5) return false;
          return true;
        })
        .slice(0, 6);

      // 메타 + paragraph 합산
      const collected = [...metaCollected];
      for (const p of filteredParas) {
        if (!collected.some((c) => c.includes(p.slice(0, 25)) || p.includes(c.slice(0, 25)))) {
          collected.push(p);
        }
      }
      return collected.slice(0, 8);
    } catch {
      return [];
    } finally {
      clearTimeout(t);
    }
  }

  // 병렬 fetch — Promise.allSettled로 실패한 것은 무시
  const results = await Promise.allSettled(top.map((url) => fetchSinglePage(url)));
  const collected: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const p of r.value) {
        // 메인 본문과 중복 안 되는 것만
        if (!existingParagraphs.some((m) => m.includes(p.slice(0, 30)) || p.includes(m.slice(0, 30)))) {
          collected.push(p);
        }
      }
    }
  }

  return collected;
}

// ---------------------------------------------------------------------------
// 폴백 힌트 추출 — JS 챌린지/EMPTY_CONTENT 사이트용
// 본문은 못 가져와도 head의 메타 태그·도메인·경로에서 가능한 단서를 모두 수집
// ---------------------------------------------------------------------------

export interface UrlFallbackHints {
  url: string;
  finalUrl: string;
  domain: string;
  /** 추정 헤드라인 — og:title || title || 도메인 정제 */
  suggestedHeadline: string;
  /** 추정 요약 — og:description || meta description */
  suggestedDek: string;
  /** 추정 본문 — description 긴 버전 + URL 단서 */
  suggestedBody: string;
  /** 추출 가능한 모든 메타 (디버그/추가 표시용) */
  rawMeta: {
    title?: string;
    ogTitle?: string;
    twitterTitle?: string;
    description?: string;
    ogDescription?: string;
    ogImage?: string;
    siteName?: string;
    keywords?: string;
    author?: string;
  };
}

/**
 * extractFromUrl이 실패한 URL에서 가능한 메타데이터만이라도 긁어옴.
 * 챌린지 페이지도 head 영역의 og:* 등은 보통 포함하고 있어 활용 가능.
 * 추가로 InfinityFree(rf.gd) 쿠키 챌린지는 자동 우회 시도.
 * 실패해도 throw하지 않고 도메인 기반 기본값을 반환.
 */
export async function extractFallbackHints(rawUrl: string): Promise<UrlFallbackHints> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const parsed = new URL(url);
  const domain = parsed.hostname.replace(/^www\./, "");

  // 도메인을 사람이 읽기 좋게 변환: water-ria.rf.gd → "Water Ria"
  const domainMain = domain.split(".")[0]; // water-ria
  const prettyDomain = domainMain
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" "); // Water Ria

  // TLD/호스팅 분류: rf.gd, epizy.com, infinityfreeapp.com → InfinityFree
  const isInfinityFree = /\.(rf\.gd|epizy\.com|infinityfreeapp\.com|42web\.io|wuaze\.com)$/i.test(domain);

  const fallback: UrlFallbackHints = {
    url: rawUrl,
    finalUrl: url,
    domain,
    suggestedHeadline: prettyDomain,
    suggestedDek: "",
    suggestedBody: `${prettyDomain}\n\n${domain}`,
    rawMeta: {},
  };

  // ─── HTML 가져오기 (필요 시 챌린지 우회 시도) ───
  // 메타만 가져오면 되므로 짧은 timeout(5초) — 수동 입력 모달이 빨리 뜨도록
  let html = "";
  let htmlAfterChallenge = "";

  try {
    const r = await fetchHtmlShort(url);
    html = r.html;
    fallback.finalUrl = r.finalUrl;
  } catch {
    // 첫 fetch도 실패 → 도메인 기반 기본값으로 종료
    return fallback;
  }

  // ─── InfinityFree 쿠키 챌린지 자동 우회 ───
  // 챌린지 HTML 안의 aes.js AES-128-CBC 암호 변수(a/b/c)를 정규식으로 추출 후
  // crypto 모듈로 정확히 복호화하여 __test 쿠키 생성. 두 번째 요청에 동봉하여
  // location.href 리다이렉트 대상으로 보내면 실제 페이지 HTML 수신 가능.
  const challengeCookie = extractChallengeCookie(html);
  if (isInfinityFree && challengeCookie) {
    try {
      htmlAfterChallenge = await fetchWithCookie(url, challengeCookie, html);
    } catch {
      // 우회 실패 — 챌린지 HTML로 진행
    }
  }

  // 우회 성공 시 그 HTML 우선 사용, 아니면 원본 챌린지 HTML
  const workingHtml = htmlAfterChallenge.length > html.length
    ? htmlAfterChallenge
    : html;

  // cheerio 로드
  let $: ReturnType<typeof cheerio.load>;
  try {
    $ = cheerio.load(workingHtml);
  } catch {
    return fallback;
  }

  // ─── 1. 메타 태그 (head 우선) ───
  const ogTitle = getMeta($, "og:title");
  const twitterTitle = getMeta($, "twitter:title");
  const titleTag = $("title").first().text().trim();
  const ogDescription = getMeta($, "og:description");
  const description = getMeta($, "description");
  const twitterDescription = getMeta($, "twitter:description");
  const ogImage = getMeta($, "og:image", "og:image:url", "twitter:image");
  const siteName = getMeta($, "og:site_name", "application-name");
  const keywords = getMeta($, "keywords");
  const author = getMeta($, "article:author", "author");

  fallback.rawMeta = {
    title: titleTag || undefined,
    ogTitle,
    twitterTitle,
    description,
    ogDescription,
    ogImage: absUrl(fallback.finalUrl, ogImage) ?? undefined,
    siteName,
    keywords,
    author,
  };

  // ─── 2. 헤드라인 결정 ───
  // og:title > twitter:title > <title> > h1 > 도메인 정제
  const firstH1 = $("h1").first().text().trim();
  const headline =
    ogTitle?.trim() ||
    twitterTitle?.trim() ||
    titleTag ||
    firstH1 ||
    prettyDomain;
  fallback.suggestedHeadline = headline.replace(/\s+/g, " ").trim();

  // ─── 3. 요약문(dek) 결정 ───
  const desc =
    ogDescription?.trim() ||
    twitterDescription?.trim() ||
    description?.trim() ||
    "";
  if (desc) {
    const firstSentence = desc.split(/(?<=[.!?。！？])\s/)[0] ?? desc;
    fallback.suggestedDek =
      firstSentence.length > 200 ? firstSentence.slice(0, 200) + "…" : firstSentence;
  }

  // ─── 4. 본문 — 다층 수집 ───
  // 4-1. og:description 전체 (가장 신뢰)
  // 4-2. <noscript> 안 텍스트 (JS 없이도 보이는 안내문)
  // 4-3. h1·h2·h3 모음
  // 4-4. <p> 단락 (챌린지 우회 성공 시 풍부)
  // 4-5. iframe src (다른 페이지로 안내하는 경우)
  // 4-6. 의미 있는 <a> 링크 라벨
  // 4-7. <img alt> 텍스트
  // 4-8. body 전체 텍스트 (마지막 폴백, script/style 제거 후)

  const bodyParts: string[] = [];
  const seen = new Set<string>(); // 중복 방지

  function addPart(text: string | undefined | null, minLen = 10) {
    if (!text) return;
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length < minLen) return;
    if (seen.has(t)) return;
    // 부분 중복 검사 — 이미 있는 더 긴 문자열의 부분이면 스킵
    for (const existing of seen) {
      if (existing.includes(t) || t.includes(existing)) return;
    }
    seen.add(t);
    bodyParts.push(t);
  }

  // 4-1. description
  if (desc) addPart(desc, 5);

  // 4-2. <noscript> 콘텐츠 (JS 비활성 사용자용 메시지)
  // SPA(React/Vue/Next.js 등) 사이트의 noscript는 보통 "JS를 켜주세요" 안내문이라
  // 본문 콘텐츠가 아님 → 한국어/영어 모든 변형 차단
  const isJsAdvisoryMessage = (text: string): boolean => {
    return (
      /javascript|자바스크립트/i.test(text) ||
      /불러올 수 없|불러오지 못|로드.*실패|load.*fail|cannot load/i.test(text) ||
      /enable.*browser|browser.*support|enable.*js/i.test(text) ||
      /this site requires|need.*script|needs javascript/i.test(text) ||
      /브라우저.*지원|지원.*브라우저|확인해.?주세요/i.test(text)
    );
  };

  $("noscript").each((_, el) => {
    const text = $(el).text();
    if (text) {
      const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (clean.length > 20 && !isJsAdvisoryMessage(clean)) {
        addPart(clean);
      }
    }
  });

  // 4-3. 모든 헤딩
  $("h1, h2, h3, h4").each((_, el) => {
    addPart($(el).text(), 5);
  });

  // 4-4. <p> 단락
  $("p").each((_, el) => {
    addPart($(el).text(), 15);
  });

  // 4-5. iframe src — 챌린지 페이지가 실제 콘텐츠를 iframe으로 임베드하기도 함
  $("iframe").each((_, el) => {
    const src = $(el).attr("src");
    if (src && !/javascript:|data:/i.test(src)) {
      const absSrc = absUrl(fallback.finalUrl, src);
      if (absSrc && absSrc !== fallback.finalUrl) {
        addPart(`임베드된 페이지: ${absSrc}`);
      }
    }
  });

  // 4-6. 의미 있는 <a> 링크 라벨 (네비게이션·CTA 텍스트는 단서가 됨)
  const linkLabels: string[] = [];
  $("a").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length > 3 && t.length < 80 && !/^(home|홈|menu|메뉴|로그인|login)$/i.test(t)) {
      linkLabels.push(t);
    }
  });
  if (linkLabels.length > 0) {
    const uniq = Array.from(new Set(linkLabels)).slice(0, 10);
    if (uniq.length >= 2) {
      addPart(`주요 메뉴/링크: ${uniq.join(" · ")}`);
    }
  }

  // 4-7. <img alt> — 시각적 대체 텍스트는 페이지 내용 단서
  const altTexts: string[] = [];
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt && alt.length > 5 && alt.length < 150) altTexts.push(alt.trim());
  });
  if (altTexts.length > 0) {
    const uniq = Array.from(new Set(altTexts)).slice(0, 5);
    addPart(`이미지 설명: ${uniq.join(" / ")}`);
  }

  // 4-8. 마지막 폴백 — body 전체 텍스트 추출
  // 챌린지 페이지에 일부 본문이 노출되거나, 우회 후 실제 본문이 있는 경우
  // 본문이 빈약할 때(< 3 단락) 적극적으로 추가
  if (bodyParts.length < 3) {
    const $clone = cheerio.load(workingHtml);
    $clone("script, style, noscript, iframe, svg").remove();
    const bodyText = $clone("body").text().replace(/\s+/g, " ").trim();
    // 챌린지/JS 안내 문구는 제외
    const cleanBodyText = bodyText
      .replace(/please enable javascript[^.]*\.?/gi, "")
      .replace(/just a moment[^.]*\.?/gi, "")
      .replace(/checking your browser[^.]*\.?/gi, "")
      .replace(/페이지를 불러올 수 없[^.]*\.?/g, "")
      .replace(/javascript[^.]*불러오[^.]*\.?/gi, "")
      .replace(/javascript[^.]*확인[^.]*\.?/gi, "")
      .replace(/자바스크립트[^.]*\.?/g, "")
      .trim();
    if (cleanBodyText.length > 30 && !isJsAdvisoryMessage(cleanBodyText)) {
      const limited = cleanBodyText.length > 1500 ? cleanBodyText.slice(0, 1500) + "…" : cleanBodyText;
      addPart(`페이지 내용: ${limited}`);
    }
  }

  // ─── 5. 메타 정보 추가 ───
  // 본문 단락이 빈약할 때(< 4)만 메타 정보를 본문에 합쳐서 보강
  // 충분히 있으면(4단락 이상) 메타는 추가하지 않아 본문이 어수선해지지 않음
  if (bodyParts.length < 4) {
    const metaLine: string[] = [];
    if (siteName) {
      metaLine.push(`${siteName} (${domain})`);
    } else if (bodyParts.length === 0) {
      // 본문이 정말 0이면 도메인이라도 표시
      metaLine.push(`${prettyDomain} (${domain})`);
    }
    if (keywords) metaLine.push(`키워드: ${keywords}`);
    if (author) metaLine.push(`작성자: ${author}`);
    if (metaLine.length > 0) {
      addPart(metaLine.join(" · "));
    }
  }

  // 챌린지 우회를 시도했으나 실패한 경우 안내 추가 (본문 부족할 때만)
  if (isInfinityFree && htmlAfterChallenge.length === 0 && bodyParts.length < 3) {
    addPart(
      "이 사이트는 InfinityFree 호스팅을 사용하여 자동 본문 추출이 제한됩니다. " +
        "위 정보는 페이지 메타데이터에서 추출한 단서이며, 직접 추가 정보를 입력해주세요.",
    );
  }

  if (bodyParts.length > 0) {
    fallback.suggestedBody = bodyParts.join("\n\n");
  } else {
    // 정말 아무것도 없으면 도메인 정보로 최소 본문
    fallback.suggestedBody = `${prettyDomain}\n\n${domain}`;
  }

  return fallback;
}

// ---------------------------------------------------------------------------
// InfinityFree 챌린지 우회 헬퍼
// ---------------------------------------------------------------------------

/**
 * InfinityFree의 aes.js 챌린지를 정확히 복호화하여 __test 쿠키 생성.
 *
 * 챌린지 HTML에 포함된 패턴:
 *   var a=toNumbers("KEY_HEX"),
 *       b=toNumbers("IV_HEX"),
 *       c=toNumbers("CIPHERTEXT_HEX");
 *   document.cookie="__test="+toHex(slowAES.decrypt(c,2,a,b))+...
 *
 * mode=2는 CBC. AES-128-CBC, no padding, 16-byte block.
 * 복호화한 평문의 hex 문자열이 __test 쿠키 값이 됨.
 */
function solveInfinityFreeChallenge(html: string): string | null {
  // 변수 a, b, c를 toNumbers("HEX") 패턴에서 추출
  // 변수 이름이 a/b/c가 아닐 수도 있어 위치 기반으로도 시도
  const aMatch = html.match(/\ba\s*=\s*toNumbers\(\s*["']([a-fA-F0-9]{32})["']\s*\)/);
  const bMatch = html.match(/\bb\s*=\s*toNumbers\(\s*["']([a-fA-F0-9]{32})["']\s*\)/);
  const cMatch = html.match(/\bc\s*=\s*toNumbers\(\s*["']([a-fA-F0-9]{32})["']\s*\)/);

  let keyHex: string | undefined;
  let ivHex: string | undefined;
  let ctHex: string | undefined;

  if (aMatch && bMatch && cMatch) {
    keyHex = aMatch[1];
    ivHex = bMatch[1];
    ctHex = cMatch[1];
  } else {
    // 폴백: toNumbers 호출이 3개 연속 나오면 그걸 a, b, c로 가정
    const allMatches = [...html.matchAll(/toNumbers\(\s*["']([a-fA-F0-9]{32})["']\s*\)/g)];
    if (allMatches.length >= 3) {
      keyHex = allMatches[0][1];
      ivHex = allMatches[1][1];
      ctHex = allMatches[2][1];
    } else {
      return null;
    }
  }

  try {
    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const ciphertext = Buffer.from(ctHex, "hex");

    if (key.length !== 16 || iv.length !== 16 || ciphertext.length !== 16) {
      return null;
    }

    // AES-128-CBC, no padding (slowAES와 정확히 같은 방식)
    const decipher = createDecipheriv("aes-128-cbc", key, iv);
    decipher.setAutoPadding(false);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // 결과를 hex로 변환 → __test 쿠키 값
    return decrypted.toString("hex");
  } catch {
    return null;
  }
}

/**
 * 챌린지 HTML에서 단순 쿠키 패턴(기존 방식)도 시도 — 일부 비-AES 변형 대응
 */
function extractChallengeCookie(html: string): string | null {
  // 1) AES 챌린지 정확히 복호화 (가장 신뢰)
  const aesValue = solveInfinityFreeChallenge(html);
  if (aesValue) return `__test=${aesValue}`;

  // 2) document.cookie="..." 직접 추출 (이미 평문인 경우)
  const m1 = html.match(/document\.cookie\s*=\s*["']([^"']+)["']/);
  if (m1) {
    const kv = m1[1].split(";")[0].trim();
    if (kv && kv.includes("=")) return kv;
  }

  // 3) __test=값 형식 직접 노출
  const m2 = html.match(/__test\s*=\s*([a-zA-Z0-9]+)/);
  if (m2) return `__test=${m2[1]}`;

  return null;
}

/**
 * 챌린지 페이지의 location.href 또는 redirect URL 추출.
 * 챌린지 통과 후 가야 할 실제 페이지 URL.
 */
function extractChallengeRedirect(html: string, fallback: string): string {
  const m = html.match(/location\.href\s*=\s*["']([^"']+)["']/);
  if (m && m[1]) {
    try {
      // 상대 경로면 fallback URL 기준으로 절대화
      return new URL(m[1], fallback).href;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * 추출된 쿠키와 함께 다시 페이지 요청.
 * 챌린지 페이지의 redirect 대상으로 보내고, 실제 콘텐츠 HTML 받음.
 */
async function fetchWithCookie(url: string, cookie: string, originalHtml?: string): Promise<string> {
  // 챌린지가 location.href로 리다이렉트하는 경우 그 URL을 우선 사용
  const targetUrl = originalHtml ? extractChallengeRedirect(originalHtml, url) : url;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        Cookie: cookie,
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return "";
    const text = await res.text();
    // 두 번째 요청에서도 챌린지가 다시 오면 우회 실패로 간주
    if (text.includes("aes.js") && text.includes("toNumbers")) return "";
    return text;
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}
