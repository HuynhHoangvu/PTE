"""Test script to verify Read Aloud scoring improvements."""
import asyncio
import sys
sys.path.insert(0, '/home/user/PTE')

from main import score_attempt
from models import QuestionData, QuestionType, ScoreRequest

def clean_text(text):
    """Match backend cleaning logic."""
    if not text:
        return ""
    text = text.lower()
    text = text.translate(str.maketrans("", "", '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~'))
    text = " ".join(text.split())
    return text


# Test Case 1: Perfect match
print("\n=== Test Case 1: Perfect Match ===")
q1 = QuestionData(
    id="test1",
    code="TEST001",
    type=QuestionType.SPEAKING_READ_ALOUD,
    content="One of the major factors influencing filter home design",
    correct_answer="One of the major factors influencing filter home design",
)

async def test_case_1():
    req = ScoreRequest(
        question=q1,
        question_type=QuestionType.SPEAKING_READ_ALOUD,
        audio_base64="",
        audio_mime="audio/webm",
        duration_seconds=30,
    )
    # Mock transcription (good match)
    from services.speaking import score_read_aloud
    result = await score_read_aloud(
        q1,
        "One of the major factors influencing filter home design",
        duration=30,
        avg_logprob=-0.3,
    )
    print(f"Perfect match:")
    print(f"  Content: {result.score_breakdown['content']}/5")
    print(f"  Pronunciation: {result.score_breakdown['pronunciation']}/5")
    print(f"  Fluency: {result.score_breakdown['fluency']}/5")
    print(f"  Total: {result.total_score}/15")


# Test Case 2: One word wrong
print("\n=== Test Case 2: One Word Wrong (future instead of filter) ===")
q2 = QuestionData(
    id="test2",
    code="TEST002",
    type=QuestionType.SPEAKING_READ_ALOUD,
    content="One of the major factors influencing filter home design",
    correct_answer="One of the major factors influencing filter home design",
)

async def test_case_2():
    from services.speaking import score_read_aloud
    result = await score_read_aloud(
        q2,
        "One of the major factors influencing future home design",
        duration=30,
        avg_logprob=-0.3,
    )
    print(f"One word wrong (88.8% coverage):")
    print(f"  Content: {result.score_breakdown['content']}/5 (expected 4)")
    print(f"  Pronunciation: {result.score_breakdown['pronunciation']}/5")
    print(f"  Fluency: {result.score_breakdown['fluency']}/5")
    print(f"  Total: {result.total_score}/15")
    print(f"  Transcription: {result.transcription}")


# Test Case 3: Pronunciation good but content bad
print("\n=== Test Case 3: Good Pronunciation But Poor Content (50% words) ===")
q3 = QuestionData(
    id="test3",
    code="TEST003",
    type=QuestionType.SPEAKING_READ_ALOUD,
    content="One of the major factors influencing filter home design",
    correct_answer="One of the major factors influencing filter home design",
)

async def test_case_3():
    from services.speaking import score_read_aloud
    result = await score_read_aloud(
        q3,
        "Something completely different for test purpose only words",
        duration=30,
        avg_logprob=-0.1,  # Very good Whisper confidence
    )
    print(f"Content 50% correct, Whisper confidence very high:")
    print(f"  Content: {result.score_breakdown['content']}/5 (expected 1-2)")
    print(f"  Pronunciation: {result.score_breakdown['pronunciation']}/5 (expected capped at 3)")
    print(f"  Fluency: {result.score_breakdown['fluency']}/5")
    print(f"  Total: {result.total_score}/15")
    print(f"  Transcription: {result.transcription}")


# Run tests
async def run_all_tests():
    await test_case_1()
    await test_case_2()
    await test_case_3()
    
    # Verify algorithm correctness
    print("\n=== Algorithm Verification ===")
    from services.speaking import _compute_word_alignment_read_aloud
    
    ref = "one of the major factors".split()
    hyp = "one of major factors test".split()
    alignment = _compute_word_alignment_read_aloud(ref, hyp)
    print(f"Ref: {ref}")
    print(f"Hyp: {hyp}")
    print(f"Coverage: {alignment['ref_coverage']:.1f}% (expected 80%)")
    print(f"Precision: {alignment['precision']:.1f}% (expected 80%)")


asyncio.run(run_all_tests())
