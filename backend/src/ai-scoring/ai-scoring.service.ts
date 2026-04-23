import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QuestionType } from '../questions/question.entity';
import { Question } from '../questions/question.entity';

@Injectable()
export class AiScoringService {
  private genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(AiScoringService.name);
  private readonly pythonScorerUrl: string | null;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.pythonScorerUrl = process.env.PYTHON_SCORER_URL || null;
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
      this.logger.warn('Python scorer unavailable, falling back to built-in', err?.message);
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
        this.logger.warn('Python scorer transcription failed, trying Gemini', err?.message);
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

  // Types scored deterministically — no AI needed, skip python-scorer entirely
  private static readonly DETERMINISTIC_TYPES = new Set([
    QuestionType.READING_MCQ_MULTIPLE_ANSWER,
    QuestionType.LISTENING_MCQ_MULTIPLE_ANSWER,
    QuestionType.READING_MCQ_SINGLE_ANSWER,
    QuestionType.LISTENING_MCQ_SINGLE_ANSWER,
    QuestionType.LISTENING_HIGHLIGHT_CORRECT_SUMMARY,
    QuestionType.LISTENING_SELECT_MISSING_WORD,
    QuestionType.READING_RE_ORDER_PARAGRAPH,
    QuestionType.LISTENING_HIGHLIGHT_INCORRECT_WORD,
    QuestionType.READING_FIB_R_W,
    QuestionType.READING_FIB_R,
    QuestionType.LISTENING_FIB_L,
    QuestionType.LISTENING_DICTATION,
  ]);

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
    if (!AiScoringService.DETERMINISTIC_TYPES.has(params.question.type)) {
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
    const prompt = `You are a PTE Academic examiner scoring a Read Aloud response.

Original text: "${question.content}"
Student transcription: "${transcription}"

Score on these criteria (each out of 90):
1. Content (0-90): How many words from original are present in correct order
2. Pronunciation (0-90): Based on likely pronunciation clarity from the text
3. Fluency (0-90): Based on naturalness of response

Return ONLY valid JSON: {"content": number, "pronunciation": number, "fluency": number, "feedback": "2-3 sentences of specific feedback", "totalScore": number}
totalScore = average of the three scores rounded to nearest integer.`;

    const result = await this.callGemini(prompt, ['content', 'pronunciation', 'fluency']);
    return { ...result, transcription };
  }

  // ── Speaking: Repeat Sentence ─────────────────────────────────────────────
  private async scoreRepeatSentence(question: Question, transcription: string) {
    const ref =
      (typeof question.correctAnswer === 'string' && question.correctAnswer.trim()
        ? question.correctAnswer
        : '') ||
      question.suggestedAnswer?.trim() ||
      '';
    const prompt = `You are a PTE Academic examiner scoring a Repeat Sentence response.

Original sentence: "${ref}"
Student said: "${transcription}"

Score:
1. Content (0-90): Accuracy of words repeated
2. Pronunciation (0-90): Quality of pronunciation
3. Fluency (0-90): Smoothness of delivery

Return ONLY valid JSON: {"content": number, "pronunciation": number, "fluency": number, "feedback": "brief feedback", "totalScore": number}`;

    const result = await this.callGemini(prompt, ['content', 'pronunciation', 'fluency']);
    return { ...result, transcription };
  }

  // ── Speaking: Extended (Describe Image, Retell, SGD, RTS) ────────────────
  private async scoreSpeakingExtended(question: Question, transcription: string, type: QuestionType) {
    const taskName = {
      [QuestionType.SPEAKING_DESCRIBE_IMAGE]: 'Describe Image',
      [QuestionType.SPEAKING_RETELL_LECTURE]: 'Retell Lecture',
      [QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION]: 'Summarize Group Discussion',
      [QuestionType.SPEAKING_RESPOND_TO_SITUATION]: 'Respond to a Situation',
    }[type];

    const prompt = `You are a PTE Academic examiner scoring a "${taskName}" response.

Question context: "${question.title || question.content || 'Audio-based question'}"
Student response: "${transcription}"

Score:
1. Content (0-90): Relevance and completeness
2. Pronunciation (0-90): Clarity
3. Fluency (0-90): Natural delivery
4. Vocabulary (0-90): Word choice appropriateness

Return ONLY valid JSON: {"content": number, "pronunciation": number, "fluency": number, "vocabulary": number, "feedback": "specific feedback", "totalScore": number}
totalScore = average of all four.`;

    const result = await this.callGemini(prompt, ['content', 'pronunciation', 'fluency', 'vocabulary']);
    return { ...result, transcription };
  }

