/**
 * v2.53.0: IndexNow 프로토콜 통합 — Bing/Naver/Yandex/Seznam/Yep 즉시 인덱싱.
 *
 * 카드 등록·편집·삭제·복원 시 자동으로 변경된 URL을 search engines에 push.
 * 전통적 crawl 대비 인덱싱 시간이 days/weeks → minutes로 단축.
 *
 * 동작:
 *  1. 환경변수 INDEXNOW_KEY + INDEXNOW_KEY_LOCATION 사용
 *  2. POST https://api.indexnow.org/indexnow 에 JSON으로 ping
 *  3. 한 번 ping하면 모든 IndexNow 참여 검색엔진에 분산 (Microsoft/Naver/Yandex)
 *
 * 환경변수:
 *  - INDEXNOW_KEY: 8~128자 hex/dash. 사용자가 임의로 정한 비밀 문자열
 *      (예: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
 *  - INDEXNOW_KEY_LOCATION (선택): 키 검증 파일 URL (기본: /indexnow-{key}.txt)
 *
 * 검색엔진 검증 절차:
 *  - https://nest-alum1.vercel.app/{key}.txt 접근 시 키 자체를 응답 (search engine이 검증)
 *  - 우리 사이트는 /api/indexnow-key/[key]/route.ts에서 처리
 *
 * 미설정 시: 단순히 ping skip — 다른 기능 영향 0.
 *
 * 참고: Google은 IndexNow 미지원 (sitemap 통한 자연 발견에 의존).
 */

const ENDPOINT = "https://api.indexnow.org/indexnow";

interface IndexNowResult {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
}

/**
 * 변경된 URL들을 IndexNow에 ping.
 *
 * @param urls - 변경/추가/삭제된 URL 절대 경로 배열 (https:// 시작)
 * @returns ping 결과
 */
export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (urls.length === 0) {
    return { ok: true, skipped: true };
  }

  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return { ok: true, skipped: true, error: "INDEXNOW_KEY not set" };
  }

  // host는 첫 URL에서 추출
  let host: string;
  try {
    host = new URL(urls[0]).host;
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  const keyLocation =
    process.env.INDEXNOW_KEY_LOCATION?.trim() ||
    `https://${host}/${key}.txt`;

  const body = {
    host,
    key,
    keyLocation,
    urlList: urls.slice(0, 10000), // 최대 10000 URL/req
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    // IndexNow 응답 코드:
    //  200 OK — accepted (정상)
    //  202 Accepted — accepted (정상, 약간 다름)
    //  400 Bad Request — JSON 형식 오류
    //  403 Forbidden — key 검증 실패 (keyLocation 파일 접근 불가)
    //  422 Unprocessable Entity — URL이 host와 다름
    //  429 Too Many Requests — rate limit
    return {
      ok: res.status === 200 || res.status === 202,
      status: res.status,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * fire-and-forget 버전 — server action에서 호출 시 await 없이 사용.
 * 결과를 기다리지 않으니 ping 실패해도 사용자 경험에 영향 X.
 */
export function pingIndexNowFireAndForget(urls: string[]): void {
  void pingIndexNow(urls).catch(() => {
    /* fire-and-forget — failure is silent */
  });
}
