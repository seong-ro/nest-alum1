// 환경별 로그 레벨 자동 분기 + Vercel 로그 검색 친화 형식
// 사용: log.info("createCard", "started", { url }) → [INFO][createCard] started {"url":"..."}

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 프로덕션은 info+, 개발은 debug+ 출력
const MIN_LEVEL: Level = process.env.NODE_ENV === "production" ? "info" : "debug";

function emit(level: Level, ctx: string, msg: string, meta?: unknown) {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;
  const tag = `[${level.toUpperCase()}][${ctx}]`;
  const metaStr = meta !== undefined ? " " + safeStringify(meta) : "";
  const line = `${tag} ${msg}${metaStr}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function safeStringify(v: unknown): string {
  try {
    if (v instanceof Error) {
      return JSON.stringify({ name: v.name, message: v.message });
    }
    return JSON.stringify(v);
  } catch {
    return "[unserializable]";
  }
}

export const log = {
  debug: (ctx: string, msg: string, meta?: unknown) => emit("debug", ctx, msg, meta),
  info: (ctx: string, msg: string, meta?: unknown) => emit("info", ctx, msg, meta),
  warn: (ctx: string, msg: string, meta?: unknown) => emit("warn", ctx, msg, meta),
  error: (ctx: string, msg: string, meta?: unknown) => emit("error", ctx, msg, meta),
};
