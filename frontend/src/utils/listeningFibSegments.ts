import type { Question } from "../types";

function normalizeOptions(raw: unknown): any[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

export type ListeningFibSeg = { text: string; isBlank: boolean };

/**
 * Đoạn cho LISTENING_FIB_L: JSON trong `content`, hoặc segments trong `options`,
 * hoặc văn bản thường có chỗ trống __1__ (seed DB).
 */
export function parseListeningFibSegments(question: Question): ListeningFibSeg[] {
  const rawContent = (question.content as string) || "";

  try {
    const parsed = JSON.parse(rawContent);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof parsed[0] === "object" &&
      parsed[0] !== null &&
      "isBlank" in parsed[0]
    ) {
      return parsed as ListeningFibSeg[];
    }
  } catch {
    /* fall through */
  }

  const rawOpts = normalizeOptions(question.options);
  if (
    rawOpts.length > 0 &&
    typeof rawOpts[0] === "object" &&
    rawOpts[0] !== null &&
    "isBlank" in rawOpts[0]
  ) {
    return rawOpts as ListeningFibSeg[];
  }

  const out: ListeningFibSeg[] = [];
  rawContent.split(/(__\d+__)/).forEach((part) => {
    if (/^__\d+__$/.test(part)) out.push({ text: "", isBlank: true });
    else if (part) out.push({ text: part, isBlank: false });
  });
  return out;
}
