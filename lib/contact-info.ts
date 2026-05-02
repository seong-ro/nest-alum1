/**
 * 본문에서 회사 기본 정보(대표자·전화·이메일·주소)를 추출.
 * 카드 메타로 별도 보관하여 우측 패널에 정돈된 형태로 노출.
 *
 * 추출 후에도 본문에는 그대로 남겨둠 (정보 중복이 협업 단서로 더 효과적).
 */

export interface ContactInfo {
  /** 대표자 이름 */
  representative?: string;
  /** 회사 대표번호·휴대전화 (협업 컨택용) */
  phone?: string;
  /** 이메일 */
  email?: string;
  /** 주소 (시·구·동까지) */
  address?: string;
}

/**
 * 텍스트 합본에서 회사 기본 정보 추출.
 * 모든 필드 옵셔널이며 미발견 시 undefined.
 */
export function extractContactInfo(textParts: string[]): ContactInfo {
  const text = textParts.join("\n");
  const info: ContactInfo = {};

  // ─── 대표자 이름 ───
  // 패턴: "대표.손형민" / "대표 손형민" / "대표자: 홍길동" / "대표이사: 홍길동"
  // 한국 이름은 2~4자 한글
  const repPatterns = [
    // "대표.이름", "대표:이름", "대표이사: 이름" 등 (구분자 0~1자)
    // 한글 이후 종료: 공백·끝·구두점·영문·숫자 모두 종료로 인정
    /(?:대표(?:이사|자)?)[\s\.:：·]+([가-힣]{2,4})(?=\s|$|[^가-힣])/,
    // "CEO 홍길동" / "Founder 홍길동" (영문 직책)
    /(?:CEO|Founder|founder)[\s\.:：·]+([가-힣]{2,4})(?=\s|$|[^가-힣])/,
    // 단독 "대표 홍길동" 짧은 표현
    /\b대표\s+([가-힣]{2,4})\b(?!\s*(?:번호|이사회|사원|메일))/,
  ];
  for (const p of repPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      info.representative = m[1];
      break;
    }
  }

  // ─── 전화번호 ───
  // 우선순위: 회사 대표번호(02·031·070 등) > 휴대전화(010 등)
  // 패턴: "070-8064-3411" / "02-1234-5678" / "031-123-4567"
  const phonePatterns = [
    // 070·050·15xx·16xx·18xx 인터넷전화/대표번호
    /\b0(?:70|50)\-\d{3,4}-\d{4}\b/,
    /\b1(?:5|6|8)\d{2}-\d{3,4}\b/,
    // 02 (서울)
    /\b02-\d{3,4}-\d{4}\b/,
    // 031~064 (지역)
    /\b0(?:31|32|33|41|42|43|44|51|52|53|54|55|61|62|63|64)-\d{3,4}-\d{4}\b/,
    // 휴대전화
    /\b01[0136-9]-\d{3,4}-\d{4}\b/,
  ];
  for (const p of phonePatterns) {
    const m = text.match(p);
    if (m) {
      info.phone = m[0];
      break;
    }
  }

  // ─── 이메일 ───
  // 강건한 추출:
  // 1) "Email.info@..." 같이 라벨이 점으로 붙은 경우 분리
  // 2) cheerio가 가끔 만드는 "info@ domain.com" 공백을 @ 주변에서 제거
  // 3) 한국어 라벨(이메일·E-mail·메일) 직후의 이메일도 인식
  const emailHaystack = text
    // "Email.info@..." → "Email. info@..."로 라벨 분리
    .replace(/(Email|E-mail|이메일|메일|Mail|MAIL)\.([a-zA-Z0-9])/g, "$1. $2")
    // "info@ domain.com" → "info@domain.com" (@ 뒤 공백 제거)
    .replace(/([a-zA-Z0-9._%+-]+)@\s+([a-zA-Z0-9])/g, "$1@$2")
    // "info @domain.com" → "info@domain.com" (@ 앞 공백 제거)
    .replace(/([a-zA-Z0-9._%+-])\s+@([a-zA-Z0-9])/g, "$1@$2");

  const allEmails =
    emailHaystack.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];

  // 라벨이 로컬 부분에 잘못 포함된 경우 정리
  // ex: "Email.info@innokeep.com" → "info@innokeep.com"
  const cleanedEmails = allEmails
    .map((e) => {
      // 잘 알려진 라벨 prefix 제거
      return e.replace(
        /^(Email|E-mail|이메일|메일|Mail|MAIL|TEL|Tel|Phone|FAX|Fax)\./i,
        "",
      );
    })
    // 너무 짧거나 도메인 없는 건 제외
    .filter((e) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e))
    // 길이 6~80자 (방어적 검증)
    .filter((e) => e.length >= 6 && e.length <= 80);

  if (cleanedEmails.length > 0) {
    // info@·contact@·hello@·support@·hr@ 같은 회사 메일 우선
    const corporate = cleanedEmails.find((e) =>
      /^(info|contact|hello|support|admin|cs|sales|hr|biz|business|press|partners?|help)@/i.test(e),
    );
    info.email = corporate ?? cleanedEmails[0];
  }

  // ─── 주소 ───
  // 한국 주소는 다양한 형식으로 나타남:
  //   1) "ADDRESS. 경기도..." / "주소: 경기도..." / "위치: 서울..."
  //   2) 라벨 없이 "경기도 성남시 중원구..." 시작
  //   3) 한 줄로 압축된 푸터 안에 묻힌 경우
  //   4) 다중 위치: "서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구"
  //      구분자: · (middle dot, U+00B7) · │ (box drawing, U+2502) · | (pipe)
  //
  // 핵심 원칙: 진짜 한국 주소는 반드시 행정구역 마커(시·군·구·로·길·번지)
  // 를 포함해야 함. 광역시·도 이름이 본문에 등장한다고 주소로 채택하면
  // "안전모 착용을... 위험구역 접근..." 같은 본문 첫 문장이 잘못 잡힘.

  // 한국 주소 행정구역 마커 (괄호 안 마커도 인식)
  const ADDRESS_MARKERS_RE =
    /(?:[가-힣]+(?:시|군|구|읍|면|동|로|길)|\d+번지|\d+층|\d+호|빌딩|타워|센터|아파트|오피스텔|상가|캠퍼스타운|단지|지구|벨리|밸리|블록)/;

  /**
   * 후보 텍스트가 진짜 한국 주소인지 검증
   * - 행정구역 마커 필수 (시·군·구·로·길·캠퍼스타운 등)
   * - 서술어 종결 또는 다중 동사 → 본문이라 거부
   * - 본문 특유 표현(소수점 숫자 + 단위, 동사형 명사) 차단
   */
  function isValidKoreanAddress(s: string): boolean {
    if (!s || s.length < 8 || s.length > 120) return false;
    if (!ADDRESS_MARKERS_RE.test(s)) return false;
    // 서술어 종결
    if (/(?:합니다|입니다|됩니다|있습니다|있다|이다|니다)\.?$/.test(s.trim())) return false;
    // 다중 동사 (본문 문장 특징)
    const verbCount = (s.match(/(?:하고|하며|되고|되며|있고|있으며|되어|하여)/g) ?? []).length;
    if (verbCount >= 2) return false;
    // 본문 명사 — "감지", "경보", "착지" 같은 동사형 명사가 있으면 본문일 가능성
    if (/(?:감지|경보|착지|작동|동작|실행|수행|처리|분석)(?:하|되|시키|를|을|의)/.test(s)) return false;
    // 소수점 + 단위 (예: "0.1초", "0.018초", "55fps") — 본문 표현
    if (/\d+\.\d+\s*(?:초|ms|fps|배|개|kg|m|cm|km)/.test(s)) return false;
    // "안전모", "위험구역", "작업자" 같은 명백한 본문 단어
    if (/(?:안전모|위험구역|위험|작업자|착용|크레인|인양물|차량|운전)/.test(s)) {
      // 단, "안전모 착용" 같은 동작 표현이 동시에 있을 때만 차단
      if (/(?:착용|접근|감지|운전|이동)/.test(s)) return false;
    }
    return true;
  }

  // 17개 광역시·도 + 약어 (정규식 union)
  const PROVINCES = [
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
  const provincePattern = PROVINCES.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");

  // 다중 위치 구분자 — · (middle dot) · │ (box drawing) · | (pipe)
  // [\u00B7\u2502|]: 모든 구분자 패턴 통일
  const SEPARATORS = "[\\u00B7\\u2502|]";

  /**
   * 다중 위치 패턴을 구분자 통일하여 정규화
   * "서울대 캠퍼스타운(관악구 신림동)  │  경기 고양  │  울산 동구"
   *  → "서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구"
   */
  function normalizeMultiLocation(s: string): string {
    return s
      .replace(new RegExp(`\\s*${SEPARATORS}\\s*`, "g"), " · ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * 매치된 텍스트의 마지막 행정구역 마커(시·군·구·읍·면·동) 이후 잡음을 제거.
   *
   * 주소 단어들 사이의 갭을 측정하여 본문 단어와 분리:
   *   - "(관악구 신림동) · 경기 고양 · 울산 동구" 같은 합법 다중 위치는
   *     단어 간 갭이 ~20자 이내 (구분자 + 공백 + 다음 광역시·도 + 공백)
   *   - "...울산 동구 3개 솔루션, ... 실시간 AI가 작동" 같은 본문은
   *     "동구" → "실시" 갭이 30자 이상 → 그 시점에 끊어 본문 차단
   *
   * 마커 직후 닫는 괄호 ")" 는 보존 ("(관악구 신림동)" 같은 케이스)
   */
  function trimAddressTail(s: string): string {
    const matches = [...s.matchAll(/[가-힣]+(?:시|군|구|읍|면|동)/g)];
    if (matches.length === 0) return s;
    let lastValid = matches[0];
    for (let i = 1; i < matches.length; i++) {
      const prev = matches[i - 1];
      const curr = matches[i];
      const prevEnd = (prev.index ?? 0) + prev[0].length;
      const gap = (curr.index ?? 0) - prevEnd;
      // 갭이 너무 크면 (20자 초과) 다음 마커는 본문 단어로 판단 → 연결 안 함
      // 합법 다중 위치 갭 예시: ")  │  경기 고양  │  " ≈ 19자
      if (gap > 20) break;
      lastValid = curr;
    }
    const endIdx = (lastValid.index ?? 0) + lastValid[0].length;
    let result = s.slice(0, endIdx);
    if (s[endIdx] === ")") result += ")";
    return result;
  }

  // A. 라벨 + 주소 (가장 신뢰, 단 진위 검증 통과 시에만 채택)
  // 다중 위치 구분자(· │ |)는 종료 문자에서 제외하여 전체 캡처
  // 종료는 줄바꿈 또는 다음 라벨 시작
  const labelPatterns = [
    /(?:ADDRESS|Address|address|ADDR|addr)\s*[:.：]?\s*([^\n]{10,200}?)(?=\s*(?:사업자|통신판매|법인등록|TEL|Tel|Phone|Email|E-mail|이메일|FAX|Fax|FAMILY\s*SITE|©|Copyright|회사\s*소개|$|\n))/i,
    /(?:주소|위치|소재지|본사|오피스|회사\s*주소)\s*[:.：]?\s*([^\n]{10,200}?)(?=\s*(?:사업자|통신판매|법인등록|TEL|Tel|Phone|Email|E-mail|이메일|FAX|Fax|FAMILY\s*SITE|©|Copyright|회사\s*소개|$|\n))/,
  ];

  for (const p of labelPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      let candidate = m[1].trim();
      // 다중 위치 구분자 통일
      candidate = normalizeMultiLocation(candidate);
      // 다중 위치 패턴이면 마지막 행정구역 마커 이후 잡음 제거
      // (단, 단일 주소처럼 "센텀로 88"으로 끝나는 경우엔 trim하면 안 됨 →
      //  다중 위치 신호인 ` · `가 있을 때만 적용)
      if (candidate.includes(" · ")) {
        candidate = trimAddressTail(candidate);
      }
      // 끝부분 잡음 제거 (이메일·FAMILY SITE·회사 소개 등이 따라붙는 경우)
      candidate = candidate
        .replace(/\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}.*$/, "")
        .replace(/\s*(?:FAMILY\s*SITE|Family\s*Sites?|회사\s*소개|EdgeHybrid-RT|Water-RIA).*$/i, "")
        .replace(/[\s,.|·\/]+$/, "")
        .trim();
      if (isValidKoreanAddress(candidate)) {
        info.address = candidate.length > 100 ? candidate.slice(0, 100).trim() + "…" : candidate;
        break;
      }
    }
  }

  // B. 라벨 없는 주소 — 광역시·도로 시작 + 다중 위치 패턴 우선
  if (!info.address) {
    // B-1. 다중 위치 패턴 — "서울/서울대 ... · 경기 ... · 울산 ..." 형태
    // 광역시·도로 시작 + 구분자 + 다른 광역시·도가 적어도 1회 등장
    // 매치는 단순하게 잡고, 마지막 행정구역 마커 이후 잡음은 trimAddressTail로 정리
    const multiRe = new RegExp(
      `(?:${provincePattern})[^\\n]*?${SEPARATORS}[^\\n]*?(?:${provincePattern})[^\\n]+`,
      "g",
    );
    const multiMatches = [...text.matchAll(multiRe)];
    if (multiMatches.length > 0) {
      const longest = multiMatches.reduce((a, b) => (b[0].length > a[0].length ? b : a));
      // 마지막 행정구역 마커 이후 잡음 제거 ("3개 솔루션", "FAMILY SITE" 등)
      let candidate = trimAddressTail(longest[0]);
      candidate = normalizeMultiLocation(candidate);
      // 추가 후처리 — 이메일·푸터 잡음 정리
      candidate = candidate
        .replace(/\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}.*$/, "")
        .replace(/\s*(?:FAMILY\s*SITE|Family\s*Sites?|회사\s*소개|EdgeHybrid-RT|Water-RIA).*$/i, "")
        .replace(/[\s,.|·\/]+$/, "")
        .trim();
      if (isValidKoreanAddress(candidate)) {
        info.address = candidate.length > 100 ? candidate.slice(0, 100).trim() + "…" : candidate;
      }
    }

    // B-2. 단일 주소 — 광역시·도로 시작하는 일반 패턴
    if (!info.address) {
      const re = new RegExp(
        `(${provincePattern})\\s+([\\s가-힣\\d,()A-Za-z-]{4,150}?(?:호|층|빌딩|타워|센터|번지))(?=\\s*(?:사업자|통신판매|법인등록|TEL|Tel|Phone|Email|E-mail|이메일|FAX|Fax|대표|에\\s*있|입니다|$|\\n))`,
        "g",
      );
      const matches = [...text.matchAll(re)];
      if (matches.length > 0) {
        const longest = matches.reduce((a, b) => (b[0].length > a[0].length ? b : a));
        const candidate = (longest[1] + " " + longest[2]).replace(/\s+/g, " ").trim();
        if (isValidKoreanAddress(candidate)) {
          info.address = candidate.length > 100 ? candidate.slice(0, 100).trim() + "…" : candidate;
        }
      }
    }

    // C. 폴백 — 광역시·도 + 시/군/구 (검증 필수)
    if (!info.address) {
      const re2 = new RegExp(
        `(${provincePattern})[\\s가-힣\\d,()A-Za-z-]{4,100}?(?:시|군|구)[^\\n]{0,80}`,
        "",
      );
      const m = text.match(re2);
      if (m) {
        const candidate = m[0].replace(/\s+/g, " ").trim().replace(/[,.|·\/]+$/, "");
        const cleanCandidate = candidate.replace(
          /\s*(?:사업자|통신판매|법인등록|TEL|Tel|Phone|Email|E-mail|이메일|FAX|Fax)[^]*$/,
          "",
        ).trim();
        if (isValidKoreanAddress(cleanCandidate)) {
          info.address = cleanCandidate.length > 100 ? cleanCandidate.slice(0, 100).trim() + "…" : cleanCandidate;
        }
      }
    }
  }

  // D. 정리: trailing 쉼표·구두점 제거
  if (info.address) {
    info.address = info.address.replace(/[\s,.|·\/]+$/, "").trim();
    if (info.address.length < 10) info.address = undefined;
  }

  return info;
}
