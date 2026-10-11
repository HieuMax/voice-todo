import type { ParsedTodo } from "@/types/todo";

type Period = "am" | "pm" | "noon" | "midnight";

const PERIOD_SRC = "sáng|trưa|chiều|tối|đêm";
const DAY_SRC = "hôm nay|hôm qua|hôm kia|ngày mai|ngày mốt|nay|mai|mốt";

/**
 * Standalone words/phrases that mark the start of a new task, e.g.
 * "new mua sữa", "tiep theo đi chợ". They act as task boundaries (like the
 * "công việc là" prefix): stripped from task text and used to split a
 * continuous transcript into several tasks.
 */
const NEW_TASK_MARKERS = [
  "tiếp theo",
  "tiếp đến",
  "tiep theo",
  "tiep den",
  "continue",
  "new",
  "ok",
];
const NEW_TASK_SRC = `(?:${NEW_TASK_MARKERS.join("|")})`;

/**
 * Date/period/connector words that may wrap the time expression itself
 * ("lúc 8 giờ", "8 giờ sáng mai"). They are consumed together with the time so
 * we never strip them from the task body.
 */
const SCAFFOLD_ITEM = `(?:${DAY_SRC}|${PERIOD_SRC}|lúc|vào)`;

const TIME_PATTERN = new RegExp(
  `(?:${SCAFFOLD_ITEM}\\s*)*\\s*(\\d{1,2})\\s*(?:giờ|h|:)(?![a-zA-Zà-ỹÀ-Ỹ])\\s*(\\d{1,2})?\\s*(?:phút|p)?\\s*(?:${SCAFFOLD_ITEM}\\s*)*`,
  "i",
);

const PERIOD_REGEX = new RegExp(`\\b(${PERIOD_SRC})\\b`, "i");

const PERIOD_WORDS: Record<string, Period> = {
  "sáng": "am",
  "trưa": "noon",
  "chiều": "pm",
  "tối": "pm",
  "đêm": "midnight",
};

/**
 * Command fillers ("nhắc tôi", "nhớ", "cần"...) plus a leading date/period.
 * Only stripped at the very start of the task, never mid-sentence, so words
 * like "cần câu", "bữa tối" or "hoa mai" survive.
 */
const LEADING_PATTERN = new RegExp(
  `^(?:\\s*(?:${DAY_SRC}|${PERIOD_SRC}|${NEW_TASK_SRC}|nhắc tôi|nhắc mình|nhắc giúp tôi|nhắc|nhớ giúp|nhớ|cần phải làm|cần làm|cần phải|cần|hãy|giúp tôi|giúp|cho tôi)\\s*)+`,
  "i",
);

const NUMBER_UNITS: Record<string, number> = {
  "không": 0,
  "linh": 0,
  "lẻ": 0,
  "một": 1,
  "mốt": 1,
  "hai": 2,
  "ba": 3,
  "bốn": 4,
  "tư": 4,
  "năm": 5,
  "lăm": 5,
  "nhăm": 5,
  "sáu": 6,
  "bảy": 7,
  "tám": 8,
  "chín": 9,
};

const NUMBER_TENS = new Set(["mười", "mươi", "chục"]);
const NUMBER_TOKENS = new Set([...Object.keys(NUMBER_UNITS), ...NUMBER_TENS]);
const TIME_UNITS = new Set(["giờ", "h", "phút", "tiếng", "rưỡi"]);

