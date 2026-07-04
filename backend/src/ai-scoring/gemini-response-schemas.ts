import { SchemaType, type ObjectSchema, type Schema } from '@google/generative-ai';

const wordErrorItem: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    word: { type: SchemaType.STRING },
    issue: { type: SchemaType.STRING },
    tip: { type: SchemaType.STRING },
  },
};

const vocabItem: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    original: { type: SchemaType.STRING },
    better: { type: SchemaType.STRING },
    reason: { type: SchemaType.STRING },
  },
};

/** Read Aloud / Repeat Sentence / extended speaking — numeric breakdown + feedback strings */
export function geminiSpeakingScoreSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      content: { type: SchemaType.NUMBER },
      pronunciation: { type: SchemaType.NUMBER },
      fluency: { type: SchemaType.NUMBER },
      totalScore: { type: SchemaType.NUMBER },
      feedback: { type: SchemaType.STRING },
      tutor_tip: { type: SchemaType.STRING },
      word_errors: {
        type: SchemaType.ARRAY,
        items: wordErrorItem,
      },
    },
    required: [
      'content',
      'pronunciation',
      'fluency',
      'totalScore',
      'feedback',
      'tutor_tip',
      'word_errors',
    ],
  };
}

export function geminiSwtScoreSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      content: { type: SchemaType.NUMBER },
      form: { type: SchemaType.NUMBER },
      grammar: { type: SchemaType.NUMBER },
      vocabulary: { type: SchemaType.NUMBER },
      totalScore: { type: SchemaType.NUMBER },
      feedback: { type: SchemaType.STRING },
      tutor_tip: { type: SchemaType.STRING },
      vocab_suggestions: {
        type: SchemaType.ARRAY,
        items: vocabItem,
      },
    },
    required: [
      'content',
      'form',
      'grammar',
      'vocabulary',
      'totalScore',
      'feedback',
      'tutor_tip',
      'vocab_suggestions',
    ],
  };
}

export function geminiEssayScoreSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      content: { type: SchemaType.NUMBER },
      form: { type: SchemaType.NUMBER },
      structure: { type: SchemaType.NUMBER },
      grammar: { type: SchemaType.NUMBER },
      linguistic: { type: SchemaType.NUMBER },
      vocabulary: { type: SchemaType.NUMBER },
      spelling: { type: SchemaType.NUMBER },
      totalScore: { type: SchemaType.NUMBER },
      feedback: { type: SchemaType.STRING },
      tutor_tip: { type: SchemaType.STRING },
      vocab_suggestions: {
        type: SchemaType.ARRAY,
        items: vocabItem,
      },
    },
    required: [
      'content',
      'form',
      'structure',
      'grammar',
      'linguistic',
      'vocabulary',
      'spelling',
      'totalScore',
      'feedback',
      'tutor_tip',
      'vocab_suggestions',
    ],
  };
}

export function geminiSstScoreSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      content: { type: SchemaType.NUMBER },
      grammar: { type: SchemaType.NUMBER },
      vocabulary: { type: SchemaType.NUMBER },
      form: { type: SchemaType.NUMBER },
      totalScore: { type: SchemaType.NUMBER },
      feedback: { type: SchemaType.STRING },
    },
    required: ['content', 'grammar', 'vocabulary', 'form', 'totalScore', 'feedback'],
  };
}
