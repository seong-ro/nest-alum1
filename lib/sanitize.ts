/**
 * 본문에서 민감한 식별 번호를 자동 제거.
 * 카드 게시 전 마지막 단계에 적용 (URL 추출 결과 + 수동 입력 모두).
 *
 * 제거 대상:
 *   - 사업자등록번호: 000-00-00000
 *   - 통신판매업신고번호: 0000-지역명-0000
 *   - 법인등록번호: 000000-0000000
 *   - 주민등록번호: 000000-0000000
 *   - 개인 휴대전화: 010-0000-0000 (대표번호는 보존을 시도하지만 안전 위해 제거)
 *
 * 정책: 발견 시 단어를 [민감정보 제거] 로 대체하지 않고 통째로 제거하여
 *       원문 흔적도 남기지 않음. 너무 짧아진 단락은 후속 정리 단계에서 제거됨.
 */

const PATTERNS: Array<{ name: string; regex: RegExp }> = [
  // 사업자등록번호 (3-2-5 자리)
  { name: "biz_id", regex: /\b\d{3}-\d{2}-\d{5}\b/g },
  // 통신판매업신고번호 (예: 2024-성남수정-0873)
  { name: "ecommerce_id", regex: /\b\d{4}-[가-힣]+-\d{3,5}\b/g },
  // 법인등록번호 (6-7 자리)
  { name: "corp_id", regex: /\b\d{6}-\d{7}\b/g },
  // 주민등록번호 패턴 (6-1[1-4]xxxxxx)
  { name: "ssn", regex: /\b\d{6}-[1-4]\d{6}\b/g },
  // 사업자등록번호의 또 다른 표기 (000.00.00000)
  { name: "biz_id_dot", regex: /\b\d{3}\.\d{2}\.\d{5}\b/g },
  // 휴대전화 010·011·016·017·018·019는 협업 컨택 정보로 보존
  // (이전엔 제거했으나 동문 컨택 가능성 우선)
];

/**
 * 단일 텍스트에서 민감 정보 제거.
 * 키 라벨과 함께 나타나는 경우 (예: "사업자등록번호: 371-88-03057") 라벨도 함께 제거.
 */
export function maskSensitive(text: string): string {
  if (!text) return text;
  let s = text;

  // 1. "라벨: 번호" 또는 "라벨 번호" 패턴 통째 제거
  // ex: "사업자등록번호: 371-88-03057" / "사업자등록번호 371-88-03057"
  const labelPatterns = [
    /(?:사업자\s*등록번호|사업자번호|등록번호)\s*[:：]?\s*\d{3}-\d{2}-\d{5}/g,
    /(?:통신판매업신고|통신판매)\s*(?:번호)?\s*[:：]?\s*\d{4}-[가-힣]+-\d{3,5}/g,
    /(?:법인\s*등록번호|법인번호)\s*[:：]?\s*\d{6}-\d{7}/g,
  ];
  for (const p of labelPatterns) {
    s = s.replace(p, "");
  }

  // 2. 일반 번호 패턴
  for (const { regex } of PATTERNS) {
    s = s.replace(regex, "");
  }

  // 3. 마스킹 후 남은 빈 라벨/구두점 정리
  // ex: "사업자등록번호:  | 통신..." → "통신..."
  s = s
    .replace(/(?:사업자\s*등록번호|사업자번호|등록번호|통신판매업신고|통신판매|법인\s*등록번호|법인번호)\s*[:：]\s*(?=$|[\s,|·\/])/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[|·]\s*[|·]\s*/g, " · ")
    .replace(/[,;]\s*[,;]/g, ",")
    .replace(/^\s*[,.|·\/]\s*/g, "")
    .replace(/\s*[,.|·\/]\s*$/g, "")
    .trim();

  return s;
}

/**
 * 카드 데이터 전체에서 민감 정보 제거.
 * EditorialCardData의 모든 텍스트 필드를 순회.
 */
