import type { EditorialCardData } from "./types";

// Server Action 반환 타입 — 'use server' 파일에서 re-export 시 에러가 날 수 있어 분리
export type ActionState =
  | {
      ok: true;
      mode: "created" | "overwritten" | "deleted";
      dedupKey?: string;
      card?: EditorialCardData;
    }
  | { ok: false; error: string };

// v2.25.0: 등록 전 미리보기·편집 단계용 상태.
// previewCard()가 반환하는 형태로, KV 저장 없이 추출 결과만 포함.
// 클라이언트에서 사용자가 수정한 후 createCardEdited()로 최종 저장.
//
// v2.27.0: debug 필드 추가 — 자동 추출 상태를 사용자가 편집 다이얼로그에서
// 직접 확인 가능. 본문/keyPoints가 부족할 때 어떤 메타데이터가 있었는지 표시.
// v2.28.0: 식별 정보 노출하지 않는 raw 데이터 미리보기·카운트 확장.
// v2.33.0: HTML 구조 진단 추가 — fetch 실패·봇 차단 케이스 진단.
export type PreviewState =
  | {
      ok: true;
      card: EditorialCardData;
      dedupKey: string;
      // v2.43.0: 정규화된 URL — createCardEdited에서 동일 dedupKey 보장용.
      // 사용자가 입력한 URL과 redirect 후 finalUrl이 다를 때, 같은 사이트로 등록 시
      // 다른 dedupKey가 만들어져 중복 등록되는 버그 방지. previewCard에서 dedupKey와
      // 함께 canonicalUrl도 클라이언트에 전달, createCardEdited는 이 URL로 dedupKey 재계산.
      canonicalUrl: string;
      isExisting: boolean;     // 이미 등록된 dedupKey면 true (덮어쓰기 경고용)
      previewedAt: string;
      debug?: {
        contentSignal: "rich" | "thin" | "meta-only" | "(none)";
        rawParagraphsCount: number;
        rawHeadingsCount: number;
        rawKeywordsCount: number;
        rawDescriptionLen: number;
        finalBodyCount: number;
        finalKeyPointsCount: number;
        // v2.28.0
        finalUrl?: string;
        redirected?: boolean;
        htmlBytesSize?: number;
        rawOgDescriptionLen?: number;
        rawTwitterDescriptionLen?: number;
        rawMetaDescriptionLen?: number;
        rawMetaKeywordsLen?: number;
        rawMetaKeywordsCount?: number;
        descriptionAccepted?: boolean;
        firstBodyPreview?: string;
        firstKeyPointPreview?: string;
        // v2.40.0: lead 단락 preview — 합성 시 도메인/사이트명 표시 깨짐 진단
        leadPreview?: string;
        dekPreview?: string;
        ogImagePresent?: boolean;
        cardFromKv?: boolean;
        // v2.33.0: HTML 구조 진단 — 봇 차단·SPA shell 의심 신호
        metaTagCount?: number;        // <meta> 개수 (정상 사이트 보통 5+)
        headChildrenCount?: number;   // <head> 자식 수
        scriptTagCount?: number;      // <script> 개수
        bodyTextLen?: number;         // body 안 모든 텍스트 길이
        scriptToHtmlRatio?: number;   // script가 HTML 차지 비율 (%) — 100% 가까우면 SPA shell
        // v2.34.0: meta 태그 이름들 list
        metaNamesList?: string[];     // ["og:title", "og:image", ...] — 어떤 메타가 있는지 확인
        // v2.38.0: 추출 단계별 결과 가시성 — 사용자가 "어디서 막혔는지" 즉시 파악
        rawParagraphSamples?: string[];     // sanitize 전 paragraphs 첫 3개 (각 80자)
        sanitizedRemovedSamples?: string[]; // sanitize에서 제거된 paragraphs 첫 3개 (각 80자)
        bruteForceTriggered?: boolean;      // brute force walker가 트리거됐는지
        bruteForceAddedCount?: number;      // brute force가 추가한 단락 수
        // v2.39.0: trigger 진단
        mainContentLen?: number;            // 본문 글자 합계 (메타 보강 전)
        needsEnrichment?: boolean;          // outer if 진입 여부
        builderSignature?: string | null;   // HTML에서 감지된 빌더 (imweb·wix 등)
        finalUrlHost?: string;              // redirect 후 최종 호스트
      };
    }
  | { ok: false; error: string };

