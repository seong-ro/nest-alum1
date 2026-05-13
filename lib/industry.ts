/**
 * 카드 본문·헤드라인을 분석하여 업종을 자동 분류.
 * 동일 업종 카드는 갤러리에서 같은 색상 배지로 표시되어 협업 가능 동문을 한눈에 식별 가능.
 *
 * 분류는 키워드 빈도 기반의 단순 규칙. 정확도 100%는 아니지만 갤러리 시각 그루핑 용도로 충분.
 *
 * v2.25.0 (2026-05) 정확도 개선:
 *   - 1글자 한글 키워드 제거 ("약" 같이 "이용약관"·"예약"·"약 100명" 등에 오매칭하던 케이스)
 *   - 한글 키워드 최소 2자 강제 (안전 가드)
 *   - 친환경 카테고리에 리사이클링·생분해·소재 키워드 추가 (친환경 소재·리사이클링 사이트 분류)
 *   - 헬스케어 카테고리는 명확한 의료 용어로 한정
 *   - 동률 시 자동분류는 'other'로 후퇴 (편집 단계에서 사용자 수동 선택 권장)
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
      "ai", "npu", "edge ai", "추론", "머신러닝", "딥러닝",
      "llm", "gpu", "양자화", "신경망", "computer vision",
      "transformer", "rt-detr", "yolo", "tensorflow", "pytorch",
      "인공지능", "온디바이스", "on-device",
    ],
  },
  {
    key: "cloud",
    label: "클라우드 · SaaS",
    color: { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1" },
    keywords: [
      "saas", "클라우드", "cloud", "서버리스", "kubernetes", "docker",
      "devops", "mlops", "인프라", "구독", "subscription", "platform",
      "오픈api", "openapi",
    ],
  },
  {
    key: "mobility",
    label: "모빌리티 · 로봇",
    color: { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
    keywords: [
      "모빌리티", "mobility", "자율주행", "autonomous", "차량", "자동차",
      "로봇", "robot", "드론", "drone", "v2x", "vehicle",
      "물류", "라스트마일", "last-mile",
    ],
  },
  {
    key: "health",
    label: "헬스케어 · 의료",
    color: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
    keywords: [
      // v2.25.0: "약" 1글자 제거 (이용약관·예약·약 100명 등에 오매칭) →
      // 의약품·처방약 등 구체 용어로 대체.
      "의료", "헬스케어", "healthcare", "medical", "진단",
      "임상", "환자", "병원", "의약품", "처방약", "약품",
      "diagnosis", "clinical", "치료", "수술", "메디컬",
      "디지털헬스", "원격의료", "telemedicine",
    ],
  },
  {
    key: "fintech",
    label: "핀테크 · 금융",
    color: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
    keywords: [
      "핀테크", "fintech", "금융", "결제", "송금", "투자", "은행",
      "주식", "암호화폐", "crypto", "blockchain", "보험", "lending",
      "여신", "수신", "대출",
    ],
  },
  {
    key: "edu",
    label: "교육 · 에듀테크",
    color: { bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
    keywords: [
      "교육", "에듀", "edutech", "education", "학습", "튜터",
      "강의", "수업", "학교", "school", "어린이", "초등", "중등",
      "프로젝트 수업", "스쿨", "이러닝", "e-learning",
    ],
  },
  {
    key: "safety",
    label: "안전 · 산업",
    color: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    keywords: [
      "안전", "safety", "산업안전", "산업재해", "industrial safety",
      "건설", "construction", "kosha", "현장", "작업장", "공장",
      "재해", "risk", "ppe", "스마트팩토리", "smart factory",
    ],
  },
  {
    key: "media",
    label: "콘텐츠 · 미디어",
    color: { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d" },
    keywords: [
      "미디어", "media", "콘텐츠", "content", "영상", "video",
      "음악", "music", "게임", "game", "방송", "엔터테인먼트",
      "스트리밍", "streaming", "podcast", "웹툰", "webtoon",
    ],
  },
  {
    key: "commerce",
    label: "커머스 · 리테일",
    color: { bg: "#f7fee7", border: "#d9f99d", text: "#4d7c0f" },
    keywords: [
      "커머스", "commerce", "쇼핑", "shopping", "마켓", "market",
      "리테일", "retail", "판매", "온라인몰", "이커머스", "ecommerce",
      "스토어", "store", "구매", "주문", "스마트스토어",
    ],
  },
  {
    // v2.36.0: 친환경 카테고리 분리 — 사용자 보고 "친환경에서 소재·에너지 구분 필요"
    key: "environment",
    label: "친환경",
    color: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    keywords: [
      // 친환경 일반·생분해·리사이클링
      "친환경", "eco", "eco-friendly", "ecology", "환경", "그린", "green",
      "지속가능", "지속 가능", "sustainability", "sustainable",
      "리사이클링", "recycling", "재활용", "재자원화",
      "생분해", "생분해성", "biodegradable", "compostable", "compostable material",
      "업사이클링", "upcycling", "업싸이클",
      "친환경 빨대", "친환경 소재", "비건", "vegan", "탄소중립", "carbon neutral",
      "carbon", "co2", "이산화탄소",
      "esg", "csr", "환경 보호", "탄소 발자국",
      "커피박", "coffee waste", "coffee meal",  // 친환경 자원화 키워드
    ],
  },
  {
    // v2.36.0: 소재 카테고리 신설 — 화학·바이오 소재 회사 정확 분류
    key: "materials",
    label: "소재",
    color: { bg: "#ecfeff", border: "#a5f3fc", text: "#0e7490" },
    keywords: [
      // 화학·고분자 소재
      "소재", "material", "materials", "polymer", "폴리머",
      "pla", "pet", "pbs", "pbat", "pha", "pha 소재",
      "biopellet", "bio pellet", "bio-pellet", "bio pellet",
      // 가공
      "압출", "extrusion", "사출", "injection", "시트", "sheet", "필름", "film",
      "성형", "molding", "원료", "raw material",
      // 산업 소재
      "철강", "강재", "비철", "알루미늄", "aluminum", "특수강",
      "엔지니어링 플라스틱", "엔플라", "엔지니어링플라스틱",
      "코팅", "coating", "접착제", "adhesive",
      "반도체 소재", "디스플레이 소재", "이차전지 소재", "양극재", "음극재",
      "분리막", "전해질",
    ],
  },
  {
    // v2.36.0: 에너지 카테고리 — 재생에너지·전력·수소 등에 한정
    key: "energy",
    label: "에너지",
    color: { bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e" },
    keywords: [
      // 재생에너지
      "에너지", "energy", "재생에너지", "renewable energy",
      "태양광", "solar", "solar pv", "풍력", "wind", "wind power",
      "수소", "hydrogen", "fuel cell", "수소연료전지",
      "지열", "geothermal", "조력", "tidal", "바이오매스", "biomass",
      // 배터리·저장
      "배터리", "battery", "ess", "에너지 저장", "energy storage",
      "이차전지", "rechargeable battery", "리튬이온", "li-ion",
      // 전력 인프라
      "전력", "power grid", "스마트그리드", "smart grid", "전기차 충전",
      "ev 충전", "충전 인프라", "charging infrastructure",
      // 발전·송전
      "발전소", "power plant", "송전", "변전", "전력망",
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

// 자동분류가 모호할 때(최고 점수가 너무 낮거나 동률) other로 후퇴하는 임계값.
// 사용자가 편집 단계에서 직접 선택하도록 유도.
const MIN_CONFIDENCE_SCORE = 2;

/**
 * 카드 본문·헤드라인·요약·핵심포인트를 합쳐 키워드 매칭으로 업종 분류.
 * 가장 많은 키워드가 매칭되는 업종 선택. 동률이면 INDUSTRIES 순서대로 우선.
 *
 * v2.25.0:
 *   - 한글 키워드는 최소 2자 (안전 가드. 1글자 키워드는 자동 무시)
 *   - 동률·낮은 점수면 'other'로 후퇴 (편집 단계에서 수동 선택 유도)
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
  let secondBestScore = 0;

  for (const ind of INDUSTRIES) {
    if (ind.keywords.length === 0) continue;
    let score = 0;
    for (const kw of ind.keywords) {
      const isKorean = /[가-힣]/.test(kw);
      if (isKorean) {
        // v2.25.0 안전 가드: 한글 키워드는 최소 2자. 1글자 키워드는 자동 무시
        // (예: "약"은 "이용약관"·"예약"·"약 100명"에 오매칭하던 버그 차단).
        if (kw.length < 2) continue;
        if (text.includes(kw)) score += 1;
      } else {
        // 영문은 단어 경계로 매칭 (예: "ai"가 "main"·"chain" 안에 잡히지 않도록)
        const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
        const matches = text.match(re);
        if (matches) score += matches.length;
      }
    }
    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestKey = ind.key;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  // v2.25.0: 분류 신뢰도가 낮으면 'other'로 후퇴 — 편집 단계에서 수동 선택 권장.
  // 점수가 너무 낮거나 (1점 이하), 1·2위가 동점인 경우 자동 분류 보류.
  if (bestScore < MIN_CONFIDENCE_SCORE) return "other";
  if (bestScore === secondBestScore && bestScore > 0) return "other";

  return bestKey;
}

export function getIndustry(key: string): Industry {
  return INDUSTRY_BY_KEY.get(key) ?? INDUSTRY_BY_KEY.get("other")!;
}
