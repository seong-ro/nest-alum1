/**
 * AI API 없이 동작하는 결정론적 추출 요약기 (확장판).
 *
 * 설계:
 *   1. 문서를 문장 단위로 분리
 *   2. 각 문장을 토큰화 후 불용어 제거
 *   3. 문장 간 코사인 유사도 행렬 생성
 *   4. 파워 이터레이션(TextRank)으로 중요도 점수 산출
 *   5. 위치 가중치(상위 문단 가점)와 길이 패널티 혼합
 *   6. Maximal Marginal Relevance(MMR)로 중복 제거하며 상위 N개 선별
 *
 * 출력 분량 (v1.3, 2.5배 확장):
 *   - lead: 2문장 연결 (~200자)
 *   - bodyParagraphs: 5단락 (10~12문장 분배, ~1200자)
 *   - keyPoints: 6~7항목 (~400자)
 *   - pullQuote: 1문장 (~100자)
 *
 * 풀쿼트는 감성·선언적 키워드가 포함된 문장을 별도 가점으로 선택한다.
 */

import {
  splitSentences,
  tokenize,
  removeStopwords,
  termFrequency,
} from "./text-utils";

// ---------------------------------------------------------------------------
// 분량 파라미터 (원본 문장 수에 따라 자동 스케일)
// ---------------------------------------------------------------------------

const LEAD_SENTENCES = 2;       // 리드는 항상 최대 2문장
const TARGET_BODY_SENTENCES = 18; // 본문에 사용할 목표 문장 수 (15→18)
const TARGET_BODY_PARAGRAPHS = 6; // 본문 단락 수 (5→6)
const TARGET_KEY_POINTS = 10;     // 핵심 메모 항목 수 (8→10)
const KEY_POINT_MIN_CHARS = 12;   // 핵심 포인트 최소 길이 (20→12, 짧은 메시지도 인정)

// ---------------------------------------------------------------------------
// 유사도 (코사인, 토큰 집합 기반)
// ---------------------------------------------------------------------------

function cosineSim(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [k, v] of a) {
    normA += v * v;
    const bv = b.get(k);
    if (bv) dot += v * bv;
  }
  for (const v of b.values()) normB += v * v;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------------------------------------------------------------------
// TextRank 파워 이터레이션
// ---------------------------------------------------------------------------

function textRank(simMatrix: number[][], damping = 0.85, iters = 40): number[] {
  const n = simMatrix.length;
  if (n === 0) return [];
  let scores = new Array(n).fill(1 / n);
  const rowSums = simMatrix.map((row) => row.reduce((a, b) => a + b, 0));

  for (let it = 0; it < iters; it++) {
    const next = new Array(n).fill((1 - damping) / n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j || simMatrix[j][i] === 0 || rowSums[j] === 0) continue;
        next[i] += damping * (simMatrix[j][i] / rowSums[j]) * scores[j];
      }
    }
    scores = next;
  }
  return scores;
}

// ---------------------------------------------------------------------------
// 문장 점수화
// ---------------------------------------------------------------------------

interface ScoredSentence {
  index: number;
  text: string;
  rank: number;
  lengthPenalty: number;
  positionBonus: number;
  finalScore: number;
  tokens: string[];
  tf: Map<string, number>;
}

function scoreSentences(sentences: string[]): ScoredSentence[] {
  const n = sentences.length;
  if (n === 0) return [];

  const tfList: Map<string, number>[] = [];
  const tokensList: string[][] = [];
  for (const s of sentences) {
    const toks = removeStopwords(tokenize(s));
    tokensList.push(toks);
    tfList.push(termFrequency(toks));
  }

  const sim: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = cosineSim(tfList[i], tfList[j]);
      sim[i][j] = s;
      sim[j][i] = s;
    }
  }

  const ranks = textRank(sim);

  return sentences.map((text, i) => {
    const len = text.length;
    let lengthPenalty = 1;
    if (len < 20) lengthPenalty = 0.5;
    else if (len < 35) lengthPenalty = 0.85;
    else if (len > 260) lengthPenalty = 0.55;
    else if (len > 180) lengthPenalty = 0.85;

    const rel = i / Math.max(1, n - 1);
    let positionBonus = 1;
    if (rel < 0.1) positionBonus = 1.35;
    else if (rel < 0.25) positionBonus = 1.15;
    else if (rel > 0.9) positionBonus = 1.1;

    const finalScore = ranks[i] * lengthPenalty * positionBonus;

    return {
      index: i,
      text,
      rank: ranks[i],
      lengthPenalty,
      positionBonus,
      finalScore,
      tokens: tokensList[i],
      tf: tfList[i],
    };
  });
}

// ---------------------------------------------------------------------------
// MMR: 중복 제거하며 상위 N개 선택
// ---------------------------------------------------------------------------