function toTime(hour: number, minute: number, period?: Period): string | null {
  let h = hour;

  switch (period) {
    case "noon":
      h = 12;
      break;
    case "pm":
      if (h < 12) h += 12;
      break;
    case "am":
      if (h === 12) h = 0;
      break;
    case "midnight":
      if (h === 12) h = 0;
      else if (h < 12) h += 12;
      break;
    default:
      break;
  }

  if (h < 0 || h > 23 || minute < 0 || minute > 59) return null;

  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function normalizeText(raw: string): string {
  return (raw ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensToNumber(tokens: string[]): number | null {
  if (tokens.length === 0) return null;

  const [first, ...rest] = tokens;

  if (first === "mười") {
    if (rest.length === 0) return 10;
    if (rest.length === 1 && NUMBER_UNITS[rest[0]] !== undefined) {
      return 10 + NUMBER_UNITS[rest[0]];
    }
    return null;
  }

  const unit = NUMBER_UNITS[first];
  if (unit === undefined) return null;
  if (rest.length === 0) return unit;

  if (rest[0] === "mươi" || rest[0] === "chục") {
    const tens = unit * 10;
    if (rest.length === 1) return tens;
    if (rest.length === 2 && NUMBER_UNITS[rest[1]] !== undefined) {
      return tens + NUMBER_UNITS[rest[1]];
    }
    return null;
  }

  return null;
}

/**
 * Convert spelled-out Vietnamese numbers into digits, but only when they sit
 * next to a time word (giờ/h/phút/rưỡi) or a "kém"/"hơn" modifier, so that a
 * task like "mua hai cái bánh" is left untouched.
 */
function digitsFromWords(text: string): string {
  const words = text.split(" ");
  const out: string[] = [];
  let i = 0;

  while (i < words.length) {
    const lower = words[i].toLowerCase();

    if (NUMBER_TOKENS.has(lower)) {
      let j = i;
      while (j < words.length && NUMBER_TOKENS.has(words[j].toLowerCase())) j += 1;

      const run = words.slice(i, j);
      const next = words[j]?.toLowerCase();
      const prev = out[out.length - 1]?.toLowerCase();
      const nearTime =
        TIME_UNITS.has(next ?? "") ||
        prev === "kém" ||
        prev === "hơn" ||
        prev === "đúng";
      const value = tokensToNumber(run);

      if (nearTime && value !== null && value >= 0 && value <= 59) {
        out.push(String(value));
      } else {
        out.push(...run);
      }

      i = j;
      continue;
    }

    out.push(words[i]);
    i += 1;
  }

  return out.join(" ");
}

function normalizeTimeExpressions(text: string): string {
  let result = digitsFromWords(text);

  result = result.replace(/\brưỡi\b/gi, "30");

  result = result.replace(
    /(\d{1,2})\s*(?:giờ|h|tiếng)?\s*kém\s*(\d{1,2})/gi,
    (_match, hour: string, minute: string) => {
      const h = (Number(hour) + 23) % 24;
      const m = 60 - Number(minute);
      return `${h} giờ ${m}`;
    },
  );

  return result;
}

function cleanTask(text: string): string {
  const result = text
    .replace(LEADING_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s,.;:!?\-–]+|[\s,.;:!?\-–]+$/g, "")
    .trim();

  if (!result) return "";
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Parse a raw Vietnamese voice transcript into a clean todo item.
 * Example: "nhắc tôi mua sữa lúc 8 giờ sáng" -> { task: "Mua sữa", time: "08:00" }
 * Also handles spelled numbers: "hai giờ rưỡi chiều" -> 14:30.
 */
export function parseVoiceCommand(raw: string): ParsedTodo {
  const normalized = normalizeText(raw);
  if (!normalized) return { task: "", time: null };

  const text = normalizeTimeExpressions(normalized);

  const periodMatch = text.match(PERIOD_REGEX);
  const period = periodMatch
    ? PERIOD_WORDS[periodMatch[1].toLowerCase()]
    : undefined;

  const timeMatch = text.match(TIME_PATTERN);
  let time: string | null = null;
  let withoutTime = text;

  if (timeMatch && timeMatch.index !== undefined) {
    const hour = Number(timeMatch[1]);
    const minute = timeMatch[2] !== undefined ? Number(timeMatch[2]) : 0;
    time = toTime(hour, minute, period);
    withoutTime =
      text.slice(0, timeMatch.index) +
      " " +
      text.slice(timeMatch.index + timeMatch[0].length);
  }

  const taskSource = withoutTime;
  const task = cleanTask(taskSource);

  return { task: task || "Việc cần làm", time };
}

/**
 * Rank speech-recognition alternatives and return the one that parses into the
 * most plausible todo. Prefers candidates that yield a real task and a time.
 */
export function pickBestTranscript(alternatives: string[]): string {
  const candidates = alternatives.map(normalizeText).filter(Boolean);
  if (candidates.length === 0) return "";

  let best = candidates[0];
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const { task, time } = parseVoiceCommand(candidate);
    let score = 0;

    if (task && task !== "Việc cần làm") {
      score += Math.min(task.length, 40);
    } else {
      score -= 10;
    }
    if (time) score += 8;

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/**
 * Prefix that marks the start of a new spoken task, e.g.
 * "công việc là mua sữa, công việc là đi chợ".
 */
const TASK_PREFIX_SRC = "(?:công việc|việc|task)\\s*(?:là|:)";
const TASK_PREFIX_TEST = new RegExp(`\\b${TASK_PREFIX_SRC}`, "i");
const TASK_PREFIX_SPLIT = new RegExp(`\\s*\\b${TASK_PREFIX_SRC}\\s*`, "gi");
const TASK_PREFIX_LEADING = new RegExp(`^\\s*\\b${TASK_PREFIX_SRC}\\s*`, "i");

/**
 * Detects a standalone "new task" marker and rewrites it to the canonical
 * "việc là" prefix so the existing split/strip logic applies unchanged.
 */
const NEW_TASK_TEST = new RegExp(`(?:^|[\\s,.;:!?])${NEW_TASK_SRC}(?=[\\s,.;:!?]|$)`, "i");
const NEW_TASK_SPLIT = new RegExp(`(?:^|[\\s,.;:!?])${NEW_TASK_SRC}(?=[\\s,.;:!?]|$)`, "gi");

function canonicalizeTaskMarkers(text: string): string {
  return text.replace(NEW_TASK_SPLIT, " việc là ");
}

export interface ParsedVoiceTask {
  raw: string;
  task: string;
  time: string | null;
}

export function hasTaskPrefix(raw: string): boolean {
  const text = normalizeText(raw);
  return TASK_PREFIX_TEST.test(text) || NEW_TASK_TEST.test(text);
}

export function stripTaskPrefix(raw: string): string {
  const text = canonicalizeTaskMarkers(normalizeText(raw));
  return text.replace(TASK_PREFIX_LEADING, "").trim();
}

/**
 * Break one continuous transcript into several tasks using the "công việc là"
 * prefix, then parse each segment (task + optional time).
 */
export function splitVoiceTasks(raw: string): ParsedVoiceTask[] {
  const text = canonicalizeTaskMarkers(normalizeText(raw));
  if (!text) return [];

  const segments = text
    .split(TASK_PREFIX_SPLIT)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const parts = segments.length > 0 ? segments : [text];

  return parts
    .map((segment) => {
      const { task, time } = parseVoiceCommand(segment);
      return {
        raw: segment,
        task: task === "Việc cần làm" ? "" : task,
        time,
      };
    })
    .filter((item) => item.task || item.time);
}