  // ── Speaking: Answer Short Question ──────────────────────────────────────
  private async scoreAnswerShortQuestion(question: Question, transcription: string) {
    const correct = question.correctAnswer;
    const score = transcription?.toLowerCase().includes(String(correct).toLowerCase()) ? 90 : 0;
    return {
      totalScore: score,
      scoreBreakdown: { content: score },
      feedback: score > 0 ? 'Correct answer!' : `Expected: "${correct}"`,
      transcription,
    };
  }

  // ── Writing: Summarize Written Text ──────────────────────────────────────
  private async scoreSWT(question: Question, textAnswer: string) {
    const wordCount = (textAnswer || '').split(/\s+/).filter(Boolean).length;
    const prompt = `You are a PTE Academic examiner scoring a Summarize Written Text response.

Original passage: "${question.content?.substring(0, 500)}..."
Student's one-sentence summary: "${textAnswer}"
Word count: ${wordCount} (should be 5-75 words)

Score:
1. Content (0-90): Key points captured
2. Form (0-90): Is it one grammatical sentence? ${wordCount >= 5 && wordCount <= 75 ? 'Word count OK' : 'Word count PENALTY'}
3. Grammar (0-90): Grammatical accuracy
4. Vocabulary (0-90): Word choice

Return ONLY valid JSON: {"content": number, "form": number, "grammar": number, "vocabulary": number, "feedback": "feedback", "totalScore": number}`;

    return this.callGemini(prompt, ['content', 'form', 'grammar', 'vocabulary']);
  }

  // ── Writing: Essay ────────────────────────────────────────────────────────
  private async scoreEssay(question: Question, textAnswer: string) {
    const wordCount = (textAnswer || '').split(/\s+/).filter(Boolean).length;
    const prompt = `You are a PTE Academic examiner scoring a Write Essay response.

Topic: "${question.content}"
Student's essay: "${textAnswer}"
Word count: ${wordCount} (target: 200-300 words)

Score:
1. Content (0-90): Arguments, examples, relevance
2. Development (0-90): Structure, coherence, paragraphs
3. Grammar (0-90): Grammatical range and accuracy
4. Vocabulary (0-90): Lexical range and precision
5. Spelling (0-90): Spelling accuracy

Return ONLY valid JSON: {"content": number, "development": number, "grammar": number, "vocabulary": number, "spelling": number, "feedback": "detailed feedback 3-4 sentences", "totalScore": number}`;

    return this.callGemini(prompt, ['content', 'development', 'grammar', 'vocabulary', 'spelling']);
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
    const totalScore = Math.round((correct / total) * 90);
    return {
      totalScore,
      scoreBreakdown: { content: totalScore },
      feedback: `${correct}/${total} words correct.`,
    };
  }

  // ── Summarize Spoken Text ─────────────────────────────────────────────────
  private async scoreSST(question: Question, textAnswer: string) {
    const wordCount = (textAnswer || '').split(/\s+/).filter(Boolean).length;
    const prompt = `PTE Academic examiner scoring Summarize Spoken Text.

Student's written summary: "${textAnswer}"
Word count: ${wordCount} (target 50-70 words)

Score: content(0-90), grammar(0-90), vocabulary(0-90), spelling(0-90), form(0-90 based on word count)
Return ONLY JSON: {"content": n, "grammar": n, "vocabulary": n, "spelling": n, "form": n, "feedback": "...", "totalScore": n}`;

    return this.callGemini(prompt, ['content', 'grammar', 'vocabulary', 'spelling', 'form']);
  }

  // ── Gemini helper ─────────────────────────────────────────────────────────
  private async callGemini(prompt: string, breakdownKeys: string[]) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout after 60s')), 60000),
    );

    const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
    const text = result.response.text();
    const json = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    const scoreBreakdown: Record<string, number> = {};
    for (const k of breakdownKeys) { if (json[k] !== undefined) scoreBreakdown[k] = json[k]; }

    return {
      totalScore: Math.min(90, Math.max(0, Math.round(json.totalScore || 0))),
      scoreBreakdown,
      feedback: json.feedback || '',
    };
  }
}
