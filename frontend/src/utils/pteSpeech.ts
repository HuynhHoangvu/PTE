/**
 * Đọc đề PTE tiếng Anh: Web Speech trên web; TextToSpeech native trên app (Android/iOS)
 * khi bật preferNative (mặc định) — lỗi native thì tự fallback Web Speech.
 */
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { ClickToSpeak, clickToSpeakEnglishPte } from './clickToSpeak';
import { loadTtsPrefs } from './ttsPreferences';

export type PteSpeakOptions = {
  rate?: number;
  voice?: SpeechSynthesisVoice | null;
  nativeVoiceIndex?: number | null;
  preferNative?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
};

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isNativeTtsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function pteSpeakEnglish(text: string, opts?: PteSpeakOptions): Promise<void> {
  const t = normalize(text);
  if (!t) return;

  const prefs = loadTtsPrefs();
  const rate = opts?.rate ?? prefs.rate;
  const preferNative = opts?.preferNative ?? prefs.preferNativeWhenAvailable;
  const onStart = opts?.onStart;
  const onEnd = opts?.onEnd;

  if (isNativeTtsAvailable() && preferNative) {
    try {
      onStart?.();
      const voiceIdx =
        opts?.nativeVoiceIndex !== undefined && opts?.nativeVoiceIndex !== null
          ? opts.nativeVoiceIndex
          : prefs.nativeVoiceIndex ?? undefined;
      await TextToSpeech.speak({
        text: t,
        lang: 'en-US',
        rate: Math.min(1.5, Math.max(0.5, rate)),
        pitch: 1,
        volume: 1,
        ...(voiceIdx !== undefined && voiceIdx >= 0 ? { voice: voiceIdx } : {}),
      });
      onEnd?.();
      return;
    } catch {
      /* fallback Web Speech */
    }
  }

  if (!ClickToSpeak.isSupported()) {
    onEnd?.();
    return;
  }

  let voice = opts?.voice ?? null;
  if (!voice && prefs.webVoiceURI) {
    const voices = window.speechSynthesis.getVoices();
    voice = voices.find((v) => v.voiceURI === prefs.webVoiceURI) ?? null;
  }

  clickToSpeakEnglishPte.speak(t, {
    lang: 'en-US',
    rate,
    voice: voice ?? undefined,
    onStart,
    onEnd,
  });
}

export async function pteStopSpeaking(): Promise<void> {
  try {
    if (isNativeTtsAvailable()) await TextToSpeech.stop();
  } catch {
    /* ignore */
  }
  clickToSpeakEnglishPte.stop();
}

export function getWebEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter((v) => /^en(-|$)/i.test(v.lang));
}
