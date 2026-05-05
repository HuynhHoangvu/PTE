const STORAGE_KEY = 'pte_tts_prefs_v1';

export type TtsPrefs = {
  /** ~0.75–1.25 — Web Speech & native plugin */
  rate: number;
  /** Giọng trên web (SpeechSynthesisVoice.voiceURI) */
  webVoiceURI: string | null;
  /** Chỉ số giọng trên Android/iOS (@capacitor-community/text-to-speech) */
  nativeVoiceIndex: number | null;
  /** Ưu tiên engine native khi có (thường ổn định hơn Web Speech trên Android) */
  preferNativeWhenAvailable: boolean;
};

const defaults: TtsPrefs = {
  rate: 0.92,
  webVoiceURI: null,
  nativeVoiceIndex: null,
  preferNativeWhenAvailable: true,
};

export function loadTtsPrefs(): TtsPrefs {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...defaults };
}

export function saveTtsPrefs(partial: Partial<TtsPrefs>): TtsPrefs {
  const next = { ...loadTtsPrefs(), ...partial };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
