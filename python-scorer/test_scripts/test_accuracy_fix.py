"""Test accuracy-based content scoring fix"""
import asyncio
from main import score_read_aloud, QuestionData

async def test():
    # Your test case: 19/32 từ đúng = 59% accuracy
    reference = "Climate change is one of the most pressing issues facing humanity today, rising temperatures, melting ice caps and extreme weather events are just some of the consequences of increased greenhouse gas emissions."
    
    # Your transcription: lots of errors
    student = "Clamageants is one of the more fresh and easy facing humanality today, rice intimidating, smelting ice caps and a swim weather even judge. I just some of the consequences of increased greenhouse cache emissions."
    
    q = QuestionData(content=reference, title="Climate", response_time=40)
    result = await score_read_aloud(q, student, duration_seconds=30.0)
    
    print("=" * 60)
    print("TEST: Accuracy-based Content Score Fix")
    print("=" * 60)
    print(f"\nTextual accuracy: ~59% (19/32 words correct)")
    print(f"\nTotal Score: {result.total_score}/15")
    print(f"Content: {result.score_breakdown['content']}/5")
    print(f"Pronunciation: {result.score_breakdown['pronunciation']}/5")
    print(f"Fluency: {result.score_breakdown['fluency']}/5")
    print(f"\nFeedback: {result.feedback}")
    
    print(f"\n--- Expected Results ---")
    print(f"Content should be 2/5 (50-70% accuracy), NOT 5/5")
    print(f"Pronunciation should be 2-3/5")
    
    if result.score_breakdown['content'] in [1, 2, 3]:  # Should be in range 1-3, not 5
        print(f"\n✅ PASS: Content score is reasonable ({result.score_breakdown['content']}/5)")
    else:
        print(f"\n❌ FAIL: Content score is {result.score_breakdown['content']}/5, should be lower")

asyncio.run(test())