export function maskCardSensitive<
  T extends {
    headline?: string;
    dek?: string;
    body?: string[];
    keyPoints?: string[];
  },
>(card: T): T {
  return {
    ...card,
    headline: card.headline ? maskSensitive(card.headline) : card.headline,
    dek: card.dek ? maskSensitive(card.dek) : card.dek,
    body: card.body ? card.body.map(maskSensitive).filter((p) => p.length > 0) : card.body,
    keyPoints: card.keyPoints
      ? card.keyPoints.map(maskSensitive).filter((p) => p.length > 0)
      : card.keyPoints,
  };
}

// ---------------------------------------------------------------------------
// v2.24.0 (2026-05): 한국 사이트 푸터·네비 보일러플레이트 정제
//
// imweb·grafolio 같은 한국 웹빌더 기반 사이트에서 푸터의 사업자정보·약관·
// SNS 바로가기 같은 잡음이 본문에 섞여 카드에 들어오는 문제를 해결.
//
// maskSensitive()는 식별 번호(사업자등록번호 등)에 특화돼 있지만,
// 다음 함수들은 *문구 단위* 보일러플레이트를 다룬다.
// ---------------------------------------------------------------------------

// 한국 사이트 푸터·네비에서 흔히 등장하는 보일러플레이트 패턴
const FOOTER_BOILERPLATE_PATTERNS: RegExp[] = [
  // 회사 식별 라벨 (라벨 + 값 통째로 — maskSensitive는 식별 번호만 처리하므로
  // 상호/대표 같은 텍스트 라벨은 여기서 제거)
  /상호\s*[:：]?\s*\(?주식회사\s*[^\n.]{0,40}|상호\s*[:：]?\s*\(?주\)?\s*[^\n.]{0,40}/g,
  /대표(?:자|이사)?\s*[:：]?\s*[가-힣A-Za-z]{1,20}/g,

  // 통신판매업 신고 (번호 유무·라벨 변형 모두 커버)
  // imweb의 "통신판매업 신고 호" 같은 빈 라벨 케이스도 잡음
  /통신판매업\s*신고\s*(?:번)?호?\s*[:：]?\s*[^\n.]{0,60}/g,

  // 사업자등록번호 라벨 (번호는 maskSensitive가 마스킹하지만 라벨 잔재 정리)
  /사업자\s*등록\s*번호\s*[:：]?\s*[\d\-.\s]{0,30}/g,

  // 주소 라벨 + 광역행정구역 시작 패턴
  // imweb 푸터의 "주소 [광역시·도] [시·군·구] ..." 같은 케이스
  // v2.30.0: 국가 코드 prefix (KR, KOR, Korea, 대한민국) 끼어있는 케이스도 매칭
  //   예: "주소: KR 강원특별자치도 원주시 ..." 같이 KR이 라벨과 광역구역 사이에 있는 경우
  /(?:주소|Address|ADDRESS)\s*[:：]?\s*(?:KR|KOR|Korea|대한민국)?\s*(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치도|특별자치시|도)?[^\n.]{0,150}/g,
  // 라벨 없이 국가 코드 + 광역행정구역으로 시작하는 주소 라인 (단독 라인 케이스)
  /^\s*(?:KR|KOR|Korea|대한민국)\s+(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치도|특별자치시|도)?[^\n]{0,150}/gm,

  // 사업자정보 라벨 (번호는 maskSensitive가 처리하지만 라벨 자체도 본문에서 제거)
  /\[?사업자\s*정보\s*확인\]?/g,

  // 연락처 라벨 + 값 통째 (전화·팩스·이메일·주소)
  /(?:전화|TEL|Tel|tel)\s*[:：]?\s*[\d\s\-()+]{7,20}/g,
  /(?:Fax|FAX|fax|팩스)\s*[:：]?\s*[\d\s\-()+]{7,20}/g,
  /(?:이메일|E-?mail|EMAIL|email)\s*[:：]?\s*[\w.+-]+@[\w-]+\.[\w.-]+/g,

  // 개인정보 책임자 (이메일 주소까지 한 묶음)
  /개인정보\s*(?:관리|보호)?\s*책임자\s*[:：]?\s*[^\n.()]{0,50}(?:\([^)]+\))?/g,

  // 푸터 링크 텍스트 (붙어있는 케이스 흔함: "이용약관개인정보처리방침")
  /이용\s*약관\s*개인정보\s*처리\s*방침/g,
  /개인정보\s*처리\s*방침/g,
  /이용\s*약관/g,
  /이메일\s*무단\s*수집\s*거부/g,
  /\b사이트\s*맵\b/g,

  // Copyright
  /Copyright\s*[©Cc]?\s*\d{0,4}[^\n.]{0,80}/gi,
  /All\s+[Rr]ights\s+[Rr]eserved\.?/gi,
  /©\s*\d{4}[^\n.]{0,50}/g,

  // SNS·외부 링크 라벨
  /SNS\s*바로\s*가기/g,
  /패밀리\s*사이트/g,

  // 흔한 다국어 선택 라벨이 한 라인 차지하는 케이스
  /\b(?:한국어|English|日本語|中文|Deutsch|Français|Español)\b/g,
];

