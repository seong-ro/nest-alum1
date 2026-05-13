"use client";

import { useState, useEffect } from "react";

interface Stats {
  total: number;
  userEditedCount: number;
  autoExtractedCount: number;
  recentlyCreated: number;
  recentlyUpdated: number;
  updatedThisWeek: number;
  topDomains: Array<{ domain: string; count: number }>;
  industryDistribution: Array<{ industry: string; count: number }>;
  recentCards: Array<{
    id: string;
    headline: string;
    domain: string;
    userEdited: boolean;
    updatedAt: string;
  }>;
  allCards: Array<{
    id: string;          // full dedupKey
    headline: string;
    domain: string;
    industry: string;
    userEdited: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  anomalies: Array<{ id: string; reason: string; headline: string }>;
  possibleDuplicates: Array<{ headline: string; count: number }>;
  // v2.55.7: 환경변수 설정 상태
  envStatus?: {
    hasIndexNowKey: boolean;
    hasGithubRepo: boolean;
    hasGithubToken: boolean;
    hasSiteUrl: boolean;
  };
  generatedAt: string;
}

interface CardHistoryEntry {
  path: string;
  date: string;
  card: {
    id: string;
    card: { headline: string; userEdited?: boolean };
    createdAt: string;
    updatedAt: string;
  };
  isDifferent: boolean;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // v2.47.0: GitHub 백업 목록 + 자동 트리거
  type GhBackup = { path: string; name: string; date?: string; size?: number };
  type GhDiag = {
    latestStatus: number;
    treeStatus: number;
    treeBlobCount: number;
    backupCandidates: number;
    notes: string[];
  };
  const [ghBackups, setGhBackups] = useState<GhBackup[] | null>(null);
  const [ghDiag, setGhDiag] = useState<GhDiag | null>(null);
  const [ghBackupsLoading, setGhBackupsLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);

  // v2.49.0: 카드별 시점 복원 — 어떤 카드의 백업 이력을 펼쳐 보여줄지
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [cardHistory, setCardHistory] = useState<CardHistoryEntry[] | null>(null);
  const [cardHistoryLoading, setCardHistoryLoading] = useState(false);
  const [cardHistoryError, setCardHistoryError] = useState<string | null>(null);

