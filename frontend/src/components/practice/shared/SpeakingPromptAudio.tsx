import React from 'react';
import { clsx } from 'clsx';
import type { Question } from '../../../types';
import { ClickToSpeak, getTextAtPoint } from '../../../utils/clickToSpeak';
import {
  pteSpeakEnglish,
  getWebEnglishVoices,
  isNativeTtsAvailable,
} from '../../../utils/pteSpeech';
import { loadTtsPrefs, saveTtsPrefs, type TtsPrefs } from '../../../utils/ttsPreferences';

export type SpeakingPromptAudioProps = {
  question: Question;
  extraEnglishParts?: string[];
  children: React.ReactNode;
  className?: string;
};

type NativeEnVoice = { index: number; name: string; lang: string };

/**
 * Đọc đề PTE (EN): nút đọc/dừng, chỉnh tốc độ & giọng, native TTS trên app;
 * chạm từ để đọc; thông báo aria-live.
 */
export function SpeakingPromptAudio({
  question,
  extraEnglishParts = [],
  children,
  className,
}: SpeakingPromptAudioProps) {
  const zoneRef = React.useRef<HTMLDivElement>(null);
  const [prefs, setPrefs] = React.useState<TtsPrefs>(() => loadTtsPrefs());
  const [speaking, setSpeaking] = React.useState(false);
  const [liveMsg, setLiveMsg] = React.useState('');
  const [webVoices, setWebVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [nativeEnVoices] = React.useState<NativeEnVoice[]>([]);
  const extrasKey = extraEnglishParts.join('\u0001');

  const supported = typeof window !== 'undefined' && ClickToSpeak.isSupported();
  const nativeOk = isNativeTtsAvailable();

  React.useEffect(() => {
    const v = getWebEnglishVoices();
    setWebVoices(v);
    const refresh = () => setWebVoices(getWebEnglishVoices());
    window.speechSynthesis?.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', refresh);
  }, []);

  const resolvedWebVoice = React.useMemo(() => {
    if (!prefs.webVoiceURI) return null;
    return webVoices.find((x) => x.voiceURI === prefs.webVoiceURI) ?? null;
  }, [prefs.webVoiceURI, webVoices]);

  React.useEffect(() => {
    if (!zoneRef.current || (!supported && !nativeOk)) return;
    const root = zoneRef.current;
    const ignoreSelector =
      'button, [data-no-speak], a, input, textarea, select, label, audio, video, summary';
    const onClick = async (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      if (target.closest(ignoreSelector)) return;

      const fromPoint = getTextAtPoint(ev.clientX, ev.clientY) ?? '';
      const raw =
        fromPoint ||
        (target.closest('[data-speak]') as HTMLElement | null)?.innerText ||
        (target as HTMLElement).innerText ||
        '';
      const text = raw.replace(/\s+/g, ' ').trim();
      if (!text) return;

      setSpeaking(true);
      setLiveMsg('Đang đọc phần bạn vừa bấm.');
      try {
        await pteSpeakEnglish(text, {
          rate: prefs.rate,
          voice: resolvedWebVoice,
          nativeVoiceIndex: prefs.nativeVoiceIndex,
          preferNative: prefs.preferNativeWhenAvailable,
          onStart: () => setLiveMsg('Đang đọc.'),
          onEnd: () => {
            setSpeaking(false);
            setLiveMsg('Đã đọc xong.');
          },
        });
      } catch {
        setSpeaking(false);
        setLiveMsg('Không đọc được. Thử đổi giọng hoặc tốc độ.');
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [supported, nativeOk, question.id, extrasKey, prefs.rate, resolvedWebVoice, prefs.nativeVoiceIndex, prefs.preferNativeWhenAvailable]);

  void nativeEnVoices;
  void saveTtsPrefs;

  return (
    <div className={clsx('speaking-prompt-audio', className)}>
      <div
        id={`pte-tts-live-${question.id}`}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveMsg}
      </div>

      {(!supported && !nativeOk) && (
        <p className="mb-2 text-[11px] text-red-600">Thiết bị không hỗ trợ đọc đề.</p>
      )}

      <div ref={zoneRef} data-speak-block className="speaking-speak-zone rounded-xl min-w-0">
        {children}
      </div>
    </div>
  );
}
