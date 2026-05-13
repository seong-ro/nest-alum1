import { ImageResponse } from "next/og";

// Next.js ImageResponse는 Satori(벡터 렌더러)를 사용합니다.
// Satori 규칙:
//   1. 자식이 2개 이상인 <div>는 반드시 display: flex (또는 display: none) 명시
//   2. JSX의 "정적 문자열 + {변수}"는 텍스트 노드 2개로 카운트됨 → template literal로 병합
//   3. 안전을 위해 모든 <div>에 display: flex를 기본 명시
// https://github.com/vercel/satori

export const alt = "신용보증기금 Start-up Nest Alumni 1기 — 17·18기 졸업 기업의 Alumni 1기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BATCHES = ["17기 졸업", "18기 졸업"];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 96px",
          background:
            "linear-gradient(135deg, #ffffff 0%, #f0f5ff 55%, #eef2ff 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* 상단 - 17·18기 뱃지 (짧게 유지, 신용보증기금은 중앙 eyebrow에서 노출) */}
        <div style={{ display: "flex", gap: "10px" }}>
          {BATCHES.map((b) => (
            <div
              key={b}
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(67, 56, 202, 0.1)",
                color: "#4338ca",
                fontSize: "22px",
                fontWeight: 600,
                padding: "8px 18px",
                borderRadius: "999px",
                border: "1px solid rgba(67, 56, 202, 0.25)",
              }}
            >
              {`Start-up Nest · ${b}`}
            </div>
          ))}
        </div>

        {/* 중앙 - 대형 타이틀 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              color: "#475569",
              letterSpacing: "0.06em",
              marginBottom: "10px",
              fontWeight: 500,
            }}
          >
            신용보증기금 (KODIT)
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              color: "#4338ca",
              letterSpacing: "0.02em",
              marginBottom: "18px",
              fontWeight: 600,
            }}
          >
            Start-up Nest
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "96px",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: "#0f172a",
              lineHeight: "0.95",
              marginBottom: "20px",
            }}
          >
            Alumni 1기
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              color: "#4338ca",
              fontWeight: 500,
              lineHeight: 1.3,
            }}
          >
            17·18기 졸업 기업이 결성한 Alumni 1기
          </div>
        </div>

        {/* 하단 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "20px",
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex" }}>기업 소개 · 에디토리얼 허브</div>
          <div
            style={{
              display: "flex",
              fontFamily: "ui-monospace, monospace",
              fontWeight: 500,
            }}
          >
            nest-alum1.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
