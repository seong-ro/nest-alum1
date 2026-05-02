/**
 * 동일한 URL이 다시 입력될 때 기존 카드를 덮어쓰기 위한 결정론적 dedup key.
 *
 * 설계 (v1.4, 정규화 강화):
 *   - scheme 통일: http / https → https로 통일
 *   - www 제거: www.example.com → example.com
 *   - hostname 소문자
 *   - trailing slash 제거 (루트 / 와 비루트 모두)
 *   - 해시 프래그먼트(#...) 제거
 *   - 추적용 쿼리 파라미터 제거 (utm_*, fbclid, gclid 등)
 *   - 쿼리 파라미터 알파벳 정렬 (순서 차이 무시)
 *   - 빈 쿼리(?) 제거
 *
 *   최종 키 = sha256(normalizedUrl).slice(0, 16)
 */

import { createHash } from "node:crypto";

// 추적용/세션용 쿼리 파라미터 — 동일 페이지로 간주하기 위해 제거
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "yclid",
  "_ga",
  "_gl",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "ref_url",
  "source",
  "share",
  "from",
]);

export function normalizeUrlForKey(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  let parsed: URL;
  try {
    parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed,
    );
  } catch {
    return trimmed.toLowerCase();
  }

  // 1. scheme 통일: http → https
  parsed.protocol = "https:";

  // 2. hostname 소문자 + www. 제거
  let host = parsed.hostname.toLowerCase();
  if (host.startsWith("www.")) {
    host = host.slice(4);
  }
  parsed.hostname = host;

  // 3. 기본 포트 제거 (https:443, http:80은 표시 안 됨이 표준이지만 명시 보호)
  if (parsed.port === "443" || parsed.port === "80") {
    parsed.port = "";
  }

  // 4. 해시 프래그먼트 제거
  parsed.hash = "";

  // 5. 추적용 쿼리 파라미터 제거
  if (parsed.search) {
    const params = new URLSearchParams(parsed.search);
    const cleaned: [string, string][] = [];
    for (const [k, v] of params) {
      if (!TRACKING_PARAMS.has(k.toLowerCase())) {
        cleaned.push([k, v]);
      }
    }
    // 6. 쿼리 파라미터 알파벳 정렬 (동일 의미 다른 순서 통일)
    cleaned.sort((a, b) => a[0].localeCompare(b[0]));
    if (cleaned.length === 0) {
      parsed.search = "";
    } else {
      const sp = new URLSearchParams();
      for (const [k, v] of cleaned) sp.append(k, v);
      parsed.search = sp.toString();
    }
  }

  // 7. trailing slash 제거 (루트 포함 모든 경로)
  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  } else if (pathname === "/") {
    pathname = "";
  }
  parsed.pathname = pathname;

  // 8. 최종 문자열 (URL 객체가 trailing slash를 자동으로 다시 붙일 수 있어 직접 조립)
  let result = `${parsed.protocol}//${parsed.hostname}`;
  if (parsed.port) result += `:${parsed.port}`;
  result += pathname;
  if (parsed.search) result += parsed.search;

  return result.toLowerCase();
}

function hashString(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * 덮어쓰기 판정용 키.
 *
 * 동일 페이지로 간주되는 입력 변형들이 모두 같은 키를 만들어야 함:
 *   schooldots.me
 *   www.schooldots.me
 *   http://schooldots.me
 *   https://schooldots.me
 *   https://www.schooldots.me/
 *   https://www.SCHOOLDOTS.me
 *   https://www.schooldots.me/?utm_source=...
 *   → 모두 동일 키
 *
 * @param rawUrl  사용자 입력 URL (정규화 후 해시)
 */
export function computeDedupKey(rawUrl: string): string {
  const urlNorm = normalizeUrlForKey(rawUrl);
  return hashString(urlNorm).slice(0, 16);
}
