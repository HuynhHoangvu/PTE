import type { Question } from '../types';

/**
 * Hướng dẫn gốc (tiếng Anh) theo từng dạng câu — dùng cho thanh tiêu đề practice và TTS.
 */
export function getExamInstruction(q: Question): string {
  const instructions: Record<string, string> = {
    SPEAKING_READ_ALOUD: `Look at the text below. In ${q.responseTime} seconds, you must read this text aloud as naturally and clearly as possible.`,
    SPEAKING_REPEAT_SENTENCE: 'You will hear a sentence. Please repeat the sentence exactly as you hear it. You will hear the sentence only once.',
    SPEAKING_DESCRIBE_IMAGE: `Look at the graph below. In ${q.prepTime} seconds, please speak into the microphone and describe in detail what the graph is showing. You will have ${q.responseTime} seconds to give your response.`,
    SPEAKING_RETELL_LECTURE: `You will hear an Interview/Lecture. After listening to it, in ${q.prepTime} seconds, please speak into the microphone and retell what you have just heard from the lecture in your own words. You will have ${q.responseTime} seconds to give your response.`,
    SPEAKING_ANSWER_SHORT_QUESTION: 'You will hear a question. Please give a simple and short answer. Often just one or a few words is enough.',
    SPEAKING_SUMMARISE_GROUP_DISCUSSION: `You will hear three people having a discussion. When you hear the beep, summarize the whole discussion. You will have ${q.prepTime} seconds to prepare and 2 minutes to give your response.`,
    SPEAKING_RESPOND_TO_SITUATION: `Listen to and read a description of situation. You will have ${q.prepTime} seconds to think about your answer. Then you will hear a beep. You have ${q.responseTime} seconds to answer the question.`,
    WRITING_SUMMARIZE_WRITTEN_TEXT: 'Read the passage below and summarize it using one sentence. Type your response in the box at the bottom. You have 10 minutes to finish this task.',
    WRITING_ESSAY: 'You will have 20 minutes to plan, write and revise an essay about the topic below. Your response will be judged on how well you develop a position, organize your ideas, present supporting details, and control the elements of standard written English.',
    READING_FIB_R_W: 'Below is a text with blanks. Click on each blank, a list of choices will appear. Select the appropriate answer choice for each blank.',
    READING_MCQ_MULTIPLE_ANSWER: 'Read the text and answer the question by selecting all the correct responses. You will need to select more than one response.',
    READING_RE_ORDER_PARAGRAPH: 'The text boxes in the left panel have been placed in a random order. Restore the original order by dragging the text boxes from the left panel to the right panel.',
    READING_FIB_R: 'In the text below some words are missing. Drag words from the box below to the appropriate place in the text. To undo an answer choice, drag the word back to the box below the text.',
    READING_MCQ_SINGLE_ANSWER: 'Read the text and answer the multiple-choice question by selecting the correct response. Only one response is correct.',
    LISTENING_SUMMARIZE_SPOKEN_TEXT: 'You will hear a short audio. Write a summary for a fellow student who was not present. You should write 50-70 words. You have 10 minutes to finish this task.',
    LISTENING_MCQ_MULTIPLE_ANSWER: 'Listen to the recording and answer the question by selecting all the correct responses. You will need to select more than one response.',
    LISTENING_FIB_L: 'You will hear a recording. Type the missing words in each blank.',
    LISTENING_HIGHLIGHT_CORRECT_SUMMARY: 'You will hear a recording. Click on the paragraph that best relates to the recording.',
    LISTENING_MCQ_SINGLE_ANSWER: 'Listen to the recording and answer the multiple-choice question by selecting the correct response. Only one response is correct.',
    LISTENING_SELECT_MISSING_WORD: 'You will hear a recording of a lecture. At the end of the recording the last word or group of words has been replaced by a beep. Select the correct option to complete the recording.',
    LISTENING_HIGHLIGHT_INCORRECT_WORD: 'You will hear a recording. Below is a transcription of the recording. Some words in the transcription differ from what the speaker(s) said. Please click on the words that are different.',
    LISTENING_DICTATION: 'You will hear a sentence. Type the sentence in the box below exactly as you hear it. Write as much of the sentence as you can. You will hear the sentence only once.',
  };
  return instructions[q.type] || '';
}
