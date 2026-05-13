/**
 * v2.29.0: 배포된 버전·커밋·시간을 즉시 확인할 수 있는 endpoint.
 *
 * 사용자가 https://nest-alum1.vercel.app/api/version 한 번 방문하면 현재 production에
 * 깔린 정확한 버전을 확인 가능. v2.X.Y 새 버전을 배포했는데 여전히 옛 버전 동작이
 * 보일 때, 이 endpoint로 진짜 배포 됐는지 즉시 진단.
 *
 * 응답 예시:
 * ```json
 * {
 *   "version": "2.29.0",
 *   "commitSha": "a1b2c3d",
 *   "deploymentId": "dpl_xxx",
 *   "deployedAt": "2026-05-06T...",
 *   "region": "icn1",
 *   "responseTime": "2026-05-06T..."
 * }
 * ```
 */

import { NextResponse } from "next/server";
import pkg from "@/package.json";

// 항상 fresh 응답 — 캐시 X
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    version: pkg.version,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    fullCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "local",
    deployedAt: process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME
      ? new Date().toISOString()  // Vercel은 빌드 시점을 직접 노출 안 함 — 응답 시점으로 근사
      : "local",
    region: process.env.VERCEL_REGION ?? "local",
    nodeEnv: process.env.NODE_ENV,
    responseTime: new Date().toISOString(),
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
