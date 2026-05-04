import type { Question } from "../types";
import { parseListeningFibSegments } from "./listeningFibSegments";
import { parseReadingFibDrag } from "./readingFibDrag";

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

/** Nối các đoạn JSON kiểu [{ text, isBlank }] thành một dòng đọc được (ô trống → …). */
function previewFromFibJsonArray(raw: string): string | null {
  try {
    const p = JSON.parse(raw);
    if (
      !Array.isArray(p) ||
      p.length === 0 ||
      typeof p[0] !== "object" ||
      p[0] === null ||
      !("isBlank" in p[0])
    ) {
      return null;
    }
    const text = p
      .map((s: { text?: string; isBlank?: boolean }) =>
        s.isBlank ? " … " : s.text != null ? String(s.text) : "",
      )
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Một dòng preview cho card danh sách câu (mobile / web), tránh hiển thị JSON thô cho FIB.
 */
export function getQuestionListPreview(
  question: Pick<Question, "type" | "title" | "content">,
  maxLen = 80,
): string {
  const title = (question.title || "").trim();
  if (title) return stripHtml(title).slice(0, maxLen);

  const type = question.type;

  if (type === "READING_FIB_R" || type === "READING_FIB_R_W") {
    const { segments } = parseReadingFibDrag(question as Question);
    const text = segments
      .map((s) => (s.kind === "text" ? s.text : " … "))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (text) return stripHtml(text).slice(0, maxLen);
  }

  if (type === "LISTENING_FIB_L") {
    const segs = parseListeningFibSegments(question as Question);
    const text = segs
      .map((s) => (s.isBlank ? " … " : s.text))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (text) return stripHtml(text).slice(0, maxLen);
  }

  const raw = (question.content || "") as string;
  const fromFib = previewFromFibJsonArray(raw);
  if (fromFib) return stripHtml(fromFib).slice(0, maxLen);

  return stripHtml(raw).slice(0, maxLen);
}
