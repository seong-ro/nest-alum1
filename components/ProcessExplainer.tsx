"use client";

import { useState } from "react";

const STEPS = [
  {
    no: "01",
    title: "URL 정규화",
    summary: "입력 URL을 표준 형태로 통일",
    detail:
      "http/https · www 유무 · 대소문자 · 추적용 쿼리 파라미터(utm_*·fbclid 등) · trailing slash를 모두 정규화하여 동일 페이지의 다른 변형이 같은 식별자를 갖도록 처리합니다. 같은 사이트를 여러 형식으로 입력해도 중복 카드가 생기지 않습니다.",
    data: "처리 결과는 SHA-256 해시 16자로 변환되어 카드 식별자로 사용됩니다.",
  },
  {
    no: "02",
    title: "중복 검사",
    summary: "기존 카드 있으면 덮어쓰기",
    detail:
      "정규화된 식별자로 Redis 저장소를 조회합니다. 기존 카드가 있으면 새 정보로 자동 갱신(updatedAt 갱신·createdAt 보존)하고, 없으면 새로 추가합니다. 검색·정렬 등 모든 갤러리 동작은 동일 식별자 기준입니다.",
    data: "갤러리에 같은 기업 카드가 여러 개 생기지 않습니다.",
  },
  {
    no: "03",
    title: "외부 페이지 가져오기",
    summary: "URL의 HTML을 서버에서 직접 fetch",
    detail:
      "Vercel 서버가 입력 URL에 9초 타임아웃·11종 브라우저 헤더로 HTTPS 요청합니다. 사용자 브라우저가 아닌 서버에서 가져오므로 사용자 IP·쿠키·세션은 대상 사이트에 노출되지 않습니다. JavaScript 챌린지(rf.gd 등)가 있으면 AES-128-CBC 정확 복호화로 자동 우회 시도합니다.",
    data: "외부 페이지 HTML 응답 (10MB 이하)",
  },
  {
    no: "04",
    title: "본문 추출",
    summary: "8단계 다층 추출로 의미 있는 텍스트 수집",
    detail:
      "cheerio로 HTML 파싱 후 (1) 메타 태그(og:*·twitter:*) (2) p·li·dd·blockquote (3) 헤딩 + 형제 요소 (4) 카드/피처 div (5) iframe 임베드 (6) 의미 있는 a 링크 라벨 (7) img alt (8) body 전체 텍스트 순서로 추출합니다. JS 안내 메시지·boilerplate(navigation·copyright 등)는 자동 제외, 부분 중복 자동 정리.",
    data: "텍스트 단락 배열 + 헤드라인 + OG 이미지 URL",
  },
  {
    no: "05",
    title: "요약 생성",
    summary: "TextRank + MMR로 핵심 문장 선별",
    detail:
      "외부 AI API 호출 없이 서버 자체 알고리즘으로 처리합니다. TextRank 그래프 기반 중요도 점수(40회 반복) + MMR(Maximal Marginal Relevance, λ=0.72)로 중복 적게 다양성 있게 본문 18문장·6단락·핵심포인트 10개를 자동 선별합니다.",
    data: "헤드라인·요약문·본문 단락·핵심 포인트",
  },
  {
    no: "06",
    title: "카드 구성",
    summary: "매거진 형식의 EditorialCard 데이터 생성",
    detail:
      "헤드라인·dek(요약)·본문·핵심포인트·OG 이미지·도메인·사이트명·발행일·작성자 등을 EditorialCardData 타입으로 결합합니다. 자동 추출 실패 시 ManualEntryDialog가 열려 사용자가 직접 입력 가능하며, 이 경우에도 동일한 데이터 구조로 처리됩니다.",
    data: "EditorialCardData 객체 (JSON)",
  },
  {
    no: "07",
    title: "저장 & 갤러리 게시",
    summary: "Upstash Redis 저장 후 즉시 갤러리 표시",
    detail:
      "Tokyo 리전 Upstash Redis에 카드 데이터 + 메타(createdAt·updatedAt·식별자)를 저장합니다. 클라이언트는 낙관적 업데이트로 즉시 반영하고, 서버 검증 후 동기화. 등록 직후 상세 뷰가 자동으로 열려 결과를 바로 확인할 수 있습니다.",
    data: "Redis 키-값 쌍 (JSON 문자열, 영구 저장)",
  },
];

