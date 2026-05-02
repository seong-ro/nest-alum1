/**
 * 카드 본문·헤드라인을 분석하여 업종을 자동 분류.
 * 동일 업종 카드는 갤러리에서 같은 색상 배지로 표시되어 협업 가능 동문을 한눈에 식별 가능.
 *
 * 분류는 키워드 빈도 기반의 단순 규칙. 정확도 100%는 아니지만 갤러리 시각 그루핑 용도로 충분.
 */

export interface Industry {
  /** 업종 식별자 (영문, 카드 메타에 저장) */
  key: string;
  /** 한국어 라벨 */
  label: string;
  /** 카드/배지 색상 — Tailwind safelist에 포함된 값들 */
  color: {
    /** 배경 (옅은 색) */
    bg: string;
    /** 보더 */
    border: string;
    /** 텍스트 (진한 색) */
    text: string;
  };
  /** 분류 키워드 (소문자/한글, AND 아닌 OR 매칭) */
  keywords: string[];
}

/**
 * 업종 목록 + 색상 + 키워드.
 * 순서가 우선순위 (위에서 아래로 검사하여 첫 매치 채택).
 */
export const INDUSTRIES: Industry[] = [
  {
    key: "ai",
    label: "AI · NPU · Edge",
    color: { bg: "#eef2ff", border: "#c7d2fe", text: "#4338ca" },
    keywords: [
      "ai", "npu", "edge ai", "edge", "추론", "머신러닝", "딥러닝",
      "llm", "gpu", "양자화", "신경망", "computer vision", "비전",
      "transformer", "rt-detr", "yolo", "tensorflow", "pytorch",
    ],
  },
  {
    key: "cloud",
    label: "클라우드 · SaaS",
    color: { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1" },
    keywords: [
      "saas", "클라우드", "cloud", "서버리스", "kubernetes", "docker",
      "devops", "mlops", "인프라", "구독", "subscription", "platform",
    ],
  },
  {
    key: "mobility",
    label: "모빌리티 · 로봇",
    color: { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
    keywords: [
      "모빌리티", "mobility", "자율주행", "autonomous", "차량", "자동차",
      "로봇", "robot", "드론", "drone", "v2x", "car", "vehicle",
    ],
  },
  {
    key: "health",
    label: "헬스케어 · 의료",
    color: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
    keywords: [
      "의료", "헬스", "헬스케어", "healthcare", "medical", "진단",
      "임상", "환자", "병원", "약", "약품", "diagnosis", "clinic",
    ],
  },
  {
    key: "fintech",
    label: "핀테크 · 금융",
    color: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
    keywords: [
      "핀테크", "fintech", "금융", "결제", "송금", "투자", "은행",
      "주식", "암호화폐", "crypto", "blockchain", "보험", "lending",
    ],
  },
  {
    key: "edu",
    label: "교육 · 에듀테크",
    color: { bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
    keywords: [
      "교육", "에듀", "edutech", "education", "학습", "튜터",
      "강의", "수업", "학교", "school", "어린이", "초등", "중등",
      "프로젝트 수업", "스쿨",
    ],
  },
  {
    key: "safety",
    label: "안전 · 산업",
    color: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    keywords: [
      "안전", "safety", "산업", "industrial", "건설", "construction",
      "kosha", "현장", "작업장", "공장", "재해", "risk", "ppe",
    ],
  },
  {
    key: "media",
    label: "콘텐츠 · 미디어",
    color: { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d" },
    keywords: [
      "미디어", "media", "콘텐츠", "content", "영상", "video",
      "음악", "music", "게임", "game", "방송", "엔터테인먼트",
      "스트리밍", "streaming", "podcast",
    ],
  },
  {
    key: "commerce",
    label: "커머스 · 리테일",
    color: { bg: "#f7fee7", border: "#d9f99d", text: "#4d7c0f" },
    keywords: [
      "커머스", "commerce", "쇼핑", "shopping", "마켓", "market",
      "리테일", "retail", "판매", "온라인몰", "이커머스", "ecommerce",
      "스토어", "store", "구매", "주문",
    ],
  },
  {
    key: "energy",
    label: "친환경 · 에너지",
    color: { bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e" },
    keywords: [
      "친환경", "에너지", "energy", "태양광", "solar", "풍력", "wind",
      "esg", "탄소중립", "carbon", "sustainability", "재생에너지",
      "수소", "hydrogen", "배터리", "battery",
    ],
  },
  {
    key: "space",
    label: "부동산 · 공간",
    color: { bg: "#fafaf9", border: "#e7e5e4", text: "#57534e" },
    keywords: [
      "부동산", "real estate", "공간", "space", "인테리어", "interior",
      "건축", "architecture", "주거", "오피스", "코워킹", "coworking",
      "프롭테크", "proptech",
    ],
  },
  {
    key: "other",
    label: "기타",
    color: { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" },
    keywords: [],  // 항상 마지막 폴백
  },
];

const INDUSTRY_BY_KEY = new Map(INDUSTRIES.map((i) => [i.key, i]));

/**
 * 카드 본문·헤드라인·요약·핵심포인트를 합쳐 키워드 매칭으로 업종 분류.
 * 가장 많은 키워드가 매칭되는 업종 선택. 동률이면 INDUSTRIES 순서대로 우선.
 */
export function classifyIndustry(card: {
  headline?: string;
  dek?: string;
  body?: string[];
  keyPoints?: string[];
  sourceDomain?: string;
  sourceSiteName?: string;
}): string {
  const text = [
    card.headline ?? "",
    card.dek ?? "",
    ...(card.body ?? []),
    ...(card.keyPoints ?? []),
    card.sourceDomain ?? "",
    card.sourceSiteName ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (!text.trim()) return "other";

  let bestKey = "other";
  let bestScore = 0;
  for (const ind of INDUSTRIES) {
    if (ind.keywords.length === 0) continue;
    let score = 0;
    for (const kw of ind.keywords) {
      // 한글 키워드는 단어 경계 검사 어려우니 단순 includes
      // 영문은 단어 경계로 매칭 (예: "ai"가 "main" 안에 잡히지 않도록)
      const isKorean = /[가-힣]/.test(kw);
      if (isKorean) {
        if (text.includes(kw)) score += 1;
      } else {
        const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
        const matches = text.match(re);
        if (matches) score += matches.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = ind.key;
    }
  }
  return bestKey;
}

export function getIndustry(key: string): Industry {
  return INDUSTRY_BY_KEY.get(key) ?? INDUSTRY_BY_KEY.get("other")!;
}
