"use client";

/**
 * v2.25.0 (2026-05): 카드 등록 전 미리보기 · 편집 다이얼로그.
 *
 * 흐름:
 *   1. 사용자가 URL 입력 + 비밀번호 → previewCard server action 호출
 *   2. previewCard가 추출+composeCard 결과 반환 (저장 X)
 *   3. 이 다이얼로그가 결과를 받아 모든 편집 가능 필드를 폼으로 표시
 *   4. 사용자가 산업 분류·본문·핵심 포인트 등 직접 수정
 *   5. "이 정보로 등록" 클릭 → createCardEdited로 최종 저장
 *
 * 자동 분류된 industry가 잘못된 케이스 (예: 친환경 빨대 회사가 헬스케어로
 * 분류되는 경우)를 사용자가 등록 전에 직접 수정할 수 있도록 하는 게 핵심 목적.
 */

import { useEffect, useState, useTransition } from "react";
import { createCardEdited } from "@/app/actions";
import { INDUSTRIES } from "@/lib/industry";
import type { EditorialCardData } from "@/lib/types";
import type { ActionState, PreviewState } from "@/lib/actions-types";

// PreviewState debug 필드만 안전하게 분리한 타입
type PreviewDebug = NonNullable<
  Extract<PreviewState, { ok: true }>["debug"]
>;

export interface CardEditDialogProps {
  url: string;
  password: string;          // 이전 단계(비밀번호 모달)에서 검증된 값
  card: EditorialCardData;   // previewCard 반환값
  dedupKey: string;
  // v2.43.0: 중복 등록 방지용 정규 URL (previewCard의 finalUrl)
  canonicalUrl?: string;
  isExisting: boolean;       // 이미 등록된 사이트면 덮어쓰기 경고 표시
  debug?: PreviewDebug;      // v2.27.0: 자동 추출 진단 정보 (opt)
  onCancel: () => void;
  onComplete: (result: ActionState) => void;  // 저장 성공/실패 후 콜백
}

