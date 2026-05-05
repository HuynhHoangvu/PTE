/**
 * Đọc văn bản bằng Web Speech API — dùng chung cho “bấm vào chữ/từ thì đọc”.
 * Tích hợp: gọi speak(), hoặc attachPointerReader() trên khối chứa bài.
 */

export type ClickToSpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
  onStart?: () => void;
  onEnd?: () => void;
};

export type PointerReaderOptions = {
  /** true: đọc toàn bộ phần tử được bấm (hoặc closest selector). false: cố lấy một từ tại điểm bấm */
  readWholeTarget?: boolean;
  /** Chỉ áp dụng khi readWholeTarget: đọc phần tử khớp selector (vd "[data-speak]") */
  speakSelector?: string;
  /** Bỏ qua khi bấm vào nút/link (tuỳ chỉnh) */
  ignoreSelector?: string;
};

const DEFAULTS: Required<Pick<ClickToSpeakOptions, 'lang' | 'rate' | 'pitch' | 'volume'>> = {
  lang: typeof navigator !== 'undefined' && /^(vi|vi-)/i.test(navigator.language || '')
    ? 'vi-VN'
    : 'en-US',
  rate: 1,
  pitch: 1,
  volume: 1,
};

function normalizeSpeechText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Lấy từ tại offset trong một chuỗi (khi caret nằm trong text node). */
export function wordAtOffsetInString(text: string, offset: number): string {
  if (!text.length || offset < 0) return '';
  let pos = offset >= text.length ? text.length - 1 : offset;
  if (/\s/.test(text[pos]!)) {
    while (pos < text.length && /\s/.test(text[pos]!)) pos++;
    if (pos >= text.length) return '';
  }
  let start = pos;
  while (start > 0 && !/\s/.test(text[start - 1]!)) start--;
  let end = pos + 1;
  while (end < text.length && !/\s/.test(text[end]!)) end++;
  return text.slice(start, end).trim();
}

/**
 * Lấy đoạn text tại điểm bấm (ưu tiên một từ). Trả null nếu không suy ra được.
 */
export function getTextAtPoint(clientX: number, clientY: number): string | null {
  const doc = document;
  let textNode: Text | null = null;
  let offset = 0;

  const rangeFromPoint = (doc as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null })
    .caretRangeFromPoint?.(clientX, clientY);
  if (rangeFromPoint && rangeFromPoint.startContainer?.nodeType === Node.TEXT_NODE) {
    textNode = rangeFromPoint.startContainer as Text;
    offset = rangeFromPoint.startOffset;
  } else {
    const caretPos = (doc as Document & { caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null })
      .caretPositionFromPoint?.(clientX, clientY);
    if (caretPos?.offsetNode?.nodeType === Node.TEXT_NODE) {
      textNode = caretPos.offsetNode as Text;
      offset = caretPos.offset;
    }
  }

  if (!textNode) return null;
  const raw = textNode.textContent ?? '';
  const word = wordAtOffsetInString(raw, offset);
  return word ? normalizeSpeechText(word) : null;
}

export class ClickToSpeak {
  private defaults: typeof DEFAULTS & { voice: SpeechSynthesisVoice | null };

  constructor(initial?: ClickToSpeakOptions) {
    this.defaults = {
      ...DEFAULTS,
      voice: initial?.voice ?? null,
      lang: initial?.lang ?? DEFAULTS.lang,
      rate: initial?.rate ?? DEFAULTS.rate,
      pitch: initial?.pitch ?? DEFAULTS.pitch,
      volume: initial?.volume ?? DEFAULTS.volume,
    };
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  setDefaults(partial: ClickToSpeakOptions): void {
    if (partial.lang !== undefined) this.defaults.lang = partial.lang;
    if (partial.rate !== undefined) this.defaults.rate = partial.rate;
    if (partial.pitch !== undefined) this.defaults.pitch = partial.pitch;
    if (partial.volume !== undefined) this.defaults.volume = partial.volume;
    if (partial.voice !== undefined) this.defaults.voice = partial.voice;
  }

  stop(): void {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
  }

  speak(text: string, overrides?: ClickToSpeakOptions): void {
    if (!ClickToSpeak.isSupported()) return;
    const t = normalizeSpeechText(text);
    if (!t) return;

    const u = new SpeechSynthesisUtterance(t);
    u.lang = overrides?.lang ?? this.defaults.lang;
    u.rate = overrides?.rate ?? this.defaults.rate;
    u.pitch = overrides?.pitch ?? this.defaults.pitch;
    u.volume = overrides?.volume ?? this.defaults.volume;
    const v = overrides?.voice !== undefined ? overrides.voice : this.defaults.voice;
    if (v) u.voice = v;

    u.onstart = () => overrides?.onStart?.();
    u.onend = () => overrides?.onEnd?.();

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  /**
   * Đọc theo vị trí bấm: mặc định một từ; hoặc cả khối nếu readWholeTarget.
   */
  speakFromPointerEvent(ev: MouseEvent | PointerEvent, opts?: PointerReaderOptions & ClickToSpeakOptions): void {
    if (!ClickToSpeak.isSupported()) return;

    const readWhole = opts?.readWholeTarget === true;
    const ignore = opts?.ignoreSelector;
    const target = ev.target;
    if (!(target instanceof Element)) return;
    if (ignore && target.closest(ignore)) return;

    let raw = '';
    if (readWhole) {
      const el = opts?.speakSelector ? target.closest(opts.speakSelector) : target.closest('[data-speak-block]') ?? target;
      raw = (el as HTMLElement).innerText ?? '';
    } else {
      raw = getTextAtPoint(ev.clientX, ev.clientY) ?? '';
      if (!raw && opts?.speakSelector) {
        const el = target.closest(opts.speakSelector);
        if (el) raw = (el as HTMLElement).innerText ?? '';
      }
    }

    const { readWholeTarget: _rw, speakSelector: _ss, ignoreSelector: _ig, ...speechOpts } = opts ?? {};
    void _rw;
    void _ss;
    void _ig;

    this.speak(raw, speechOpts);
  }

  /**
   * Gắn listener vào root (ủy quyền sự kiện). Trả về hàm gỡ listener.
   */
  attachPointerReader(root: HTMLElement, opts?: PointerReaderOptions & ClickToSpeakOptions): () => void {
    const handler = (ev: Event) => {
      if (ev instanceof MouseEvent || (typeof PointerEvent !== 'undefined' && ev instanceof PointerEvent)) {
        this.speakFromPointerEvent(ev, opts);
      }
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }
}

/** Instance mặc định — import và dùng trực tiếp hoặc tạo new ClickToSpeak() riêng */
export const clickToSpeak = new ClickToSpeak();

/** Đề Speaking PTE — luôn đọc tiếng Anh (giọng & ngữ cảnh thi). */
export const clickToSpeakEnglishPte = new ClickToSpeak({
  lang: 'en-US',
  rate: 0.92,
  pitch: 1,
  volume: 1,
});
