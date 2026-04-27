import type { Question } from "../types";

/** Một đoạn text hoặc một ô trống (id khớp key trong correctAnswer / answers). */
export type FibDragSegment =
  | { kind: "text"; text: string }
  | { kind: "blank"; id: string };

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

const pushUnique = (pool: string[], w: string) => {
  const t = (w || "").trim();
  if (t && !pool.includes(t)) pool.push(t);
};

/** Crawl R&W FIB lưu cả đoạn bài + ô trống trong cột `options` (JSON segments), `content` có thể rỗng. */
function isOptionsSegmentArray(opts: any[]): boolean {
  return (
    opts.length > 0 &&
    typeof opts[0] === "object" &&
    opts[0] !== null &&
    "isBlank" in opts[0]
  );
}

/**
 * Parse READING_FIB_R / READING_FIB_R_W cho dạng kéo từ (drag): đoạn văn + ô trống + word bank.
 * — RWFIB (crawl): segments nằm trong `options`, `content` thường trống.
 * — RFIB: JSON trong `content` hoặc `__n__` trong `content` + pool trong `options`.
 */
export function parseReadingFibDrag(question: Question): {
  segments: FibDragSegment[];
  wordBank: string[];
} {
  const rawContent: string = (question.content as string) || "";
  const rawOpts = normalizeOptions(question.options);

  const segments: FibDragSegment[] = [];
  const wordBank: string[] = [];

  if (isOptionsSegmentArray(rawOpts)) {
    let blankSeq = 0;
    rawOpts.forEach((s: any) => {
      if (!s.isBlank) {
        segments.push({ kind: "text", text: s.text != null ? String(s.text) : "" });
      } else {
        segments.push({ kind: "blank", id: String(++blankSeq) });
      }
    });
    rawOpts.forEach((s: any) => {
      if (s.isBlank && Array.isArray(s.options)) {
        s.options.forEach((c: string) => pushUnique(wordBank, c));
      }
    });
    return { segments, wordBank };
  }

  let parsedJson: unknown = null;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    /* plain text */
  }

  let blankSeq = 0;

  if (
    Array.isArray(parsedJson) &&
    parsedJson.length > 0 &&
    (parsedJson[0] as any)?.hasOwnProperty?.("isBlank")
  ) {
    (parsedJson as any[]).forEach((s) => {
      if (s.isBlank) segments.push({ kind: "blank", id: String(++blankSeq) });
      else if (s.text) segments.push({ kind: "text", text: String(s.text) });
    });
    rawOpts.forEach((o) => {
      if (typeof o === "string") pushUnique(wordBank, o);
    });
  } else {
    rawContent.split(/(__\d+__)/).forEach((part) => {
      const m = part.match(/^__(\d+)__$/);
      if (m) segments.push({ kind: "blank", id: m[1] });
      else if (part) segments.push({ kind: "text", text: part });
    });
    rawOpts.forEach((o: any) => {
      if (o?.blank != null && Array.isArray(o.choices)) {
        o.choices.forEach((c: string) => pushUnique(wordBank, c));
      }
    });
    if (wordBank.length === 0) {
      rawOpts.forEach((o) => {
        if (typeof o === "string") pushUnique(wordBank, o);
      });
    }
  }

  return { segments, wordBank };
}
