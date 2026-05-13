"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoredCard, EditorialCardData } from "@/lib/types";
import type { ActionState, PreviewState } from "@/lib/actions-types";
import { getIndustry } from "@/lib/industry";
import {
  createCard,
  createCardManual,
  deleteCardAction,
  getFallbackHints,
  previewCard,
  refreshCardActionDirect,
} from "@/app/actions";
import { EditorialCard } from "./EditorialCard";
import { ThumbnailCard } from "./ThumbnailCard";
import { ProcessExplainer } from "./ProcessExplainer";
import { CardEditDialog } from "./CardEditDialog";

interface Props {
  initialGallery: StoredCard[];
  storageConfigured: boolean;
}

type Mode = "gallery" | "detail";

export function HomeClient({ initialGallery, storageConfigured }: Props) {
  const router = useRouter();
  const [gallery, setGallery] = useState<StoredCard[]>(initialGallery);

  // 서버에서 revalidatePath로 갱신된 새 데이터를 클라이언트 state로 반영
  // (router.refresh() 후 서버 컴포넌트가 새 props를 내려주면 여기서 수신)
  useEffect(() => {
    setGallery(initialGallery);
  }, [initialGallery]);

  const [mode, setMode] = useState<Mode>("gallery");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // 모달 상태 — create 또는 delete
  const [modal, setModal] = useState<
    | { kind: "create"; url: string }
    | {
        kind: "edit";
        url: string;
        password: string;
        card: EditorialCardData;
        dedupKey: string;
        canonicalUrl?: string;  // v2.43.0: 중복 등록 방지용 정규 URL
        isExisting: boolean;
        debug?: NonNullable<Extract<PreviewState, { ok: true }>["debug"]>;
      }
    | { kind: "manual"; url: string; reason: string; prefilledPassword?: string }
    | { kind: "delete"; id: string; label: string; afterDelete?: "gallery" }
    | { kind: "refresh"; id: string; label: string }
    // v2.44.0: 등록된 카드 직접 편집 — 비밀번호 검증 후 CardEditDialog 열기
    | { kind: "edit-existing-pw"; stored: StoredCard }
    | { kind: "share"; id: string; headline: string; dek: string; sourceUrl: string }
    | null
  >(null);

  // v2.44.0: 자동 cron + 일괄 새로고침 다이얼로그 제거
  // (사용자 카드는 v2.37.0 userEdited 시스템으로 영구 보존, 자동 갱신 불필요)

  const createSectionRef = useRef<HTMLDivElement>(null);
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const gallerySectionRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterGallery(gallery, query), [gallery, query]);

  const selectedCard = selectedId
    ? gallery.find((g) => g.id === selectedId)
    : undefined;

  // 안전장치: selectedId는 있지만 갤러리에 카드가 없는 상태
  // (다른 디바이스에서 삭제됨 / router.refresh 직후 일시 불일치 등)
  // → 자동으로 갤러리 모드로 복귀해서 화이트 스크린 방지
  useEffect(() => {
    if (mode === "detail" && selectedId && !selectedCard && gallery.length > 0) {
      setMode("gallery");
      setSelectedId(null);
    }
  }, [mode, selectedId, selectedCard, gallery.length]);

  // ─── History API 통합 ───
  // 상세 뷰 진입 시 history.pushState로 새 항목 추가 → 브라우저 뒤로가기로 갤러리 복귀
  // 외부 사이트로 빠져나가는 것이 아니라 갤러리 모드로 자연스럽게 복귀
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      // history 상태가 detail이 아니면 갤러리 모드로
      const state = e.state as { mode?: Mode } | null;
      if (state?.mode !== "detail") {
        setMode("gallery");
        setSelectedId(null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // 상세 뷰 진입 핸들러 — history 항목 추가하여 뒤로가기 통합
  function openDetail(id: string) {
    setSelectedId(id);
    setMode("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
    // history에 detail 상태 push (뒤로가기 시 popstate로 감지됨)
    if (typeof window !== "undefined") {
      window.history.pushState({ mode: "detail", id }, "");
    }
  }

  // 갤러리 복귀 핸들러 — history.back으로 popstate 트리거 (자연스러움)
  // 만약 상세 진입 시 push 안 된 상태(예: 직접 진입)면 setMode 직접
  function closeDetail() {
    if (
      typeof window !== "undefined" &&
      window.history.state &&
      (window.history.state as { mode?: Mode }).mode === "detail"
    ) {
      window.history.back();
    } else {
      setMode("gallery");
      setSelectedId(null);
    }
  }

  // ─── 상세 뷰 전환 시에도 작동하는 스크롤 ───
  function scrollToSection(ref: React.RefObject<HTMLDivElement | null>) {
    const doScroll = () =>
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (mode === "detail") {
      closeDetail();
      // 다음 두 프레임 대기 — React 커밋 + 레이아웃 완료
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
    } else {
      doScroll();
    }
  }

  return (
    <>
      {/* ─── Top Nav ─── */}
      <header className="sticky top-0 z-20 backdrop-blur-sm bg-white/85 border-b border-border-subtle">
        <div className="max-w-container mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const wasDetail = mode === "detail";
              setMode("gallery");
              setSelectedId(null);
              // 상세 뷰에서 왔으면 두 프레임 대기 후 스크롤 (DOM 마운트 후)
              if (wasDetail) {
                requestAnimationFrame(() =>
                  requestAnimationFrame(() =>
                    window.scrollTo({ top: 0, behavior: "smooth" }),
                  ),
                );
              } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-2.5 focus-ring -mx-1 px-1"
            aria-label="페이지 최상단으로"
          >
            <span
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[0.9rem] font-bold"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)",
              }}
            >
              N
            </span>
            <span className="font-sans text-[0.95rem] font-semibold tracking-tight">
              Alumni 1기
            </span>
          </button>
          <nav className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => scrollToSection(aboutSectionRef)}
              className="text-[0.85rem] font-medium text-fg-muted hover:text-fg transition-colors focus-ring -mx-2 px-2 py-1 rounded-sm"
            >
              소개
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(gallerySectionRef)}
              className="text-[0.85rem] font-medium text-fg-muted hover:text-fg transition-colors focus-ring -mx-2 px-2 py-1 rounded-sm"
              aria-label="추가된 기업 소개 갤러리로 이동"
            >
              갤러리
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(createSectionRef)}
              className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium px-3.5 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors focus-ring"
              aria-label="기업 소개를 갤러리에 추가하기"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>소개 추가</span>
            </button>
          </nav>
        </div>
      </header>

      <main id="main">
        {mode === "detail" && selectedCard ? (
          <div className="max-w-container mx-auto px-6 md:px-10 py-12">
            <DetailView
              card={selectedCard}
              onBack={closeDetail}
              onRequestDelete={() =>
                setModal({
                  kind: "delete",
                  id: selectedCard.id,
                  label: selectedCard.card.headline,
                  afterDelete: "gallery",
                })
              }
              onRequestEdit={() =>
                setModal({
                  kind: "edit-existing-pw",
                  stored: selectedCard,
                })
              }
              onRequestRefresh={() =>
                setModal({
                  kind: "refresh",
                  id: selectedCard.id,
                  label: selectedCard.card.headline,
                })
              }
              onRequestShare={() =>
                setModal({
                  kind: "share",
                  id: selectedCard.id,
                  headline: selectedCard.card.headline,
                  dek: selectedCard.card.dek ?? "",
                  sourceUrl: selectedCard.card.sourceUrl,
                })
              }
            />
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="hero-gradient relative overflow-hidden">
              <div className="max-w-container mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-14 md:pb-20">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <Pill>신용보증기금(신보) · Start-up NEST</Pill>
                  <Pill>NEST 17·18기 출발</Pill>
                  <Pill>NEST 1~16기 환영</Pill>
                  <Pill strong>전 기수 자발적 커뮤니티</Pill>
                </div>
                <h1 className="font-display text-display font-bold tracking-tight max-w-5xl">
                  <span className="block text-fg">Start-up NEST</span>
                  <span className="block mt-1">
                    <span className="gradient-accent">Alumni 1기</span>
                  </span>
                </h1>
                <p className="mt-6 text-[1.15rem] md:text-[1.3rem] leading-[1.5] font-medium text-fg max-w-3xl">
                  <strong className="font-semibold text-accent">신용보증기금(신보, KODIT)</strong> Start-up NEST{" "}
                  <strong className="font-semibold text-accent">전 기수(1~18기 및 후속) 졸업 기업</strong>을 위한{" "}
                  <strong className="font-semibold text-accent">자발적 동문 커뮤니티</strong>
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => scrollToSection(createSectionRef)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-accent text-white font-medium hover:bg-accent-hover transition-colors focus-ring shadow-raised"
                  >
                    기업 소개 추가 →
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(gallerySectionRef)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border text-fg font-medium hover:bg-surface-raised transition-colors focus-ring"
                  >
                    갤러리 둘러보기 ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(aboutSectionRef)}
                    className="inline-flex items-center text-[0.9rem] text-fg-muted hover:text-fg transition-colors focus-ring -mx-2 px-2 py-1 rounded-sm"
                  >
                    Alumni 1기 소개 →
                  </button>
                </div>
              </div>
            </section>

            {/* SEO Landing 섹션 — 검색 키워드 자연어 문장으로 등장 (v2.18.0+)
                v2.20.0: 갤러리 우선 노출을 위해 details로 감싸 접힌 상태 시작.
                <details>는 HTML 표준이라 검색엔진이 펼친 상태로 인식 → SEO 손실 0. */}
            <section
              aria-labelledby="seo-program-intro"
              className="border-t border-border bg-surface"
            >
              <div className="max-w-container mx-auto px-6 md:px-10 py-6 md:py-8">
                <details className="group max-w-4xl">
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-4 py-2 -mx-2 px-2 rounded-md hover:bg-surface-raised transition-colors focus-ring">
                    <div className="flex-1 min-w-0">
                      <span className="eyebrow eyebrow-accent">§ 프로그램 안내</span>
                      <h2
                        id="seo-program-intro"
                        className="mt-2 font-display font-semibold tracking-tight text-[1.25rem] md:text-[1.5rem] leading-tight text-fg"
                      >
                        신용보증기금 Start-up NEST 17기·18기 동문 갤러리란?
                      </h2>
                      <p className="mt-2 text-[0.88rem] text-fg-muted leading-relaxed">
                        신용보증기금(신보, KODIT) Start-up NEST 17기·18기 졸업 기업의 동문 커뮤니티 안내, 활용 이점, 운영 정보 — 클릭하여 자세히 보기
                      </p>
                    </div>
                    <span
                      className="shrink-0 mt-2 w-7 h-7 rounded-md flex items-center justify-center text-fg-muted group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </summary>

                  <div className="pt-6 mt-2 border-t border-border-subtle">
                  <div className="space-y-5 text-[0.98rem] leading-[1.75] text-fg">
                    <p>
                      <strong>신용보증기금(신보, KODIT)</strong>이 운영하는{" "}
                      <strong>Start-up NEST(스타트업 네스트)</strong>는 한국의 대표적인
                      스타트업 액셀러레이션 프로그램입니다. 본 사이트는{" "}
                      <strong>신용보증기금 Start-up NEST 17기</strong>와{" "}
                      <strong>신용보증기금 Start-up NEST 18기</strong>를 졸업한 기업이
                      첫 세대(Alumni 1기)로 자발적으로 결성한 동문 커뮤니티 갤러리입니다.
                    </p>
                    <p>
                      <strong>스타트업 네스트 17기</strong>·<strong>스타트업 네스트 18기</strong>{" "}
                      출신 기업이 자사 홈페이지나 보도자료 URL을 입력하면 매거진 형식의
                      기업 소개 카드가 자동 생성되어 갤러리에 추가됩니다.{" "}
                      <strong>신보 NEST 17기 동문</strong>,{" "}
                      <strong>NEST 18기 동문</strong> 모두 자발적으로 참여 가능하며,
                      등록 여부는 100% 자율입니다.
                    </p>
                    <p>
                      <strong>KODIT NEST Alumni</strong> 1기는 첫 두 기수(NEST 17기, NEST 18기)
                      졸업 기업이 출발점이지만, 향후 <strong>Start-up NEST 19기</strong> 이후
                      기수 졸업 기업도 순차적으로 합류할 수 있도록 열려 있습니다.
                      신용보증기금 액셀러레이션 프로그램에 참여한 모든 동문이 서로의 사업·기술·서비스를
                      한눈에 파악하고 협력 기회를 모색할 수 있도록 설계되었습니다.
                    </p>
                  </div>

                  {/* 동문 기업 이점 — E-E-A-T Experience 신호 + 사용자 가치 중심 */}
                  <div className="mt-10">
                    <h3 className="font-semibold text-fg text-[1.1rem] mb-4">
                      동문 기업이 본 갤러리를 활용하는 방법
                    </h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[0.92rem] text-fg leading-relaxed list-none">
                      <li>
                        <strong>· 동문 사업 한눈에 파악</strong> — 다른 17기·18기 기업이
                        어떤 사업·기술을 다루는지 매거진 카드 갤러리에서 빠르게 탐색
                      </li>
                      <li>
                        <strong>· 협력 후보 발굴</strong> — 업종 카테고리 multi-select 필터로
                        기술 협력·공동 사업 가능한 동문 기업 즉시 식별
                      </li>
                      <li>
                        <strong>· 등록 부담 없음</strong> — 회원가입·로그인 절차 없이
                        URL 1개만 입력하면 매거진 카드 자동 생성
                      </li>
                      <li>
                        <strong>· 셀프 관리</strong> — 카드 등록 시 본인이 설정한 관리 코드로
                        직접 등록·수정·삭제 (운영자 거치지 않음)
                      </li>
                      <li>
                        <strong>· 검색 엔진 노출</strong> — Google·Naver·Bing에 자동 인덱싱되어
                        잠재 고객·투자자 검색 시 자연 노출
                      </li>
                      <li>
                        <strong>· AI 답변 인용</strong> — ChatGPT·Claude·Perplexity·Gemini
                        답변에 카드 정보 인용 가능 (llms.txt + JSON-LD 적용)
                      </li>
                      <li>
                        <strong>· 자유로운 카드 공유</strong> — 카드별 고유 URL로
                        소셜·이메일·메신저에 직접 공유 (Web Share API 통합)
                      </li>
                      <li>
                        <strong>· 즐겨찾기 개인화</strong> — 관심 동문 기업을
                        ★ 즐겨찾기로 표시하여 빠른 재방문 (서버 부하 0)
                      </li>
                    </ul>
                  </div>

                  {/* 핵심 사실 박스 — Knowledge Graph 친화 */}
                  <dl className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-[0.88rem]">
                    <div>
                      <dt className="font-semibold text-fg">프로그램 운영</dt>
                      <dd className="mt-1 text-fg-muted">
                        신용보증기금 (신보, KODIT, Korea Credit Guarantee Fund)
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-fg">프로그램 명칭</dt>
                      <dd className="mt-1 text-fg-muted">
                        Start-up NEST (스타트업 네스트)
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-fg">참여 기수</dt>
                      <dd className="mt-1 text-fg-muted">
                        NEST 17기 졸업 기업 + NEST 18기 졸업 기업 (Alumni 1기 출발점)
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-fg">커뮤니티 성격</dt>
                      <dd className="mt-1 text-fg-muted">
                        동문 자발적 비공식 커뮤니티 (신보 공식 사이트 아님)
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-fg">출범일</dt>
                      <dd className="mt-1 text-fg-muted">
                        2025년 12월 15일 (SOUND2025 행사)
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-fg">운영 주체</dt>
                      <dd className="mt-1 text-fg-muted">
                        주식회사 워터리아 (Water-RIA) — Start-up NEST 동문 기업
                      </dd>
                    </div>
                  </dl>

                  {/* 비공식 안내 — Trustworthiness 신호 */}
                  <div className="mt-8 p-4 rounded-md border border-border bg-bg text-[0.85rem] text-fg-muted leading-relaxed">
                    <strong className="text-fg">⚠️ 안내:</strong> 본 사이트는{" "}
                    <a
                      href="https://www.kodit.co.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline focus-ring rounded-sm"
                    >
                      신용보증기금 공식 사이트
                    </a>
                    가 아닙니다. Start-up NEST <strong>전 기수(1~18기 및 후속) 졸업 기업</strong>을 위한 자발적
                    동문 커뮤니티이며 (출발점은 17기·18기), 운영은 동문 중 한 기업인 주식회사 워터리아가
                    담당합니다. 등록·참여는 각 기업의 자율 판단입니다.
                  </div>
                  </div>
                </details>
              </div>
            </section>

            {/* About — v2.20.0: 갤러리 우선 노출을 위해 접힌 상태로 시작 */}
            <section
              ref={aboutSectionRef}
              id="about"
              className="border-t border-border bg-surface"
            >
              <div className="max-w-container mx-auto px-6 md:px-10 py-6 md:py-8">
                <details className="group">
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-4 py-2 -mx-2 px-2 rounded-md hover:bg-surface-raised transition-colors focus-ring">
                    <div className="flex-1 min-w-0">
                      <span className="eyebrow eyebrow-accent">§ About</span>
                      <h2 className="mt-2 font-display font-semibold tracking-tight text-[1.25rem] md:text-[1.5rem] leading-tight text-fg">
                        최초로 만들어진 Alumni 1기
                      </h2>
                      <p className="mt-2 text-[0.88rem] text-fg-muted leading-relaxed">
                        SOUND2025(2025.12.15) 출범, NEST 17기·18기 동문 커뮤니티 — 클릭하여 자세히 보기
                      </p>
                    </div>
                    <span
                      className="shrink-0 mt-2 w-7 h-7 rounded-md flex items-center justify-center text-fg-muted group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </summary>

                  <div className="pt-6 mt-2 border-t border-border-subtle">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
                  <div className="lg:col-span-4">
                    <h3
                      className="font-display font-bold tracking-tight"
                      style={{
                        fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                        lineHeight: 1.1,
                      }}
                    >
                      최초로 만들어진
                      <br />
                      Alumni 1기
                    </h3>
                    <p className="mt-5 text-[0.95rem] text-fg-muted leading-relaxed">
                      신용보증기금 <strong className="text-fg">Start-up NEST</strong>{" "}
                      프로그램의{" "}
                      <strong className="text-fg">17기·18기 졸업 기업</strong>을
                      시작점으로,{" "}
                      <strong className="text-fg">SOUND2025</strong>(2025.12.15)
                      에서 출범한 NEST 출신 기업 최초의 Alumni 커뮤니티입니다.
                    </p>
                    <p className="mt-4 text-[0.9rem] text-fg-muted leading-relaxed">
                      그 동안 NEST 프로그램이 축적해 온 네트워크 역량을 기반으로,
                      기수의 경계를 넘어 졸업 기업 간 교류·기술 협력·투자 연계를
                      촉진하는 지속 가능한 동문 생태계를 만들어갑니다.
                    </p>
                  </div>
                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <AboutCard
                      n="01"
                      title="시작점"
                      body="신용보증기금 Start-up NEST 17기·18기 졸업 기업이 NEST Alumni 1기의 출발점입니다. 이후 기수 졸업 기업도 순차 합류 예정."
                    />
                    <AboutCard
                      n="02"
                      title="출범"
                      body="SOUND2025 ‘Next Chapter’ NEST Networking 세션에서 공식 출범. 초대 회장단을 중심으로 운영 거버넌스 구성."
                    />
                    <AboutCard
                      n="03"
                      title="역할"
                      body="Alumni 기반 지속 가능 커뮤니티로서 NEST 생태계 활성화·기업 간 상호 네트워크 구축·기술 및 투자 협력 매개."
                    />
                  </div>
                </div>

                {/* 타임라인 — Alumni 1기 탄생 흐름 */}
                <div className="mt-14 pt-10 border-t border-border-subtle">
                  <span className="eyebrow eyebrow-accent">§ Timeline</span>
                  <h3 className="mt-3 font-display text-[1.5rem] font-semibold tracking-tight mb-6">
                    Alumni 1기 탄생 배경
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border-subtle border border-border rounded-lg overflow-hidden">
                    <TimelineStep
                      label="STEP 01"
                      title="NEST 17기 졸업"
                      detail="신용보증기금 Start-up NEST 17기 프로그램 수료"
                    />
                    <TimelineStep
                      label="STEP 02"
                      title="NEST 18기 졸업"
                      detail="17기와 함께 1기 결성의 토대 마련"
                    />
                    <TimelineStep
                      label="STEP 03"
                      title="Alumni 1기 결성"
                      detail="17·18기 졸업 기업이 첫 번째 Alumni 세대로 합류"
                    />
                    <TimelineStep
                      label="STEP 04"
                      title="SOUND2025 출범"
                      detail="2025.12.15 NEST Networking 세션에서 공식 출범 + 초대 회장단 발표"
                      leadership={[
                        {
                          role: "회장",
                          company: "(주)도와주다",
                        },
                        {
                          role: "부회장",
                          company: "(주)모두의권리",
                        },
                      ]}
                      highlight
                    />
                    <TimelineStep
                      label="STEP 05"
                      title="커뮤니티 합류"
                      detail="카카오톡 오픈채팅방으로 NEST Alumni 1기 동문 네트워크에 합류하세요. 운영 문의는 신용보증기금 스타트업그라운드팀."
                      community={{
                        kakaoUrl: "https://open.kakao.com/o/g57uDvqi",
                        kakaoSearch: "nest alumni 1기",
                        contacts: [
                          { label: "운영", phone: "02-710-4678" },
                          { label: "운영", phone: "02-710-4679" },
                        ],
                        email: "startup@kodit.co.kr",
                        team: "신용보증기금 스타트업그라운드팀",
                      }}
                    />
                  </div>
                </div>
                  </div>
                </details>
              </div>
            </section>

            {/* 저장소 경고 */}
            {!storageConfigured ? (
              <section className="max-w-container mx-auto px-6 md:px-10 py-8">
                <div
                  className="px-4 py-3 rounded-md border flex items-start gap-2.5 text-[0.875rem]"
                  style={{
                    borderColor: "#fecaca",
                    backgroundColor: "#fef2f2",
                    color: "#991b1b",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="shrink-0 mt-0.5"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>
                    <strong className="font-semibold">저장소 연결 불가: </strong>
                    Vercel Marketplace에서 Upstash Redis를 연결하고 재배포하세요.
                  </span>
                </div>
              </section>
            ) : null}

            {/* Gallery */}
            <section
              ref={gallerySectionRef}
              id="gallery"
              className="max-w-container mx-auto px-6 md:px-10 py-12 md:py-16"
            >
              <GallerySection
                gallery={gallery}
                filtered={filtered}
                query={query}
                onQueryChange={setQuery}
                onOpen={openDetail}
                onDelete={(id, label) =>
                  setModal({ kind: "delete", id, label })
                }
                onEdit={(stored) =>
                  setModal({ kind: "edit-existing-pw", stored })
                }
                onCreate={() => scrollToSection(createSectionRef)}
              />
            </section>

            {/* Create — 기업 소개 추가 */}
            <section
              ref={createSectionRef}
              id="create"
              className="bg-surface-raised border-y border-border"
            >
              <div className="max-w-container mx-auto px-6 md:px-10 py-16 md:py-20">
                <div className="max-w-2xl mx-auto">
                  <span className="eyebrow eyebrow-accent">§ Add</span>
                  <h2 className="mt-3 text-hero font-display font-semibold tracking-tight">
                    기업 소개 추가하기
                  </h2>
                  <p className="mt-4 text-fg-muted leading-relaxed">
                    Start-up NEST 17·18기 졸업 기업 또는 향후 기수의 동문 기업의
                    소개를 갤러리에 추가할 수 있습니다. 자사 홈페이지가 없어도
                    괜찮습니다 — 기업을 다룬 뉴스 기사·블로그 글·보도자료·발표
                    자료 등 공개된 페이지의 URL이면 무엇이든 가능합니다.
                    입력한 페이지의 본문이 자동으로 정리되어 매거진 형식의
                    소개로 공개됩니다.
                  </p>
                  <div className="mt-6 px-4 py-3 rounded-md border border-border-subtle bg-surface text-[0.825rem] leading-[1.55]">
                    <strong className="text-fg">사용 가능한 URL 예시</strong>
                    <ul className="mt-2 space-y-1 text-fg-muted">
                      <li>• 자사 홈페이지: <code className="font-mono text-[0.78rem] bg-surface-raised px-1 py-0.5 rounded">https://your-company.com</code></li>
                      <li>• 기업 소개 뉴스 기사: <code className="font-mono text-[0.78rem] bg-surface-raised px-1 py-0.5 rounded">https://news.example.com/article/...</code></li>
                      <li>• 보도자료·블로그 글</li>
                      <li>• 본문이 풍부한 회사 소개 페이지</li>
                    </ul>
                  </div>
                  <div
                    className="mt-6 p-8 md:p-10 rounded-xl shadow-overlay relative overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-surface) 0%, var(--color-accent-subtle) 100%)",
                      border: "1px solid var(--color-accent)",
                      borderTopWidth: "4px",
                    }}
                  >
                    {/* 좌상단 액센트 글리프 */}
                    <div
                      className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[0.65rem] font-mono font-semibold tracking-wider"
                      style={{
                        backgroundColor: "var(--color-accent)",
                        color: "#ffffff",
                      }}
                    >
                      URL 입력
                    </div>
                    <UrlEntryForm
                      onSubmit={(url) =>
                        setModal({ kind: "create", url })
                      }
                      disabled={!storageConfigured}
                    />
                  </div>

                  {/* URL 처리 과정 설명 (펼침형) */}
                  <ProcessExplainer />
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="max-w-container mx-auto px-6 md:px-10 py-8">
          {/* 상단 SEO/정보 섹션 — 다양한 호칭 자연스럽게 노출 (v2.20.0: 접힌 상태) */}
          <details className="group mb-6">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 py-2 -mx-2 px-2 rounded-md hover:bg-surface-raised transition-colors focus-ring text-[0.85rem]">
              <span className="font-semibold text-fg">
                커뮤니티 소개 · 다양한 호칭 · 프로그램 모기관
              </span>
              <span
                className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-fg-muted group-open:rotate-180 transition-transform"
                aria-hidden="true"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </summary>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-[0.78rem] leading-relaxed">
              <div>
                <h3 className="font-semibold text-fg mb-2 text-[0.85rem]">
                  커뮤니티 소개
                </h3>
                <p className="text-fg-muted">
                  <strong className="text-fg">신용보증기금(신보, KODIT)</strong>
                  {" "}Start-up NEST 17기·18기 졸업 기업이 첫 세대로 결성한
                  동문 커뮤니티. NEST 17기 동문, NEST 18기 동문이 자발적으로 참여하는
                  무료 갤러리입니다.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-2 text-[0.85rem]">
                  다양한 호칭
                </h3>
                <ul className="text-fg-muted space-y-0.5">
                  <li>· 신용보증기금 Start-up NEST Alumni 1기</li>
                  <li>· 신보 NEST Alumni 1기 / KODIT NEST Alumni</li>
                  <li>· Start-up NEST 17기·18기 동문</li>
                  <li>· 신보 17기·18기 / 스타트업 네스트 17기·18기</li>
                  <li>· 스타트업 네스트 동문 1기</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-2 text-[0.85rem]">
                  프로그램 모기관
                </h3>
                <p className="text-fg-muted">
                  <a
                    href="https://www.kodit.co.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline focus-ring rounded-sm"
                  >
                    신용보증기금 (신보 / KODIT) ↗
                  </a>
                  <br />
                  Start-up NEST(스타트업 네스트) 액셀러레이션 프로그램 운영.
                  본 사이트는 17기·18기 졸업 기업이 자발적으로 결성한 비공식 동문 커뮤니티.
                </p>
              </div>
            </div>
          </details>

          {/* 하단 저작권 라인 */}
          <div className="pt-6 border-t border-border-subtle flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[0.75rem] font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)",
                }}
              >
                N
              </span>
              <span className="text-[0.85rem] text-fg-muted">
                신용보증기금 Start-up NEST Alumni 1기 · NEST 17기·18기 동문
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-fg-subtle font-mono">
              <span>© {new Date().getFullYear()} · MIT License</span>
              <span aria-hidden="true">·</span>
              <span className="text-fg-muted">
                Built by{" "}
                <a
                  href="https://water-ria.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent hover:underline focus-ring rounded-sm"
                >
                  워터리아(Water-RIA) ↗
                </a>
              </span>
              <span aria-hidden="true">·</span>
              <a
                href="/api/version"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm text-fg-muted hover:underline focus-ring"
                title="현재 배포된 정확한 버전 · 커밋 · 시간 확인"
              >
                v{process.env.NEXT_PUBLIC_APP_VERSION ?? "?"} ↗
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 모달 — create / manual / delete 분기 */}
      {modal && modal.kind === "manual" ? (
        <ManualEntryDialog
          url={modal.url}
          reason={modal.reason}
          prefilledPassword={modal.prefilledPassword}
          onCancel={() => setModal(null)}
          onSuccess={(result) => {
            if (result.ok && result.dedupKey && result.card) {
              const newId = result.dedupKey;
              const newCard = result.card;
              const now = new Date().toISOString();
              setGallery((prev) => {
                const existingIdx = prev.findIndex((c) => c.id === newId);
                const nextEntry: StoredCard = {
                  id: newId,
                  card: newCard,
                  createdAt:
                    existingIdx >= 0 ? prev[existingIdx].createdAt : now,
                  updatedAt: now,
                };
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = nextEntry;
                  return copy;
                }
                return [nextEntry, ...prev];
              });
              setModal(null);
              openDetail(newId);
              router.refresh();
            }
          }}
        />
      ) : null}

      {/* 비밀번호 모달 — create/delete/refresh/edit-existing-pw 처리 */}
      {modal && (modal.kind === "create" || modal.kind === "delete" || modal.kind === "refresh" || modal.kind === "edit-existing-pw") ? (
        <PasswordDialog
          variant={modal.kind === "edit-existing-pw" ? "edit" : modal.kind}
          targetLabel={
            modal.kind === "delete" || modal.kind === "refresh"
              ? modal.label
              : modal.kind === "edit-existing-pw"
                ? modal.stored.card.headline
                : undefined
          }
          onCancel={() => setModal(null)}
          action={async (password) => {
            if (modal.kind === "edit-existing-pw") {
              // v2.44.0: 비밀번호만 검증되면 즉시 CardEditDialog 열기
              // (등록된 카드를 그대로 로드해서 편집 가능하게)
              const stored = modal.stored;
              const nextEditModal = {
                kind: "edit" as const,
                url: stored.card.sourceUrl,
                password,
                card: stored.card,
                dedupKey: stored.id,
                canonicalUrl: stored.card.sourceUrl,
                isExisting: true,
                debug: undefined,
              };
              setModal(null);
              setTimeout(() => setModal(nextEditModal), 150);
              return { ok: true, mode: "overwritten" as const };
            }
            if (modal.kind === "create") {
              const fd = new FormData();
              fd.set("url", modal.url);
              fd.set("password", password);

              // v2.25.0: createCard(자동 등록) → previewCard(미리보기) 전환.
              // 사용자가 추출 결과를 검토·편집한 후 createCardEdited로 최종 저장.
              const result = await previewCard(null, fd);
              if (result.ok) {
                // 비밀번호 모달 닫고 편집 모달로 전환
                const nextEditModal = {
                  kind: "edit" as const,
                  url: modal.url,
                  password,
                  card: result.card,
                  dedupKey: result.dedupKey,
                  canonicalUrl: result.canonicalUrl,  // v2.43.0: 중복 등록 방지
                  isExisting: result.isExisting,
                  debug: result.debug,
                };
                setModal(null);
                setTimeout(() => setModal(nextEditModal), 150);
                // 비밀번호 모달은 success(ok=true)로 인지하고 닫힘. 하지만 ActionState
                // 반환 시 mode 필드가 필요 — 여기선 임시로 'created' 플레이스홀더.
                // 실제 created/overwritten은 createCardEdited 결과에서 결정.
                return { ok: true, mode: "created" as const };
              }
              if (
                result.error &&
                /자동 추출이 차단|봇 차단|본문을 찾을 수 없|내용을 찾을 수 없|시간 안에 끝나지 못|시간 안에|외부 자동 접근을 차단|일시적 오류|매우 짧은 응답|보안 정책/.test(result.error)
              ) {
                // ─── 자동 추출 실패 → 수동 입력 모드로 자동 전환 제안 ───
                const failUrl = modal.url;
                const verifiedPassword = password;
                setModal(null);
                setTimeout(() => {
                  setModal({
                    kind: "manual",
                    url: failUrl,
                    reason: result.error ?? "자동 추출이 불가능합니다",
                    prefilledPassword: verifiedPassword,
                  });
                }, 200);
                return { ok: false, error: result.error };
              }
              return { ok: false, error: result.error };
            } else if (modal.kind === "delete") {
              const fd = new FormData();
              fd.set("id", modal.id);
              fd.set("password", password);
              const deletedId = modal.id;
              const shouldGoBack = modal.afterDelete === "gallery";
              const result = await deleteCardAction(null, fd);
              if (result.ok) {
                setGallery((prev) => prev.filter((c) => c.id !== deletedId));
                setModal(null);
                if (shouldGoBack) {
                  setMode("gallery");
                  setSelectedId(null);
                }
                router.refresh();
              }
              return result;
            } else if (modal.kind === "refresh") {
              const result = await refreshCardActionDirect(modal.id, password);
              if (result.ok && result.card) {
                const refreshedId = modal.id;
                const refreshedCard = result.card;
                const now = new Date().toISOString();
                setGallery((prev) =>
                  prev.map((c) =>
                    c.id === refreshedId
                      ? { ...c, card: refreshedCard, updatedAt: now }
                      : c,
                  ),
                );
                setModal(null);
                router.refresh();
              }
              return result;
            }
            return { ok: false, error: "알 수 없는 작업입니다." };
          }}
        />
      ) : null}

      {/* 공유 모달 */}
      {modal && modal.kind === "share" ? (
        <ShareDialog
          cardId={modal.id}
          headline={modal.headline}
          dek={modal.dek}
          sourceUrl={modal.sourceUrl}
          onClose={() => setModal(null)}
        />
      ) : null}

      {/* v2.25.0: 등록 전 미리보기·편집 모달 */}
      {modal && modal.kind === "edit" ? (
        <CardEditDialog
          url={modal.url}
          password={modal.password}
          card={modal.card}
          dedupKey={modal.dedupKey}
          canonicalUrl={modal.canonicalUrl}
          isExisting={modal.isExisting}
          debug={modal.debug}
          onCancel={() => setModal(null)}
          onComplete={(result) => {
            if (result.ok && result.dedupKey && result.card) {
              const newId = result.dedupKey;
              const newCard = result.card;
              const now = new Date().toISOString();

              setGallery((prev) => {
                const existingIdx = prev.findIndex((c) => c.id === newId);
                const nextEntry: StoredCard = {
                  id: newId,
                  card: newCard,
                  createdAt: existingIdx >= 0 ? prev[existingIdx].createdAt : now,
                  updatedAt: now,
                };
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = nextEntry;
                  return copy;
                }
                return [nextEntry, ...prev];
              });

              setModal(null);
              openDetail(newId);
              router.refresh();
            }
          }}
        />
      ) : null}

      {/* v2.44.0: 일괄 새로고침 다이얼로그 제거 — userEdited 시스템으로 자동 갱신 불필요 */}
    </>
  );
}

