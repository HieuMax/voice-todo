import type { ParsedTodo } from "@/types/todo";

type Period = "am" | "pm" | "noon" | "midnight";

const TIME_PATTERN = /(\d{1,2})\s*(?:giờ|h|:)(?![a-zA-Zà-ỹÀ-Ỹ])\s*(\d{1,2})?\s*(?:phút|p)?/i;

const PERIOD_REGEX = /\b(sáng|trưa|chiều|tối|đêm)\b/i;

const PERIOD_WORDS: Record<string, Period> = {
  "sáng": "am",
  "trưa": "noon",
  "chiều": "pm",
  "tối": "pm",
  "đêm": "midnight",
};

const PERIOD_STRIP = /\b(sáng|trưa|chiều|tối|đêm)\b/gi;

const DAY_STRIP =
  /\b(hôm nay|hôm qua|hôm kia|ngày mai|ngày mốt|tối nay|sáng nay|chiều nay|trưa nay|nay|mai|mốt)\b/gi;

const FILLERS = [
  "nhắc tôi",
  "nhắc mình",
  "nhắc giúp tôi",
  "nhắc",
  "cần phải làm",
  "cần làm",
  "cần phải",
  "cần",
  "nhớ giúp",
  "nhớ",
  "hãy",
  "giúp tôi",
  "giúp",
  "cho tôi",
  "vào lúc",
  "lúc",
  "vào",
  "tôi ơi",
  "ơi",
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function cleanTask(text: string): string {
  let result = text;

  for (const filler of FILLERS) {
    const pattern = new RegExp(`(^|\\s)${escapeRegex(filler)}(?=\\s|$)`, "gi");
    result = result.replace(pattern, " ");
  }

  result = result
    .replace(/\b(giờ|phút)\b/gi, " ")
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
 */
export function parseVoiceCommand(raw: string): ParsedTodo {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { task: "", time: null };

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

  const taskSource = withoutTime.replace(PERIOD_STRIP, " ").replace(DAY_STRIP, " ");
  const task = cleanTask(taskSource);

  return { task: task || "Việc cần làm", time };
}
