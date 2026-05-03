/**
 * 결정론적 텍스트 처리 유틸.
 * AI/ML에 의존하지 않고, 한국어와 영어가 혼합된 문장을
 * 안전하게 분리하고 토큰화한다.
 */

// ---------------------------------------------------------------------------
// 언어 감지
// ---------------------------------------------------------------------------

const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/g;
const LATIN_RE = /[A-Za-z]/g;

export function detectLang(text: string): "ko" | "en" | "mixed" {
  const ko = (text.match(HANGUL_RE) ?? []).length;
  const en = (text.match(LATIN_RE) ?? []).length;
  if (ko === 0 && en === 0) return "en";
  const total = ko + en;
  if (ko / total > 0.7) return "ko";
  if (en / total > 0.7) return "en";
  return "mixed";
}

// ---------------------------------------------------------------------------
// 문장 분리 (KO/EN 혼합 대응)
// ---------------------------------------------------------------------------
// 규칙:
//   - 종결부호 . ! ? 다음 공백에서 끊는다 (영문)
//   - 종결부호 다/요/까/네/죠/함/임 + 마침표 또는 개행에서 끊는다 (한국어 단순 휴리스틱)
//   - 한국어 "다." "요." "까?" "니까." 등은 보조 단서
//   - 줄바꿈 2회 이상은 강한 경계
//   - 약어(Mr., Inc., etc., vs.)로 인한 오분리를 최소화
// ---------------------------------------------------------------------------

const ABBREV = new Set([
  "mr", "mrs", "ms", "dr", "prof", "inc", "ltd", "co",
  "etc", "vs", "e.g", "i.e", "st", "no", "vol",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
]);

export function splitSentences(raw: string): string[] {
  if (!raw) return [];
  // 정규화: 윈도우 개행, NBSP, 제로폭 제거
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .trim();

  const sentences: string[] = [];
  let buf = "";
  const chars = [...text];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    buf += ch;

    const isSentenceEnd =
      ch === "." || ch === "!" || ch === "?" ||
      ch === "。" || ch === "！" || ch === "？";

    if (isSentenceEnd) {
      // 다음 문자가 공백/개행/끝이면 분리 시도
      const next = chars[i + 1] ?? " ";
      if (/[\s\n]/.test(next) || i === chars.length - 1) {
        // 영문 약어 체크: 마지막 단어가 약어이면 분리하지 않음
        if (ch === ".") {
          const tail = buf.slice(-8).toLowerCase().replace(/[^a-z.]/g, "");
          const m = tail.match(/([a-z]+)\.$/);
          if (m && ABBREV.has(m[1])) continue;
        }
        const trimmed = buf.trim();
        if (trimmed.length > 0) sentences.push(trimmed);
        buf = "";
      }
    } else if (ch === "\n") {
      // 빈 줄(단락 경계)
      const trimmed = buf.trim();
      if (trimmed.length > 0) {
        sentences.push(trimmed);
        buf = "";
      }
    }
  }
  const last = buf.trim();
  if (last) sentences.push(last);

  // 너무 짧거나(2자 이하) 순수 숫자만 있는 건 제거
  return sentences
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2 && !/^[\d\s.,()]+$/.test(s));
}

// ---------------------------------------------------------------------------
// 단락 정규화
// ---------------------------------------------------------------------------

export function normalizeParagraphs(raw: string): string[] {
  if (!raw) return [];
  return raw
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}

// ---------------------------------------------------------------------------
// 토큰화 (한국어 어절 + 영어 단어)
// ---------------------------------------------------------------------------

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    // 한국어 어절, 영문/숫자 단어만 남김
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

// ---------------------------------------------------------------------------
// 불용어 (최소)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set<string>([
  // 영어
  "the", "and", "for", "that", "this", "with", "from", "have", "has", "had",
  "are", "was", "were", "but", "not", "you", "your", "they", "their", "our",
  "its", "into", "than", "then", "also", "them", "him", "her", "she", "his",
  "about", "been", "being", "which", "what", "when", "where", "how", "why",
  "who", "whom", "all", "any", "some", "more", "most", "other", "such",
  "very", "can", "will", "would", "could", "should", "may", "might",
  // 한국어 조사/접속/보조
  "그리고", "그러나", "하지만", "또한", "이것", "저것", "그것", "있다", "없다",
  "이는", "그는", "이를", "그를", "같은", "같이", "등의", "등을", "대한", "통해",
  "위한", "위해", "이번", "지난", "다음", "최근", "현재", "경우", "때문", "함께",
  "모든", "매우", "많은", "작은", "높은", "낮은", "좋은", "있는", "없는",
  "것이", "것은", "것을", "것이다", "합니다", "입니다", "됩니다", "있습니다", "됐다",
]);

export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOPWORDS.has(t));
}

// ---------------------------------------------------------------------------
// 단어 빈도
// ---------------------------------------------------------------------------

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

// ---------------------------------------------------------------------------
// 안전한 자르기 (단어 경계)
// ---------------------------------------------------------------------------

export function clampByWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}