// ---------------------------------------------------------------------------
// URL 입력 폼
// ---------------------------------------------------------------------------

function UrlEntryForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (url: string) => void;
  disabled: boolean;
}) {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 실시간 검증 — 사용자가 입력 중일 때 형식 오류 즉시 표시
  const trimmed = url.trim();
  const inlineError = useMemo(() => {
    if (!trimmed) return null;
    if (
      !/^https?:\/\/\S+/i.test(trimmed) &&
      !/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(trimmed)
    ) {
      return "유효한 URL 형식이 아닙니다. 예: https://example.com";
    }
    return null;
  }, [trimmed]);

  const isValid = !!trimmed && !inlineError;
  const showError = touched && (inlineError || submitError);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setTouched(true);
    if (!trimmed) {
      setSubmitError("URL을 입력해주세요.");
      return;
    }
    if (inlineError) {
      setSubmitError(inlineError);
      return;
    }
    setSubmitError(null);
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <label
        htmlFor="url"
        className="block mb-2 text-[1rem] font-semibold text-fg"
      >
        기업 관련 페이지 URL
      </label>
      <p className="text-[0.825rem] text-fg-muted mb-3 leading-relaxed">
        자사 홈페이지·뉴스 기사·보도자료 등 무엇이든 OK
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          {/* 좌측 링크 아이콘 */}
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-accent)" }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </span>
          <input
            id="url"
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            onBlur={() => setTouched(true)}
            disabled={disabled}
            aria-invalid={!!showError}
            aria-describedby={showError ? "url-error" : "url-help"}
            className={`w-full pl-11 pr-12 py-4 bg-white border-2 rounded-md
                       text-[1rem] font-medium
                       placeholder:text-fg-subtle placeholder:font-normal
                       focus:outline-none focus:ring-4 focus:ring-accent/15
                       disabled:opacity-60 transition-all shadow-sm
                       ${showError ? "border-red-400 focus:border-red-500" : isValid ? "border-emerald-500 focus:border-emerald-600" : "border-border focus:border-accent"}`}
          />
          {/* 우측 유효성 인디케이터 */}
          {trimmed && !inlineError ? (
            <span
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600"
              aria-hidden="true"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={disabled}
          aria-label="입력한 URL로 기업 소개 만들기"
          className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-md
                     bg-accent text-white text-[1rem] font-semibold whitespace-nowrap
                     hover:bg-accent-hover active:scale-[0.98]
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all focus-ring shadow-raised"
        >
          소개 만들기 →
        </button>
      </div>
      <p
        id="url-help"
        className="mt-4 text-[0.825rem] text-fg-muted leading-relaxed"
      >
        동일 URL을 다시 등록하면 기존 소개가 자동 갱신됩니다.
        소개 추가·갱신·내림 작업 시 관리자 비밀번호 확인이 필요합니다.
      </p>
      {/* v2.42.0: 정부·공공기관 도메인 사전 안내 — kodit.or.kr 같은 케이스 대응.
          .or.kr/.go.kr 도메인은 봇 차단이 흔해 자동 추출 실패 가능성 있음.
          실패해도 수동 입력으로 등록 가능하니 미리 안내하여 사용자 혼란 방지. */}
      {trimmed && /^https?:\/\/[^/]+\.(or|go)\.kr/i.test(trimmed) ? (
        <div
          className="mt-3 px-3.5 py-2.5 rounded-md border border-sky-200 bg-sky-50 text-[0.825rem] text-sky-900 leading-relaxed"
          role="status"
        >
          <span className="mr-1">ℹ️</span>
          <strong>공공기관·정부 사이트로 보여요.</strong>{" "}
          이런 사이트는 보안 정책 때문에 자동 추출이 실패할 수 있습니다.
          그래도 걱정 마세요 — 자동 추출이 안 되면 직접 입력 화면으로 자동 전환됩니다.
        </div>
      ) : null}
      {showError ? (
        <div
          id="url-error"
          className="mt-5 px-4 py-3 rounded-md border border-red-200 bg-red-50 text-[0.9rem] text-red-700"
          role="alert"
        >
          {inlineError ?? submitError}
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 수동 입력 모달 — JS 챌린지 사이트(rf.gd 등) 폴백
// ---------------------------------------------------------------------------

/**
 * v2.43.0: 모달 backdrop 클릭 시 안전한 닫힘 처리 hook.
 *
 * **해결하는 치명적 UX 버그**:
 *  1. 입력란 안에서 텍스트 드래그 → mousedown은 input → 마우스가 backdrop으로
 *     이동하며 mouseup이 backdrop에서 발생 → click 이벤트가 공통 조상(backdrop)
 *     에서 발생 → e.target === e.currentTarget 참 → 모달 닫힘.
 *  2. 우클릭 메뉴 "복사/붙여넣기" 클릭 시 컨텍스트 메뉴가 backdrop 위에 떠있어
 *     같은 문제 재현.
 *  3. 모바일 long-press 후 드래그 선택 시 동일.
 *
 * **해결**: mousedown/touchstart가 backdrop에서 시작했을 때만 닫기.
 * 드래그·복사·붙여넣기는 input/dialog 안에서 시작하므로 모두 보호됨.
 */
function useSafeBackdropClose(onClose: () => void, disabled = false) {
  const downOnBackdropRef = useRef(false);
  const interactedWithFormRef = useRef(false);

  // v2.43.0: 폼 요소 상호작용 또는 텍스트 선택 추적 — backdrop 닫힘 차단
  useEffect(() => {
    function markFormInteraction(e: Event) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.matches("input, textarea, select, button, [contenteditable]")) {
        interactedWithFormRef.current = true;
        setTimeout(() => {
          interactedWithFormRef.current = false;
        }, 100);
      }
    }
    function markSelection() {
      const sel = document.getSelection();
      if (sel && sel.toString().length > 0) {
        interactedWithFormRef.current = true;
        setTimeout(() => {
          interactedWithFormRef.current = false;
        }, 100);
      }
    }
    document.addEventListener("mousedown", markFormInteraction, true);
    document.addEventListener("touchstart", markFormInteraction, true);
    document.addEventListener("selectionchange", markSelection);
    return () => {
      document.removeEventListener("mousedown", markFormInteraction, true);
      document.removeEventListener("touchstart", markFormInteraction, true);
      document.removeEventListener("selectionchange", markSelection);
    };
  }, []);

  return {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      downOnBackdropRef.current =
        e.target === e.currentTarget && !interactedWithFormRef.current;
    },
    onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => {
      const sel = document.getSelection();
      const hasSelection = sel && sel.toString().length > 0;
      if (
        e.target === e.currentTarget &&
        downOnBackdropRef.current &&
        !hasSelection &&
        !interactedWithFormRef.current &&
        !disabled
      ) {
        onClose();
      }
      downOnBackdropRef.current = false;
    },
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      downOnBackdropRef.current =
        e.target === e.currentTarget && !interactedWithFormRef.current;
    },
    onTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => {
      const sel = document.getSelection();
      const hasSelection = sel && sel.toString().length > 0;
      if (
        e.target === e.currentTarget &&
        downOnBackdropRef.current &&
        !hasSelection &&
        !interactedWithFormRef.current &&
        !disabled
      ) {
        onClose();
      }
      downOnBackdropRef.current = false;
    },
  };
}

