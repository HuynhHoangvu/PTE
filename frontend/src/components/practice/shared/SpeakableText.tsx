import React from "react";
import { dictionaryApi, type DictionaryEntry } from "../../../api/index";

interface PopoverState {
  word: string;
  top: number;
  left: number;
  status: "loading" | "ok" | "error";
  entry?: DictionaryEntry;
  errorMsg?: string;
}

/**
 * Bọc mỗi từ trong <span class="speak-word" data-word="..."> để:
 * 1. Hover tô vàng nhẹ — người dùng biết từ nào bấm được.
 * 2. Bấm vào từ → mở popup tra nghĩa (dictionaryApi).
 *
 * Không tự đọc to khi bấm — việc "bấm để nghe" vẫn do listener cấp-vùng
 * của SpeakingPromptAudio xử lý (nó tự dò từ tại điểm bấm), nên component
 * này chỉ lo phần hiển thị + tra từ điển, tránh xử lý trùng.
 */
export function SpeakableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const tokens = React.useMemo(() => text.split(/(\s+)/), [text]);
  const [popover, setPopover] = React.useState<PopoverState | null>(null);

  React.useEffect(() => {
    if (!popover) return;
    const close = () => setPopover(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    // Đợi 1 tick để không đóng ngay bởi chính click vừa mở popup
    const t = setTimeout(() => {
      window.addEventListener("click", close);
      window.addEventListener("scroll", close, true);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [popover]);

  const openDictionary = (word: string, target: HTMLElement) => {
    if (!word) return;
    const rect = target.getBoundingClientRect();
    setPopover({ word, top: rect.bottom + 6, left: rect.left, status: "loading" });
    dictionaryApi
      .lookup(word)
      .then((entry) => {
        setPopover((p) => (p && p.word === word ? { ...p, status: "ok", entry } : p));
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || "Không tra được nghĩa của từ này.";
        setPopover((p) => (p && p.word === word ? { ...p, status: "error", errorMsg: msg } : p));
      });
  };

  return (
    <span className={className}>
      {tokens.map((tok, i) => {
        if (!tok || /^\s+$/.test(tok)) return tok;
        const cleanWord = tok.toLowerCase().replace(/[^a-z0-9']/g, "");
        return (
          <span
            key={i}
            className="speak-word"
            data-word={cleanWord}
            onClick={(e) => {
              if (!cleanWord) return;
              openDictionary(cleanWord, e.currentTarget);
            }}
          >
            {tok}
          </span>
        );
      })}

      {popover && (
        <span
          role="dialog"
          aria-label={`Nghĩa của từ ${popover.word}`}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-64 max-w-[80vw] rounded-xl border border-gray-200 bg-white shadow-lg p-3 text-left normal-case"
          style={{ top: popover.top, left: Math.max(8, Math.min(popover.left, window.innerWidth - 264)) }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-bold text-sm text-gray-900">{popover.word}</p>
            <button
              type="button"
              aria-label="Đóng"
              className="text-gray-400 hover:text-gray-600 text-xs px-1"
              onClick={() => setPopover(null)}
            >
              ✕
            </button>
          </div>

          {popover.status === "loading" && (
            <p className="text-xs text-gray-400">Đang tra từ điển…</p>
          )}

          {popover.status === "error" && (
            <p className="text-xs text-gray-400">{popover.errorMsg}</p>
          )}

          {popover.status === "ok" && popover.entry && (
            <div className="space-y-1.5">
              {popover.entry.phonetic && (
                <p className="text-xs text-brand-gold font-mono">{popover.entry.phonetic}</p>
              )}
              {popover.entry.meanings.slice(0, 2).map((m, mi) => (
                <div key={mi}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {m.partOfSpeech}
                  </p>
                  {m.definitions.slice(0, 2).map((d, di) => (
                    <p key={di} className="text-xs text-gray-700 leading-snug">
                      {d.definition}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </span>
      )}
    </span>
  );
}
