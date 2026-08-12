import type {
  MatchBreakdown,
  MatchStatus,
  MatchSummary,
  ReadingListItem,
  ReadingListMatch,
} from "./types";

const LEADING_ARTICLE = /^(a|an|the)\s+/i;

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeTitle(value: string): string {
  return normalizeText(value).replace(LEADING_ARTICLE, "");
}

function compact(value: string): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function tokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 || /\d/.test(token));
}

export function levenshteinDistance(left: string, right: string): number {
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitution,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function characterSimilarity(left: string, right: string): number {
  const normalizedLeft = compact(left);
  const normalizedRight = compact(right);
  const longest = Math.max(normalizedLeft.length, normalizedRight.length);
  if (!longest) return 0;
  if (normalizedRight.includes(normalizedLeft) || normalizedLeft.includes(normalizedRight)) {
    const shortest = Math.min(normalizedLeft.length, normalizedRight.length);
    if (shortest / longest >= 0.7) return 1;
  }
  return 1 - levenshteinDistance(normalizedLeft, normalizedRight) / longest;
}

function tokenSimilarity(
  title: string,
  candidate: string,
): Pick<MatchBreakdown, "tokenCoverage" | "tokenPrecision"> {
  const titleTokens = tokens(title);
  const candidateTokens = tokens(candidate);
  if (!titleTokens.length || !candidateTokens.length) {
    return { tokenCoverage: 0, tokenPrecision: 0 };
  }
  const matchedTitle = titleTokens.filter((titleToken) =>
    candidateTokens.some(
      (candidateToken) => characterSimilarity(titleToken, candidateToken) >= 0.72,
    ),
  ).length;
  const matchedCandidate = candidateTokens.filter((candidateToken) =>
    titleTokens.some((titleToken) => characterSimilarity(titleToken, candidateToken) >= 0.72),
  ).length;
  return {
    tokenCoverage: matchedTitle / titleTokens.length,
    tokenPrecision: matchedCandidate / candidateTokens.length,
  };
}

interface CandidateScore {
  evidence: string;
  score: number;
  breakdown: MatchBreakdown;
}

function candidateWindows(rawText: string, title: string): string[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates = new Set(lines);
  for (let index = 0; index < lines.length - 1; index += 1) {
    candidates.add(`${lines[index]} ${lines[index + 1]}`);
  }
  const allTokens = normalizeText(rawText).split(" ").filter(Boolean);
  const targetLength = Math.max(1, tokens(title).length);
  for (let width = Math.max(1, targetLength - 1); width <= targetLength + 2; width += 1) {
    for (let index = 0; index <= allTokens.length - width; index += 1) {
      candidates.add(allTokens.slice(index, index + width).join(" "));
    }
  }
  return [...candidates].filter((candidate) => candidate.length >= 2);
}

function authorSurname(author: string): string {
  return tokens(author).at(-1) ?? "";
}

function scoreCandidate(
  item: ReadingListItem,
  candidate: string,
  fullText: string,
): CandidateScore {
  const character = characterSimilarity(normalizeTitle(item.title), normalizeTitle(candidate));
  const tokenScores = tokenSimilarity(normalizeTitle(item.title), normalizeTitle(candidate));
  const surname = authorSurname(item.author);
  const authorBonus = surname && normalizeText(fullText).includes(surname) ? 0.04 : 0;
  const shortPenalty = compact(item.title).length < 4 ? 0.18 : 0;
  const score = Math.max(
    0,
    Math.min(
      1,
      character * 0.56 +
        tokenScores.tokenCoverage * 0.32 +
        tokenScores.tokenPrecision * 0.12 +
        authorBonus -
        shortPenalty,
    ),
  );
  return {
    evidence: candidate,
    score,
    breakdown: {
      characterSimilarity: character,
      tokenCoverage: tokenScores.tokenCoverage,
      tokenPrecision: tokenScores.tokenPrecision,
      authorBonus,
    },
  };
}

export function statusForScore(score: number, threshold: number): MatchStatus {
  if (score >= threshold) return "found";
  if (score >= Math.max(0.42, threshold - 0.14)) return "review";
  return "missing";
}

export function matchBook(
  item: ReadingListItem,
  rawText: string,
  threshold = 0.72,
): ReadingListMatch {
  const candidates = candidateWindows(rawText, item.title);
  const empty: CandidateScore = {
    evidence: "",
    score: 0,
    breakdown: { characterSimilarity: 0, tokenCoverage: 0, tokenPrecision: 0, authorBonus: 0 },
  };
  const best = candidates.reduce<CandidateScore>((current, candidate) => {
    const scored = scoreCandidate(item, candidate, rawText);
    return scored.score > current.score ? scored : current;
  }, empty);
  const roundedScore = Math.round(best.score * 1000) / 1000;
  return {
    item,
    score: roundedScore,
    status: statusForScore(roundedScore, threshold),
    evidence: best.evidence,
    breakdown: best.breakdown,
  };
}

export function matchReadingList(
  items: ReadingListItem[],
  rawText: string,
  threshold = 0.72,
): ReadingListMatch[] {
  return items
    .map((item) => matchBook(item, rawText, threshold))
    .sort(
      (left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title),
    );
}

export function summarizeMatches(matches: ReadingListMatch[]): MatchSummary {
  return matches.reduce<MatchSummary>(
    (summary, match) => ({
      ...summary,
      [match.status]: summary[match.status] + 1,
      total: summary.total + 1,
    }),
    { found: 0, review: 0, missing: 0, total: 0 },
  );
}
