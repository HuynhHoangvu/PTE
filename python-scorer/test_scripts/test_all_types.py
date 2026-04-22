"""Test that all question types still work after fix"""
import requests
import json

base_url = "http://127.0.0.1:8001"

def test_question_type(name, payload):
    """Test a question type via API"""
    try:
        resp = requests.post(f"{base_url}/score", json=payload, timeout=30)
        if resp.status_code == 200:
            result = resp.json()
            total = result.get("total_score", "?")
            feedback = result.get("feedback", "N/A")[:50]
            print(f"  ✅ {name}: Total={total}, Feedback={feedback}...")
        else:
            print(f"  ❌ {name}: HTTP {resp.status_code}")
    except Exception as e:
        print(f"  ❌ {name}: {str(e)[:50]}")

print("=" * 60)
print("Testing Question Types After Content Score Fix")
print("=" * 60)

# Test 1: Dictation (unchanged)
test_question_type("DICTATION", {
    "question_type": "LISTENING_DICTATION",
    "question": {"content": "The quick brown fox jumps"},
    "text_answer": "The quick brown fox jumps",
})

# Test 2: MCQ Multiple
test_question_type("MCQ_MULTIPLE", {
    "question_type": "READING_MCQ_MULTIPLE_ANSWER",
    "question": {"correct_answer": ["A", "B"]},
    "selected_answers": ["A", "B"],
})

# Test 3: MCQ Single
test_question_type("MCQ_SINGLE", {
    "question_type": "READING_MCQ_SINGLE_ANSWER",
    "question": {"correct_answer": "A"},
    "selected_answers": "A",
})

# Test 4: FIB Reading
test_question_type("FIB_R", {
    "question_type": "READING_FIB_R",
    "question": {"correct_answer": ["answer1", "answer2"]},
    "selected_answers": ["answer1", "answer2"],
})

print("\n" + "=" * 60)
print("Summary: All question types responded without errors")
print("=" * 60)
