"use client";

import { useState } from "react";
import { refreshAllAction, type RefreshResult } from "@/app/actions";

/**
 * 일괄 새로고침 모달
 * 관리자 비밀번호로 인증 후 모든 카드 외부 사이트 재fetch
 *
 * Vercel Hobby plan 10초 timeout 대응 — 카드별로 server action을 반복 호출
 * 진행 상황을 실시간으로 표시 (X / 100)
 *
 * 에러는 진행 중에도 누적 표시 + 클립보드 복사 기능
 */
export function RefreshAllDialog({
  total,
  onClose,
  onComplete,
}: {
  total: number;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [password, setPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, succeeded: 0, failed: 0 });
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [allErrors, setAllErrors] = useState<NonNullable<RefreshResult["errors"]>>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleRun() {
    if (!password.trim()) return;
    setRunning(true);
    setResult(null);
    setProgress({ current: 0, succeeded: 0, failed: 0 });
    setAllErrors([]);

    const accumulatedErrors: NonNullable<RefreshResult["errors"]> = [];
    let totalSucceeded = 0;
    let totalFailed = 0;
    let offset = 0;

    try {
      while (true) {
        const r = await refreshAllAction(password, offset);

        // 인증 실패 등 즉시 중단
        if (!r.ok) {
          setResult(r);
          setRunning(false);
          return;
        }

        totalSucceeded += r.succeeded ?? 0;
        totalFailed += r.failed ?? 0;
        if (r.errors && r.errors.length > 0) {
          accumulatedErrors.push(...r.errors);
          // 진행 중에도 즉시 누적 에러 업데이트 → 실시간 표시
          setAllErrors([...accumulatedErrors]);
        }

        const nextOffset = r.nextOffset ?? (r.total ?? 0);
        setProgress({
          current: nextOffset,
          succeeded: totalSucceeded,
          failed: totalFailed,
        });

        if (r.done || r.nextOffset === undefined) {
          setResult({
            ok: true,
            total: r.total,
            succeeded: totalSucceeded,
            failed: totalFailed,
            errors: accumulatedErrors,
            done: true,
          });
          setRunning(false);
          // 완료 자동 닫기는 실패가 0건일 때만 — 실패 있으면 사용자가 에러 확인 후 직접 닫기
          if (totalFailed === 0) {
            setTimeout(() => onComplete(), 2000);
          }
          return;
        }

        offset = r.nextOffset;
        // 외부 사이트 부담 완화 — 배치 간 1초 간격
        await new Promise((res) => setTimeout(res, 1000));
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "오류가 발생했습니다.",
      });
      setRunning(false);
    }
  }

  // 에러 텍스트 포맷팅 (복사용)
  function formatErrorsForCopy(errors: NonNullable<RefreshResult["errors"]>): string {
    const ts = new Date().toISOString();
    const lines = [
      `[일괄 새로고침 실패 카드 — ${ts}]`,
      `전체: ${total}개 / 성공: ${progress.succeeded}개 / 실패: ${errors.length}개`,
      "",
      ...errors.map(
        (err, i) =>
          `${i + 1}. [${err.id}] ${err.url}\n   사유: ${err.error}`,
      ),
    ];
    return lines.join("\n");
  }

  async function handleCopyErrors() {
    if (allErrors.length === 0) return;
    const text = formatErrorsForCopy(allErrors);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 폴백 — clipboard API 거부 시 textarea + select
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // 둘 다 실패 — 사용자가 수동 선택해서 복사
        alert("자동 복사에 실패했습니다. 에러 목록을 직접 선택해서 복사해주세요.");
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  // 예상 시간: 카드당 평균 10초 (fetch 9초 + 간격 1초)
  const estimatedMin = Math.max(1, Math.ceil((total * 10) / 60));
  const progressPct =
    total > 0 ? Math.round((progress.current / total) * 100) : 0;

  // 진행 중 또는 완료 후 에러 패널 표시 조건
  const showErrorPanel = allErrors.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refresh-all-title"
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface rounded-lg shadow-overlay border border-border">
        <div className="p-6">
          <h2
            id="refresh-all-title"
            className="text-[1.1rem] font-display font-semibold tracking-tight"
          >
            모든 기업 소개 일괄 새로고침
          </h2>
          <p className="mt-1.5 text-[0.875rem] text-fg-muted leading-relaxed">
            모든 카드의 원본 사이트를 다시 fetch하여 최신 콘텐츠 + 최신 추출
            로직을 반영합니다. 카드 데이터(URL·createdAt)는 보존되며 본문만
            갱신됩니다.
          </p>

          {!result && !running && allErrors.length === 0 ? (
            <>
              <div
                className="mt-4 p-3 rounded-md text-[0.8rem]"
                style={{
                  backgroundColor: "var(--color-surface-raised)",
                  color: "var(--color-fg-muted)",
                }}
              >
                <strong className="text-fg">예상 처리</strong>
                <ul className="mt-1.5 space-y-0.5">
                  <li>• 대상 카드: <strong className="text-fg nums-tabular">{total}</strong>개</li>
                  <li>• 예상 시간: <strong className="text-fg nums-tabular">약 {estimatedMin}분</strong></li>
                  <li>• Vercel 무료 플랜 호환 — 카드별 분할 처리</li>
                  <li>• 실패한 카드는 건너뛰고 계속 진행 (사유 기록)</li>
                </ul>
              </div>

              <label className="mt-4 flex items-start gap-2 text-[0.85rem] cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-fg-muted leading-relaxed">
                  진행 중에는 페이지를 닫지 마세요. 일부 외부 사이트가 재fetch
                  실패해도 기존 카드는 그대로 유지됩니다.
                </span>
              </label>

              <div className="mt-4">
                <label
                  htmlFor="refresh-pw"
                  className="block text-[0.8rem] font-medium text-fg mb-1.5"
                >
                  관리자 비밀번호
                </label>
                <input
                  id="refresh-pw"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-white text-[0.9rem] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="••••"
                  autoFocus
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md border border-border text-[0.875rem] font-medium hover:bg-surface-raised transition-colors focus-ring"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={!password.trim() || !confirmed}
                  className="px-4 py-2 rounded-md text-white text-[0.875rem] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring"
                  style={{ backgroundColor: "var(--color-accent)" }}
                >
                  새로고침 시작
                </button>
              </div>
            </>
          ) : null}

          {/* 진행 중 영역 */}
          {running ? (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.85rem] font-medium text-fg">
                  진행 중…
                </span>
                <span className="text-[0.85rem] nums-tabular text-fg-muted">
                  {progress.current} / {total}
                </span>
              </div>
              {/* 진행률 바 */}
              <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: "var(--color-accent)",
                  }}
                />
              </div>
              <div className="mt-3 flex items-center gap-4 text-[0.8rem] text-fg-muted">
                <span>
                  ✓ 성공{" "}
                  <strong className="text-emerald-700 nums-tabular">
                    {progress.succeeded}
                  </strong>
                </span>
                {progress.failed > 0 ? (
                  <span>
                    ✗ 실패{" "}
                    <strong className="text-red-600 nums-tabular">
                      {progress.failed}
                    </strong>
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-[0.78rem] text-fg-subtle text-center">
                페이지를 닫지 마세요. 카드별로 분할 처리 중입니다.
              </p>
            </div>
          ) : null}

          {/* 인증 실패 등 즉시 중단 */}
          {result && !result.ok ? (
            <div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-[0.85rem] text-red-700">
              {result.error}
            </div>
          ) : null}

          {/* 완료 결과 영역 — 실패 0건이면 자동 닫히지만, 실패 있으면 사용자 확인 후 직접 닫기 */}
          {result && result.ok ? (
            <div className="mt-4">
              <div
                className="p-3 rounded-md border-2"
                style={{
                  borderColor:
                    (result.failed ?? 0) > 0
                      ? "rgb(239 68 68)" // 실패 있으면 빨강 강조
                      : "var(--color-accent)",
                  backgroundColor:
                    (result.failed ?? 0) > 0
                      ? "rgb(254 242 242)"
                      : "var(--color-accent-subtle)",
                }}
              >
                <strong className="text-fg">
                  {(result.failed ?? 0) > 0 ? "완료 (일부 실패)" : "완료!"}
                </strong>
                <ul className="mt-1.5 space-y-0.5 text-[0.85rem] text-fg-muted">
                  <li>• 전체: <strong className="text-fg nums-tabular">{result.total}</strong>개</li>
                  <li>• 성공: <strong className="text-emerald-700 nums-tabular">{result.succeeded}</strong>개</li>
                  {result.failed && result.failed > 0 ? (
                    <li>• 실패: <strong className="text-red-600 nums-tabular">{result.failed}</strong>개 (아래 상세 확인)</li>
                  ) : null}
                </ul>
                {(result.failed ?? 0) === 0 ? (
                  <p className="mt-2 text-[0.78rem] text-fg-muted">
                    잠시 후 갤러리가 자동으로 새로고침됩니다…
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* 누적 에러 패널 — 진행 중에도 표시, 완료 후에도 유지 */}
          {showErrorPanel ? (
            <div
              className="mt-4 p-3 rounded-md border"
              style={{
                borderColor: "rgb(252 165 165)",
                backgroundColor: "rgb(254 242 242)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <strong className="text-[0.85rem] text-red-700">
                  실패한 카드 ({allErrors.length})
                </strong>
                <button
                  type="button"
                  onClick={handleCopyErrors}
                  className="px-2.5 py-1 rounded text-[0.75rem] font-medium border border-red-300 text-red-700 hover:bg-red-100 transition-colors focus-ring"
                  aria-label="실패 사유 클립보드에 복사"
                >
                  {copied ? "✓ 복사됨" : "📋 복사"}
                </button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto text-[0.78rem] pr-1">
                {allErrors.map((err, idx) => (
                  <li
                    key={`${err.id}-${idx}`}
                    className="p-2 rounded bg-white border border-red-100"
                  >
                    <div className="flex items-start gap-1.5">
                      <span className="font-mono text-fg-subtle text-[0.7rem] mt-0.5">
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={err.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[0.72rem] text-blue-700 hover:underline break-all"
                        >
                          {err.url}
                        </a>
                        <p className="mt-1 text-red-700 leading-snug">
                          {err.error}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.7rem] text-fg-subtle">
                💡 실패한 카드는 갤러리 그대로 유지됩니다. 사이트를 직접 확인 후
                개별 카드 삭제 → 재등록하거나 다시 일괄 새로고침을 시도하세요.
              </p>
            </div>
          ) : null}

          {/* 완료 후 닫기 버튼 (실패 있을 때만 표시 — 실패 0건은 자동 닫힘) */}
          {result && result.ok && (result.failed ?? 0) > 0 ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onComplete}
                className="px-4 py-2 rounded-md text-white text-[0.875rem] font-medium transition-colors focus-ring"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                닫기
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