function mmrSelect(
  scored: ScoredSentence[],
  k: number,
  lambda = 0.72,
): ScoredSentence[] {
  const selected: ScoredSentence[] = [];
  const remaining = [...scored];

  const maxScore = Math.max(...scored.map((s) => s.finalScore), 1e-9);

  while (selected.length < k && remaining.length > 0) {
    let bestIdx = -1;
    let bestVal = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const relevance = cand.finalScore / maxScore;
      let maxSim = 0;
      for (const sel of selected) {
        const s = cosineSim(cand.tf, sel.tf);
        if (s > maxSim) maxSim = s;
      }
      const mmr = lambda * relevance - (1 - lambda) * maxSim;
      if (mmr > bestVal) {
        bestVal = mmr;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected.sort((a, b) => a.index - b.index);
}

// ---------------------------------------------------------------------------
// 풀쿼트 추출
// ---------------------------------------------------------------------------

const QUOTE_KEYWORDS_KO = [
  "반드시", "핵심", "유일", "최초", "처음", "세계", "국내",
  "차별화", "혁신", "돌파", "전환", "전략", "비전", "목표",
  "미래", "이유는", "결국", "지금이", "가장", "가능성",
];
const QUOTE_KEYWORDS_EN = [
  "must", "will", "never", "always", "only", "first", "fundamental",
  "critical", "vision", "mission", "future", "believe", "because",
  "unique", "breakthrough", "transform", "essential",
];

function isQuotable(s: ScoredSentence): number {
  const txt = s.text;
  let bonus = 0;
  for (const kw of QUOTE_KEYWORDS_KO) if (txt.includes(kw)) bonus += 0.15;
  for (const kw of QUOTE_KEYWORDS_EN) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(txt)) bonus += 0.12;
  }
  // 적절한 길이 범위(60-220자)에 가산점 — 너무 짧으면 무게감 부족, 너무 길면 인용 부적합
  if (s.text.length >= 60 && s.text.length <= 220) bonus += 0.25;
  else if (s.text.length >= 40 && s.text.length <= 240) bonus += 0.1;
  if (/[0-9]+/.test(txt)) bonus += 0.05;
  return bonus;
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export interface SummaryResult {
  lead: string;
  bodyParagraphs: string[];
  keyPoints: string[];
  pullQuote?: string;
  usedSentences: number;
}

export interface SummarizeInput {
  title?: string;
  description?: string;
  fulltext: string;
}

export function summarize(input: SummarizeInput): SummaryResult {
  const sentences = splitSentences(input.fulltext);
  if (sentences.length === 0) {
    return {
      lead: input.description ?? input.title ?? "",
      bodyParagraphs: [],
      keyPoints: [],
      usedSentences: 0,
    };
  }

  const scored = scoreSentences(sentences);

  // -------------------------------------------------------------------------
  // 리드: 문서 상단 4~20% 범위에서 TextRank가 가장 높은 2문장 선택 후 연결
  // -------------------------------------------------------------------------
  const headPool = scored.slice(0, Math.max(4, Math.ceil(scored.length * 0.2)));
  const leadCount = Math.min(LEAD_SENTENCES, headPool.length);
  const topHead = [...headPool]
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, leadCount)
    .sort((a, b) => a.index - b.index);

  const lead = topHead.length > 0
    ? topHead.map((s) => s.text).join(" ")
    : sentences[0];
  const leadIndices = new Set(topHead.map((s) => s.index));

  // -------------------------------------------------------------------------
  // 본문: 리드 제외 문장들 중 MMR로 상위 N개, 5단락으로 분배
  // -------------------------------------------------------------------------
  const bodyCandidates = scored.filter((s) => !leadIndices.has(s.index));
  const targetBodyPicks = Math.min(
    TARGET_BODY_SENTENCES,
    Math.max(5, Math.floor(bodyCandidates.length * 0.85)),
  );

  const bodyPicks = mmrSelect(bodyCandidates, targetBodyPicks, 0.72);

  const targetParagraphs = Math.min(
    TARGET_BODY_PARAGRAPHS,
    Math.max(2, Math.ceil(bodyPicks.length / 2)),
  );
  const bodyParagraphs = groupIntoParagraphs(
    bodyPicks.map((p) => p.text),
    targetParagraphs,
  );
  const bodyIndices = new Set(bodyPicks.map((s) => s.index));

  // -------------------------------------------------------------------------
  // 핵심 포인트: 리드·본문에 안 쓰인 문장 중 상위 6~7개
  // -------------------------------------------------------------------------
  const usedSoFar = new Set<number>([...leadIndices, ...bodyIndices]);
  const keyPointSentences = [...scored]
    .filter((s) => !usedSoFar.has(s.index))
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, TARGET_KEY_POINTS)
    .sort((a, b) => a.index - b.index);

  const keyPoints = keyPointSentences
    .map((s) => condenseToPoint(s.text))
    .filter((p) => p.length >= KEY_POINT_MIN_CHARS);

  // -------------------------------------------------------------------------
  // 풀쿼트: quotability 가산 후 최고점 선택 (리드와 다른 문장)
  // -------------------------------------------------------------------------
  let pullQuote: string | undefined;
  let best = 0;
  for (const s of scored) {
    if (leadIndices.has(s.index)) continue;
    const q = s.finalScore + isQuotable(s);
    if (q > best && s.text.length <= 240 && s.text.length >= 50) {
      best = q;
      pullQuote = s.text;
    }
  }

  const usedSentences =
    leadIndices.size + bodyIndices.size + keyPointSentences.length;

  return { lead, bodyParagraphs, keyPoints, pullQuote, usedSentences };
}

// ---------------------------------------------------------------------------
// 보조
// ---------------------------------------------------------------------------

function groupIntoParagraphs(lines: string[], groups: number): string[] {
  if (lines.length === 0) return [];
  if (lines.length <= groups) return lines.map((l) => l); // 한 단락에 한 문장씩

  // 정확히 groups개 단락으로 균등 분할 (경계는 실수 비율로 계산 후 반올림)
  const result: string[] = [];
  const avg = lines.length / groups;
  let start = 0;
  for (let g = 0; g < groups; g++) {
    const end = g === groups - 1 ? lines.length : Math.round((g + 1) * avg);
    if (end > start) {
      result.push(lines.slice(start, end).join(" "));
    }
    start = end;
  }
  return result;
}

function condenseToPoint(s: string): string {
  const trimmed = s
    .replace(/^["'“”'「『]/g, "")
    .replace(/["'”』」]+$/g, "")
    .trim();
  if (/[가-힣]$/.test(trimmed)) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed.replace(/[.!?]$/, "");
  return trimmed;
}