function ManualEntryDialog({
  url,
  reason,
  prefilledPassword,
  onCancel,
  onSuccess,
}: {
  url: string;
  reason: string;
  prefilledPassword?: string;
  onCancel: () => void;
  onSuccess: (result: ActionState) => void;
}) {
  // 미리채움용 상태 (formAction이 참조하므로 먼저 선언)
  const [headline, setHeadline] = useState("");
  const [dek, setDek] = useState("");
  const [body, setBody] = useState("");
  const [hintsLoading, setHintsLoading] = useState(true);
  const [hintsApplied, setHintsApplied] = useState(false);
  const [ogImage, setOgImage] = useState<string | undefined>(undefined);
  const [siteName, setSiteName] = useState<string | undefined>(undefined);

  const [state, formAction, pending] = useActionState<
    ActionState | null,
    FormData
  >(async (_, fd) => {
    fd.set("url", url);
    // 자동 추출 단계에서 검증된 비밀번호가 있으면 그대로 사용 → 사용자에게 다시 안 묻기
    if (prefilledPassword) {
      fd.set("password", prefilledPassword);
    }
    // OG 이미지·사이트명을 hints에서 받은 그대로 서버로 전달
    if (ogImage) fd.set("ogImage", ogImage);
    if (siteName) fd.set("siteName", siteName);
    const result = await createCardManual(null, fd);
    if (result.ok) onSuccess(result);
    return result;
  }, null);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  // ─── 모달 열리자마자 폴백 힌트 자동 가져오기 ───
  // 6초 후엔 자동으로 포기하여 사용자가 직접 입력하도록 (UX 멈춤 방지)
  useEffect(() => {
    let cancelled = false;
    // 6초 안에 끝나지 않으면 자동으로 hintsLoading 종료
    const giveUpTimer = setTimeout(() => {
      if (!cancelled) {
        setHintsLoading(false);
      }
    }, 6000);

    (async () => {
      try {
        const result = await getFallbackHints(url);
        if (cancelled) return;
        if (result.ok) {
          setHeadline(result.hints.suggestedHeadline);
          setDek(result.hints.suggestedDek);
          setBody(result.hints.suggestedBody);
          setOgImage(result.hints.rawMeta.ogImage);
          setSiteName(result.hints.rawMeta.siteName);
          setHintsApplied(true);
        }
      } catch {
        // 무시 — 사용자가 직접 입력하면 됨
      } finally {
        if (!cancelled) setHintsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(giveUpTimer);
    };
  }, [url]);

  // ESC 키
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, onCancel]);

  // v2.43.0: 드래그·붙여넣기 시 모달 닫힘 완벽 차단 (치명적 UX 버그 수정).
  //
  // 이전 문제: 사용자가 입력란 안에서 텍스트 드래그 시작 시 mousedown은 input에서
  // 발생하나 마우스가 backdrop으로 이동하면 mouseup이 backdrop에서 발생 → click
  // 이벤트가 공통 조상(backdrop)에서 발생 → 모달이 닫혀 입력 데이터 유실.
  // 우클릭 메뉴 "복사/붙여넣기"·우클릭 위 컨텍스트 메뉴 클릭도 동일 문제.
  //
  // v2.43.0 해결: backdrop click 핸들러 자체 제거. 닫기는 명시적 액션만 허용
  // — X 버튼·ESC 키·취소 버튼. 사용자가 의도하지 않은 닫힘 100% 차단.

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
      // v2.43.0: backdrop 클릭으로 닫기 완전 비활성화.
      // 사용자가 입력란 안에서 드래그/복사/붙여넣기/우클릭 등 어떤 텍스트 조작을
      // 해도 모달이 절대 닫히지 않도록 보장. 닫기는 X 버튼·ESC 키·취소 버튼만 가능.
      // 이전 v2.42.0 이전: backdrop click → 입력 중 데이터 유실 치명적 버그 발생.
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-dialog-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl bg-surface rounded-lg shadow-overlay border border-border rise-in my-8"
      >
        <div className="px-6 pt-6 pb-3">
          <h2
            id="manual-dialog-title"
            className="text-[1.125rem] font-semibold text-fg leading-snug"
          >
            수동으로 기업 소개 작성
          </h2>
          <p className="mt-2 text-[0.85rem] leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
            {reason}
          </p>

          {/* URL + OG 이미지 미리보기 */}
          <div className="mt-3 flex gap-3 items-start">
            {ogImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ogImage}
                alt=""
                className="w-16 h-16 rounded-md object-cover border border-border shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
            <div className="flex-1 min-w-0">
              <div
                className="px-3 py-2 rounded-md text-[0.78rem] font-mono break-all"
                style={{
                  backgroundColor: "var(--color-surface-raised)",
                  color: "var(--color-fg-muted)",
                }}
              >
                {url}
              </div>
              {siteName ? (
                <p
                  className="mt-1.5 text-[0.72rem]"
                  style={{ color: "var(--color-fg-subtle)" }}
                >
                  {siteName}
                </p>
              ) : null}
            </div>
          </div>

          {/* 미리채움 상태 알림 */}
          {hintsLoading ? (
            <div
              className="mt-3 px-3 py-2 rounded-md border text-[0.8rem] flex items-center gap-2"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-raised)",
                color: "var(--color-fg-muted)",
              }}
            >
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
              메타데이터 분석 중…
            </div>
          ) : hintsApplied ? (
            <div
              className="mt-3 px-3 py-2 rounded-md border text-[0.8rem] flex items-start gap-2"
              style={{
                borderColor: "#bbf7d0",
                backgroundColor: "#f0fdf4",
                color: "#166534",
              }}
              role="status"
            >
              <span aria-hidden="true">✓</span>
              <span>
                <strong>가능한 정보를 미리 채웠습니다.</strong> 각 필드를 자유롭게 수정하세요.
              </span>
            </div>
          ) : (
            <div
              className="mt-3 px-3 py-2 rounded-md border text-[0.8rem]"
              style={{
                borderColor: "#fed7aa",
                backgroundColor: "#fff7ed",
                color: "#9a3412",
              }}
            >
              메타데이터를 가져오지 못했습니다. 직접 입력해주세요.
            </div>
          )}
        </div>

        <form action={formAction}>
          <div className="px-6 pb-3 space-y-4">
            <div>
              <label htmlFor="manual-headline" className="eyebrow block mb-2">
                헤드라인 <span style={{ color: "#dc2626" }}>*</span>
                <span className="ml-2 text-[0.7rem] font-normal" style={{ color: "var(--color-fg-subtle)" }}>
                  ({headline.length}/140자)
                </span>
              </label>
              <input
                id="manual-headline"
                name="headline"
                type="text"
                required
                maxLength={140}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                disabled={pending || hintsLoading}
                placeholder="기업/프로젝트명 또는 핵심 메시지"
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-white text-[0.95rem] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="manual-dek" className="eyebrow block mb-2">
                요약문 (한 줄 소개)
                <span className="ml-2 text-[0.7rem] font-normal" style={{ color: "var(--color-fg-subtle)" }}>
                  ({dek.length}/280자)
                </span>
              </label>
              <input
                id="manual-dek"
                name="dek"
                type="text"
                maxLength={280}
                value={dek}
                onChange={(e) => setDek(e.target.value)}
                disabled={pending || hintsLoading}
                placeholder="검색·SNS용 한 줄 소개 (자동 채움)"
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-white text-[0.9rem] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="manual-body" className="eyebrow block mb-2">
                본문 <span style={{ color: "#dc2626" }}>*</span>
                <span className="ml-2 text-[0.7rem] font-normal" style={{ color: "var(--color-fg-subtle)" }}>
                  (단락 사이 빈 줄로 구분, 최소 30자)
                </span>
              </label>
              <textarea
                id="manual-body"
                name="body"
                required
                minLength={30}
                maxLength={5000}
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={pending || hintsLoading}
                placeholder={`회사 소개와 주요 사업 내용을 입력하세요.\n\n단락은 빈 줄로 구분합니다.`}
                className="w-full px-3.5 py-2.5 rounded-md border border-border bg-white text-[0.9rem] leading-[1.6] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60 resize-y font-sans"
              />
              <p
                className="mt-1.5 text-[0.7rem]"
                style={{ color: "var(--color-fg-subtle)" }}
              >
                현재 {body.length}자 {body.length >= 30 ? "(✓ 충분)" : `(최소 30자 필요, ${30 - body.length}자 부족)`}
              </p>
            </div>

            {/* 비밀번호 필드 — 자동 추출 단계에서 이미 인증됐으면 숨김 (UX: 중복 입력 방지) */}
            {prefilledPassword ? (
              <div
                className="px-3 py-2 rounded-md text-[0.8rem] flex items-center gap-2"
                style={{
                  backgroundColor: "var(--color-accent-subtle)",
                  color: "var(--color-fg-muted)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>관리자 인증 완료 — 비밀번호 재입력 불필요</span>
              </div>
            ) : (
              <div>
                <label htmlFor="manual-pw" className="eyebrow block mb-2">
                  관리자 비밀번호 <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  id="manual-pw"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  inputMode="numeric"
                  disabled={pending}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 rounded-md border border-border bg-white font-mono text-[1rem] tracking-widest focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>
            )}

            {state && !state.ok ? (
              <div
                className="px-3 py-2 rounded-md border text-[0.85rem]"
                style={{
                  borderColor: "#fecaca",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                }}
                role="alert"
              >
                {state.error}
              </div>
            ) : null}
          </div>

          <div className="px-6 pt-4 pb-5 flex items-center justify-end gap-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              aria-label="취소하고 모달 닫기"
              className="px-4 py-2 rounded-md border border-border text-[0.875rem] font-medium text-fg hover:bg-surface-raised transition-colors focus-ring disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending || hintsLoading}
              aria-label="입력 내용으로 기업 소개 추가"
              className="px-4 py-2 rounded-md text-white text-[0.875rem] font-medium disabled:opacity-60 transition-colors focus-ring min-w-[120px]"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {pending ? "저장 중…" : "소개 추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 공유 모달 (Web Share API + 클립보드 + 소셜 빠른 공유)
// ---------------------------------------------------------------------------

function ShareDialog({
  cardId,
  headline,
  dek,
  sourceUrl,
  onClose,
}: {
  cardId: string;
  headline: string;
  dek: string;
  sourceUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = "share-dialog-title";

  // 클라이언트에서만 window.location 접근 가능
  useEffect(() => {
    const url = `${window.location.origin}/${cardId}`;
    setShareUrl(url);
    // Web Share API 지원 + 카드 데이터로 공유 가능 여부 판단
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        const shareData = { title: headline, text: dek || headline, url };
        if ("canShare" in navigator && typeof navigator.canShare === "function") {
          setCanNativeShare(navigator.canShare(shareData));
        } else {
          setCanNativeShare(true);
        }
      } catch {
        setCanNativeShare(false);
      }
    }
  }, [cardId, headline, dek]);

  // ESC 키 닫기 + 포커스 트랩
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // ─── Web Share API (모바일 네이티브 공유 시트) ───
  async function handleNativeShare() {
    if (!shareUrl) return;
    const shareData = {
      title: headline,
      text: dek || headline,
      url: shareUrl,
    };
    try {
      await navigator.share(shareData);
      // 성공 시 모달 자동 닫기 (사용자 경험 자연스럽게)
      onClose();
    } catch (err) {
      // 사용자가 취소한 경우(AbortError)는 무시
      if (err instanceof Error && err.name === "AbortError") return;
      // 그 외 에러 → 클립보드 폴백
      await handleCopy();
    }
  }

  // ─── 클립보드 복사 (Web Share API 미지원 시 폴백) ───
  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // execCommand 폴백 (구버전 브라우저)
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        alert("자동 복사에 실패했습니다. URL을 직접 선택해서 복사해주세요.");
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  // ─── 소셜 빠른 공유 URL 빌더 ───
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(headline);
  const encodedText = encodeURIComponent(`${headline}${dek ? ` - ${dek}` : ""}`);
  const encodedSubject = encodeURIComponent(`[Start-up Nest Alumni 1기] ${headline}`);
  const encodedBody = encodeURIComponent(
    `${headline}\n${dek}\n\n${shareUrl}\n\n원본 사이트: ${sourceUrl}`,
  );

  const socialLinks = [
    {
      label: "X (트위터)",
      icon: "𝕏",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      bg: "#000000",
      color: "#ffffff",
    },
    {
      label: "페이스북",
      icon: "f",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bg: "#1877f2",
      color: "#ffffff",
    },
    {
      label: "링크드인",
      icon: "in",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      bg: "#0a66c2",
      color: "#ffffff",
    },
    {
      label: "이메일",
      icon: "✉",
      href: `mailto:?subject=${encodedSubject}&body=${encodedBody}`,
      bg: "#6b7280",
      color: "#ffffff",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
      // v2.43.0: backdrop 클릭 닫기 비활성화 — URL 입력란에서 드래그/복사 시
      // 모달이 닫혀 사용자 동작이 끊기지 않도록 보호.
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface rounded-lg shadow-overlay border border-border"
      >
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2
              id={titleId}
              className="text-[1.1rem] font-display font-semibold tracking-tight"
            >
              이 기업 소개 공유하기
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex-shrink-0 p-1 rounded text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors focus-ring"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* 카드 정보 */}
          <p className="text-[0.875rem] text-fg-muted leading-snug line-clamp-2 mt-1">
            {headline}
          </p>
          {dek ? (
            <p className="mt-1 text-[0.78rem] text-fg-subtle leading-snug line-clamp-2">
              {dek}
            </p>
          ) : null}

          {/* URL 박스 + 복사 버튼 */}
          <div className="mt-5">
            <label
              htmlFor="share-url-input"
              className="block text-[0.75rem] font-medium text-fg-muted mb-1.5"
            >
              카드 페이지 링크
            </label>
            <div className="flex items-stretch gap-2">
              <input
                id="share-url-input"
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                className="flex-1 min-w-0 px-3 py-2 rounded-md border border-border bg-surface-raised text-[0.82rem] font-mono text-fg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={handleCopy}
                aria-label="링크 클립보드에 복사"
                className="flex-shrink-0 px-3 py-2 rounded-md text-white text-[0.82rem] font-medium transition-colors focus-ring min-w-[78px]"
                style={{
                  backgroundColor: copied ? "#16a34a" : "var(--color-accent)",
                }}
              >
                {copied ? "✓ 복사됨" : "📋 복사"}
              </button>
            </div>
          </div>

          {/* Web Share API 버튼 (모바일/지원 브라우저) */}
          {canNativeShare ? (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full mt-3 px-4 py-2.5 rounded-md border-2 text-[0.875rem] font-semibold transition-all focus-ring shadow-sm hover:shadow inline-flex items-center justify-center gap-2"
              style={{
                borderColor: "var(--color-accent)",
                color: "var(--color-accent)",
                backgroundColor: "var(--color-accent-subtle)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              앱으로 공유
            </button>
          ) : null}

          {/* 소셜 빠른 공유 */}
          <div className="mt-5">
            <p className="text-[0.75rem] font-medium text-fg-muted mb-2">
              빠른 공유
            </p>
            <div className="grid grid-cols-4 gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label}로 공유`}
                  title={s.label}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-md text-[0.7rem] font-medium transition-transform hover:scale-105 focus-ring"
                  style={{ backgroundColor: s.bg, color: s.color }}
                >
                  <span className="text-[1.05rem] font-bold leading-none">
                    {s.icon}
                  </span>
                  <span className="text-[0.68rem]">{s.label}</span>
                </a>
              ))}
            </div>
            <p className="mt-2 text-[0.7rem] text-fg-subtle leading-snug">
              💡 카카오톡 공유는 위 [📋 복사] 버튼으로 링크를 복사한 후 채팅창에 붙여넣어주세요.
            </p>
          </div>

          {/* 외부 링크 — 카드 페이지 직접 열기 */}
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.78rem] text-fg-muted hover:text-accent inline-flex items-center gap-1 focus-ring rounded"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              새 탭에서 카드 페이지 보기
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-border text-[0.82rem] font-medium hover:bg-surface-raised transition-colors focus-ring"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 비밀번호 모달 (useActionState로 pending/error 일체화)
// ---------------------------------------------------------------------------

function PasswordDialog({
  variant,
  targetLabel,
  onCancel,
  action,
}: {
  variant: "create" | "delete" | "refresh" | "edit";
  targetLabel?: string;
  onCancel: () => void;
  action: (password: string) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<
    ActionState | null,
    FormData
  >(async (_, fd) => {
    const password = (fd.get("password") as string | null) ?? "";
    return action(password);
  }, null);

  const [showPassword, setShowPassword] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // 단계별 진행 메시지 — pending 동안 시간에 따라 회전
  const [progressIdx, setProgressIdx] = useState(0);
  useEffect(() => {
    if (!pending) {
      setProgressIdx(0);
      return;
    }
    if (variant === "delete") return; // 삭제는 빠르므로 단계 분리 없음
    const t1 = setTimeout(() => setProgressIdx(1), 5000);
    const t2 = setTimeout(() => setProgressIdx(2), 10000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pending, variant]);

  const progressMessages =
    variant === "create"
      ? ["본문 추출 중…", "요약 생성 중…", "저장 중…"]
      : variant === "refresh"
        ? ["원본 사이트 다시 가져오는 중…", "요약 재생성 중…", "저장 중…"]
        : variant === "edit"
          ? ["편집 화면 여는 중…"]
          : ["삭제 중…"];
  const pendingMessage = progressMessages[progressIdx] ?? progressMessages[0];

  // ESC 키로 모달 닫기 + 포커스 트랩
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) {
        e.preventDefault();
        onCancel();
        return;
      }
      // Tab 키 포커스 트랩 — 모달 안에서만 순환
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, onCancel]);

  const isDelete = variant === "delete";
  const isRefresh = variant === "refresh";
  const isEdit = variant === "edit";
  const titleText = isDelete
    ? "이 기업 소개를 갤러리에서 내리시겠습니까?"
    : isRefresh
      ? "원본 사이트에서 데이터를 다시 가져오시겠습니까?"
      : isEdit
        ? "이 기업 소개 내용을 편집하시겠습니까?"
        : "이 기업 소개를 갤러리에 추가하시겠습니까?";
  const primaryLabel = isDelete
    ? "갤러리에서 내리기"
    : isRefresh
      ? "새로고침"
      : isEdit
        ? "편집 화면 열기"
        : "소개 추가";
  const primaryBg = isDelete ? "#dc2626" : "var(--color-accent)";
  const titleId = `pw-dialog-title-${variant}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
      // v2.43.0: backdrop 클릭 닫기 비활성화 — 비밀번호 입력란 드래그/복사 시
      // 모달이 닫혀 입력 데이터가 사라지는 문제 방지.
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-surface rounded-lg shadow-overlay border border-border rise-in"
      >
        <div className="px-6 pt-6 pb-4">
          <h2
            id={titleId}
            className="text-[1.125rem] font-semibold text-fg leading-snug"
          >
            {titleText}
          </h2>
          <p className="mt-1.5 text-[0.875rem] text-fg-muted leading-relaxed">
            {isDelete && targetLabel ? (
              <>
                <span className="font-medium text-fg">"{targetLabel}"</span>
                의 소개가 Alumni 1기 갤러리에서 제거됩니다. 동일한 URL로
                다시 추가하면 새 소개가 만들어집니다.
              </>
            ) : isDelete ? (
              "이 소개가 Alumni 1기 갤러리에서 제거됩니다."
            ) : isEdit && targetLabel ? (
              <>
                <span className="font-medium text-fg">"{targetLabel}"</span>
                의 헤드라인·부제·본문·핵심 포인트 등을 직접 수정할 수 있어요.
                저장 시 사용자 편집 카드로 표시되어 본문이 영구 보존됩니다.
              </>
            ) : isRefresh ? (
              "원본 사이트의 최신 내용으로 다시 가져옵니다. 사용자가 직접 편집한 카드는 본문이 보존됩니다."
            ) : (
              "추가한 기업 소개가 Alumni 1기 갤러리에 게시되어 모든 동문이 확인할 수 있습니다."
            )}
          </p>
        </div>

        <form action={formAction}>
          <div className="px-6 pb-2">
            <label htmlFor="pw" className="eyebrow block mb-2">
              관리자 비밀번호
            </label>
            <div className="relative">
              <input
                id="pw"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                inputMode="numeric"
                placeholder={showPassword ? "비밀번호 입력" : "••••"}
                autoFocus
                disabled={pending}
                className="w-full pl-3.5 pr-11 py-2.5 rounded-md border border-border bg-white
                           font-mono text-[1rem] tracking-widest
                           focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
                           disabled:opacity-60 transition-colors"
                aria-invalid={state && !state.ok ? true : false}
                aria-describedby={state && !state.ok ? "pw-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={pending}
                aria-label={
                  showPassword ? "비밀번호 가리기" : "비밀번호 표시"
                }
                aria-pressed={showPassword}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors disabled:opacity-60"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {state && !state.ok ? (
              <p id="pw-error" className="mt-2 text-[0.825rem] text-red-600" role="alert">
                {state.error}
              </p>
            ) : null}
          </div>

          <div className="px-6 pt-5 pb-5 flex items-center justify-end gap-2 border-t border-border-subtle mt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              aria-label="취소하고 모달 닫기"
              className="px-4 py-2 rounded-md border border-border text-[0.875rem] font-medium text-fg hover:bg-surface-raised transition-colors focus-ring disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              aria-label={isDelete ? "기업 소개를 갤러리에서 내리기" : "기업 소개를 갤러리에 추가"}
              className="px-4 py-2 rounded-md text-white text-[0.875rem] font-medium disabled:opacity-60 transition-colors focus-ring min-w-[110px]"
              style={{ backgroundColor: primaryBg }}
            >
              <span aria-live="polite" aria-atomic="true">
                {pending ? pendingMessage : primaryLabel}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 상세 뷰
// ---------------------------------------------------------------------------

function DetailView({
  card,
  onBack,
  onRequestDelete,
  onRequestEdit,
  onRequestRefresh,
  onRequestShare,
}: {
  card: StoredCard;
  onBack: () => void;
  onRequestDelete: () => void;
  onRequestEdit: () => void;
  onRequestRefresh: () => void;
  onRequestShare: () => void;
}) {
  return (
    <div className="rise-in">
      {/* 상단: 시인성 강화된 갤러리 복귀 버튼 + 부가 액션 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="갤러리로 돌아가기"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 text-[0.875rem] font-semibold transition-all focus-ring shadow-sm hover:shadow"
          style={{
            borderColor: "var(--color-accent)",
            color: "var(--color-accent)",
            backgroundColor: "var(--color-accent-subtle)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          갤러리로 돌아가기
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRequestShare}
            aria-label="이 기업 소개 카드 공유 링크 가져오기"
            title="공유 링크"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-[0.82rem] font-medium transition-all focus-ring shadow-sm hover:shadow"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            공유
          </button>
          {/* 새로고침 버튼 제거 (v2.23.0) — 자동 cron으로 매 6시간 갱신 */}
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="이 카드 인쇄하기"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-[0.82rem] font-medium text-fg-muted hover:text-fg hover:border-fg-muted transition-colors focus-ring"
          >
            Print
          </button>
          {/* v2.45.0: 수정 버튼 — 갤러리에서 내리기 버튼 왼편에 배치
              CardEditDialog로 헤드라인·본문·핵심 포인트 등 직접 편집 가능 */}
          <button
            type="button"
            onClick={onRequestEdit}
            aria-label="이 기업 소개 내용 수정"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-[0.82rem] font-medium text-fg-muted hover:text-accent hover:border-accent transition-colors focus-ring"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            수정
          </button>
          <button
            type="button"
            onClick={onRequestDelete}
            aria-label="이 기업 소개를 갤러리에서 내리기"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-[0.82rem] font-medium text-red-600 hover:bg-red-50 transition-colors focus-ring"
          >
            갤러리에서 내리기
          </button>
        </div>
      </div>

      <EditorialCard card={card.card} />

      {/* 끝부분: 풀폭 갤러리 복귀 푸터 + 페이지 위로 + 안내 */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-[0.875rem] text-fg-muted">
            이 기업 소개를 모두 확인하셨다면
          </p>
          <button
            type="button"
            onClick={onBack}
            aria-label="갤러리로 돌아가서 다른 기업 소개 보기"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md text-[0.95rem] font-semibold text-white transition-all focus-ring shadow-raised hover:shadow-overlay active:scale-[0.98]"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            갤러리에서 다른 기업 소개 보기
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-[0.78rem] font-medium underline-offset-2 hover:underline transition-colors mt-1"
            style={{ color: "var(--color-fg-subtle)" }}
            aria-label="이 페이지 맨 위로 스크롤"
          >
            ↑ 페이지 위로
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 갤러리 섹션
// ---------------------------------------------------------------------------

function GallerySection({
  gallery,
  filtered,
  query,
  onQueryChange,
  onOpen,
  onDelete,
  onEdit,
  onCreate,
}: {
  gallery: StoredCard[];
  filtered: StoredCard[];
  query: string;
  onQueryChange: (q: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string, label: string) => void;
  onEdit: (stored: StoredCard) => void;
  onCreate: () => void;
}) {
  const trimmed = query.trim();
  const empty = gallery.length === 0;

  // ─── 정렬 옵션 ───
  type SortMode = "recent" | "industry" | "alpha" | "domain" | "favorites";
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  // ─── 카테고리 필터 (multi-select 칩) ───
  const [activeIndustries, setActiveIndustries] = useState<Set<string>>(new Set());

  // ─── 즐겨찾기 (localStorage 기반 — 무료 운영, 서버 부하 0) ───
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // localStorage에서 즐겨찾기 로드 (mount 1회)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nest-alum1:favorites");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setFavorites(new Set(arr));
      }
    } catch {
      // ignore
    }
  }, []);

  // 즐겨찾기 토글 → localStorage 저장
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("nest-alum1:favorites", JSON.stringify([...next]));
      } catch {
        // localStorage 실패해도 메모리 상으로는 작동
      }
      return next;
    });
  };

  // ─── 카테고리별 카드 수 통계 (메모이제이션) ───
  const industryStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of gallery) {
      const ind = card.card.industry ?? "other";
      counts.set(ind, (counts.get(ind) ?? 0) + 1);
    }
    return counts;
  }, [gallery]);

  const toggleIndustry = (key: string) => {
    setActiveIndustries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const clearIndustryFilter = () => setActiveIndustries(new Set());

  // ─── 카테고리 필터 적용된 갤러리 ───
  const filteredByIndustry = useMemo(() => {
    if (activeIndustries.size === 0) return filtered;
    return filtered.filter((card) =>
      activeIndustries.has(card.card.industry ?? "other"),
    );
  }, [filtered, activeIndustries]);

  const searching = !empty && trimmed.length > 0;
  const filtering = activeIndustries.size > 0;
  const noMatch =
    !empty && (searching || filtering) && filteredByIndustry.length === 0;

  // ─── 페이지네이션 — 초기 24개 표시 + 더보기 ───
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 검색·정렬·필터·갤러리 변경 시 페이지 카운트 리셋
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [trimmed, sortMode, gallery.length, activeIndustries]);

  // ─── 정렬 적용 ───
  const sorted = useMemo(() => {
    const arr = [...filteredByIndustry];
    if (sortMode === "alpha") {
      arr.sort((a, b) =>
        a.card.headline.localeCompare(b.card.headline, "ko"),
      );
    } else if (sortMode === "domain") {
      arr.sort((a, b) =>
        a.card.sourceDomain.localeCompare(b.card.sourceDomain, "ko"),
      );
    } else if (sortMode === "industry") {
      // 업종별 그룹화 — 같은 업종 카드끼리 인접 표시
      // 같은 업종 내에서는 최신순
      arr.sort((a, b) => {
        const indA = a.card.industry ?? "zzz";
        const indB = b.card.industry ?? "zzz";
        const cmp = indA.localeCompare(indB);
        if (cmp !== 0) return cmp;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    } else if (sortMode === "favorites") {
      // 즐겨찾기 우선 — 즐겨찾기 카드를 위로, 그 안에서 최신순
      arr.sort((a, b) => {
        const aFav = favorites.has(a.id) ? 0 : 1;
        const bFav = favorites.has(b.id) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    } else {
      // recent: updatedAt 내림차순 (최신이 위)
      arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return arr;
  }, [filteredByIndustry, sortMode, favorites]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visibleCount;

  return (
    <>
      {/* ─── 갤러리 헤더 (검색 sticky) ─── */}
      <div className="sticky top-14 z-10 -mx-6 md:-mx-10 px-6 md:px-10 py-4 mb-6 backdrop-blur-sm bg-bg/85 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow eyebrow-accent">§ Member Gallery</span>
            <h2 className="mt-1.5 text-[1.35rem] md:text-[1.6rem] font-display font-semibold tracking-tight">
              {empty ? (
                "첫 번째 기업 소개를 기다리고 있어요"
              ) : searching ? (
                <>
                  검색 결과{" "}
                  <span className="text-accent nums-tabular">
                    {filtered.length}
                  </span>
                  <span className="text-fg-muted font-normal">
                    {" "}
                    / {gallery.length}
                  </span>
                </>
              ) : (
                <>
                  추가된 기업 소개{" "}
                  <span className="text-fg-muted nums-tabular font-normal">
                    ({gallery.length})
                  </span>
                </>
              )}
            </h2>
          </div>

          {!empty ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-96">
                <input
                  type="search"
                  placeholder="기업명·도메인·본문·키워드 검색"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-md border border-border bg-surface text-[0.9rem]
                             placeholder:text-fg-subtle
                             focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
                  aria-label="기업 소개 검색"
                />
                {trimmed ? (
                  <button
                    type="button"
                    onClick={() => onQueryChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors"
                    aria-label="검색 지우기"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              {/* 일괄 새로고침 버튼 제거 (v2.23.0)
                  자동 cron으로 매 6시간 갱신 (.github/workflows/auto-refresh.yml)
                  + Vercel Cron 매일 1회 (vercel.json crons) */}
            </div>
          ) : null}
        </div>

        {/* 정렬 칩 + 표시 카운트 (gallery > 6개일 때만) */}
        {!empty && gallery.length > 6 ? (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex items-center gap-1 p-0.5 rounded-md border border-border-subtle bg-surface-raised"
                role="tablist"
                aria-label="정렬 방식"
              >
                <SortChip
                  label="최신순"
                  active={sortMode === "recent"}
                  onClick={() => setSortMode("recent")}
                />
                <SortChip
                  label="업종별"
                  active={sortMode === "industry"}
                  onClick={() => setSortMode("industry")}
                />
                <SortChip
                  label="가나다순"
                  active={sortMode === "alpha"}
                  onClick={() => setSortMode("alpha")}
                />
                <SortChip
                  label="도메인순"
                  active={sortMode === "domain"}
                  onClick={() => setSortMode("domain")}
                />
                {favorites.size > 0 ? (
                  <SortChip
                    label={`★ 즐겨찾기 (${favorites.size})`}
                    active={sortMode === "favorites"}
                    onClick={() => setSortMode("favorites")}
                  />
                ) : null}
              </div>
              <span
                className="text-[0.78rem] font-mono"
                style={{ color: "var(--color-fg-subtle)" }}
                aria-live="polite"
              >
                {searching || filtering
                  ? `${visible.length}/${filteredByIndustry.length} 표시`
                  : `${visible.length}/${gallery.length} 표시`}
              </span>
            </div>

            {/* 카테고리 필터 칩 (multi-select) — 2026 베스트 프랙티스: niche directory 핵심 기능 */}
            {industryStats.size > 1 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span
                  className="text-[0.72rem] font-medium mr-1"
                  style={{ color: "var(--color-fg-subtle)" }}
                >
                  업종 필터:
                </span>
                {[...industryStats.entries()]
                  .sort((a, b) => b[1] - a[1]) // 카드 수 많은 순
                  .map(([key, count]) => {
                    const ind = getIndustry(key);
                    const active = activeIndustries.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleIndustry(key)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-medium transition-all focus-ring"
                        style={
                          active
                            ? {
                                backgroundColor: ind.color.text,
                                color: "#ffffff",
                                borderColor: ind.color.text,
                              }
                            : {
                                backgroundColor: ind.color.bg,
                                color: ind.color.text,
                                border: `1px solid ${ind.color.border}`,
                              }
                        }
                        aria-pressed={active}
                        aria-label={`${ind.label} 카테고리 ${active ? "필터 해제" : "필터 적용"} (${count}개 카드)`}
                      >
                        <span>{ind.label}</span>
                        <span
                          className="font-mono opacity-75"
                          style={{ fontSize: "0.66rem" }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                {activeIndustries.size > 0 ? (
                  <button
                    type="button"
                    onClick={clearIndustryFilter}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-medium border border-border text-fg-muted hover:text-fg hover:border-fg-muted transition-colors focus-ring"
                    aria-label="모든 카테고리 필터 해제"
                  >
                    × 필터 해제
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {empty ? (
        <div className="py-16 md:py-20 px-6 rounded-xl border border-dashed border-border text-center bg-surface-raised">
          <h3 className="font-display text-[1.35rem] font-semibold tracking-tight mb-2">
            아직 추가된 기업 소개가 없습니다
          </h3>
          <p className="text-fg-muted text-[0.95rem] mb-6 max-w-lg mx-auto">
            Start-up NEST 17·18기 졸업 기업의 소개를 추가해 첫 카드를
            만들어보세요. 자사 홈페이지가 없으면 기업을 다룬 뉴스 기사·보도자료·
            블로그 글의 URL도 사용할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-white font-medium hover:bg-accent-hover transition-colors focus-ring"
          >
            첫 소개 추가하기 →
          </button>
        </div>
      ) : noMatch ? (
        <div className="py-14 text-center">
          <p className="text-fg-muted">
            <span className="font-mono text-accent">&quot;{trimmed}&quot;</span>에
            해당하는 카드가 없습니다.
          </p>
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-[0.85rem] font-medium hover:bg-surface-raised transition-colors focus-ring"
          >
            검색 지우기
          </button>
        </div>
      ) : (
        <>
          {/* 4열 밀도 그리드 — 모바일 1, 태블릿 2, 데스크탑 3, 와이드 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visible.map((stored) => (
              <ThumbnailCard
                key={stored.id}
                stored={stored}
                onOpen={() => onOpen(stored.id)}
                onDelete={() => onDelete(stored.id, stored.card.headline)}
                onEdit={() => onEdit(stored)}
                isFavorite={favorites.has(stored.id)}
                onToggleFavorite={() => toggleFavorite(stored.id)}
              />
            ))}
          </div>

          {/* 더 보기 버튼 */}
          {hasMore ? (
            <div className="mt-10 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length))
                }
                aria-label={`더 많은 기업 소개 ${Math.min(PAGE_SIZE, sorted.length - visibleCount)}개 표시`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border bg-surface hover:bg-surface-raised text-[0.9rem] font-medium transition-colors focus-ring shadow-subtle"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {Math.min(PAGE_SIZE, sorted.length - visibleCount)}개 더 보기
                <span
                  className="text-[0.75rem] font-mono"
                  style={{ color: "var(--color-fg-subtle)" }}
                >
                  ({visibleCount}/{sorted.length})
                </span>
              </button>
              {sorted.length - visibleCount > PAGE_SIZE ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount(sorted.length)}
                  className="text-[0.78rem] font-medium underline-offset-2 hover:underline transition-colors"
                  style={{ color: "var(--color-fg-muted)" }}
                >
                  전체 {sorted.length}개 모두 표시
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

function SortChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="px-3 py-1 rounded-[5px] text-[0.78rem] font-medium transition-colors focus-ring"
      style={{
        backgroundColor: active ? "var(--color-accent)" : "transparent",
        color: active ? "#ffffff" : "var(--color-fg-muted)",
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// 보조 컴포넌트
// ---------------------------------------------------------------------------

function Pill({
  children,
  strong = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-[0.75rem] font-medium"
      style={
        strong
          ? { backgroundColor: "var(--color-accent)", color: "#ffffff" }
          : {
              backgroundColor: "var(--color-accent-subtle)",
              color: "var(--color-accent)",
            }
      }
    >
      {children}
    </span>
  );
}

function AboutCard({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="p-6 rounded-lg border border-border bg-surface-raised">
      <div className="flex items-center gap-2 mb-3">
        <span className="num-marker" style={{ color: "var(--color-accent)" }}>
          {n}
        </span>
        <span className="eyebrow">{title}</span>
      </div>
      <p className="text-[0.9rem] leading-[1.6] text-fg">{body}</p>
    </div>
  );
}

function TimelineStep({
  label,
  title,
  detail,
  leadership,
  community,
  highlight = false,
}: {
  label: string;
  title: string;
  detail: string;
  leadership?: { role: string; company: string }[];
  community?: {
    kakaoUrl: string;
    kakaoSearch: string;
    contacts: { label: string; phone: string }[];
    email: string;
    team: string;
  };
  highlight?: boolean;
}) {
  return (
    <div
      className="p-5 md:p-6"
      style={{
        backgroundColor: highlight
          ? "var(--color-accent-subtle)"
          : "var(--color-surface)",
      }}
    >
      <div
        className="num-marker mb-2"
        style={{
          color: highlight ? "var(--color-accent)" : "var(--color-fg-subtle)",
        }}
      >
        {label}
      </div>
      <div
        className="font-display font-semibold text-[1rem] md:text-[1.05rem] tracking-tight mb-2"
        style={{
          color: highlight ? "var(--color-accent-hover)" : "var(--color-fg)",
        }}
      >
        {title}
      </div>
      <p
        className="text-[0.825rem] leading-[1.55]"
        style={{ color: "var(--color-fg-muted)" }}
      >
        {detail}
      </p>

      {leadership && leadership.length > 0 ? (
        <div
          className="mt-4 pt-3 border-t"
          style={{
            borderColor: highlight
              ? "rgba(67, 56, 202, 0.2)"
              : "var(--color-border-subtle)",
          }}
        >
          <div
            className="num-marker mb-2"
            style={{
              color: highlight
                ? "var(--color-accent)"
                : "var(--color-fg-subtle)",
              fontSize: "0.65rem",
            }}
          >
            초대 회장단
          </div>
          <ul className="space-y-1.5">
            {leadership.map((m) => (
              <li
                key={m.role}
                className="flex items-baseline gap-2 text-[0.8rem] leading-[1.4]"
              >
                <span
                  className="font-mono shrink-0 w-12"
                  style={{
                    color: highlight
                      ? "var(--color-accent)"
                      : "var(--color-fg-muted)",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                  }}
                >
                  {m.role}
                </span>
                <span
                  className="font-semibold"
                  style={{ color: "var(--color-fg)" }}
                >
                  {m.company}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {community ? (
        <div
          className="mt-4 pt-3 border-t"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {/* 카카오 오픈채팅 CTA */}
          <a
            href={community.kakaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="카카오톡 오픈채팅방 새 탭에서 열기"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[0.825rem] font-semibold transition-colors focus-ring"
            style={{
              backgroundColor: "#FEE500",
              color: "#191919",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.821 1.892 5.288 4.728 6.66l-1.16 4.227a.4.4 0 0 0 .61.43l5.011-3.286c.265.018.534.029.811.029 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
            </svg>
            오픈채팅 입장
          </a>

          <div className="mt-2 text-center">
            <span
              className="num-marker"
              style={{
                color: "var(--color-fg-subtle)",
                fontSize: "0.6rem",
              }}
            >
              검색: {community.kakaoSearch}
            </span>
          </div>

          {/* 연락처 */}
          <div className="mt-3 space-y-1">
            {community.contacts.map((c) => (
              <a
                key={c.phone}
                href={`tel:${c.phone.replace(/-/g, "")}`}
                aria-label={`${c.phone}로 전화 걸기`}
                className="flex items-center gap-2 text-[0.75rem] leading-[1.4] hover:underline focus-ring rounded-sm"
                style={{ color: "var(--color-fg-muted)" }}
              >
                <span
                  aria-hidden="true"
                  style={{ color: "var(--color-fg-subtle)" }}
                >
                  ☎
                </span>
                <span className="font-mono">{c.phone}</span>
              </a>
            ))}
            <a
              href={`mailto:${community.email}`}
              aria-label={`${community.email}로 이메일 보내기`}
              className="flex items-center gap-2 text-[0.75rem] leading-[1.4] hover:underline focus-ring rounded-sm"
              style={{ color: "var(--color-fg-muted)" }}
            >
              <span
                aria-hidden="true"
                style={{ color: "var(--color-fg-subtle)" }}
              >
                ✉
              </span>
              <span className="font-mono break-all">{community.email}</span>
            </a>
          </div>

          <div
            className="mt-2 text-[0.7rem] leading-[1.4]"
            style={{ color: "var(--color-fg-subtle)" }}
          >
            {community.team}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 클라이언트 검색 (가중 스코어링)
// ---------------------------------------------------------------------------

function filterGallery(gallery: StoredCard[], query: string): StoredCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return gallery;
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return gallery;

  type Scored = { card: StoredCard; score: number };
  const scored: Scored[] = [];

  for (const g of gallery) {
    const c = g.card;
    const fields: Array<[string, number]> = [
      [c.headline, 10],
      [c.kicker ?? "", 6],
      [c.sourceDomain, 5],
      [c.sourceSiteName ?? "", 4],
      [c.dek, 3],
      [c.eyebrow, 2],
      [c.lead, 2],
      [c.pullQuote ?? "", 2],
      [c.bodyParagraphs.join(" "), 1],
      [c.keyPoints.join(" "), 1],
    ];
    let total = 0;
    let all = true;
    for (const t of tokens) {
      let best = 0;
      for (const [text, w] of fields) {
        if (text.toLowerCase().includes(t) && w > best) best = w;
      }
      if (best === 0) {
        all = false;
        break;
      }
      total += best;
    }
    if (all) {
      const bonus = new Date(g.updatedAt).getTime() / 1e13;
      scored.push({ card: g, score: total + bonus });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.card);
}
