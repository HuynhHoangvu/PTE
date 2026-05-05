import React from 'react';
import { clsx } from 'clsx';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import type { Question } from '../../../types';
import { getExamInstruction } from '../../../constants/examInstructions';
import { ClickToSpeak, clickToSpeakEnglishPte } from '../../../utils/clickToSpeak';
import {
  pteSpeakEnglish,
  pteStopSpeaking,
  getWebEnglishVoices,
  isNativeTtsAvailable,
} from '../../../utils/pteSpeech';
import { loadTtsPrefs, saveTtsPrefs, type TtsPrefs } from '../../../utils/ttsPreferences';

function joinEnglishParts(base: string, extras: string[]): string {
  const parts = [base, ...extras.map((s) => s.trim()).filter(Boolean)];
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

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
  const [nativeEnVoices, setNativeEnVoices] = React.useState<NativeEnVoice[]>([]);
  const [advOpen, setAdvOpen] = React.useState(false);

  const extrasKey = extraEnglishParts.join('\u0001');
  const fullText = React.useMemo(() => {
    return joinEnglishParts(getExamInstruction(question), extraEnglishParts);
  }, [question.id, question.type, question.prepTime, question.responseTime, extrasKey]);

  const supported = typeof window !== 'undefined' && ClickToSpeak.isSupported();
  const nativeOk = isNativeTtsAvailable();

  React.useEffect(() => {
    const v = getWebEnglishVoices();
    setWebVoices(v);
    const refresh = () => setWebVoices(getWebEnglishVoices());
    window.speechSynthesis?.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', refresh);
  }, []);

  React.useEffect(() => {
    if (!nativeOk) return;
    let cancelled = false;
    TextToSpeech.getSupportedVoices()
      .then((r) => {
        if (cancelled) return;
        const all = r.voices || [];
        const list: NativeEnVoice[] = [];
        all.forEach((v, i) => {
          if (/^en(-|$)/i.test(v.lang)) {
            list.push({ index: i, name: v.name, lang: v.lang });
          }
        });
        setNativeEnVoices(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [nativeOk]);

  const resolvedWebVoice = React.useMemo(() => {
    if (!prefs.webVoiceURI) return null;
    return webVoices.find((x) => x.voiceURI === prefs.webVoiceURI) ?? null;
  }, [prefs.webVoiceURI, webVoices]);

  React.useEffect(() => {
    clickToSpeakEnglishPte.setDefaults({
      lang: 'en-US',
      rate: prefs.rate,
      voice: resolvedWebVoice,
    });
  }, [prefs.rate, resolvedWebVoice]);

  React.useEffect(() => {
    if (!supported || !zoneRef.current) return;
    return clickToSpeakEnglishPte.attachPointerReader(zoneRef.current, {
      lang: 'en-US',
      ignoreSelector:
        'button, [data-no-speak], a, input, textarea, select, label, audio, video, summary',
    });
  }, [supported, question.id, extrasKey, prefs.rate, resolvedWebVoice]);

  const updatePrefs = (partial: Partial<TtsPrefs>) => {
    setPrefs(saveTtsPrefs(partial));
  };

  const readAll = async () => {
    if (!fullText.trim()) return;
    setSpeaking(true);
    setLiveMsg('Đang đọc đề bằng tiếng Anh.');
    try {
      await pteSpeakEnglish(fullText, {
        rate: prefs.rate,
        voice: resolvedWebVoice,
        nativeVoiceIndex: prefs.nativeVoiceIndex,
        preferNative: prefs.preferNativeWhenAvailable,
        onStart: () => setLiveMsg('Đang đọc đề.'),
        onEnd: () => {
          setSpeaking(false);
          setLiveMsg('Đã đọc xong đề.');
        },
      });
    } catch {
      setSpeaking(false);
      setLiveMsg('Không đọc được. Thử tắt “Ưu tiên giọng máy” hoặc đổi giọng trình duyệt.');
    }
  };

  const stopAll = async () => {
    await pteStopSpeaking();
    setSpeaking(false);
    setLiveMsg('Đã dừng đọc đề.');
  };

  const canRead = fullText.trim() && (supported || nativeOk);

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

      <div className="flex flex-wrap justify-between items-start gap-2 mb-2 sm:mb-3">
        <button
          type="button"
          data-no-speak
          onClick={() => setAdvOpen((o) => !o)}
          className="text-[11px] font-bold text-gray-500 underline decoration-dotted underline-offset-2"
          aria-expanded={advOpen}
          aria-controls="pte-tts-advanced"
        >
          Giọng & tốc độ
        </button>
        <div className="flex flex-wrap justify-end items-center gap-2">
          <button
            type="button"
            data-no-speak
            onClick={() => void readAll()}
            disabled={!canRead || speaking}
            aria-busy={speaking}
            aria-describedby={`pte-tts-live-${question.id}`}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
              canRead && !speaking
                ? 'border-amber-200 bg-amber-50 text-amber-900 active:scale-[0.98] hover:bg-amber-100'
                : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed',
            )}
          >
            <span aria-hidden>🔊</span>
            {speaking ? 'Đang đọc…' : 'Đọc đề (tiếng Anh)'}
          </button>
          <button
            type="button"
            data-no-speak
            onClick={() => void stopAll()}
            disabled={!speaking}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Dừng
          </button>
        </div>
      </div>

      {advOpen && (
        <div
          id="pte-tts-advanced"
          className="mb-3 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 space-y-2 text-xs"
        >
          <label className="flex flex-col gap-1">
            <span className="font-bold text-amber-900">Tốc độ ({prefs.rate.toFixed(2)}×)</span>
            <input
              type="range"
              data-no-speak
              min={0.75}
              max={1.25}
              step={0.01}
              value={prefs.rate}
              onChange={(e) => updatePrefs({ rate: Number(e.target.value) })}
              className="w-full accent-amber-600"
            />
          </label>

          {nativeOk && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                data-no-speak
                checked={prefs.preferNativeWhenAvailable}
                onChange={(e) => updatePrefs({ preferNativeWhenAvailable: e.target.checked })}
              />
              <span>Ưu tiên giọng máy (Android/iOS — thường ổn hơn Web Speech)</span>
            </label>
          )}

          {nativeOk && nativeEnVoices.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="font-bold text-amber-900">Giọng trên app (khi bật ưu tiên máy)</span>
              <select
                data-no-speak
                className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs"
                value={prefs.nativeVoiceIndex ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  updatePrefs({
                    nativeVoiceIndex: v === '' ? null : Number(v),
                  });
                }}
              >
                <option value="">Mặc định hệ thống</option>
                {nativeEnVoices.map((nv) => (
                  <option key={nv.index} value={String(nv.index)}>
                    {nv.name} ({nv.lang})
                  </option>
                ))}
              </select>
            </label>
          )}

          {supported && webVoices.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="font-bold text-amber-900">Giọng trình duyệt (Web Speech)</span>
              <select
                data-no-speak
                className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs"
                value={prefs.webVoiceURI ?? ''}
                onChange={(e) =>
                  updatePrefs({ webVoiceURI: e.target.value || null })
                }
              >
                <option value="">Mặc định trình duyệt</option>
                {webVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
          )}

          {!supported && !nativeOk && (
            <p className="text-[11px] text-red-600">Thiết bị không hỗ trợ đọc đề.</p>
          )}
        </div>
      )}

      <div ref={zoneRef} data-speak-block className="speaking-speak-zone rounded-xl min-w-0">
        {children}
      </div>
    </div>
  );
}
