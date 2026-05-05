"""
Test thử các loại câu hỏi — chạy trực tiếp không cần server.
python test_scorer.py
"""

import asyncio
import sys
import os

# Load env
from dotenv import load_dotenv
load_dotenv()

# Import scoring functions
from main import (
    QuestionData, ScoreRequest, QuestionType,
    score_attempt,
    score_fib, score_mcq_multiple, score_mcq_single,
    score_reorder, score_highlight_incorrect, score_dictation,
)


def header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)


def show(result, label="Result"):
    bd = result.score_breakdown or {}
    mx = bd.get("content_max") or bd.get("total_max")
    suffix = f"/{mx}" if mx else "/90"
    print(f"  [{label}] Score: {result.total_score}{suffix}")
    print(f"  Breakdown: {result.score_breakdown}")
    print(f"  Feedback: {result.feedback}")
    if result.transcription:
        print(f"  Transcription: {result.transcription}")


async def test_all():
    print("\n🎯 FlyEdu PTE Scorer — Test Suite")
    print("=" * 60)

    # ── 1. Read Aloud ─────────────────────────────────────────────
    header("1. Read Aloud")
    q = QuestionData(content="Climate change is one of the most pressing challenges facing humanity today.")
    req = ScoreRequest(
        question_type=QuestionType.SPEAKING_READ_ALOUD,
        question=q,
        audio_base64=None,  # Would need real audio
    )
    # Simulate with a manual transcription test
    from main import score_read_aloud
    r = await score_read_aloud(q, "Climate change is one of the most pressing challenges facing humanity today.")
    show(r, "Perfect match")

    r2 = await score_read_aloud(q, "Climate change is one of the biggest problems for humanity today.")
    show(r2, "Partial match")

    # ── 2. Repeat Sentence ────────────────────────────────────────
    header("2. Repeat Sentence")
    from main import score_repeat_sentence
    q = QuestionData(content="The university library will be closed on public holidays.")
    r = await score_repeat_sentence(q, "The university library will be closed on public holidays.")
    show(r, "Exact repeat")

    r2 = await score_repeat_sentence(q, "The library will be closed holidays.")
    show(r2, "Partial")

    # ── 3. Writing - Summarize Written Text ───────────────────────
    header("3. Summarize Written Text (SWT)")
    q = QuestionData(content=(
        "The global average temperature has risen by approximately 1.1 degrees Celsius since "
        "pre-industrial times, primarily due to the burning of fossil fuels and deforestation. "
        "This warming has led to more frequent extreme weather events, rising sea levels, and "
        "disruptions to ecosystems worldwide. Scientists warn that without significant reductions "
        "in greenhouse gas emissions, temperatures could rise by 3-4 degrees Celsius by 2100."
    ))
    r = await score_swt_test(q, "Global temperatures have risen 1.1°C since pre-industrial times due to fossil fuels, causing extreme weather and ecosystem disruption unless emissions are reduced.")
    show(r)

    # ── 4. Essay ──────────────────────────────────────────────────
    header("4. Write Essay")
    q = QuestionData(content="Some people think that technology is making people less social. Others disagree. Discuss both views and give your own opinion.")
    essay = """Technology has transformed how people communicate and interact with each other. While some argue that this transformation is making people less social, I believe that technology enhances social connections when used appropriately.

On one hand, critics point out that smartphones and social media encourage people to stare at screens rather than engage in face-to-face conversations. Family dinners are interrupted by notifications, and people walking together may be absorbed in their phones. This superficial connectivity could replace deeper, more meaningful relationships.

On the other hand, technology enables people to maintain relationships across vast distances. Video calls allow families separated by continents to see each other regularly. Online communities connect people with shared interests who would never have met otherwise.

In conclusion, while technology can be misused and lead to social isolation, its primary effect is to expand and strengthen social networks. The key lies in using technology as a complement to, rather than a replacement for, in-person interaction."""
    r = await score_essay_test(q, essay)
    show(r)

    # ── 5. MCQ Single ─────────────────────────────────────────────
    header("5. MCQ Single Answer")
    q = QuestionData(
        content="What is the main cause of climate change according to the passage?",
        correct_answer="B"
    )
    r = score_mcq_single(q, "B")
    show(r, "Correct")
    r2 = score_mcq_single(q, "A")
    show(r2, "Wrong")

    # ── 6. MCQ Multiple ───────────────────────────────────────────
    header("6. MCQ Multiple Answer")
    q = QuestionData(correct_answer=["A", "C", "E"])
    r = score_mcq_multiple(q, ["A", "C", "E"])
    show(r, "All correct")
    r2 = score_mcq_multiple(q, ["A", "B", "C"])
    show(r2, "1 wrong")

    # ── 7. Re-order Paragraphs ────────────────────────────────────
    header("7. Re-order Paragraphs")
    q = QuestionData(correct_answer=["A", "C", "B", "D"])
    r = score_reorder(q, ["A", "C", "B", "D"])
    show(r, "Perfect")
    r2 = score_reorder(q, ["A", "B", "C", "D"])
    show(r2, "1 wrong pair")

    # ── 8. Fill-in-Blanks ─────────────────────────────────────────
    header("8. Fill-in-Blanks")
    q = QuestionData(correct_answer={"b1": "however", "b2": "therefore", "b3": "although"})
    r = score_fib(q, {"b1": "however", "b2": "therefore", "b3": "although"})
    show(r, "All correct")
    r2 = score_fib(q, {"b1": "however", "b2": "because", "b3": "although"})
    show(r2, "1 wrong")

    # ── 9. Highlight Incorrect Words ──────────────────────────────
    header("9. Highlight Incorrect Words")
    q = QuestionData(correct_answer=["quickly", "beautiful"])
    r = score_highlight_incorrect(q, ["quickly", "beautiful"])
    show(r, "Perfect")
    r2 = score_highlight_incorrect(q, ["quickly", "wrong_word"])
    show(r2, "1 wrong")

    # ── 10. Dictation ─────────────────────────────────────────────
    header("10. Write from Dictation")
    q = QuestionData(content="The professor explained the concept clearly to all students.")
    r = score_dictation(q, "The professor explained the concept clearly to all students.")
    show(r, "Perfect")
    r2 = score_dictation(q, "The teacher explained concept clearly students.")
    show(r2, "Partial")

    print(f"\n{'='*60}")
    print("  ✅ All tests completed!")
    print(f"{'='*60}\n")


# Helper aliases for tests
async def score_swt_test(q, text): return await score_swt(q, text)
async def score_essay_test(q, text): return await score_essay(q, text)

from main import score_swt, score_essay

if __name__ == "__main__":
    asyncio.run(test_all())