export function ProcessExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="process-detail"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-md border border-border-subtle bg-surface hover:bg-surface-raised transition-colors focus-ring"
      >
        <span className="flex items-center gap-2 text-[0.875rem] font-medium text-fg">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--color-accent)" }}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          입력한 URL이 어떻게 처리되나요?
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            color: "var(--color-fg-muted)",
          }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open ? (
        <div
          id="process-detail"
          className="mt-3 px-5 py-5 md:px-6 md:py-6 rounded-lg border border-border-subtle bg-surface space-y-4"
        >
          <p className="text-[0.825rem] leading-relaxed text-fg-muted">
            URL 입력부터 카드 게시까지 7단계로 처리됩니다. 모든 처리는 Vercel
            서버에서 진행되며 외부 AI API를 사용하지 않습니다.
          </p>

          <ol className="space-y-3">
            {STEPS.map((step) => (
              <li
                key={step.no}
                className="flex gap-3 pb-3 border-b border-border-subtle last:border-b-0 last:pb-0"
              >
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[0.7rem] font-mono font-bold"
                  style={{
                    backgroundColor: "var(--color-accent-subtle)",
                    color: "var(--color-accent)",
                  }}
                >
                  {step.no}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[0.9rem] font-semibold text-fg">
                    {step.title}
                  </h4>
                  <p
                    className="mt-0.5 text-[0.78rem] font-medium"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {step.summary}
                  </p>
                  <p className="mt-1.5 text-[0.825rem] leading-[1.55] text-fg-muted">
                    {step.detail}
                  </p>
                  <div
                    className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded text-[0.7rem] font-mono"
                    style={{
                      backgroundColor: "var(--color-surface-raised)",
                      color: "var(--color-fg-subtle)",
                    }}
                  >
                    <span aria-hidden="true">→</span>
                    {step.data}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* 데이터 처리 원칙 */}
          <div
            className="mt-5 p-4 rounded-md border-2 border-dashed"
            style={{ borderColor: "var(--color-accent)" }}
          >
            <h4 className="text-[0.85rem] font-semibold text-fg mb-2">
              데이터 처리 원칙
            </h4>
            <ul className="text-[0.78rem] leading-[1.6] text-fg-muted space-y-1">
              <li>
                <strong className="text-fg">공개 데이터만 처리</strong> — 로그인이
                필요하거나 비공개인 페이지는 가져올 수 없습니다.
              </li>
              <li>
                <strong className="text-fg">외부 AI API 미사용</strong> — TextRank·MMR
                알고리즘이 서버에서 직접 처리하여 콘텐츠가 OpenAI·Anthropic 등에
                전송되지 않습니다.
              </li>
              <li>
                <strong className="text-fg">서버 fetch</strong> — 사용자 브라우저가
                아닌 Vercel 서버가 외부 페이지에 접근하므로 사용자 IP·쿠키는 노출되지
                않습니다.
              </li>
              <li>
                <strong className="text-fg">사전 동의 권장</strong> — 자사 페이지가
                아닌 타사 정보를 추가할 때는 해당 기업의 사전 동의를 받아주세요.
                동의 없이 게시된 카드는 발견 시 즉시 삭제됩니다.
              </li>
              <li>
                <strong className="text-fg">언제든 수정·삭제</strong> — 동일 URL을
                다시 입력하면 자동 갱신, 관리자 비밀번호로 즉시 삭제 가능합니다.
              </li>
            </ul>
          </div>

          {/* 자동 추출 실패 시 안내 */}
          <div
            className="p-4 rounded-md text-[0.78rem] leading-[1.55]"
            style={{
              backgroundColor: "var(--color-surface-raised)",
              color: "var(--color-fg-muted)",
            }}
          >
            <strong className="text-fg">
              자동 추출이 실패하면?
            </strong>{" "}
            JavaScript 챌린지로 차단되거나 SPA(Single Page Application)라 본문이
            비어있는 사이트에서는 자동 추출이 어렵습니다. 이 경우 수동 입력
            폼이 자동으로 열리고, 가능한 메타데이터(og:title·og:image 등)는 미리
            채워져 사용자가 부족한 부분만 보강하면 됩니다.
          </div>
        </div>
      ) : null}
    </div>
  );
}
