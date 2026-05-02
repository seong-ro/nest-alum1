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