// 짧은 단독 메뉴 키워드 (해당 라인이 정확히 이 키워드만 갖고 있을 때 라인 자체 삭제)
const STANDALONE_MENU_KEYWORDS = new Set<string>([
  "회사 소개", "회사소개", "제품 소개", "제품소개", "지속가능경영",
  "채용", "공지사항", "문의", "문의하기",
  "About", "About Us", "Products", "News", "Careers", "Contact",
  "Sustainable Management",
  "Sign in", "Sign-in required. Sign in", "Sign out", "Login", "Logout",
  "More", "Back", "MENU", "HOME", "Search",
  "Notification settings", "Notifications", "Post notifications",
]);

/**
 * 같은 짧은 문구가 N번 이상 연속 등장하면 1번으로 압축.
 * 예: "SNS 바로가기SNS 바로가기SNS 바로가기" → "SNS 바로가기"
 *      "회사 소개회사 소개" → "회사 소개"
 *
 * imweb·grafolio 등 다수 한국 웹빌더에서 모바일·데스크톱 메뉴를 같은 페이지에
 * 두 번 출력하면서 발생하는 패턴.
 */
export function compressRepeatedShortPhrases(text: string): string {
  if (!text) return text;
  // 길이 30자 이하 한국어/영어 문구가 2회 이상 연속으로 등장하면 1회로 축소
  return text.replace(
    /([가-힣A-Za-z][가-힣A-Za-z0-9\s]{1,30}?)\1{1,}/g,
    "$1",
  );
}

/**
 * 한국어 조사·서술어 부재 + 짧은 길이로 메뉴/네비 라인을 판정.
 * \b는 한글에 동작하지 않으므로 다음 문자 클래스(공백·구두점)를 명시.
 *
 * 한글이 8자 이상인데 조사·서술어가 0개면 단어 나열(메뉴)로 본다.
 */
export function isLikelyNavOrMenu(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 4) return true;
  if (trimmed.length > 80) return false;

  if (STANDALONE_MENU_KEYWORDS.has(trimmed)) return true;

  const hasKorean = /[가-힣]/.test(trimmed);
  if (hasKorean) {
    const particleHits =
      trimmed.match(
        /[가-힣](?:을|를|이|가|은|는|에서|에는|에도|에게|한테|께서|께|의|와|과|도|만|로|으로|보다|부터|까지|마저|조차|이며|이고|입니다|이다|하다|한다|했다|있다|없다|됩니다|있습니다|있었다|이었다)(?=[\s,.!?'")\]\u3000]|$)/g,
      ) || [];
    const koreanCharCount = (trimmed.match(/[가-힣]/g) || []).length;
    if (koreanCharCount >= 8 && particleHits.length === 0) return true;
  }

  // 구두점 거의 없는 짧은 영어 라인은 메뉴
  if (!hasKorean && trimmed.length < 30 && !/[.!?,]/.test(trimmed)) {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 4) return true;
  }

  return false;
}

