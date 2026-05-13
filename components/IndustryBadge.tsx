import { getIndustry } from "@/lib/industry";

/**
 * 업종 배지 — 카드 우상단에 표시되는 색상 코딩 라벨.
 * 같은 업종은 동일 색상으로 갤러리에서 한눈에 그루핑 가능.
 */
export function IndustryBadge({
  industry,
  size = "sm",
}: {
  industry?: string;
  size?: "xs" | "sm" | "md";
}) {
  if (!industry) return null;
  const ind = getIndustry(industry);

  const sizeStyle =
    size === "xs"
      ? "px-2 py-0.5 text-[0.65rem]"
      : size === "md"
        ? "px-3 py-1 text-[0.78rem]"
        : "px-2.5 py-0.5 text-[0.7rem]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium font-mono tracking-wide whitespace-nowrap ${sizeStyle}`}
      style={{
        backgroundColor: ind.color.bg,
        color: ind.color.text,
        border: `1px solid ${ind.color.border}`,
      }}
      title={`업종: ${ind.label}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: ind.color.text }}
        aria-hidden="true"
      />
      {ind.label}
    </span>
  );
}
