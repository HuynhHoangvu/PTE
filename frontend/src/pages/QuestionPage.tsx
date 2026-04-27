import { useParams } from 'react-router-dom';
import { PracticeLayout } from '../components/practice/PracticeLayout';
import {
  ReadAloud, RepeatSentence, AudioWithMic, DescribeImage, SummarizeWrittenText, WriteEssay,
  MCQuestion, ReorderParagraphs, FillInBlanksReading, FillInBlanksRW, ListeningFIB,
  HighlightIncorrectWords, AudioTextAnswer,
} from '../components/practice/QuestionTypes';
import { Question } from '../types';
import { AudioPlayer } from '../components/ui';

export default function QuestionPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div className="p-8">No question ID</div>;

  return (
    <PracticeLayout questionId={id}>
      {(question: Question, attempts: any[]) => (
        <QuestionBody question={question} attempts={attempts} />
      )}
    </PracticeLayout>
  );
}

function QuestionBody({ question, attempts }: { question: Question; attempts: any[] }) {
  const { type } = question;

  // ── Speaking ──────────────────────────────────────────────────────────────
  if (type === 'SPEAKING_READ_ALOUD') return <ReadAloud question={question} attempts={attempts} />;

  if (type === 'SPEAKING_REPEAT_SENTENCE') return <RepeatSentence question={question} />;

  if (type === 'SPEAKING_ANSWER_SHORT_QUESTION') {
    return <AudioWithMic question={question} maxScore={1} />;
  }

  if (type === 'SPEAKING_RETELL_LECTURE' ||
      type === 'SPEAKING_SUMMARISE_GROUP_DISCUSSION' ||
      type === 'SPEAKING_RESPOND_TO_SITUATION') {
    return <AudioWithMic question={question} maxScore={15} />;
  }

  if (type === 'SPEAKING_DESCRIBE_IMAGE') return <DescribeImage question={question} />;

  // ── Writing ───────────────────────────────────────────────────────────────
  if (type === 'WRITING_SUMMARIZE_WRITTEN_TEXT') return <SummarizeWrittenText question={question} />;
  if (type === 'WRITING_ESSAY') return <WriteEssay question={question} />;

  // ── Reading ───────────────────────────────────────────────────────────────
  if (type === 'READING_FIB_R_W') {
    return <FillInBlanksRW question={question} />;
  }

  if (type === 'READING_FIB_R') return <FillInBlanksReading question={question} />;

  if (type === 'READING_MCQ_MULTIPLE_ANSWER' || type === 'LISTENING_MCQ_MULTIPLE_ANSWER') {
    if (type === 'LISTENING_MCQ_MULTIPLE_ANSWER') {
      return (
        <div className="px-5 py-5 space-y-4">
          <AudioPlayer src={question.audioUrl} countdownSeconds={7} showSpeedControl />
          <MCQuestion question={question} multiple />
        </div>
      );
    }
    return <MCQuestion question={question} multiple />;
  }

  if (type === 'READING_MCQ_SINGLE_ANSWER' ||
      type === 'LISTENING_MCQ_SINGLE_ANSWER' ||
      type === 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY' ||
      type === 'LISTENING_SELECT_MISSING_WORD') {
    const withAudio = type.startsWith('LISTENING_');
    // Ẩn stem/transcript cho HCS & SMW; MC Single (LSA…) giữ title = stem giống PTE Magic (.MuiCard h6 = code, đoạn dưới = câu hỏi).
    const hideListeningStem =
      type === 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY' ||
      type === 'LISTENING_SELECT_MISSING_WORD';
    const qForMCQ =
      withAudio && hideListeningStem
        ? { ...question, content: undefined, title: undefined }
        : question;
    return (
      <div className="px-5 py-5 space-y-4">
        {withAudio && <AudioPlayer src={question.audioUrl} countdownSeconds={7} showSpeedControl />}
        <MCQuestion question={qForMCQ as typeof question} multiple={false} />
      </div>
    );
  }

  if (type === 'READING_RE_ORDER_PARAGRAPH') return <ReorderParagraphs question={question} />;

  // ── Listening ─────────────────────────────────────────────────────────────
  if (type === 'LISTENING_FIB_L') return <ListeningFIB question={question} />;

  if (type === 'LISTENING_HIGHLIGHT_INCORRECT_WORD') return <HighlightIncorrectWords question={question} />;

  if (type === 'LISTENING_DICTATION') {
    return <AudioTextAnswer question={question} />;
  }

  if (type === 'LISTENING_SUMMARIZE_SPOKEN_TEXT') {
    return <AudioTextAnswer question={question} minWords={50} maxWords={70} maxScore={12} />;
  }

  return (
    <div className="p-8 text-center text-gray-400">
      <p className="text-4xl mb-3">🚧</p>
      <p className="font-semibold">Question type under development</p>
      <p className="text-sm mt-1">{type}</p>
    </div>
  );
}