/**
 * 한 단락 내부에서 푸터 보일러플레이트 패턴을 제거.
 * compressRepeatedShortPhrases와 함께 사용.
 *
 * 주의: 이 함수는 *단락 단위* 정제. 메뉴 라인 자체 제거는 isLikelyNavOrMenu로
 * 별도 처리 (paragraph 배열 단위 필터링).
 */
export function removeKoreanFooterBoilerplate(text: string): string {
  if (!text) return text;
  let s = compressRepeatedShortPhrases(text);
  for (const pat of FOOTER_BOILERPLATE_PATTERNS) {
    s = s.replace(pat, " ");
  }
  // 다중 공백 정리
  s = s.replace(/[ \t]+/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
  return s;
}

/**
 * paragraphs 배열을 받아 다음 정제 적용:
 *  1) 각 단락에 removeKoreanFooterBoilerplate
 *  2) 단락 자체가 메뉴/네비로 보이면 제거
 *  3) 정제 후 너무 짧아진 단락 제거 (8자 미만)
 *  4) 중복 단락 제거
 *
 * 인터페이스 변경 없이 url-extractor.ts와 summarizer.ts 양쪽에서 사용.
 */
export function sanitizeKoreanFooterNoise(paragraphs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of paragraphs) {
    if (!raw) continue;

    // 1. 보일러플레이트 패턴 제거
    const cleaned = removeKoreanFooterBoilerplate(raw);
    if (!cleaned || cleaned.length < 8) continue;

    // 2. 메뉴/네비 라인이면 제거
    if (isLikelyNavOrMenu(cleaned)) continue;

    // 3. 중복 단락 제거 (공백·대소문자 무시 키)
    const key = cleaned.replace(/\s+/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push(cleaned);
  }

  return out;
}

/**
 * 단일 description / dek 같은 짧은 텍스트에 적용하는 사후 검증.
 * 결과가 푸터 패턴 흔적을 갖고 있으면 false 반환.
 */
export function isCleanDescriptionText(s: string): boolean {
  if (!s || s.trim().length < 10) return false;

  const POST_PATTERNS: RegExp[] = [
    /상호\s*[:：]?\s*\(?주식회사|상호\s*[:：]?\s*\(?주\)?/,
    /통신판매업\s*신고/,
    /사업자\s*등록\s*번호/,
    /(?:전화|TEL|Fax|FAX)\s*[:：]?\s*[\d\s\-()+]{7,}/,
    /개인정보\s*(?:관리|보호)?\s*책임자/,
    /이용\s*약관|개인정보\s*처리\s*방침/,
    /Copyright\s*[©Cc]/i,
    /SNS\s*바로\s*가기/,
  ];
  for (const p of POST_PATTERNS) {
    if (p.test(s)) return false;
  }
  return true;
}

/**
 * v2.28.0: description을 완전 거부하지 않고 푸터 패턴만 제거하여 깨끗한 부분만 살림.
 *
 * isCleanDescriptionText는 strict (있으면 거부 / 없으면 통과)이지만, 일부 사이트는
 * description에 회사 정보 패턴이 섞여있어도 본문 의미는 살아있음. 그런 경우
 * 패턴 매치 부분만 제거하고 깨끗한 부분만 반환. 결과가 너무 짧으면 빈 문자열.
 *
 * v2.30.0: 30% 미만 룰 제거 — 정제 후 15자 이상이면 OK. 30% 룰이 너무 공격적이라
 * 짧지만 의미있는 정제 결과를 거부하는 케이스 방지.
 *
 * 사용처: composeCard fallback에서 description 무조건 거부 대신 정제 시도.
 */
export function cleanDescriptionText(s: string): string {
  if (!s || s.trim().length < 10) return "";
  // 푸터 보일러플레이트 패턴 제거 (sanitizeKoreanFooterNoise와 같은 로직 활용)
  const cleaned = removeKoreanFooterBoilerplate(s);
  // v2.30.0: 정제 후 15자 이상이면 OK. 30% 룰 제거.
  if (cleaned.length < 15) return "";
  return cleaned;
}

/**
 * v2.30.0: 텍스트가 거의 주소 정보로만 구성됐는지 판정.
 *
 * 본문 fallback 단계에서 lead·bodyParagraphs가 주소 라인만으로 이뤄지면
 * 카드가 빈약해 보이므로 이 판정으로 감지하고 description 등 다른 콘텐츠로 대체.
 *
 * 매칭 패턴:
 *   "주소: 강원특별자치도 원주시 ..."
 *   "주소: KR 강원특별자치도 ..."
 *   "KR 강원특별자치도 원주시 ..."  (라벨 없는 형태)
 *   "강원특별자치도 [시·군] [상세 주소] ..."
 */
export function looksLikeJustAddress(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0 || trimmed.length > 200) return false;

  const ADDR_PATTERNS: RegExp[] = [
    // "주소:" 라벨로 시작 + 광역행정구역
    /^\[?(?:주소|Address|ADDRESS)\s*[:：]?\s*(?:KR|KOR|Korea|대한민국)?\s*(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/,
    // 국가 코드로 시작 + 광역행정구역
    /^(?:KR|KOR|Korea|대한민국)\s+(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/,
    // 광역행정구역으로 시작 + 시·군·구·로·길 마커가 있고 우편번호로 끝남
    /^(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치도|특별자치시|도)?\s+\S{2,20}(?:시|군|구)\s+/,
  ];

  for (const p of ADDR_PATTERNS) {
    if (p.test(trimmed)) return true;
  }
  return false;
}

/**
 * v2.40.0: 합성된 lead/dek 텍스트의 깨진 도메인 패턴 정리.
 *
 * 빌더 사이트의 특정 단락(예: "회사명 (도메인.co.kr). 함께하는 ...")이
 * sanitize 후 "..co.kr )." 같은 깨진 형태로 lead에 들어오는 케이스 보완.
 *
 * 패턴:
 *   - "..co.kr ).": ".." + "도메인뒷부분" + ")" + "." 잔재
 *   - "도메인이름.. ".": 같은 변형
 *   - "(.코.kr)" / "(  )": 빈 괄호
 *
 * 동작: 깨진 패턴 제거 후 다중 공백·잔여 구두점 정리
 */
export function cleanBrokenDomainArtifacts(text: string): string {
  if (!text) return text;
  let s = text;
  // (1) ".." + 도메인 후반부 + 닫는 괄호: "..co.kr )." 또는 "..com )" 등
  s = s.replace(/\.\.\s*[a-z]{2,4}(?:\.[a-z]{2,4})?\s*\)/gi, "");
  // (2) 빈 괄호 또는 공백만 든 괄호
  s = s.replace(/\(\s*\)/g, "");
  // (3) 도메인 시작 점 패턴: "..co.kr" 또는 "..com" 등 (괄호 없이 잔재)
  s = s.replace(/(?:^|\s)\.\.[a-z]{2,4}(?:\.[a-z]{2,4})?(?=[\s,.!?]|$)/gi, "");
  // (4) 잔여 닫는 괄호 (앞에 매칭되는 여는 괄호 없을 때)
  // 간단히: 단어 시작에 ) 또는 공백 + ) 패턴
  s = s.replace(/(?:^|\s)\)+/g, " ");
  // (5) 다중 마침표·쉼표 정리
  s = s.replace(/\.{2,}/g, ".").replace(/,{2,}/g, ",");
  // (6) 공백 + 구두점 정리
  s = s.replace(/\s+([.,!?])/g, "$1");
  // (7) 다중 공백 정리
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}
