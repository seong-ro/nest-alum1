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