  // sessionStorage에서 비밀번호 복원 (탭 단위 유지, 새창은 다시 로그인)
  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("admin-pw") : null;
    if (saved) {
      setPassword(saved);
      void fetchStats(saved);
    }
  }, []);

  async function fetchStats(pw: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.status === 401) {
        // v2.47.0: 친화적 진단 메시지
        let errMsg = "비밀번호가 올바르지 않습니다.";
        try {
          const data = await res.json();
          if (data.hint?.guide) {
            errMsg = data.hint.guide;
          }
        } catch {
          /* fallback */
        }
        setError(errMsg);
        sessionStorage.removeItem("admin-pw");
        setAuthed(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "통계 조회 실패");
        setLoading(false);
        return;
      }
      setStats(data);
      setAuthed(true);
      sessionStorage.setItem("admin-pw", pw);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    void fetchStats(password);
  }

  function handleLogout() {
    sessionStorage.removeItem("admin-pw");
    setAuthed(false);
    setPassword("");
    setStats(null);
  }

  // v2.49.0: 백업/다운로드 핸들러 제거.
  //  - 자동 백업: GitHub Actions가 매일 KST 02:00 실행 (사용자 무개입)
  //  - 복원: GitHub 백업 목록에서 한 클릭 또는 카드별 시점 복원

  // v2.47.0: GitHub의 백업 파일 목록 조회
  async function loadGhBackups() {
    setGhBackupsLoading(true);
    setGhError(null);
    setGhDiag(null);
    try {
      const res = await fetch(`/api/admin/restore-from-github?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (!data.ok) {
        setGhError(data.error ?? "백업 목록 조회 실패");
        setGhBackupsLoading(false);
        return;
      }
      setGhBackups(data.backups ?? []);
      setGhDiag(data.diag ?? null);
    } catch (e) {
      setGhError(e instanceof Error ? e.message : "오류");
    } finally {
      setGhBackupsLoading(false);
    }
  }

  // v2.55.6: Daily Backup workflow 즉시 실행 (cron 02:00 KST 기다리지 않음)
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  async function triggerBackupNow() {
    if (!confirm("GitHub Actions Daily Backup을 즉시 실행할까요?\n1~2분 후 backups/ 폴더에 새 백업이 생성됩니다.")) return;
    setTriggerLoading(true);
    setTriggerMsg(null);
    try {
      const res = await fetch(
        `/api/admin/trigger-backup?password=${encodeURIComponent(password)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!data.ok) {
        setTriggerMsg(`❌ ${data.error ?? "실패"}`);
      } else {
        setTriggerMsg(
          `✅ Workflow 트리거됨. 1~2분 후 [📂 백업 목록 불러오기] 다시 클릭하면 표시됩니다.`,
        );
        // 90초 후 자동 reload
        setTimeout(() => {
          loadGhBackups();
        }, 90_000);
      }
    } catch (e) {
      setTriggerMsg(`❌ ${e instanceof Error ? e.message : "오류"}`);
    } finally {
      setTriggerLoading(false);
    }
  }

  // v2.56.0: 모든 카드 IndexNow 재ping — 검색 노출 회복
  const [reindexLoading, setReindexLoading] = useState(false);
  const [reindexMsg, setReindexMsg] = useState<string | null>(null);
  async function reindexAllCards() {
    if (
      !confirm(
        "모든 카드를 IndexNow에 재ping하여 검색엔진(Bing/Naver/Yandex)에 즉시 알릴까요?\n\n언제 사용?\n- 카드가 구글 검색에서 안 나올 때\n- INDEXNOW_KEY를 새로 설정한 직후\n- 도메인 변경 후",
      )
    )
      return;
    setReindexLoading(true);
    setReindexMsg(null);
    try {
      const res = await fetch(
        `/api/admin/reindex-all?password=${encodeURIComponent(password)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!data.ok) {
        setReindexMsg(`❌ ${data.error ?? "실패"}`);
      } else {
        setReindexMsg(
          `✅ ${data.urlsCount}개 URL이 ${data.providers?.join("·") ?? "검색엔진"}에 ping됨 (HTTP ${data.indexNowStatus}). 1~5분 후 검색 결과 반영.`,
        );
      }
    } catch (e) {
      setReindexMsg(`❌ ${e instanceof Error ? e.message : "오류"}`);
    } finally {
      setReindexLoading(false);
    }
  }

  // v2.47.0: GitHub 백업으로 직접 복원
  // v2.49.0: 카드별 시점 복원 — 카드 클릭 시 30일 이력 fetch
  async function loadCardHistory(cardId: string) {
    if (openCardId === cardId) {
      // 이미 열린 카드 → 닫기
      setOpenCardId(null);
      setCardHistory(null);
      return;
    }
    setOpenCardId(cardId);
    setCardHistory(null);
    setCardHistoryError(null);
    setCardHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/admin/card-history?id=${encodeURIComponent(cardId)}&days=30&password=${encodeURIComponent(password)}`,
      );
      const data = await res.json();
      if (!data.ok) {
        setCardHistoryError(data.error ?? "이력 조회 실패");
        setCardHistoryLoading(false);
        return;
      }
      setCardHistory(data.history ?? []);
    } catch (e) {
      setCardHistoryError(e instanceof Error ? e.message : "오류");
    } finally {
      setCardHistoryLoading(false);
    }
  }

  async function handleRestoreCard(cardId: string, backupPath: string, dateLabel: string) {
    const ok = confirm(
      `'${dateLabel}' 시점의 백업으로 이 카드만 복원합니다. 다른 카드는 영향 없습니다. 계속하시겠습니까?`,
    );
    if (!ok) return;

    setActionMsg(`${dateLabel} 시점으로 카드 복원 중…`);
    try {
      const res = await fetch("/api/admin/restore-card-from-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          cardId,
          backupPath,
          confirm: true,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setActionMsg(`복원 실패: ${data.error}`);
        return;
      }
      const beforeText = data.before
        ? `이전: "${data.before.headline}" (${new Date(data.before.updatedAt).toLocaleString("ko-KR")})`
        : "이전: (카드 없음)";
      const afterText = `복원: "${data.after.headline}" (${new Date(data.after.updatedAt).toLocaleString("ko-KR")})`;
      setActionMsg(`✓ 카드 복원 완료 — ${beforeText} → ${afterText}`);

      // 통계 + 이력 갱신
      void fetchStats(password);
      setOpenCardId(null);
      setCardHistory(null);
    } catch (e) {
      setActionMsg(`복원 실패: ${e instanceof Error ? e.message : "오류"}`);
    }
  }

  // v2.47.0: GitHub 백업으로 직접 복원
  async function handleRestoreFromGithub(path: string, mode: "merge" | "replace") {
    if (mode === "replace") {
      const ok = confirm(
        `⚠️ 위험: '${path}' 백업으로 현재 갤러리를 완전 교체합니다. 기존 카드 모두 삭제. 계속하시겠습니까?`,
      );
      if (!ok) return;
      const ok2 = confirm("정말 모든 현재 카드를 삭제하고 백업으로 덮어쓰시겠습니까? 되돌릴 수 없습니다.");
      if (!ok2) return;
    } else {
      const ok = confirm(
        `'${path}' 백업을 현재 갤러리에 병합합니다. ✎ 사용자 편집 카드 우선 보존. 계속하시겠습니까?`,
      );
      if (!ok) return;
    }

    setActionMsg(`GitHub에서 ${path} 복원 중…`);
    try {
      const res = await fetch("/api/admin/restore-from-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirm: true,
          mode,
          path,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setActionMsg(`복원 실패: ${data.error}`);
        return;
      }
      setActionMsg(
        `복원 완료 (${path}, ${mode}) — before ${data.before} → after ${data.after} (추가 ${data.added}, 덮어쓰기 ${data.overwritten}, 보존 ${data.preserved})`,
      );
      void fetchStats(password);
    } catch (e) {
      setActionMsg(`복원 실패: ${e instanceof Error ? e.message : "오류"}`);
    }
  }

  async function handleRestore(file: File, mode: "merge" | "replace") {
    if (mode === "replace") {
      const ok = confirm(
        "⚠️ 위험: 'replace' 모드는 현재 갤러리의 모든 카드를 삭제하고 백업으로 교체합니다. 계속하시겠습니까?",
      );
      if (!ok) return;
      const ok2 = confirm("정말 모든 현재 카드를 삭제하고 백업으로 덮어쓰시겠습니까? 이 작업은 되돌릴 수 없습니다.");
      if (!ok2) return;
    } else {
      const ok = confirm(
        "백업 데이터를 현재 갤러리에 병합합니다. 사용자 편집 카드는 우선 보존됩니다. 계속하시겠습니까?",
      );
      if (!ok) return;
    }

    setActionMsg("복원 중…");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.cards || !Array.isArray(parsed.cards)) {
        setActionMsg("백업 파일 형식이 올바르지 않습니다 (cards 배열 없음)");
        return;
      }
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirm: true,
          mode,
          cards: parsed.cards,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setActionMsg(`복원 실패: ${data.error}`);
        return;
      }
      setActionMsg(
        `복원 완료 — ${mode} 모드, before ${data.before} → after ${data.after} (추가 ${data.added}, 덮어쓰기 ${data.overwritten}, 보존 ${data.preserved})`,
      );
      void fetchStats(password);
    } catch (e) {
      setActionMsg(`복원 실패: ${e instanceof Error ? e.message : "오류"}`);
    }
  }

  async function handleCleanupDuplicates(dryRun: boolean) {
    setActionMsg(dryRun ? "중복 검사 중…" : "중복 정리 중…");
    try {
      const res = await fetch("/api/admin/cleanup-duplicates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ confirm: !dryRun, dryRun }),
      });
      const data = await res.json();
      if (!data.ok) {
        setActionMsg(`실패: ${data.error}`);
        return;
      }
      const action = dryRun ? "검사 결과" : "정리 완료";
      setActionMsg(
        `${action} — 스캔 ${data.scanned}개, 중복 그룹 ${data.duplicateGroups}개, ${dryRun ? `삭제 예정 ${data.duplicateCards}개` : `삭제 ${data.deleted}개`}`,
      );
      if (!dryRun) void fetchStats(password);
    } catch (e) {
      setActionMsg(`오류: ${e instanceof Error ? e.message : "알 수 없음"}`);
    }
  }

  // ─── 비밀번호 입력 화면 ───
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white rounded-lg border border-stone-200 shadow-sm p-6"
        >
          <h1 className="text-lg font-semibold text-stone-900 mb-1">최고 관리자 모드</h1>
          <p className="text-sm text-stone-600 mb-3">
            최고 관리자 비밀번호를 입력해 주세요. (검색 엔진에 노출되지 않는 페이지)
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mb-4">
            ⚠️ 카드 등록·수정·삭제 비밀번호로는 대시보드에 접근할 수 없습니다.
            별도의 최고 관리자 비밀번호가 필요해요.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            autoFocus
            className="w-full px-3 py-2 rounded-md border border-stone-300 text-sm focus:border-stone-900 focus:outline-none mb-3"
          />
          {error ? (
            <div className="mb-3 p-3 rounded bg-rose-50 border border-rose-200" role="alert">
              <p className="text-xs text-rose-900 leading-relaxed">{error}</p>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-3 py-2 rounded-md bg-stone-900 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
          >
            {loading ? "확인 중…" : "로그인"}
          </button>
          <details className="mt-4">
            <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-700">
              ⚙️ 비밀번호 설정 안내 (관리자용)
            </summary>
            <div className="mt-2 p-3 rounded bg-stone-50 border border-stone-200 text-[11px] text-stone-700 leading-relaxed space-y-1.5">
              <p><strong>인증 정책 (v2.48.0)</strong>:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><code className="bg-stone-200 px-1 rounded">ADMIN_DASHBOARD_PASSWORD</code> 환경변수 — <strong>최고 관리자 대시보드 전용</strong></li>
                <li>카드 등록·수정·삭제용 <code className="bg-stone-200 px-1 rounded">ADMIN_PASSWORD</code>로는 대시보드 접근 <strong>불가</strong> (권한 분리)</li>
              </ul>
              <p className="pt-1.5"><strong>설정 방법</strong>:</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Vercel Dashboard → 프로젝트 → Settings → Environment Variables</li>
                <li><code className="bg-stone-200 px-1 rounded">ADMIN_DASHBOARD_PASSWORD</code> 추가, 값 입력, <strong>Production</strong> 환경 체크</li>
                <li>Deployments → 최신 deployment → ⋯ → <strong>Redeploy</strong> (환경변수 갱신용)</li>
              </ol>
              <p className="pt-1.5 text-amber-700"><strong>참고</strong>: 환경변수는 build 시점에 inline되므로 추가 후 redeploy 필수.</p>
            </div>
          </details>
        </form>
      </div>
    );
  }

  // ─── 대시보드 ───
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">관리자 대시보드</h1>
            <p className="text-sm text-stone-600 mt-0.5">
              마지막 갱신: {stats?.generatedAt ? new Date(stats.generatedAt).toLocaleString("ko-KR") : "—"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchStats(password)}
              disabled={loading}
              className="px-3 py-1.5 rounded-md border border-stone-300 text-sm text-stone-700 hover:bg-stone-100"
            >
              {loading ? "갱신 중…" : "🔄 새로고침"}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md border border-stone-300 text-sm text-stone-700 hover:bg-stone-100"
            >
              로그아웃
            </button>
          </div>
        </div>

        {actionMsg ? (
          <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-900">
            {actionMsg}
            <button
              onClick={() => setActionMsg(null)}
              className="float-right text-blue-600 hover:text-blue-900"
            >
              ✕
            </button>
          </div>
        ) : null}

        {stats ? (
          <>
            {/* 핵심 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="총 카드 수" value={stats.total} />
              <StatCard
                label="✎ 사용자 편집"
                value={stats.userEditedCount}
                hint={`${stats.total > 0 ? Math.round((stats.userEditedCount / stats.total) * 100) : 0}%`}
                color="emerald"
              />
              <StatCard
                label="자동 추출"
                value={stats.autoExtractedCount}
                hint={`${stats.total > 0 ? Math.round((stats.autoExtractedCount / stats.total) * 100) : 0}%`}
              />
              <StatCard
                label="최근 24시간 활동"
                value={stats.recentlyUpdated}
                hint={`이번 주 ${stats.updatedThisWeek}개`}
                color={stats.recentlyUpdated > 0 ? "blue" : undefined}
              />
            </div>

            {/* v2.55.7: 환경변수 인프라 점검 패널 */}
            {stats.envStatus ? (
              <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <h3 className="font-medium text-stone-900 mb-2 text-sm">
                  🔧 인프라 환경변수 점검
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <EnvStatusBadge
                    label="INDEXNOW_KEY"
                    ok={stats.envStatus.hasIndexNowKey}
                    requiredHint="검색 인덱싱 핵심"
                    addUrl="https://vercel.com/dashboard"
                  />
                  <EnvStatusBadge
                    label="NEXT_PUBLIC_SITE_URL"
                    ok={stats.envStatus.hasSiteUrl}
                    requiredHint="canonical/og 핵심"
                    addUrl="https://vercel.com/dashboard"
                  />
                  <EnvStatusBadge
                    label="GITHUB_REPO"
                    ok={stats.envStatus.hasGithubRepo}
                    requiredHint="시점 복원·자동 백업"
                    addUrl="https://vercel.com/dashboard"
                  />
                  <EnvStatusBadge
                    label="GITHUB_TOKEN"
                    ok={stats.envStatus.hasGithubToken}
                    requiredHint="시점 복원·자동 백업"
                    addUrl="https://github.com/settings/personal-access-tokens/new"
                  />
                </div>
                {!stats.envStatus.hasIndexNowKey ? (
                  <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    ⚠️ <strong>INDEXNOW_KEY 미설정</strong> — Bing/Naver/Yandex
                    즉시 인덱싱이 비활성 상태. 카드 등록 시 검색 노출까지
                    days/weeks 소요 (활성 시 minutes).
                    <br />
                    <span className="text-amber-700">
                      Vercel Dashboard → Environment Variables → INDEXNOW_KEY
                      추가 (8-128자 hex/dash 임의 문자열) → Redeploy
                    </span>
                  </div>
                ) : (
                  // v2.56.0: INDEXNOW_KEY가 있으면 [🔄 모든 카드 재인덱싱] 버튼 표시
                  <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
                    <p className="font-medium">🔍 검색 노출 회복 도구</p>
                    <p className="mt-1 text-blue-800">
                      특정 카드가 구글·네이버에서 안 보이거나, 새 카드 등록 후
                      즉시 검색에 반영하고 싶을 때:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={reindexAllCards}
                        disabled={reindexLoading}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reindexLoading
                          ? "⏳ 재인덱싱 중..."
                          : "🔄 모든 카드 검색엔진 재인덱싱 (IndexNow)"}
                      </button>
                      <span className="text-[10px] text-blue-700">
                        주기적 자동 작동 + 수동 트리거 가능
                      </span>
                    </div>
                    {reindexMsg ? (
                      <p
                        className={`mt-2 text-[11px] ${
                          reindexMsg.startsWith("✅")
                            ? "text-emerald-800"
                            : "text-rose-800"
                        }`}
                      >
                        {reindexMsg}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[10px] text-blue-700">
                      💡 매주 일요일 KST 03:00 GitHub Actions가 자동으로 모든
                      카드를 재인덱싱합니다 (weekly-reindex workflow). Google은
                      IndexNow 미지원이지만 sitemap.xml로 1~7일 내 자연 발견.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* v2.49.0: 데이터 관리 — 중복 카드 검사/정리만.
                백업은 GitHub Actions가 매일 자동 수행 → "지금 백업"·"로컬 다운로드" 버튼 제거. */}
            <Section title="🛡️ 데이터 관리">
              <p className="text-xs text-stone-600 mb-3">
                💡 백업은 매일 KST 02:00 GitHub Actions가 자동 수행 → backups/ 폴더에 저장됩니다.
                별도 수동 버튼 없이 자동 보존되니, 아래 [🔄 GitHub 백업에서 복원] 섹션에서
                원하는 시점으로 복원할 수 있어요.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <ActionCard
                  title="🔍 중복 카드 검사"
                  desc="동일 URL이 여러 dedupKey로 저장된 카드를 찾습니다 (검사만, 삭제 X)."
                  buttonLabel="🔍 검사"
                  onClick={() => handleCleanupDuplicates(true)}
                />
                <ActionCard
                  title="🗑️ 중복 카드 정리"
                  desc="⚠️ 검사 결과의 중복 카드를 실제로 삭제합니다 (✎ 사용자 편집 우선 보존)."
                  buttonLabel="🗑️ 중복 정리"
                  variant="danger"
                  onClick={() => handleCleanupDuplicates(false)}
                />
              </div>
            </Section>

            {/* v2.47.0: GitHub 백업으로 직접 복원 (다운로드/업로드 X) */}
            <Section title="🔄 GitHub 백업에서 복원">
              <p className="text-xs text-stone-600 mb-3">
                매일 자동 백업되는 GitHub 저장소의 백업 파일에서 한 클릭으로 현재 갤러리를 교체할 수 있어요.{" "}
                <strong className="text-stone-900">병합 모드</strong>는 사용자 편집 카드 우선 보존,{" "}
                <strong className="text-rose-700">교체 모드</strong>는 백업으로 완전 덮어쓰기.
              </p>
              <button
                onClick={loadGhBackups}
                disabled={ghBackupsLoading}
                className="px-3 py-1.5 rounded text-xs font-medium bg-stone-900 hover:bg-stone-700 text-white disabled:opacity-50 mb-3"
              >
                {ghBackupsLoading ? "조회 중…" : "📂 백업 목록 불러오기"}
              </button>

              {ghError ? <GithubSetupGuide errorMsg={ghError} /> : null}

              {ghBackups && ghBackups.length === 0 ? (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs">
                  <p className="font-medium text-amber-900">
                    ⚠️ 백업 파일을 찾지 못했습니다
                  </p>
                  <p className="mt-1 text-amber-800">
                    GitHub Actions의 자동 백업이 성공했어도 이 메시지가 보인다면,{" "}
                    <strong>Vercel 환경변수 GITHUB_TOKEN이 누락됐거나, 추가 후 redeploy가 안 됐거나,
                    토큰 권한이 부족한 가능성</strong>이 가장 높습니다. 아래 진단 정보로 정확한
                    원인을 파악하세요.
                  </p>
                  <p className="mt-1 text-amber-800">
                    <strong>빠른 확인 순서</strong>:
                    {" "}<a
                      href="https://github.com/seong-ro/nest-alum1/tree/main/backups"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      GitHub backups/ 폴더 ↗
                    </a>
                    {" "}에 파일 존재? → Vercel{" "}
                    <code className="bg-white px-1 rounded">GITHUB_TOKEN</code> 설정? →
                    추가 후 Redeploy?
                  </p>

                  {ghDiag ? (
                    <details className="mt-2.5 bg-white rounded border border-amber-200 p-2" open>
                      <summary className="cursor-pointer font-medium text-stone-900">
                        🔍 진단 정보
                      </summary>
                      <div className="mt-2 space-y-1 text-stone-800">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[11px]">
                          <span className="text-stone-600">latest.json HTTP 상태:</span>
                          <span
                            className={
                              ghDiag.latestStatus === 200
                                ? "text-emerald-700"
                                : ghDiag.latestStatus === 404
                                  ? "text-stone-600"
                                  : "text-rose-700 font-bold"
                            }
                          >
                            {ghDiag.latestStatus || "(네트워크 오류)"}
                          </span>
                          <span className="text-stone-600">Tree API HTTP 상태:</span>
                          <span
                            className={
                              ghDiag.treeStatus === 200
                                ? "text-emerald-700"
                                : "text-rose-700 font-bold"
                            }
                          >
                            {ghDiag.treeStatus || "(네트워크 오류)"}
                          </span>
                          <span className="text-stone-600">Repo 전체 파일 수:</span>
                          <span>{ghDiag.treeBlobCount}</span>
                          <span className="text-stone-600">backups/*.json 발견:</span>
                          <span
                            className={
                              ghDiag.backupCandidates > 0 ? "text-emerald-700" : "text-stone-600"
                            }
                          >
                            {ghDiag.backupCandidates}
                          </span>
                        </div>
                        {ghDiag.notes.length > 0 ? (
                          <div className="mt-2">
                            <p className="font-medium text-stone-900">진단 노트:</p>
                            <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                              {ghDiag.notes.map((n, i) => (
                                <li key={i} className="text-stone-700">
                                  {n}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  ) : null}

                  {/* 진단 결과 기반 자동 안내 */}
                  {ghDiag &&
                  (ghDiag.latestStatus === 401 ||
                    ghDiag.latestStatus === 403 ||
                    ghDiag.treeStatus === 401 ||
                    ghDiag.treeStatus === 403) ? (
                    <div className="mt-2.5 rounded border border-rose-200 bg-rose-50 p-2 text-rose-900">
                      <p className="font-medium">
                        🔑 GITHUB_TOKEN 인증 실패 — 즉시 조치 필요
                      </p>
                      <ol className="list-decimal pl-5 mt-1 space-y-0.5">
                        <li>
                          Vercel → Settings → Environment Variables에서{" "}
                          <code className="bg-white px-1 rounded">GITHUB_TOKEN</code> 값 확인
                        </li>
                        <li>
                          토큰이 없으면{" "}
                          <a
                            href="https://github.com/settings/personal-access-tokens/new"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 hover:underline font-medium"
                          >
                            새 PAT 발급 ↗
                          </a>{" "}
                          (Actions: Read and write + Contents: Read and write 권한)
                        </li>
                        <li>Vercel에 추가 후 Deployments → ⋯ → Redeploy</li>
                      </ol>
                    </div>
                  ) : ghDiag && ghDiag.treeStatus === 404 ? (
                    <div className="mt-2.5 rounded border border-rose-200 bg-rose-50 p-2 text-rose-900">
                      <p className="font-medium">
                        📁 GITHUB_REPO 값 오류 — repo를 찾을 수 없음
                      </p>
                      <p className="mt-1">
                        Vercel 환경변수의{" "}
                        <code className="bg-white px-1 rounded">GITHUB_REPO</code> 값이{" "}
                        <code className="bg-white px-1 rounded">&lt;owner&gt;/&lt;repo&gt;</code>{" "}
                        형식인지 확인하세요. (예:{" "}
                        <code className="bg-white px-1 rounded">seong-ro/nest-alum1</code>)
                      </p>
                    </div>
                  ) : ghDiag &&
                    ghDiag.treeStatus === 200 &&
                    ghDiag.backupCandidates === 0 ? (
                    <div className="mt-2.5 rounded border border-blue-200 bg-blue-50 p-3 text-blue-900">
                      <p className="font-medium">
                        💡 첫 자동 백업이 아직 실행되지 않았어요
                      </p>
                      <p className="mt-1 text-blue-800">
                        GitHub repo는 정상 접근됩니다만 backups/*.json이 없습니다.
                        가능한 원인:
                      </p>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        <li>최초 push 후 cron(매일 KST 02:00)이 아직 안 옴</li>
                        <li>
                          GitHub Secret <code className="bg-white px-1 rounded">ADMIN_DASHBOARD_PASSWORD</code> 미설정
                        </li>
                        <li>force-push 직후 GitHub Actions가 workflow 인식 안 함</li>
                      </ul>
                      <p className="mt-2 font-medium">⚡ 즉시 해결:</p>
                      <p className="text-sm mt-1">
                        아래 버튼으로 cron을 기다리지 않고 지금 바로 백업을 실행할 수 있어요.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          onClick={triggerBackupNow}
                          disabled={triggerLoading}
                          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {triggerLoading
                            ? "⏳ 트리거 중..."
                            : "🚀 지금 백업 실행"}
                        </button>
                        <a
                          href="https://github.com/seong-ro/nest-alum1/tree/main/backups"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline text-xs"
                        >
                          backups/ 폴더 ↗
                        </a>
                        <a
                          href="https://github.com/seong-ro/nest-alum1/actions/workflows/daily-backup.yml"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline text-xs"
                        >
                          Actions 탭 ↗
                        </a>
                      </div>
                      {triggerMsg ? (
                        <p
                          className={`mt-2 text-xs ${
                            triggerMsg.startsWith("✅")
                              ? "text-emerald-800"
                              : "text-rose-800"
                          }`}
                        >
                          {triggerMsg}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {ghBackups && ghBackups.length > 0 ? (
                <ul className="space-y-1.5">
                  {ghBackups.map((b) => (
                    <li
                      key={b.path}
                      className="flex items-center gap-2 p-2 rounded bg-stone-50 border border-stone-200 text-xs"
                    >
                      <span className="font-mono flex-1 truncate">
                        {b.name}
                        {b.size ? (
                          <span className="ml-2 text-stone-500">({(b.size / 1024).toFixed(1)} KB)</span>
                        ) : null}
                      </span>
                      <button
                        onClick={() => handleRestoreFromGithub(b.path, "merge")}
                        className="px-2 py-1 rounded text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                        title="기존 갤러리에 병합 (사용자 편집 카드 보존)"
                      >
                        병합 복원
                      </button>
                      <button
                        onClick={() => handleRestoreFromGithub(b.path, "replace")}
                        className="px-2 py-1 rounded text-[11px] font-medium bg-rose-600 hover:bg-rose-700 text-white"
                        title="⚠️ 갤러리 완전 교체 — 기존 카드 모두 사라짐"
                      >
                        교체 복원
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-stone-500 hover:text-stone-700">
                  📁 로컬 JSON 파일에서 복원 (수동 업로드)
                </summary>
                <div className="mt-2 grid md:grid-cols-2 gap-3">
                  <FileRestoreCard
                    mode="merge"
                    title="병합 모드"
                    desc="JSON 파일의 카드를 기존 갤러리에 병합. ✎ 사용자 편집 카드 우선 보존."
                    onSubmit={handleRestore}
                  />
                  <FileRestoreCard
                    mode="replace"
                    title="교체 모드 (위험)"
                    desc="⚠️ 현재 갤러리를 JSON 파일 내용으로 완전 교체."
                    onSubmit={handleRestore}
                  />
                </div>
              </details>
            </Section>

            {/* 이상 징후 */}
            {stats.anomalies.length > 0 ? (
              <Section title={`⚠️ 이상 징후 (${stats.anomalies.length}개)`}>
                <div className="text-sm">
                  <ul className="space-y-1">
                    {stats.anomalies.slice(0, 10).map((a) => (
                      <li key={a.id} className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-200">
                        <span className="font-mono text-xs text-amber-700">{a.id}</span>
                        <div className="flex-1">
                          <div className="text-stone-900">{a.headline}</div>
                          <div className="text-xs text-amber-700">{a.reason}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {stats.anomalies.length > 10 ? (
                    <p className="mt-2 text-xs text-stone-500">
                      ... 외 {stats.anomalies.length - 10}건. 백업 다운로드 후 직접 확인 권장.
                    </p>
                  ) : null}
                </div>
              </Section>
            ) : (
              <Section title="✅ 이상 징후 없음">
                <p className="text-sm text-stone-600">모든 카드가 정상 상태입니다.</p>
              </Section>
            )}

            {/* 중복 가능성 */}
            {stats.possibleDuplicates.length > 0 ? (
              <Section title={`🔁 동일 헤드라인 (${stats.possibleDuplicates.length}건)`}>
                <ul className="text-sm space-y-1">
                  {stats.possibleDuplicates.slice(0, 10).map((d, i) => (
                    <li key={i} className="flex justify-between p-2 rounded bg-stone-50">
                      <span className="truncate">{d.headline}</span>
                      <span className="text-stone-500 font-mono ml-3">×{d.count}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {/* 산업 분포 */}
            <Section title="🏭 산업 분류 분포">
              <div className="flex flex-wrap gap-2">
                {stats.industryDistribution.map((ind) => (
                  <span
                    key={ind.industry}
                    className="px-2.5 py-1 rounded-full bg-stone-100 text-xs text-stone-700"
                  >
                    {ind.industry}: <strong>{ind.count}</strong>
                  </span>
                ))}
              </div>
            </Section>

            {/* 도메인 Top 10 */}
            <Section title="🌐 등록 도메인 Top 10">
              <ol className="text-sm space-y-1">
                {stats.topDomains.map((d, i) => (
                  <li key={d.domain} className="flex justify-between p-2 rounded bg-stone-50">
                    <span>
                      <span className="text-stone-400 mr-2">{i + 1}.</span>
                      <span className="font-mono">{d.domain}</span>
                    </span>
                    <span className="text-stone-500 font-mono">×{d.count}</span>
                  </li>
                ))}
              </ol>
            </Section>

            {/* 최근 5개 카드 */}
            <Section title="🕐 최근 활동">
              <ul className="text-sm space-y-1">
                {stats.recentCards.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 p-2 rounded bg-stone-50">
                    <span className="font-mono text-xs text-stone-400">{c.id}</span>
                    <span className="flex-1 truncate">{c.headline}</span>
                    {c.userEdited ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px]">
                        ✎ 편집
                      </span>
                    ) : null}
                    <span className="font-mono text-xs text-stone-500">{c.domain}</span>
                    <span className="font-mono text-xs text-stone-500">
                      {new Date(c.updatedAt).toLocaleDateString("ko-KR")}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* v2.49.0: 등록된 카드 + 카드별 시점 복원 (지난 30일 백업 일자 스크롤 박스) */}
            <Section title={`📋 등록 카드 + 시점 복원 (총 ${stats.allCards.length}개)`}>
              <p className="text-xs text-stone-600 mb-3">
                각 카드의 [⏮️ 이전 버전 복원] 버튼을 클릭하면 지난 30일치 백업 일자가 스크롤 박스로
                나타나요. 원하는 날짜를 선택하면 <strong>그 카드만</strong> 그 시점으로 복원됩니다
                (다른 카드는 영향 X).
              </p>
              <ul className="space-y-1.5">
                {stats.allCards.map((c) => {
                  const isOpen = openCardId === c.id;
                  return (
                    <li
                      key={c.id}
                      className="rounded border border-stone-200 bg-white"
                    >
                      <div className="flex items-center gap-3 p-2.5">
                        <span className="font-mono text-[10px] text-stone-400 shrink-0">
                          {c.id.slice(0, 8)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-900 truncate">{c.headline}</span>
                            {c.userEdited ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] shrink-0">
                                ✎ 편집
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-500">
                            <span className="font-mono">{c.domain}</span>
                            <span>·</span>
                            <span className="font-mono">{c.industry}</span>
                            <span>·</span>
                            <span>업데이트 {new Date(c.updatedAt).toLocaleString("ko-KR")}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => loadCardHistory(c.id)}
                          className="px-2.5 py-1 rounded text-[11px] font-medium bg-stone-900 hover:bg-stone-700 text-white shrink-0"
                          aria-expanded={isOpen}
                        >
                          {isOpen ? "닫기 ▲" : "⏮️ 이전 버전 복원"}
                        </button>
                      </div>

                      {/* 펼쳐진 카드 — 백업 일자 스크롤 박스 */}
                      {isOpen ? (
                        <div className="border-t border-stone-200 p-2.5 bg-stone-50">
                          {cardHistoryLoading ? (
                            <p className="text-xs text-stone-600">백업 이력 조회 중…</p>
                          ) : cardHistoryError ? (
                            <GithubSetupGuide errorMsg={cardHistoryError} />
                          ) : cardHistory && cardHistory.length === 0 ? (
                            <p className="text-xs text-stone-500">
                              지난 30일 동안의 백업에 이 카드가 발견되지 않았습니다. 자동 백업이
                              아직 없거나, 카드가 최근 등록되었을 수 있어요.
                            </p>
                          ) : cardHistory ? (
                            <div>
                              <p className="text-[11px] text-stone-600 mb-1.5">
                                백업 일자를 클릭하면 그 시점 데이터로 카드를 복원합니다
                                (스크롤 가능):
                              </p>
                              <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
                                {cardHistory.map((h) => (
                                  <button
                                    key={h.path}
                                    onClick={() =>
                                      handleRestoreCard(c.id, h.path, h.date)
                                    }
                                    className={`w-full text-left flex items-center gap-2 p-1.5 rounded text-[11px] hover:bg-blue-50 transition-colors ${
                                      h.isDifferent
                                        ? "bg-amber-50 border border-amber-200"
                                        : "bg-white border border-stone-200"
                                    }`}
                                    title={h.path}
                                  >
                                    <span className="font-mono font-medium text-stone-900">
                                      {h.date}
                                    </span>
                                    <span className="flex-1 truncate text-stone-600">
                                      {h.card.card.headline}
                                    </span>
                                    {h.card.card.userEdited ? (
                                      <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px]">
                                        ✎
                                      </span>
                                    ) : null}
                                    {h.isDifferent ? (
                                      <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">
                                        다름
                                      </span>
                                    ) : (
                                      <span className="px-1 py-0.5 rounded bg-stone-100 text-stone-500 text-[10px]">
                                        동일
                                      </span>
                                    )}
                                    <span className="text-stone-400">↺</span>
                                  </button>
                                ))}
                              </div>
                              <p className="mt-1.5 text-[10px] text-stone-500">
                                💡 <span className="px-1 rounded bg-amber-100 text-amber-700">다름</span>은
                                현재와 다른 시점, <span className="px-1 rounded bg-stone-100">동일</span>은
                                현재와 같은 데이터입니다.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Section>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Helpers ───
function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: number;
  hint?: string;
  color?: "emerald" | "blue" | "amber";
}) {
  const colorClass =
    color === "emerald"
      ? "bg-emerald-50 border-emerald-200"
      : color === "blue"
        ? "bg-blue-50 border-blue-200"
        : color === "amber"
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-stone-200";
  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <div className="text-xs text-stone-600">{label}</div>
      <div className="text-2xl font-semibold text-stone-900 mt-1">{value.toLocaleString()}</div>
      {hint ? <div className="text-xs text-stone-500 mt-1">{hint}</div> : null}
    </div>
  );
}

// v2.55.7: 환경변수 상태 배지 — 인프라 점검용
function EnvStatusBadge({
  label,
  ok,
  requiredHint,
  addUrl,
}: {
  label: string;
  ok: boolean;
  requiredHint: string;
  addUrl?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded border ${
        ok
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-rose-50 border-rose-300 text-rose-900"
      }`}
    >
      <span className="font-mono text-[10px] flex-shrink-0">
        {ok ? "✓" : "✗"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-mono font-medium text-[10px] truncate">{label}</div>
        <div className="text-[10px] opacity-80 truncate">{requiredHint}</div>
      </div>
      {!ok && addUrl ? (
        <a
          href={addUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] underline hover:no-underline whitespace-nowrap"
          title="환경변수 추가"
        >
          추가↗
        </a>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="text-sm font-semibold text-stone-700 mb-2">{title}</h2>
      <div className="bg-white rounded-lg border border-stone-200 p-4">{children}</div>
    </section>
  );
}

function ActionCard({
  title,
  desc,
  buttonLabel,
  onClick,
  variant,
}: {
  title: string;
  desc: string;
  buttonLabel: string;
  onClick: () => void;
  variant?: "danger";
}) {
  const btnClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : "bg-stone-900 hover:bg-stone-700 text-white";
  return (
    <div className="border border-stone-200 rounded-md p-3">
      <div className="font-medium text-sm text-stone-900">{title}</div>
      <div className="text-xs text-stone-600 mt-1 mb-3">{desc}</div>
      <button onClick={onClick} className={`px-3 py-1.5 rounded text-xs font-medium ${btnClass}`}>
        {buttonLabel}
      </button>
    </div>
  );
}

function FileRestoreCard({
  title,
  desc,
  mode,
  onSubmit,
  compact = false,
}: {
  title: string;
  desc: string;
  mode: "merge" | "replace";
  onSubmit: (file: File, mode: "merge" | "replace") => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "border border-stone-200 rounded-md p-3"}>
      {!compact ? (
        <>
          <div className="font-medium text-sm text-stone-900">{title}</div>
          <div className="text-xs text-stone-600 mt-1 mb-3">{desc}</div>
        </>
      ) : null}
      <input
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onSubmit(f, mode);
            e.target.value = ""; // reset
          }
        }}
        className="text-xs"
      />
    </div>
  );
}

// v2.50.0: GitHub 환경변수 미설정 시 표시되는 상세 설정 가이드.
// GITHUB_REPO·GITHUB_TOKEN이 없으면 시점 복원·백업 목록 기능 작동 안 함.
function GithubSetupGuide({ errorMsg }: { errorMsg: string }) {
  return (
    <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs">
      <div className="flex items-start gap-2 mb-2">
        <span aria-hidden>⚠️</span>
        <div className="flex-1">
          <p className="text-rose-900 font-medium">{errorMsg}</p>
          <p className="text-rose-700 mt-1">
            아래 절차로 <code className="bg-white px-1 rounded">GITHUB_REPO</code> +{" "}
            <code className="bg-white px-1 rounded">GITHUB_TOKEN</code> 두 환경변수를 추가하세요.
          </p>
        </div>
      </div>

      <details className="mt-2 bg-white rounded border border-stone-200 p-2.5" open>
        <summary className="cursor-pointer font-medium text-stone-900 select-none">
          📖 상세 설정 절차 (약 3분 소요)
        </summary>

        <div className="mt-3 space-y-3 text-stone-800 leading-relaxed">
          {/* STEP 1 */}
          <section>
            <p className="font-semibold text-stone-900">
              1️⃣ GitHub Personal Access Token 발급
            </p>
            <ol className="list-decimal pl-5 mt-1 space-y-0.5">
              <li>
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://github.com/settings/personal-access-tokens/new ↗
                </a>
                {" "}접속 (Fine-grained PAT 권장)
              </li>
              <li>
                <strong>Token name</strong>: <code className="bg-stone-100 px-1 rounded">folio-cards-backup</code>
              </li>
              <li>
                <strong>Expiration</strong>: 1년 또는 무기한 (취향대로)
              </li>
              <li>
                <strong>Repository access</strong> → <strong>Only select repositories</strong>{" "}
                → <code className="bg-stone-100 px-1 rounded">nest-alum1</code> 선택
              </li>
              <li>
                <strong>Repository permissions</strong>에서 다음 3개를 <strong>Read and write</strong> 또는 표시된 권한으로 설정:
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li>
                    <strong>Actions</strong>: Read and write
                    <span className="text-stone-500 ml-1">(워크플로우 트리거용)</span>
                  </li>
                  <li>
                    <strong>Contents</strong>: Read and write
                    <span className="text-stone-500 ml-1">(백업 파일 commit/fetch)</span>
                  </li>
                  <li>
                    <strong>Metadata</strong>: Read-only
                    <span className="text-stone-500 ml-1">(자동 포함)</span>
                  </li>
                </ul>
              </li>
              <li>
                [Generate token] 클릭 → 화면에 표시되는{" "}
                <code className="bg-stone-100 px-1 rounded">github_pat_...</code> 값 복사
                <span className="text-rose-700 ml-1 font-medium">
                  (이후 다시 볼 수 없으니 즉시 다음 단계로!)
                </span>
              </li>
            </ol>
          </section>

          {/* STEP 2 */}
          <section>
            <p className="font-semibold text-stone-900">
              2️⃣ Vercel에 환경변수 추가
            </p>
            <ol className="list-decimal pl-5 mt-1 space-y-0.5">
              <li>
                Vercel Dashboard → 프로젝트 → <strong>Settings</strong> →{" "}
                <strong>Environment Variables</strong>
              </li>
              <li>
                <strong>Add New</strong> 버튼 클릭, 다음 두 변수 차례로 추가:
              </li>
            </ol>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-stone-50 border border-stone-200 rounded p-2">
                <p className="font-mono font-semibold text-stone-900">GITHUB_REPO</p>
                <p className="font-mono text-stone-700 mt-1">
                  Value: <code className="bg-white px-1 rounded">seong-ro/nest-alum1</code>
                </p>
                <p className="text-stone-600 mt-1">
                  Environments: <strong>Production + Preview</strong>
                </p>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded p-2">
                <p className="font-mono font-semibold text-stone-900">GITHUB_TOKEN</p>
                <p className="font-mono text-stone-700 mt-1">
                  Value: <code className="bg-white px-1 rounded">github_pat_...</code> (1️⃣에서 복사)
                </p>
                <p className="text-stone-600 mt-1">
                  Environments: <strong>Production + Preview</strong>
                </p>
                <p className="text-rose-700 mt-1">
                  Sensitive 체크 권장
                </p>
              </div>
            </div>
            <p className="mt-1.5 text-stone-600">
              💡 Development 환경은 선택 사항 — 로컬 개발 시 자동 백업 기능을 안 써도 무방합니다.
            </p>
          </section>

          {/* STEP 3 */}
          <section>
            <p className="font-semibold text-stone-900">3️⃣ Redeploy (필수)</p>
            <ol className="list-decimal pl-5 mt-1 space-y-0.5">
              <li>
                Vercel Dashboard → <strong>Deployments</strong> → 최신 deployment의{" "}
                <strong>⋯</strong> 메뉴
              </li>
              <li>
                <strong>Redeploy</strong> 클릭 → "Use existing Build Cache" 체크 해제 권장 → Redeploy
              </li>
              <li>
                <span className="text-stone-600">
                  환경변수는 build 시점에 inline되므로, 추가 후 redeploy 없이는 적용 안 됨
                </span>
              </li>
            </ol>
          </section>

          {/* STEP 3.5 — v2.51.0: GitHub Secret도 별도로 필요 */}
          <section className="bg-blue-50 border border-blue-200 rounded p-2.5">
            <p className="font-semibold text-blue-900">
              3️⃣⁺ GitHub Secret 추가 (자동 백업용 — 별도 필요!)
            </p>
            <p className="text-blue-800 mt-1">
              ⚠️ Vercel 환경변수와 <strong>다른 시스템</strong>이라 별도 등록 필수.
              자동 백업 워크플로우(daily-backup.yml)가 사용합니다.
            </p>
            <ol className="list-decimal pl-5 mt-1.5 space-y-0.5 text-blue-900">
              <li>
                <a
                  href="https://github.com/seong-ro/nest-alum1/settings/secrets/actions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 hover:underline font-medium"
                >
                  GitHub Repo Secrets 페이지 ↗
                </a>{" "}
                접속
              </li>
              <li>
                <strong>[New repository secret]</strong> 클릭
              </li>
              <li>
                <strong>Name</strong>:{" "}
                <code className="bg-white px-1 rounded">ADMIN_DASHBOARD_PASSWORD</code>
              </li>
              <li>
                <strong>Secret</strong>: Vercel에 설정한{" "}
                <code className="bg-white px-1 rounded">ADMIN_DASHBOARD_PASSWORD</code>와{" "}
                <strong>같은 값</strong>
              </li>
              <li>
                [Add secret] 클릭 → 자동 백업 활성화
              </li>
            </ol>
            <p className="mt-2 text-blue-800">
              💡 GitHub Secret은 로그·diff·UI에 표시되지 않아 안전합니다. workflow_dispatch로
              테스트 가능:{" "}
              <a
                href="https://github.com/seong-ro/nest-alum1/actions/workflows/daily-backup.yml"
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 hover:underline"
              >
                Daily Card Backup ↗
              </a>{" "}
              → [Run workflow]
            </p>
          </section>

          {/* STEP 4 */}
          <section>
            <p className="font-semibold text-stone-900">4️⃣ 동작 확인</p>
            <ol className="list-decimal pl-5 mt-1 space-y-0.5">
              <li>이 페이지를 새로 불러옵니다 (Cmd/Ctrl+R)</li>
              <li>
                위쪽 [📂 백업 목록 불러오기] 클릭 → 백업 파일 목록이 보이면 정상
              </li>
              <li>
                아직 자동 백업이 한 번도 실행 안 됐으면 목록이 비어 있을 수 있어요.{" "}
                <a
                  href="https://github.com/seong-ro/nest-alum1/actions/workflows/daily-backup.yml"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Actions ↗
                </a>
                에서 [Run workflow]로 한 번 수동 실행하면 즉시 첫 백업 생성
              </li>
              <li>
                각 카드의 [⏮️ 이전 버전 복원] 버튼이 활성화되어 30일 이력 조회 가능
              </li>
            </ol>
          </section>

          {/* 보안 안내 */}
          <section className="bg-amber-50 border border-amber-200 rounded p-2">
            <p className="font-semibold text-amber-900">🔒 보안 주의</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-amber-900">
              <li>
                <strong>GITHUB_TOKEN은 절대 GitHub repo에 commit하지 마세요.</strong>{" "}
                Vercel 환경변수에만 저장.
              </li>
              <li>
                백업 파일에 카드 연락처 등 개인정보가 포함되니, GitHub repo는{" "}
                <strong>Private</strong>로 운영 권장.
              </li>
              <li>
                토큰 분실/유출 시 즉시{" "}
                <a
                  href="https://github.com/settings/personal-access-tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub PAT 페이지 ↗
                </a>
                에서 Revoke 후 재발급.
              </li>
            </ul>
          </section>
        </div>
      </details>
    </div>
  );
}