export function CardEditDialog({
  url,
  password,
  card,
  dedupKey,
  canonicalUrl,
  isExisting,
  debug,
  onCancel,
  onComplete,
}: CardEditDialogProps) {
  // ─── 편집 가능 필드 — card에서 초기값 채워옴 ───
  const [headline, setHeadline] = useState(card.headline);
  const [dek, setDek] = useState(card.dek);
  const [lead, setLead] = useState(card.lead);
  const [pullQuote, setPullQuote] = useState(card.pullQuote ?? "");
  const [eyebrow, setEyebrow] = useState(card.eyebrow);
  const [sourceSiteName, setSourceSiteName] = useState(card.sourceSiteName ?? "");
  const [heroImage, setHeroImage] = useState(card.heroImage ?? "");
  const [industry, setIndustry] = useState(card.industry ?? "other");
  const [palette, setPalette] = useState(card.palette);

  // 배열 필드 — 각 단락/포인트를 별도 항목으로
  const [bodyParagraphs, setBodyParagraphs] = useState<string[]>(card.bodyParagraphs);
  const [keyPoints, setKeyPoints] = useState<string[]>(card.keyPoints);

  // 회사 정보 (옵션) — 접을 수 있는 섹션
  const [contactRepresentative, setContactRepresentative] = useState(
    card.contactInfo?.representative ?? "",
  );
  const [contactPhone, setContactPhone] = useState(card.contactInfo?.phone ?? "");
  const [contactEmail, setContactEmail] = useState(card.contactInfo?.email ?? "");
  const [contactAddress, setContactAddress] = useState(card.contactInfo?.address ?? "");

  // UI 상태
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({
    body: false,
    keyPoints: false,
    company: !card.contactInfo,
    site: true,
  });

  // 자동 분류 감지: industry === "other"면 사용자에게 분류 직접 선택 권유 알림 표시
  const wasAutoClassifiedAsOther = card.industry === "other";

  // v2.29.0: 사이트 버전 표시 — Vercel 배포 후 어떤 버전이 실행 중인지 즉시 확인 가능
  const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";

  // v2.29.0: 디버그 정보를 브라우저 콘솔(F12)에 자동 출력 — 사용자가 복사·공유 쉽게
  useEffect(() => {
    if (debug) {
      // eslint-disable-next-line no-console
      console.group(
        `%c[Folio Cards v${APP_VERSION}] preview debug`,
        "color: #4338ca; font-weight: bold;",
      );
      // eslint-disable-next-line no-console
      console.log("URL:", url);
      // eslint-disable-next-line no-console
      console.log("contentSignal:", debug.contentSignal);
      // eslint-disable-next-line no-console
      console.log("raw:", {
        paragraphs: debug.rawParagraphsCount,
        headings: debug.rawHeadingsCount,
        keywords: debug.rawKeywordsCount,
        descriptionLen: debug.rawDescriptionLen,
      });
      // eslint-disable-next-line no-console
      console.log("rawMeta:", {
        ogDescription: debug.rawOgDescriptionLen,
        twitterDescription: debug.rawTwitterDescriptionLen,
        metaDescription: debug.rawMetaDescriptionLen,
        metaKeywords: debug.rawMetaKeywordsLen,
        keywordsCount: debug.rawMetaKeywordsCount,
      });
      // eslint-disable-next-line no-console
      console.log("final:", {
        body: debug.finalBodyCount,
        keyPoints: debug.finalKeyPointsCount,
        firstBodyPreview: debug.firstBodyPreview,
        firstKeyPointPreview: debug.firstKeyPointPreview,
      });
      // eslint-disable-next-line no-console
      console.log("response:", {
        finalUrl: debug.finalUrl,
        redirected: debug.redirected,
        htmlBytesSize: debug.htmlBytesSize,
        ogImagePresent: debug.ogImagePresent,
      });
      // eslint-disable-next-line no-console
      console.log("full debug object (copyable):", JSON.stringify(debug, null, 2));
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }, [debug, url, APP_VERSION]);

  // v2.29.0: 디버그 JSON 클립보드 복사
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  function copyDebugJson() {
    if (!debug) return;
    const payload = {
      app_version: APP_VERSION,
      url,
      domain: card.sourceDomain,
      timestamp: new Date().toISOString(),
      debug,
      card_summary: {
        headline: card.headline,
        dekLen: card.dek.length,
        leadLen: card.lead.length,
        bodyParagraphsCount: card.bodyParagraphs.length,
        keyPointsCount: card.keyPoints.length,
        industry: card.industry,
        palette: card.palette,
        lang: card.lang,
        hasContactInfo: !!card.contactInfo,
        hasHeroImage: !!card.heroImage,
      },
    };
    const json = JSON.stringify(payload, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(json)
        .then(() => {
          setCopyStatus("copied");
          setTimeout(() => setCopyStatus("idle"), 2000);
        })
        .catch(() => {
          setCopyStatus("error");
          setTimeout(() => setCopyStatus("idle"), 2000);
        });
    } else {
      setCopyStatus("error");
    }
  }

  function updateBodyParagraph(idx: number, value: string) {
    setBodyParagraphs((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }
  function removeBodyParagraph(idx: number) {
    setBodyParagraphs((prev) => prev.filter((_, i) => i !== idx));
  }
  function addBodyParagraph() {
    setBodyParagraphs((prev) => [...prev, ""]);
  }

  function updateKeyPoint(idx: number, value: string) {
    setKeyPoints((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }
  function removeKeyPoint(idx: number) {
    setKeyPoints((prev) => prev.filter((_, i) => i !== idx));
  }
  function addKeyPoint() {
    setKeyPoints((prev) => [...prev, ""]);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    // 클라이언트 사이드 1차 검증
    if (!headline.trim()) return setErrorMsg("헤드라인(큰 제목)을 작성해 주세요.");
    if (!dek.trim()) return setErrorMsg("부제를 작성해 주세요.");
    if (!lead.trim()) return setErrorMsg("첫 단락(도입 글)을 작성해 주세요.");
    const cleanBody = bodyParagraphs.map((p) => p.trim()).filter((p) => p.length > 0);
    if (cleanBody.length === 0) return setErrorMsg("본문 단락을 최소 1개 작성해 주세요.");

    const cleanKeyPoints = keyPoints.map((p) => p.trim()).filter((p) => p.length > 0);

    const contactInfoObj = {
      representative: contactRepresentative.trim() || undefined,
      phone: contactPhone.trim() || undefined,
      email: contactEmail.trim() || undefined,
      address: contactAddress.trim() || undefined,
    };
    const hasAnyContact =
      contactInfoObj.representative ||
      contactInfoObj.phone ||
      contactInfoObj.email ||
      contactInfoObj.address;

    const fd = new FormData();
    fd.set("url", url);
    fd.set("password", password);
    fd.set("dedupKey", dedupKey);
    if (canonicalUrl) fd.set("canonicalUrl", canonicalUrl);  // v2.43.0: 중복 등록 방지
    fd.set("headline", headline.trim());
    fd.set("dek", dek.trim());
    fd.set("lead", lead.trim());
    fd.set("pullQuote", pullQuote.trim());
    fd.set("eyebrow", eyebrow.trim());
    fd.set("kicker", card.kicker ?? "DISPATCH");
    fd.set("sourceSiteName", sourceSiteName.trim());
    fd.set("heroImage", heroImage.trim());
    fd.set("industry", industry);
    fd.set("palette", palette);
    fd.set("lang", card.lang);
    fd.set("bodyParagraphs", JSON.stringify(cleanBody));
    fd.set("keyPoints", JSON.stringify(cleanKeyPoints));
    if (hasAnyContact) {
      fd.set("contactInfoJson", JSON.stringify(contactInfoObj));
    }

    startTransition(async () => {
      const result = await createCardEdited(null, fd);
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      onComplete(result);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dialog-title"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl border-b border-stone-200 bg-white px-6 py-4">
          <div>
            <h2 id="edit-dialog-title" className="text-xl font-bold text-stone-900">
              카드 내용 확인 · 수정
              <span
                className="ml-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 align-middle text-[10px] font-mono font-medium text-indigo-700"
                title="현재 사이트에 배포된 Folio Cards 버전. /api/version 으로도 확인 가능."
              >
                v{APP_VERSION}
              </span>
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              자동으로 가져온 내용을 한번 살펴보시고, 어색하거나 잘못된 부분이 있으면 자유롭게 고쳐주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* 경고 메시지 */}
          {isExisting && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="mr-1">📝</span>
              <strong>이미 등록된 사이트예요.</strong> 등록을 누르면 기존 카드 내용이 새 내용으로 바뀝니다.
            </div>
          )}
          {wasAutoClassifiedAsOther && (
            <div className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              <span className="mr-1">🏷️</span>
              <strong>산업 분류를 자동으로 정하기 어려웠어요.</strong>{" "}
              일단 &ldquo;기타&rdquo;로 두었으니, 아래 분류 메뉴에서 알맞은 항목을 직접 골라주세요.
            </div>
          )}

          {/* v2.31.0: 자동 추출 빈약 안내 — 메타·본문 모두 비어있을 때 명시적 안내.
              imweb·Wix 같은 빌더 사이트에서 cheerio가 본문을 거의 못 가져오는 케이스. */}
          {debug &&
            debug.rawParagraphsCount <= 1 &&
            debug.rawHeadingsCount === 0 &&
            (debug.rawOgDescriptionLen ?? 0) === 0 &&
            (debug.rawTwitterDescriptionLen ?? 0) === 0 &&
            (debug.rawMetaDescriptionLen ?? 0) === 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none mt-0.5">📭</span>
                <div className="flex-1">
                  <strong className="block mb-1">
                    이 사이트는 정보가 잘 정리돼 있지 않아요
                  </strong>
                  <p className="text-amber-800/90 leading-relaxed">
                    웹사이트가 자기 자신을 소개하는 정보(보통 검색 결과나 SNS 미리보기에 쓰이는 설명)가
                    거의 비어있어, 자동으로 카드 내용을 채우기가 어려운 상태입니다. 홈페이지 제작 도구로
                    만든 사이트(<span className="text-amber-700">imweb</span>·
                    <span className="text-amber-700">Wix</span> 등)에서 자주 발생합니다.
                  </p>
                  {(debug.htmlBytesSize ?? 0) > 50 * 1024 ? (
                    <p className="mt-1.5 text-xs text-amber-700/90">
                      💡 페이지 자체는 큰데(약 {((debug.htmlBytesSize ?? 0) / 1024).toFixed(0)}KB)
                      추출에 실패한 경우라 직접 입력이 가장 정확합니다.
                    </p>
                  ) : null}
                  <p className="mt-2 font-medium text-amber-900">
                    아래 헤드라인·부제·본문·핵심 포인트를 직접 작성해 주세요.
                  </p>

                  <div className="mt-3 pt-2.5 rounded bg-amber-100/60 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                    <div className="flex items-start gap-1.5">
                      <span className="leading-none">🛡️</span>
                      <div>
                        <strong>안심하세요 — 직접 작성한 카드는 영구 보존됩니다</strong>
                        <p className="mt-1 text-amber-800/95 leading-relaxed">
                          여러분이 직접 작성하면 시스템이 자동으로 <strong>"사용자 편집"</strong> 표시를
                          남깁니다. 6시간마다 카드를 자동으로 새로 가져오는 작업이 돌아가지만,
                          여러분이 작성한 본문은 절대 덮어쓰지 않아요.
                          (사이트 이미지·이름 같은 메타 정보만 살짝 갱신됩니다.)
                          카드 아래쪽에 <span className="inline-flex items-center gap-0.5 rounded bg-amber-200/70 px-1 py-0.5 font-mono">✎ 사용자 편집</span> 마크가
                          표시되어 한눈에 알 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* 미리보기 메타 */}
          <div className="rounded-lg bg-stone-50 px-4 py-3 text-xs text-stone-600">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-stone-500">🔗 사이트 주소:</span>
              <span className="font-mono break-all">{url}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-stone-500">🌐 도메인:</span>
              <span className="font-mono">{card.sourceDomain}</span>
            </div>
          </div>

          {/* v2.27.0~v2.41.0: 자동 추출 진단 패널 — v2.41.0 비전문가 친화 전면 개편.
              요약: 신호등 + 자연어 한글 설명 / 상세: 개발자용 영문 약어 화면 (토글) */}
          {debug ? (
            <details
              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700"
            >
              <summary className="flex cursor-pointer select-none items-center justify-between gap-2 font-medium text-stone-700">
                <span className="flex items-center gap-1.5 text-stone-700">
                  <span>🔍</span>
                  <span>이 사이트에서 자동으로 가져온 정보 살펴보기</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); copyDebugJson(); }}
                  className={`rounded-md border px-2 py-1 text-[11px] font-mono transition ${
                    copyStatus === "copied"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : copyStatus === "error"
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-100"
                  }`}
                  aria-label="기술 정보 클립보드 복사"
                  title="개발자에게 보여줄 기술 정보를 한꺼번에 복사해요"
                >
                  {copyStatus === "copied" ? "✓ 복사됨" : copyStatus === "error" ? "✗ 실패" : "📋 복사"}
                </button>
              </summary>

              <div className="mt-3 space-y-3">
                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    v2.41.0 비전문가 친화 요약 — 신호등 + 자연어
                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {(() => {
                  // 추출 품질 평가 — 4가지 지표
                  const bodyCount = debug.finalBodyCount ?? 0;
                  const hasOgImage = !!debug.ogImagePresent;
                  const hasDescription = (debug.rawOgDescriptionLen ?? 0) > 0
                    || (debug.rawTwitterDescriptionLen ?? 0) > 0
                    || (debug.rawMetaDescriptionLen ?? 0) > 0;
                  const isBuilder = !!debug.builderSignature;

                  // 종합 신호: 본문 3개 이상 = 충분, 1~2개 = 보통, 0개 = 부족
                  const overallStatus = bodyCount >= 3 ? "good" : bodyCount >= 1 ? "ok" : "poor";
                  const overallEmoji = overallStatus === "good" ? "🟢" : overallStatus === "ok" ? "🟡" : "🔴";
                  const overallText =
                    overallStatus === "good"
                      ? "사이트 정보를 잘 가져왔어요"
                      : overallStatus === "ok"
                        ? "기본 정보는 가져왔지만 보완이 필요해요"
                        : "사이트에서 정보를 거의 가져오지 못했어요";
                  const overallColor =
                    overallStatus === "good"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : overallStatus === "ok"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-rose-200 bg-rose-50 text-rose-900";

                  return (
                    <div className={`rounded-lg border px-3.5 py-3 text-[13px] ${overallColor}`}>
                      <div className="flex items-center gap-2 font-semibold mb-2">
                        <span className="text-base leading-none">{overallEmoji}</span>
                        <span>{overallText}</span>
                      </div>

                      <ul className="space-y-1.5 text-[12px]">
                        {/* 본문 단락 추출 결과 */}
                        <li className="flex items-start gap-2">
                          <span className="leading-tight">
                            {bodyCount >= 3 ? "✓" : bodyCount >= 1 ? "△" : "✗"}
                          </span>
                          <span>
                            본문 글: <strong>{bodyCount}개 단락</strong>
                            {bodyCount >= 3 ? " 추출됨 (충분)"
                              : bodyCount >= 1 ? " 추출됨 (조금 부족)"
                              : " — 본문이 거의 없어요"}
                          </span>
                        </li>

                        {/* 사이트 설명문 */}
                        <li className="flex items-start gap-2">
                          <span className="leading-tight">{hasDescription ? "✓" : "✗"}</span>
                          <span>
                            사이트 자기소개 글:{" "}
                            <strong>
                              {hasDescription ? "있음" : "없음"}
                            </strong>
                            {!hasDescription ? " — 사이트가 검색·SNS용 한 줄 소개를 작성하지 않은 상태" : ""}
                          </span>
                        </li>

                        {/* 대표 이미지 */}
                        <li className="flex items-start gap-2">
                          <span className="leading-tight">{hasOgImage ? "✓" : "—"}</span>
                          <span>
                            대표 이미지:{" "}
                            <strong>{hasOgImage ? "있음" : "없음"}</strong>
                            {hasOgImage ? " (카드 상단에 표시됩니다)" : ""}
                          </span>
                        </li>

                        {/* 사이트 종류 */}
                        {isBuilder ? (
                          <li className="flex items-start gap-2">
                            <span className="leading-tight">ℹ️</span>
                            <span>
                              <strong>홈페이지 제작 도구</strong>로 만든 사이트({debug.builderSignature})로 보입니다.
                              이런 사이트는 자동 추출이 어려운 경우가 많아요.
                            </span>
                          </li>
                        ) : null}
                      </ul>

                      {/* 권장 액션 */}
                      <div className="mt-3 pt-2 border-t border-current/20 text-[12px]">
                        <strong>👉 어떻게 할까요?</strong>{" "}
                        {overallStatus === "good"
                          ? "내용을 한번 훑어보고 어색한 부분만 살짝 다듬어 등록하세요."
                          : overallStatus === "ok"
                            ? "헤드라인·부제·본문을 직접 다듬어 주시는 게 좋아요. 직접 작성한 내용은 영구 보존됩니다."
                            : "헤드라인·부제·본문·핵심 포인트를 직접 작성해 주세요. 직접 작성한 내용은 자동 새로고침에서도 영구 보존됩니다."}
                      </div>

                      {/* 가져온 내용 미리보기 — 사용자 친화적 */}
                      {(debug.dekPreview || debug.leadPreview || debug.firstBodyPreview) ? (
                        <div className="mt-3 pt-2 border-t border-current/20 text-[11.5px] space-y-1.5">
                          <div className="font-semibold mb-1">📄 자동으로 가져온 내용 미리보기</div>
                          {debug.dekPreview ? (
                            <div className="break-words">
                              <span className="text-current/70">부제:</span>{" "}
                              <span>"{debug.dekPreview}"</span>
                            </div>
                          ) : null}
                          {debug.leadPreview ? (
                            <div className="break-words">
                              <span className="text-current/70">첫 단락:</span>{" "}
                              <span>"{debug.leadPreview}"</span>
                            </div>
                          ) : null}
                          {debug.firstBodyPreview ? (
                            <div className="break-words">
                              <span className="text-current/70">본문 시작:</span>{" "}
                              <span>"{debug.firstBodyPreview}"</span>
                            </div>
                          ) : null}
                          {debug.firstKeyPointPreview ? (
                            <div className="break-words">
                              <span className="text-current/70">핵심 포인트:</span>{" "}
                              <span>"{debug.firstKeyPointPreview}"</span>
                            </div>
                          ) : null}
                          <p className="mt-2 text-[10.5px] text-current/65 italic">
                            잘못 가져온 부분이 있으면 아래 입력란에서 직접 고쳐주세요.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    응답 이상 신호 — 친근한 한글 안내
                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {(debug.redirected ||
                  (debug.htmlBytesSize ?? 0) < 5000 ||
                  ((debug.metaTagCount ?? 100) < 5) ||
                  ((debug.scriptToHtmlRatio ?? 0) > 80) ||
                  ((debug.bodyTextLen ?? 0) < 500 && (debug.htmlBytesSize ?? 0) > 50 * 1024)
                ) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-900">
                    <div className="flex items-center gap-2 font-semibold mb-1.5">
                      <span>⚠️</span>
                      <span>가져오는 과정에서 살펴봐야 할 부분</span>
                    </div>
                    <ul className="space-y-1 text-[12px]">
                      {debug.redirected && (
                        <li>
                          <strong>•</strong> 사이트 주소가 다른 곳으로 이동했어요{" "}
                          <span className="font-mono text-[11px] break-all text-amber-800">
                            (→ {debug.finalUrl})
                          </span>
                        </li>
                      )}
                      {(debug.htmlBytesSize ?? 0) < 5000 && (
                        <li>
                          <strong>•</strong> 페이지 내용이 너무 작아요(약 {((debug.htmlBytesSize ?? 0) / 1024).toFixed(1)}KB).
                          접속 차단 페이지나 빈 페이지를 받았을 수 있습니다.
                        </li>
                      )}
                      {(debug.metaTagCount ?? 100) < 5 && (
                        <li>
                          <strong>•</strong> 사이트 정보 태그가 {debug.metaTagCount}개뿐이에요.
                          정상적인 페이지는 보통 5개 이상 있습니다.
                        </li>
                      )}
                      {(debug.scriptToHtmlRatio ?? 0) > 80 && (
                        <li>
                          <strong>•</strong> 페이지의 {debug.scriptToHtmlRatio}%가 자바스크립트 코드예요.
                          내용을 화면에 그릴 때 브라우저가 필요한 사이트라, 서버에서 직접 본문을 가져오기 어려워요.
                        </li>
                      )}
                      {(debug.bodyTextLen ?? 0) < 500 && (debug.htmlBytesSize ?? 0) > 50 * 1024 && (
                        <li>
                          <strong>•</strong> 페이지는 큰데(약 {((debug.htmlBytesSize ?? 0) / 1024).toFixed(0)}KB)
                          담긴 본문 글자는 {debug.bodyTextLen}자뿐이에요. 봇 차단 응답이거나 빈 껍데기 페이지일 수 있습니다.
                        </li>
                      )}
                    </ul>
                    <p className="mt-2 text-[11.5px] text-amber-800">
                      💡 이런 경우 자동으로 정보를 가져오기 어려우니, 직접 입력해 주시는 게 가장 정확해요.
                    </p>
                  </div>
                )}

                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    상세 진단 (개발자용) — 토글 안에 숨김
                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <details className="rounded border border-stone-200 bg-white px-2.5 py-1.5 text-[11px]">
                  <summary className="cursor-pointer select-none font-medium text-stone-500 hover:text-stone-700">
                    🛠️ 기술 정보 자세히 보기 (개발자용 · 영문 용어)
                  </summary>
                  <div className="mt-2.5 space-y-3 pl-1">
                    {/* 섹션 1: 추출 결과 카운트 */}
                    <div>
                      <h4 className="mb-1 text-[11px] font-semibold uppercase text-stone-500">
                        추출 결과
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono sm:grid-cols-3">
                        <span>contentSignal: <strong>{debug.contentSignal}</strong></span>
                        <span>raw paragraphs: <strong>{debug.rawParagraphsCount}</strong></span>
                        <span>raw headings: <strong>{debug.rawHeadingsCount}</strong></span>
                        <span>raw keywords: <strong>{debug.rawKeywordsCount}</strong></span>
                        <span>desc length: <strong>{debug.rawDescriptionLen}</strong></span>
                        <span>desc accepted: <strong>{String(debug.descriptionAccepted)}</strong></span>
                        <span>final body: <strong>{debug.finalBodyCount}</strong></span>
                        <span>final keyPoints: <strong>{debug.finalKeyPointsCount}</strong></span>
                        <span>og:image: <strong>{debug.ogImagePresent ? "✓" : "—"}</strong></span>
                      </div>
                    </div>

                    {/* 섹션 2: 원본 메타 데이터 */}
                    <div>
                      <h4 className="mb-1 text-[11px] font-semibold uppercase text-stone-500">
                        원본 메타 데이터 (sanitize 전)
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono sm:grid-cols-3">
                        <span>og:description: <strong>{debug.rawOgDescriptionLen ?? 0}자</strong></span>
                        <span>twitter:description: <strong>{debug.rawTwitterDescriptionLen ?? 0}자</strong></span>
                        <span>meta description: <strong>{debug.rawMetaDescriptionLen ?? 0}자</strong></span>
                        <span>meta keywords: <strong>{debug.rawMetaKeywordsLen ?? 0}자</strong></span>
                        <span>keywords split: <strong>{debug.rawMetaKeywordsCount ?? 0}개</strong></span>
                        <span>html size: <strong>{((debug.htmlBytesSize ?? 0) / 1024).toFixed(1)}KB</strong></span>
                      </div>
                    </div>

                    {/* 섹션 2.5: HTML 구조 진단 */}
                    <div>
                      <h4 className="mb-1 text-[11px] font-semibold uppercase text-stone-500">
                        HTML 구조 진단
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono sm:grid-cols-3">
                        <span>meta 태그: <strong>{debug.metaTagCount ?? "—"}</strong></span>
                        <span>head 자식: <strong>{debug.headChildrenCount ?? "—"}</strong></span>
                        <span>script 태그: <strong>{debug.scriptTagCount ?? "—"}</strong></span>
                        <span>body 텍스트: <strong>{((debug.bodyTextLen ?? 0) / 1024).toFixed(1)}KB</strong></span>
                        <span>script 비율: <strong>{debug.scriptToHtmlRatio ?? "—"}%</strong></span>
                      </div>
                      {debug.metaNamesList && debug.metaNamesList.length > 0 ? (
                        <div className="mt-2">
                          <span className="text-[11px] text-stone-500">발견된 meta 태그:</span>{" "}
                          <span className="font-mono text-[11px] break-all text-stone-700">
                            {debug.metaNamesList.slice(0, 25).join(" · ")}
                            {debug.metaNamesList.length > 25 ? ` · +${debug.metaNamesList.length - 25}개` : ""}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* 섹션 4: 최종 카드 본문 미리보기 */}
                    <div>
                      <h4 className="mb-1 text-[11px] font-semibold uppercase text-stone-500">
                        최종 카드 첫 본문·핵심 포인트 (80자)
                      </h4>
                      <div className="space-y-1 font-mono">
                        <div>body[0]: <span className="text-stone-700">{debug.firstBodyPreview ?? "(없음)"}</span></div>
                        <div>kp[0]: <span className="text-stone-700">{debug.firstKeyPointPreview ?? "(없음)"}</span></div>
                        {debug.dekPreview ? (
                          <div className="break-words">
                            dek: <span className="text-stone-700">{debug.dekPreview}</span>
                          </div>
                        ) : null}
                        {debug.leadPreview ? (
                          <div className="break-words">
                            lead: <span className="text-stone-700">{debug.leadPreview}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* v2.38.0+ 섹션 5: 추출 단계 가시성 */}
                    {(debug.rawParagraphSamples ||
                      debug.sanitizedRemovedSamples ||
                      debug.bruteForceTriggered !== undefined) ? (
                      <div className="border-t border-stone-200 pt-2.5">
                        <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-indigo-700">
                          ⚙ 추출 단계 가시성 (v2.38.0+)
                        </h4>
                        <div className="space-y-2 font-mono text-[11px]">
                          {debug.needsEnrichment !== undefined ? (
                            <div className="rounded bg-stone-100 px-2 py-1">
                              <span className="text-stone-500">enrichment trigger:</span>{" "}
                              <strong className={debug.needsEnrichment ? "text-emerald-700" : "text-rose-700"}>
                                {debug.needsEnrichment ? "✓ 진입함" : "✗ 진입 못 함"}
                              </strong>
                              {debug.mainContentLen !== undefined ? (
                                <span className="ml-2 text-stone-500">
                                  (mainContentLen:{" "}
                                  <strong className="text-stone-700">{debug.mainContentLen}자</strong>
                                  {debug.mainContentLen >= 400 ? " — 본문 글자 합계 충분으로 판단" : " — 부족"}
                                  )
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {debug.builderSignature || debug.finalUrlHost ? (
                            <div>
                              <span className="text-stone-500">빌더 감지:</span>{" "}
                              {debug.builderSignature ? (
                                <strong className="text-emerald-700">
                                  ✓ {debug.builderSignature}
                                </strong>
                              ) : (
                                <span className="text-stone-500">— 미감지</span>
                              )}
                              {debug.finalUrlHost ? (
                                <span className="ml-2 text-stone-500">
                                  (finalUrlHost:{" "}
                                  <strong className="text-stone-700">{debug.finalUrlHost}</strong>)
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {debug.bruteForceTriggered !== undefined ? (
                            <div>
                              <span className="text-stone-500">brute force walker:</span>{" "}
                              <strong className={debug.bruteForceTriggered ? "text-emerald-700" : "text-stone-500"}>
                                {debug.bruteForceTriggered ? "✓ 트리거됨" : "— 트리거 안 됨"}
                              </strong>
                              {debug.bruteForceTriggered ? (
                                <span className="ml-2 text-stone-500">
                                  (추가 단락:{" "}
                                  <strong className="text-stone-700">
                                    {debug.bruteForceAddedCount ?? 0}개
                                  </strong>
                                  )
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {debug.rawParagraphSamples && debug.rawParagraphSamples.length > 0 ? (
                            <div>
                              <span className="text-stone-500">raw paragraphs (sanitize 전, 첫 3개):</span>
                              <ul className="mt-1 space-y-0.5">
                                {debug.rawParagraphSamples.map((p, i) => (
                                  <li key={i} className="break-all text-stone-700">
                                    <span className="text-stone-400">[{i}]</span> {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="text-stone-500">
                              raw paragraphs: <strong className="text-rose-700">(0개)</strong>
                            </div>
                          )}

                          {debug.sanitizedRemovedSamples && debug.sanitizedRemovedSamples.length > 0 ? (
                            <div>
                              <span className="text-rose-600">⚠ sanitize에서 제거된 단락 (첫 3개):</span>
                              <ul className="mt-1 space-y-0.5">
                                {debug.sanitizedRemovedSamples.map((p, i) => (
                                  <li key={i} className="break-all text-rose-700">
                                    <span className="text-rose-400">[제거]</span> {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <p className="mt-2 border-t border-stone-200 pt-2 text-[10.5px] text-stone-500 italic">
                      해석 가이드: contentSignal이 thin/meta-only이면 메타 fallback이 활성화돼야 합니다.
                      final body/keyPoints가 raw paragraphs/keywords보다 크면 fallback이 적용된 것.
                      raw 카운트가 모두 0에 가까우면 추출기가 사이트에서 데이터를 거의 못 가져온 것 —
                      html size·redirect 확인 필요.
                    </p>

                    <div className="mt-2 text-[10.5px] text-stone-400 font-mono">
                      v{APP_VERSION}
                    </div>
                  </div>
                </details>
              </div>
            </details>
          ) : null}

          {/* 핵심 필드 — 항상 보임 */}
          <FieldSection title="기본 정보">
            <Field label="헤드라인 (큰 제목) *" required>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={140}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base focus:border-stone-900 focus:outline-none"
              />
              <p className="mt-1 text-xs text-stone-500">
                💡 카드의 가장 큰 글씨로 표시되는 한 줄 제목이에요. 짧고 명확하게.
              </p>
              <CountHint current={headline.length} max={140} />
            </Field>

            <Field label="부제 *" required>
              <textarea
                value={dek}
                onChange={(e) => setDek(e.target.value)}
                maxLength={280}
                rows={2}
                className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              />
              <p className="mt-1 text-xs text-stone-500">
                💡 헤드라인 바로 아래에 표시되는 한두 문장 요약이에요. (신문에서 큰 제목 밑의 작은 제목 같은 역할)
              </p>
              <CountHint current={dek.length} max={280} />
            </Field>

            <Field label="첫 단락 (도입 글) *" required>
              <textarea
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                rows={3}
                maxLength={600}
                className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              />
              <p className="mt-1 text-xs text-stone-500">
                💡 카드를 펼쳤을 때 가장 먼저 보이는 도입부예요. 본문 내용을 자연스럽게 시작해 주세요.
              </p>
              <CountHint current={lead.length} max={600} />
            </Field>

            <Field label="산업 분류 *" required>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind.key} value={ind.key}>
                    {ind.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-500">
                💡 같은 분류 카드들은 갤러리에서 같은 색상 배지로 묶여 보입니다.
              </p>
            </Field>
          </FieldSection>

          {/* 본문 단락 — 접을 수 있음 */}
          <CollapsibleSection
            title={`본문 단락 (${bodyParagraphs.filter((p) => p.trim()).length}개)`}
            collapsed={collapsed.body}
            onToggle={() => setCollapsed((c) => ({ ...c, body: !c.body }))}
          >
            <p className="mb-2 text-xs text-stone-500">
              💡 카드를 펼쳤을 때 보일 본문 글이에요. 한 단락에 한 가지 이야기를 담는 게 깔끔해요.
            </p>
            <div className="space-y-2">
              {bodyParagraphs.map((p, idx) => (
                <div key={idx} className="flex gap-2">
                  <textarea
                    value={p}
                    onChange={(e) => updateBodyParagraph(idx, e.target.value)}
                    rows={2}
                    maxLength={1000}
                    className="flex-1 resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                    placeholder={`본문 ${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBodyParagraph(idx)}
                    className="self-start rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                    aria-label={`본문 ${idx + 1} 삭제`}
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBodyParagraph}
                className="rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:border-stone-500 hover:text-stone-900"
              >
                + 본문 단락 추가
              </button>
            </div>
          </CollapsibleSection>

          {/* 핵심 포인트 — 접을 수 있음 */}
          <CollapsibleSection
            title={`핵심 포인트 (${keyPoints.filter((p) => p.trim()).length}개)`}
            collapsed={collapsed.keyPoints}
            onToggle={() => setCollapsed((c) => ({ ...c, keyPoints: !c.keyPoints }))}
          >
            <p className="mb-2 text-xs text-stone-500">
              💡 카드 한쪽에 글머리 기호로 표시될 짧은 문장들이에요. (예: 핵심 기능, 강점, 특징 등)
            </p>
            <div className="space-y-2">
              {keyPoints.map((p, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => updateKeyPoint(idx, e.target.value)}
                    maxLength={200}
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                    placeholder={`핵심 포인트 ${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeKeyPoint(idx)}
                    className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                    aria-label={`포인트 ${idx + 1} 삭제`}
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addKeyPoint}
                className="rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:border-stone-500 hover:text-stone-900"
              >
                + 핵심 포인트 추가
              </button>
            </div>
            <Field label="강조 인용문 (선택사항)">
              <textarea
                value={pullQuote}
                onChange={(e) => setPullQuote(e.target.value)}
                rows={2}
                maxLength={400}
                className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              />
              <p className="mt-1 text-xs text-stone-500">
                💡 본문 중 한 문장을 큰 글씨로 강조해서 보여주고 싶을 때 적어주세요. (잡지의 강조 문구처럼)
              </p>
            </Field>
          </CollapsibleSection>

          {/* 회사 정보 — 접을 수 있음 */}
          <CollapsibleSection
            title="회사 정보 (선택사항)"
            collapsed={collapsed.company}
            onToggle={() => setCollapsed((c) => ({ ...c, company: !c.company }))}
          >
            <p className="mb-3 text-xs text-stone-500">
              💡 카드 하단에 회사 연락처를 표시하고 싶을 때만 작성하세요. 비워두면 표시되지 않습니다.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="대표자 이름">
                <input
                  type="text"
                  value={contactRepresentative}
                  onChange={(e) => setContactRepresentative(e.target.value)}
                  maxLength={50}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                />
              </Field>
              <Field label="전화번호">
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  maxLength={30}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                />
              </Field>
              <Field label="이메일 주소">
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                />
              </Field>
              <Field label="회사 주소">
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  maxLength={200}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                />
              </Field>
            </div>
          </CollapsibleSection>

          {/* 사이트 정보·이미지 — 접을 수 있음 */}
          <CollapsibleSection
            title="사이트 이름·이미지"
            collapsed={collapsed.site}
            onToggle={() => setCollapsed((c) => ({ ...c, site: !c.site }))}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="사이트 이름">
                <input
                  type="text"
                  value={sourceSiteName}
                  onChange={(e) => setSourceSiteName(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                />
              </Field>
              <Field label="상단 작은 라벨">
                <input
                  type="text"
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  maxLength={50}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                />
                <p className="mt-1 text-xs text-stone-500">
                  💡 헤드라인 위에 작게 표시되는 카테고리/태그 같은 라벨이에요.
                </p>
              </Field>
            </div>
            <Field label="대표 이미지 주소 (https://로 시작)">
              <input
                type="url"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="https://..."
                maxLength={500}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              />
              <p className="mt-1 text-xs text-stone-500">
                💡 카드 상단에 표시될 대표 이미지의 인터넷 주소예요. 비워두면 이미지 없이 표시됩니다.
              </p>
            </Field>
            <Field label="팔레트(카드 톤)">
              <select
                value={palette}
                onChange={(e) =>
                  setPalette(e.target.value as EditorialCardData["palette"])
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              >
                <option value="paper">paper (밝은 톤)</option>
                <option value="ink">ink (어두운 톤)</option>
                <option value="clay">clay (테크 강조)</option>
              </select>
            </Field>
          </CollapsibleSection>

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {errorMsg}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="sticky bottom-0 -mx-6 -mb-5 flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? "등록하는 중..."
                : isExisting
                  ? "✓ 새 내용으로 덮어쓰기"
                  : "✓ 갤러리에 등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 보조 컴포넌트 ───

function FieldSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      {children}
    </section>
  );
}

function CollapsibleSection({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-stone-900 hover:bg-stone-50"
        aria-expanded={!collapsed}
      >
        <span>{title}</span>
        <span aria-hidden="true" className="text-stone-500">
          {collapsed ? "▸" : "▾"}
        </span>
      </button>
      {!collapsed && <div className="space-y-3 border-t border-stone-200 px-4 py-3">{children}</div>}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className={`mb-1 block text-xs font-medium ${required ? "text-stone-900" : "text-stone-700"}`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function CountHint({ current, max }: { current: number; max: number }) {
  const ratio = current / max;
  const colorClass =
    ratio > 0.95 ? "text-rose-600" : ratio > 0.8 ? "text-amber-600" : "text-stone-400";
  return (
    <p className={`mt-1 text-right text-xs ${colorClass}`}>
      {current} / {max}
    </p>
  );
}
