// ---------------------------------------------------------------------------
// 에디토리얼 카드 데이터
// ---------------------------------------------------------------------------

export interface EditorialCardData {
  // 소스 메타
  sourceUrl: string;
  sourceDomain: string;
  sourceSiteName?: string;
  fetchedAt: string;

  // 상단 정보
  eyebrow: string;
  kicker?: string;
  headline: string;
  dek: string;

  // 본문 (확장판)
  lead: string;                 // 2 문장 연결 리드
  bodyParagraphs: string[];     // 5 단락 (10~12 문장 분배)
  pullQuote?: string;

  // 하단
  keyPoints: string[];          // 6~7 항목
  heroImage?: string;
  palette: "paper" | "ink" | "clay";
  lang: "ko" | "en" | "mixed";

  // 업종 분류 (자동 감지, 갤러리 색상 그루핑용)
  industry?: string;            // INDUSTRIES key (예: "ai", "edu", "safety")

  // 회사 기본정보 (자동 추출, 우측 패널에 정돈 표시)
  contactInfo?: {
    representative?: string;    // 대표자
    phone?: string;             // 회사 대표번호 또는 휴대전화
    email?: string;             // 이메일
    address?: string;           // 주소
  };

  // v2.37.0: 사용자가 직접 편집한 카드 표시 — 자동 새로고침 시 본문 덮어쓰기 방지.
  // createCardEdited()로 사용자가 본문을 직접 입력한 경우 true.
  // refreshCardAction은 이 플래그가 true면 본문(headline/dek/lead/bodyParagraphs/keyPoints/
  // pullQuote/contactInfo/industry)을 보존하고 메타(heroImage·sourceSiteName)만 갱신.
  userEdited?: boolean;
  // 사용자 편집 시각. userEdited=true와 함께 기록됨.
  userEditedAt?: string;
}

// ---------------------------------------------------------------------------
// URL 추출 중간 산출물
// ---------------------------------------------------------------------------

export interface UrlExtractResult {
  url: string;
  finalUrl: string;
  domain: string;
  title: string;
  description: string;
  ogImage?: string;
  siteName?: string;
  lang: string;
  headings: string[];
  paragraphs: string[];
  publishedTime?: string;
  author?: string;
  /** v2.26.0: meta keywords + article:tag — 카드 keyPoints fallback 소스 */
  keywords?: string[];
  /**
   * v2.26.0: 추출 단계에서 감지한 본문 부족 신호.
   * imweb·Wix 같은 SPA·웹빌더 사이트는 메타데이터는 풍부하지만 cheerio fetch로
   * 본문 추출이 잘 안 됨 — composeCard가 메타 보강 fallback을 활성화하는 신호.
   */
  contentSignal?: "rich" | "thin" | "meta-only";
  /**
   * v2.28.0: 디버그·fallback용 원본 메타데이터.
   * description이 isCleanDescriptionText로 빈 문자열이 됐을 때도 rawDescription에
   * 원본이 보존됨. composeCard fallback 또는 사용자 디버그 패널에서 활용.
   */
  rawDescription?: string;
  rawOgDescription?: string;
  rawTwitterDescription?: string;
  rawMetaKeywords?: string;
  htmlBytesSize?: number;
  /**
   * v2.33.0: HTML 구조 진단 — 봇 차단·SPA shell·empty page 케이스 진단용.
   * Vercel server에서 fetch한 HTML이 정상 사용자가 본 페이지와 다른지 판단.
   */
  metaTagCount?: number;
  headChildrenCount?: number;
  scriptTagCount?: number;
  bodyTextLen?: number;
  scriptToHtmlRatio?: number;
  /**
   * v2.34.0: head 안 meta 태그 이름들 list (최대 30개) — 사용자가 어떤 메타가
   * 있는지 직접 확인 가능. og:description이 있는데 빈 값인지, 아예 없는지 구분.
   */
  metaNamesList?: string[];
  // v2.38.0: 추출 단계별 결과 가시성
  rawParagraphSamples?: string[];
  sanitizedRemovedSamples?: string[];
  bruteForceTriggered?: boolean;
  bruteForceAddedCount?: number;
  // v2.39.0: trigger 진단 — 왜 walker가 트리거 됐는지/안 됐는지
  mainContentLen?: number;
  needsEnrichment?: boolean;
  builderSignature?: string | null;
  finalUrlHost?: string;
}

// ---------------------------------------------------------------------------
// 서버 액션 반환
// ---------------------------------------------------------------------------

export type ActionResult =
  | {
      ok: true;
      card: EditorialCardData;
      dedupKey: string;
      debug?: { sourceChars: number; usedSentences: number };
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// 갤러리 저장 구조 (localStorage)
// ---------------------------------------------------------------------------

export interface StoredCard {
  id: string;              // dedupKey
  card: EditorialCardData;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryData {
  version: 1;
  cards: StoredCard[];
}
