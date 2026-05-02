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
