import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, type ObjectSchema } from '@google/generative-ai';
import { QuestionType } from '../questions/question.entity';
import { Question } from '../questions/question.entity';
import { isDeterministicQuestionType } from '../questions/deterministic-types';
import {
  geminiEssayScoreSchema,
  geminiSpeakingScoreSchema,
  geminiSstScoreSchema,
  geminiSwtScoreSchema,
} from './gemini-response-schemas';

@Injectable()
export class AiScoringService {
  private genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(AiScoringService.name);
  private readonly pythonScorerUrl: string | null;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.pythonScorerUrl = this.normalizePythonScorerUrl(process.env.PYTHON_SCORER_URL);
    if (process.env.PYTHON_SCORER_URL && !this.pythonScorerUrl) {
      this.logger.warn('Invalid PYTHON_SCORER_URL, python scorer disabled');
    }
  }

  private normalizePythonScorerUrl(url?: string): string | null {
    if (!url) return null;
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withScheme);
      return parsed.origin + parsed.pathname.replace(/\/+$/, '');
    } catch {
      return null;
    }
  }

  // ── Delegate to Python scorer if available ────────────────────────────────
  private async tryPythonScorer(params: {
    question: Question;
    transcription?: string;
    textAnswer?: string;
    selectedAnswers?: any;
    audioBuffer?: Buffer;
    audioFilename?: string;
    duration?: number;
  }): Promise<{ totalScore: number; scoreBreakdown: any; feedback: string; transcription?: string } | null> {
    if (!this.pythonScorerUrl) return null;
    try {
      const { question, audioBuffer } = params;
      const body: any = {
        question_type: question.type,
        question: {
          content: question.content,
          title: question.title,
          correct_answer: question.correctAnswer,
          suggested_answer: question.suggestedAnswer,
          options: question.options,
          response_time: question.responseTime,
          prep_time: question.prepTime,
        },
        text_answer: params.textAnswer ?? null,
        selected_answers: params.selectedAnswers ?? null,
        audio_base64: audioBuffer ? audioBuffer.toString('base64') : null,
        audio_mime: 'audio/webm',
        duration_seconds: params.duration ?? question.responseTime ?? 30,
      };
      const res = await fetch(`${this.pythonScorerUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      return {
        totalScore: data.total_score,
        scoreBreakdown: data.score_breakdown,
        feedback: data.feedback,
        transcription: data.transcription,
      };
    } catch (err) {
      this.logger.warn(
        `Python scorer unavailable, falling back to built-in: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  // ── Transcribe audio (Python scorer first, fallback to Gemini) ──────────
  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    // Try Python scorer first
    if (this.pythonScorerUrl) {
      try {
        const base64Audio = audioBuffer.toString('base64');
        const res = await fetch(`${this.pythonScorerUrl}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: base64Audio,
            audio_mime: 'audio/webm',
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (res.ok) {
          const data: any = await res.json();
          if (data.transcription) {
            this.logger.log('Transcription via Python scorer successful');
            return data.transcription.trim();
          }
        }
      } catch (err) {
        this.logger.warn(
          `Python scorer transcription failed, trying Gemini: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Fallback to Gemini
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const base64Audio = audioBuffer.toString('base64');
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Transcription timeout after 60s')), 60000),
      );
      const result = await Promise.race([
        model.generateContent([
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
          'Transcribe this audio accurately. Return only the transcribed text, nothing else.',
        ]),
        timeoutPromise,
      ]);
      this.logger.log('Transcription via Gemini successful');
      return result.response.text().trim();
    } catch (err) {
      this.logger.error('Gemini transcription failed', err);
      return '';
    }
  }

  // ── Master scorer ─────────────────────────────────────────────────────────
  async scoreAttempt(params: {
    question: Question;
    transcription?: string;
    textAnswer?: string;
    selectedAnswers?: any;
    audioBuffer?: Buffer;
    audioFilename?: string;
    duration?: number;
  }): Promise<{ totalScore: number; scoreBreakdown: any; feedback: string; transcription?: string }> {
    // Deterministic types: score directly without calling python-scorer
    if (!isDeterministicQuestionType(params.question.type)) {
      const pythonResult = await this.tryPythonScorer({ ...params, duration: params.duration });
      if (pythonResult) return pythonResult;
    }

    const { question } = params;
    let transcription = params.transcription;

    if (params.audioBuffer && !transcription) {
      transcription = await this.transcribeAudio(params.audioBuffer, params.audioFilename || 'audio.webm');
    }

    switch (question.type) {
      case QuestionType.SPEAKING_READ_ALOUD:
        return this.scoreReadAloud(question, transcription);

      case QuestionType.SPEAKING_REPEAT_SENTENCE:
        return this.scoreRepeatSentence(question, transcription);

      case QuestionType.SPEAKING_DESCRIBE_IMAGE:
      case QuestionType.SPEAKING_RETELL_LECTURE:
      case QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION:
      case QuestionType.SPEAKING_RESPOND_TO_SITUATION:
        return this.scoreSpeakingExtended(question, transcription, question.type);

      case QuestionType.SPEAKING_ANSWER_SHORT_QUESTION:
        return this.scoreAnswerShortQuestion(question, transcription);

      case QuestionType.WRITING_SUMMARIZE_WRITTEN_TEXT:
        return this.scoreSWT(question, params.textAnswer);

      case QuestionType.WRITING_ESSAY:
        return this.scoreEssay(question, params.textAnswer);

      case QuestionType.READING_FIB_R_W:
      case QuestionType.READING_FIB_R:
      case QuestionType.LISTENING_FIB_L:
        return this.scoreFIB(question, params.selectedAnswers);

      case QuestionType.READING_MCQ_MULTIPLE_ANSWER:
      case QuestionType.LISTENING_MCQ_MULTIPLE_ANSWER:
        return this.scoreMCQMultiple(question, params.selectedAnswers);

      case QuestionType.READING_MCQ_SINGLE_ANSWER:
      case QuestionType.LISTENING_MCQ_SINGLE_ANSWER:
      case QuestionType.LISTENING_HIGHLIGHT_CORRECT_SUMMARY:
      case QuestionType.LISTENING_SELECT_MISSING_WORD:
        return this.scoreMCQSingle(question, params.selectedAnswers);

      case QuestionType.READING_RE_ORDER_PARAGRAPH:
        return this.scoreReorder(question, params.selectedAnswers);

      case QuestionType.LISTENING_HIGHLIGHT_INCORRECT_WORD:
        return this.scoreHighlightIncorrect(question, params.selectedAnswers);

      case QuestionType.LISTENING_DICTATION:
        return this.scoreDictation(question, params.textAnswer);

      case QuestionType.LISTENING_SUMMARIZE_SPOKEN_TEXT:
        return this.scoreSST(question, params.textAnswer);

      default:
        return { totalScore: 0, scoreBreakdown: {}, feedback: 'Unknown question type' };
    }
  }

  // ── Speaking: Read Aloud ─────────────────────────────────────────────────
  private async scoreReadAloud(question: Question, transcription: string) {
    const prompt = `You are an expert PTE Academic coach AND phonetics tutor. Score this Read Aloud response and provide specific, actionable Vietnamese-language coaching.

Original text:
<original_text>
${question.content}
</original_text>

Student transcription (what they actually said):
<student_text>
${transcription}
</student_text>

Scoring guidelines (be fair and encouraging — most motivated learners should score 60-80%):
1. content (0-5): Words from original in correct order.
   5=all correct, 4=1-3 errors, 3=4-6 errors, 2=7-9 errors, 1=10-12 errors, 0=many errors.
   Ignore minor transcription artifacts (um, uh, slight repetitions).
2. pronunciation (0-5): Overall phonetic clarity. Native-speaker perfection is NOT required.
   5=very clear, 4=clear with minor accent, 3=mostly clear, 2=many unclear words, 1=hard to understand, 0=very unclear.
   Default to 4 for typical learners. Only go to 3 if multiple words are clearly mispronounced.
3. fluency (0-5): Natural pace and rhythm.
   5=very smooth, 4=mostly smooth with minor pauses, 3=some pauses but readable, 2=frequent hesitations, 1=very choppy, 0=extremely halting.
   Default to 4 unless clearly halting. If 0 pauses detected, give at least 4.

Find up to 3 specifically mispronounced or missing words (skip if no clear errors).

Return ONLY valid JSON (no markdown, no extra text):
{
  "content": number,
  "pronunciation": number,
  "fluency": number,
  "totalScore": number,
  "feedback": "1-2 sentence encouraging assessment in Vietnamese",
  "tutor_tip": "One specific actionable coaching tip in Vietnamese. Example: 'Bạn bỏ sót từ X, hãy chú ý...' hoặc 'Từ Y bạn đọc chưa rõ âm /ʒ/, thử cong lưỡi nhẹ...'",
  "word_errors": [
    {"word": "exactWord", "issue": "brief issue", "tip": "specific fix tip in Vietnamese"}
  ]
}
totalScore = content + pronunciation + fluency (max 15).

IMPORTANT: Write feedback and tutor_tip as single-line strings (no raw line breaks inside the quotes).`;

    const raw = await this.callGemini(prompt, ['content', 'pronunciation', 'fluency'], {
      responseSchema: geminiSpeakingScoreSchema(),
    });
    const { scoreBreakdown, totalScore } = this.normalizeBreakdown(
      raw.scoreBreakdown || {},
      { content: 5, pronunciation: 5, fluency: 5 },
    );
    return { ...raw, scoreBreakdown, totalScore, transcription };
  }

  // ── Speaking: Repeat Sentence ─────────────────────────────────────────────
  private async scoreRepeatSentence(question: Question, transcription: string) {
    const ref =
      (typeof question.correctAnswer === 'string' && question.correctAnswer.trim()
        ? question.correctAnswer
        : '') ||
      question.suggestedAnswer?.trim() ||
      '';
    const prompt = `You are an expert PTE Academic coach. Score this Repeat Sentence response.

Original sentence:
<original_text>
${ref}
</original_text>

Student said:
<student_text>
${transcription}
</student_text>

Scoring guidelines (be fair — most motivated learners should score 60-80%):
1. content (0-3): Word accuracy. 3=all/most words correct, 2=some substitutions, 1=many changes, 0=completely different.
2. pronunciation (0-5): Clarity. Default 4 for typical learners. Only below 4 if clearly mispronouncing multiple words. 5=excellent, 4=good, 3=several unclear words, 2=mostly unclear, 1=very poor, 0=incomprehensible.
3. fluency (0-5): Rhythm/pace. Default 4. 5=smooth, 4=minor pauses, 3=some pauses, 2=frequent halts, 1=very choppy, 0=broken.

Return ONLY valid JSON:
{
  "content": number,
  "pronunciation": number,
  "fluency": number,
  "totalScore": number,
  "feedback": "brief encouraging Vietnamese assessment",
  "tutor_tip": "One specific tip in Vietnamese — e.g. 'Bạn đổi từ X thành Y, nhớ luyện nghe nhiều hơn để ghi nhớ từ chính xác'",
  "word_errors": [{"word": "exactWord", "issue": "brief", "tip": "tip in Vietnamese"}]
}
totalScore = content + pronunciation + fluency (max 13).

IMPORTANT: Write feedback and tutor_tip as single-line strings (no raw line breaks inside the quotes).`;

    const raw = await this.callGemini(prompt, ['content', 'pronunciation', 'fluency'], {
      responseSchema: geminiSpeakingScoreSchema(),
    });
    const { scoreBreakdown, totalScore } = this.normalizeBreakdown(
      raw.scoreBreakdown || {},
      { content: 3, pronunciation: 5, fluency: 5 },
    );
    return { ...raw, scoreBreakdown, totalScore, transcription };
  }

  // ── Speaking: Extended (Describe Image, Retell, SGD, RTS) ────────────────
  private async scoreSpeakingExtended(question: Question, transcription: string, type: QuestionType) {
    const taskName = {
      [QuestionType.SPEAKING_DESCRIBE_IMAGE]: 'Describe Image',
      [QuestionType.SPEAKING_RETELL_LECTURE]: 'Retell Lecture',
      [QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION]: 'Summarize Group Discussion',
      [QuestionType.SPEAKING_RESPOND_TO_SITUATION]: 'Respond to a Situation',
    }[type];

    const prompt = `You are an expert PTE Academic coach scoring a "${taskName}" response.

Question context:
<original_text>
${question.title || question.content || 'Audio-based question'}
</original_text>

Student response:
<student_text>
${transcription}
</student_text>

Scoring guidelines (be fair — most motivated learners should score 60-80%):
1. content (0-5): Relevance and completeness of ideas. Give credit for reasonable attempts even if imperfect.
2. pronunciation (0-5): Phonetic clarity. Default 4 for typical learners. Only penalize if multiple words clearly mispronounced. 5=excellent, 4=good, 3=several unclear words, 2=mostly unclear, 1=very poor, 0=incomprehensible.
3. fluency (0-5): Natural flow. Default 4. Penalize only for frequent hesitations or very unnatural pace. If speech sounds natural, give 4-5.

Return ONLY valid JSON:
{
  "content": number,
  "pronunciation": number,
  "fluency": number,
  "totalScore": number,
  "feedback": "2-3 sentence encouraging Vietnamese assessment",
  "tutor_tip": "Most important coaching point in Vietnamese. Be specific: mention a real word or phrase pattern from the response.",
  "word_errors": [{"word": "word", "issue": "issue", "tip": "Vietnamese tip"}]
}
totalScore = content + pronunciation + fluency (max 15).

IMPORTANT: Write feedback and tutor_tip as single-line strings (no raw line breaks inside the quotes).`;

    const raw = await this.callGemini(prompt, ['content', 'pronunciation', 'fluency'], {
      responseSchema: geminiSpeakingScoreSchema(),
    });
    const { scoreBreakdown, totalScore } = this.normalizeBreakdown(
      raw.scoreBreakdown || {},
      { content: 5, pronunciation: 5, fluency: 5 },
    );
    return { ...raw, scoreBreakdown, totalScore, transcription };
  }

  // ── Speaking: Answer Short Question ──────────────────────────────────────
  /** Tách nhiều đáp án hợp lệ (dấu phẩy, ;, / — giống gợi ý trong DB). */
  private parseAsqAcceptableAnswers(correct: unknown): string[] {
    if (correct == null) return [];
    if (Array.isArray(correct)) {
      return correct.flatMap((c) => this.parseAsqAcceptableAnswers(c));
    }
    const s = String(correct).trim();
    if (!s) return [];
    return s
      .split(/(?:,|;|\s*\/\s*)/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  private normalizeAsqText(s: string): string {
    return s
      .toLowerCase()
      .trim()
      .replace(/[.!?,…]+$/g, '')
      .replace(/\s+/g, ' ');
  }

  /** Đúng nếu lời nói khớp một trong các cụm đáp án (không cần trùng cả chuỗi gộp). */
  private asqTranscriptionMatches(transcription: string, acceptable: string[]): boolean {
    const st = this.normalizeAsqText(transcription || '');
    if (!st) return false;
    return acceptable.some((raw) => {
      const a = this.normalizeAsqText(raw);
      if (!a) return false;
      if (st === a) return true;
      if (st.includes(a)) return true;
      if (a.length >= 4 && a.includes(st)) return true;
      return false;
    });
  }

  private async scoreAnswerShortQuestion(question: Question, transcription: string) {
    const acceptable = this.parseAsqAcceptableAnswers(question.correctAnswer);
    const isCorrect =
      acceptable.length > 0
        ? this.asqTranscriptionMatches(transcription, acceptable)
        : this.normalizeAsqText(transcription).includes(
            this.normalizeAsqText(String(question.correctAnswer ?? '')),
          );
    const referenceLine =
      acceptable.length > 0
        ? acceptable.join(' · ')
        : String(question.correctAnswer ?? '');
    return {
      totalScore: isCorrect ? 1 : 0,
      scoreBreakdown: { content: isCorrect ? 1 : 0, content_max: 1 },
      feedback: isCorrect
        ? 'Chính xác! ✅'
        : `Chưa khớp đáp án gợi ý. Một trong các cách trả lời được chấp nhận: ${referenceLine}`,
      tutorTip: '',
      wordErrors: [],
      vocabSuggestions: [],
      transcription,
    };
  }

  // ── Writing: Summarize Written Text ──────────────────────────────────────
  private async scoreSWT(question: Question, textAnswer: string) {
    const wordCount = (textAnswer || '').split(/\s+/).filter(Boolean).length;
    const sentenceCount = (textAnswer || '').replace(/!/g, '.').replace(/\?/g, '.').split('.').filter(s => s.trim()).length;
    const formOk = wordCount >= 5 && wordCount <= 75 && sentenceCount <= 2;
    const prompt = `You are an expert PTE Academic coach scoring a Summarize Written Text response.

Original passage:
<original_text>
${question.content?.substring(0, 800)}...
</original_text>

Student's summary:
<student_text>
${textAnswer}
</student_text>
Word count: ${wordCount} (target: 5-75 words, 1 sentence). formOk=${formOk}.

Score:
1. content (0-4): Key ideas captured
2. form (0-1): One sentence, 5-75 words. If formOk=false → form=0
3. grammar (0-2): Grammatical accuracy
4. vocabulary (0-2): Word choice precision

Also identify up to 2 words the student used that could be upgraded to more academic vocabulary.

Return ONLY valid JSON:
{
  "content": number,
  "form": number,
  "grammar": number,
  "vocabulary": number,
  "totalScore": number,
  "feedback": "2 sentence Vietnamese assessment",
  "tutor_tip": "One specific actionable tip in Vietnamese",
  "vocab_suggestions": [
    {"original": "studentWord", "better": "academicAlternative", "reason": "Why this word scores higher in Vietnamese"}
  ]
}
totalScore = content+form+grammar+vocabulary (max 9).

IMPORTANT: feedback, tutor_tip, and strings inside vocab_suggestions must be single-line (no raw line breaks inside JSON strings).`;

    const raw = await this.callGemini(prompt, ['content', 'form', 'grammar', 'vocabulary'], {
      responseSchema: geminiSwtScoreSchema(),
    });
    const { scoreBreakdown, totalScore } = this.normalizeBreakdown(
      raw.scoreBreakdown || {},
      { content: 4, form: 1, grammar: 2, vocabulary: 2 },
    );
    return { ...raw, scoreBreakdown, totalScore };
  }

  // ── Writing: Essay ────────────────────────────────────────────────────────
  private async scoreEssay(question: Question, textAnswer: string) {
    const wordCount = (textAnswer || '').split(/\s+/).filter(Boolean).length;
    const formOk = wordCount >= 200 && wordCount <= 300;
    const prompt = `You are an expert PTE Academic coach AND writing tutor scoring a Write Essay response.

Topic:
<original_text>
${question.content}
</original_text>

Student's essay:
<student_text>
${textAnswer}
</student_text>
Word count: ${wordCount} (target: 200-300). formOk=${formOk}.

Score:
1. content (0-6): Addresses prompt with relevant ideas
2. form (0-2): 200-300 words. 2=ok, 1=slightly off, 0=far off. formOk=${formOk}
3. structure (0-6): Organization, cohesion, paragraphs
4. grammar (0-2): Grammatical range and accuracy
5. linguistic (0-6): Language variety and precision
6. vocabulary (0-2): Breadth and appropriateness
7. spelling (0-2): Spelling accuracy

Find up to 3 vocabulary upgrade opportunities — words the student used that a high-scorer would replace with more precise/academic alternatives.

Return ONLY valid JSON:
{
  "content": number,
  "form": number,
  "structure": number,
  "grammar": number,
  "linguistic": number,
  "vocabulary": number,
  "spelling": number,
  "totalScore": number,
  "feedback": "3-4 sentence Vietnamese assessment of strengths and weaknesses",
  "tutor_tip": "The single most impactful improvement the student can make, in Vietnamese. Be specific — quote their actual text.",
  "vocab_suggestions": [
    {"original": "wordTheyUsed", "better": "betterAlternative", "reason": "Explanation in Vietnamese why this scores higher"}
  ]
}
totalScore = sum of all 7 criteria (max 26).

IMPORTANT: feedback, tutor_tip, and strings inside vocab_suggestions must be single-line (no raw line breaks inside JSON strings).`;

    const raw = await this.callGemini(prompt, ['content', 'form', 'structure', 'grammar', 'linguistic', 'vocabulary', 'spelling'], {
      responseSchema: geminiEssayScoreSchema(),
      maxOutputTokens: 4096,
    });
    const { scoreBreakdown, totalScore } = this.normalizeBreakdown(
      raw.scoreBreakdown || {},
      { content: 6, form: 2, structure: 6, grammar: 2, linguistic: 6, vocabulary: 2, spelling: 2 },
    );
    return { ...raw, scoreBreakdown, totalScore };
  }

  // ── Reading/Listening: Fill in Blanks ────────────────────────────────────
  private fibKeyOrder(keys: string[]): string[] {
    return [...keys].sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && String(na) === a && String(nb) === b) return na - nb;
      return a.localeCompare(b);
    });
  }

  /** Chuẩn hóa đáp án đúng + bài làm: mảng vs object, key blank_0 vs "1". */
  private normalizeFIBPair(question: Question, selectedAnswers: any): {
    correct: Record<string, string>;
    selected: Record<string, string>;
  } | null {
    let rawCorrect = question.correctAnswer as any;
    if (rawCorrect == null) return null;

    let correct: Record<string, string> = {};
    if (Array.isArray(rawCorrect)) {
      rawCorrect.forEach((v: unknown, i: number) => {
        correct[String(i + 1)] = typeof v === 'string' ? v : String(v ?? '');
      });
    } else if (typeof rawCorrect === 'object') {
      correct = { ...rawCorrect };
    } else {
      return null;
    }

    const orderedKeys = this.fibKeyOrder(Object.keys(correct));
    if (orderedKeys.length === 0) return null;

    let selected: Record<string, string> = {};

    if (Array.isArray(selectedAnswers)) {
      orderedKeys.forEach((k, i) => {
        selected[k] = String(selectedAnswers[i] ?? '').trim();
      });
    } else if (selectedAnswers && typeof selectedAnswers === 'object') {
      selected = { ...selectedAnswers };
      const blankRe = /^blank_(\d+)$/i;
      const keys = Object.keys(selected);
      if (keys.some((k) => blankRe.test(k))) {
        const remapped: Record<string, string> = {};
        keys.forEach((k) => {
          const m = k.match(blankRe);
          if (m) {
            const idx = parseInt(m[1], 10);
            const target = orderedKeys[idx] ?? String(idx + 1);
            remapped[target] = String(selected[k] ?? '').trim();
          } else {
            remapped[k] = String(selected[k] ?? '').trim();
          }
        });
        selected = remapped;
      }
    } else {
      return null;
    }

    return { correct, selected };
  }

  private async scoreFIB(question: Question, selectedAnswers: any) {
    const pair = this.normalizeFIBPair(question, selectedAnswers);
    if (!pair) {
      return { totalScore: 0, scoreBreakdown: {}, feedback: 'No answers provided' };
    }
    const { correct, selected } = pair;

    let correctCount = 0;
    const total = Object.keys(correct).length;
    const details: Record<string, boolean> = {};

    for (const [key, val] of Object.entries(correct)) {
      const isCorrect =
        (selected[key] || '').toLowerCase().trim() === (val || '').toLowerCase().trim();
      details[key] = isCorrect;
      if (isCorrect) correctCount++;
    }

    const totalScore = total > 0 ? Math.round((correctCount / total) * 90) : 0;
    return {
      totalScore,
      scoreBreakdown: { content: totalScore, details },
      feedback: `${correctCount}/${total} blanks correct.`,
    };
  }

  // ── MCQ Multiple ──────────────────────────────────────────────────────────
  private async scoreMCQMultiple(question: Question, selectedAnswers: string[]) {
    const correct = new Set<string>(question.correctAnswer || []);
    const selected = new Set<string>(selectedAnswers || []);

    let score = 0;
    for (const s of selected) {
      if (correct.has(s)) score++;
      else score--;
    }

    const maxScore = correct.size;
    const normalizedScore = Math.max(0, Math.round((score / maxScore) * 90));
    return {
      totalScore: normalizedScore,
      scoreBreakdown: { content: normalizedScore },
      feedback: `Score: ${Math.max(0, score)}/${maxScore}. Correct: ${[...correct].join(', ')}`,
    };
  }

  // ── MCQ Single ────────────────────────────────────────────────────────────
  private async scoreMCQSingle(question: Question, selectedAnswer: any) {
    const sel = Array.isArray(selectedAnswer) ? selectedAnswer[0] : selectedAnswer;
    const isCorrect = sel === question.correctAnswer;
    const totalScore = isCorrect ? 90 : 0;
    return {
      totalScore,
      scoreBreakdown: { content: totalScore },
      feedback: isCorrect ? 'Correct!' : `Incorrect. Correct answer: ${question.correctAnswer}`,
    };
  }

  // ── Re-order Paragraphs ───────────────────────────────────────────────────
  private async scoreReorder(question: Question, orderedLabels: string[]) {
    const correct = question.correctAnswer as string[];
    if (!correct || !orderedLabels) return { totalScore: 0, scoreBreakdown: {}, feedback: '' };

    let correctPairs = 0;
    const totalPairs = correct.length - 1;
    for (let i = 0; i < orderedLabels.length - 1; i++) {
      const pairIdx = correct.indexOf(orderedLabels[i]);
      if (pairIdx >= 0 && correct[pairIdx + 1] === orderedLabels[i + 1]) correctPairs++;
    }

    const totalScore = totalPairs > 0 ? Math.round((correctPairs / totalPairs) * 90) : 0;
    return {
      totalScore,
      scoreBreakdown: { content: totalScore },
      feedback: `${correctPairs}/${totalPairs} correct pairs. Correct order: ${correct.join(' → ')}`,
    };
  }

  // ── Highlight Incorrect Words ─────────────────────────────────────────────
  private async scoreHighlightIncorrect(question: Question, selectedWords: string[]) {
    const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/gi, '');
    const rawCor = question.correctAnswer || [];
    const correctArr = Array.isArray(rawCor) ? rawCor : [];
    const correct = new Set<string>(
      correctArr.map((w: string) => norm(String(w))).filter(Boolean),
    );
    const selected = new Set<string>(
      (selectedWords || []).map((w) => norm(String(w))).filter(Boolean),
    );
    let score = 0;
    for (const w of selected) { if (correct.has(w)) score++; else score--; }
    const totalScore = Math.max(0, Math.round((score / Math.max(correct.size, 1)) * 90));
    return {
      totalScore,
      scoreBreakdown: { content: totalScore },
      feedback: `${Math.max(0, score)}/${correct.size} incorrect words identified correctly.`,
    };
  }

  // ── Write from Dictation ──────────────────────────────────────────────────
  private scoreDictation(question: Question, textAnswer: string) {
    const ca = question.correctAnswer as any;
    let ref = '';
    if (ca && typeof ca === 'object' && ca.transcript) ref = ca.transcript;
    else if (typeof ca === 'string') ref = ca;
    if (!ref) ref = question.content || question.title || '';

    const clean = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    const refWords = clean(ref);
    const stuWords = clean(textAnswer || '');

    // Word frequency match (each ref word matched at most once)
    const refCount = new Map<string, number>();
    refWords.forEach(w => refCount.set(w, (refCount.get(w) ?? 0) + 1));
    const stuCount = new Map<string, number>();
    stuWords.forEach(w => stuCount.set(w, (stuCount.get(w) ?? 0) + 1));
    let correct = 0;
    for (const [w, cnt] of refCount) correct += Math.min(cnt, stuCount.get(w) ?? 0);

    const total = Math.max(refWords.length, 1);
    // WFD: hiển thị theo chuẩn luyện tập — mỗi từ đúng = 1 điểm tối đa N từ (không map 0–90 toàn bài thi)
    return {
      totalScore: correct,
      scoreBreakdown: { content: correct, content_max: total },
      feedback: `${correct}/${total} words correct.`,
    };
  }

  // ── Summarize Spoken Text ─────────────────────────────────────────────────
  private async scoreSST(question: Question, textAnswer: string) {
    const wordCount = (textAnswer || '').split(/\s+/).filter(Boolean).length;
    const formOk = wordCount >= 50 && wordCount <= 70;
    const prompt = `PTE Academic examiner scoring Summarize Spoken Text.

Student's written summary:
<student_text>
${textAnswer}
</student_text>
Word count: ${wordCount} (target 50-70 words)

Score using PTE Core rubric:
1. Content (0-4): Key ideas captured
2. Form (0-2): Word count 50-70. formOk=${formOk}
3. Grammar (0-2): Sentence structure accuracy
4. Vocabulary (0-2): Word choice
5. Spelling (0-2): Spelling accuracy

Return ONLY JSON: {"content": n, "grammar": n, "vocabulary": n, "spelling": n, "form": n, "feedback": "...", "totalScore": n}
totalScore = sum of all five (max 12).

IMPORTANT: feedback must be one single line (no raw line breaks inside the JSON string).`;

    const raw = await this.callGemini(prompt, ['content', 'grammar', 'vocabulary', 'spelling', 'form'], {
      responseSchema: geminiSstScoreSchema(),
    });
    const { scoreBreakdown, totalScore } = this.normalizeBreakdown(
      raw.scoreBreakdown || {},
      { content: 4, form: 2, grammar: 2, vocabulary: 2, spelling: 2 },
    );
    return { ...raw, scoreBreakdown, totalScore };
  }

  // ── Score normalizer ─────────────────────────────────────────────────────
  /**
   * Normalize each breakdown value into [0, max] and sum for totalScore.
   *
   * Three cases to avoid the "rawVal=6, max=5 → 0" bug from the old formula:
   *   1. rawVal <= max         → clamp directly (normal case)
   *   2. max < rawVal <= max*2 → slight AI overshoot, just cap at max
   *   3. rawVal > max*2        → assume AI used 0-100 scale, scale proportionally
   */
  private normalizeBreakdown(
    raw: Record<string, number>,
    maxMap: Record<string, number>,
  ): { scoreBreakdown: Record<string, number>; totalScore: number } {
    const scoreBreakdown: Record<string, number> = {};
    let totalScore = 0;
    for (const [key, max] of Object.entries(maxMap)) {
      const rawVal = raw[key] ?? 0;
      const v = Math.round(rawVal);
      let val: number;
      if (v <= max) {
        val = Math.max(0, v);
      } else if (v <= max * 2) {
        val = max;                                        // slight overshoot → cap
      } else {
        val = Math.min(max, Math.round((v / 100) * max)); // 0-100 scale → rescale
      }
      scoreBreakdown[key] = val;
      scoreBreakdown[`${key}_max`] = max;
      totalScore += val;
    }
    return { scoreBreakdown, totalScore };
  }

  // ── Gemini helper ─────────────────────────────────────────────────────────
  private async callGemini(
    prompt: string,
    breakdownKeys: string[],
    options?: { responseSchema?: ObjectSchema; maxOutputTokens?: number },
  ) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
        responseMimeType: 'application/json',
        ...(options?.responseSchema ? { responseSchema: options.responseSchema } : {}),
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout after 60s')), 60000),
    );

    let json: any;
    let lastRawText = '';
    try {
      const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
      const text = result.response.text();
      lastRawText = text || '';
      json = this.parseGeminiJson(text);
    } catch (firstErr) {
      // Retry once with ultra-strict prompt to reduce malformed payload chance.
      const retryPrompt = `${prompt}\n\nIMPORTANT: Return only a valid minified JSON object. No markdown, no explanations, no code fences.`;
      try {
        const retryResult = await Promise.race([
          model.generateContent(retryPrompt),
          timeoutPromise,
        ]);
        const retryText = retryResult.response.text();
        lastRawText = retryText || lastRawText;
        json = this.parseGeminiJson(retryText);
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        this.logger.error(`Gemini JSON parse failed after retry: ${msg}`);
        return this.buildFallbackGeminiScore(breakdownKeys, lastRawText);
      }
    }
    const scoreBreakdown: Record<string, number> = {};
    for (const k of breakdownKeys) { if (json[k] !== undefined) scoreBreakdown[k] = json[k]; }

    return {
      totalScore: Math.max(0, Math.round(json.totalScore || 0)), // normalizeBreakdown recalculates this
      scoreBreakdown,
      feedback: json.feedback || '',
      tutorTip: json.tutor_tip || json.tutorTip || '',
      wordErrors: Array.isArray(json.word_errors) ? json.word_errors : [],
      vocabSuggestions: Array.isArray(json.vocab_suggestions) ? json.vocab_suggestions : [],
    };
  }

  private buildFallbackGeminiScore(breakdownKeys: string[], rawText: string) {
    // Try to extract individual breakdown values from the raw (possibly malformed) response
    const extracted: Record<string, number> = {};
    for (const key of breakdownKeys) {
      const m = rawText.match(new RegExp(`"${key}"\\s*:\\s*(\\d{1,3})`, 'i'));
      if (m) extracted[key] = Math.max(0, Number(m[1]));
    }

    // Build scoreBreakdown with extracted values only (no magic fallback number).
    // normalizeBreakdown() downstream will clamp to the correct max per key.
    const scoreBreakdown: Record<string, number> = {};
    for (const key of breakdownKeys) {
      scoreBreakdown[key] = extracted[key] ?? 0;
    }

    // Try to extract totalScore from raw text; fall back to 0 so normalizeBreakdown sums correctly
    const totalFromPayload = rawText.match(/"totalScore"\s*:\s*(\d{1,3})/i);
    const totalScore = totalFromPayload
      ? Math.max(0, Number(totalFromPayload[1]))
      : 0;

    return {
      totalScore,
      scoreBreakdown,
      feedback: '',
      tutorTip: '',
      wordErrors: [],
      vocabSuggestions: [],
    };
  }

  /**
   * Trích object JSON đầu tiên bằng đếm ngoặc có tôn trọng chuỗi (tránh lastIndexOf('}') cắt nhầm).
   */
  private extractFirstBalancedJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (c === '\\') {
          escape = true;
          continue;
        }
        if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    return null;
  }

  private parseGeminiJson(rawText: string): any {
    const cleaned = (rawText || '').replace(/```json\n?|```/g, '').trim();
    if (!cleaned) {
      throw new Error('Gemini returned empty response');
    }

    try {
      return JSON.parse(cleaned);
    } catch {
      const balanced = this.extractFirstBalancedJsonObject(cleaned);
      if (balanced) {
        try {
          return JSON.parse(balanced);
        } catch {
          /* fall through */
        }
      }

      // Gemini đôi lúc trả thêm text trước/sau JSON, cố trích object JSON đầu tiên.
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        const jsonSlice = cleaned.slice(start, end + 1);
        try {
          return JSON.parse(jsonSlice);
        } catch {
          // fall through
        }
      }

      this.logger.error(
        `Gemini returned non-JSON payload (first 500 chars): ${cleaned.slice(0, 500)}`,
      );
      throw new Error('Gemini returned malformed JSON');
    }
  }
}
