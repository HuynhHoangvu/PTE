"""Quick test for content score fix"""
import asyncio
import json
from main import score_read_aloud, score_repeat_sentence, QuestionData

async def main():
    print("=" * 60)
    print("TEST: READ_ALOUD Content Score Fix")
    print("=" * 60)
    
    reference = "Climate change is one of the most pressing issues facing humanity today"
    student = "Climate change is one of the most prescient issues facing her mentality today"
    
    q = QuestionData(content=reference, title="Climate", response_time=40)
    result = await score_read_aloud(q, student, duration_seconds=20.0)
    
    print(f"\nTotal Score: {result.total_score}/15")
    print(f"Content: {result.score_breakdown['content']}/5")
    print(f"Pronunciation: {result.score_breakdown['pronunciation']}/5")
    print(f"Fluency: {result.score_breakdown['fluency']}/5")
    print(f"\nFeedback: {result.feedback}")
    print(f"\nExpected: Content should be 5/5 (100% coverage), not 0/5")
    
    if result.score_breakdown['content'] == 5:
        print("\n✅ PASS: Content score is correct!")
    else:
        print(f"\n❌ FAIL: Content score is {result.score_breakdown['content']}, expected 5")
    
    print("\n" + "=" * 60)
    print("TEST: REPEAT_SENTENCE Content Score Fix")
    print("=" * 60)
    
    q2 = QuestionData(content=reference, title="Climate", response_time=15)
    result2 = await score_repeat_sentence(q2, student, duration_seconds=10.0)
    
    print(f"\nTotal Score: {result2.total_score}/15")
    print(f"Content: {result2.score_breakdown['content']}/5")
    print(f"Pronunciation: {result2.score_breakdown['pronunciation']}/5")
    print(f"Fluency: {result2.score_breakdown['fluency']}/5")
    print(f"\nFeedback: {result2.feedback}")
    
    if result2.score_breakdown['content'] == 5:
        print("\n✅ PASS: Content score is correct!")
    else:
        print(f"\n❌ FAIL: Content score is {result2.score_breakdown['content']}, expected 5")

asyncio.run(main())
