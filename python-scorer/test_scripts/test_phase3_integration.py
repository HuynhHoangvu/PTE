"""
End-to-End Integration Test: Frontend → NestJS → Python Scorer → Phase 2 Data
"""
import requests
import json
import base64
import time
import os

BASE_URL = "http://127.0.0.1:3000/api"
PYTHON_SCORER_URL = "http://127.0.0.1:8002"

print("=" * 80)
print("PHASE 3: END-TO-END INTEGRATION TEST")
print("Flow: Frontend → NestJS Backend → Python Scorer (with Phase 2)")
print("=" * 80)

# Step 1: Register user if needed
print("\n[1/5] Setting up test user...")
email = f"test_phase3_{int(time.time())}@test.com"
password = "Test@123456"

try:
    auth_response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": email,
            "fullName": "Phase 3 Test User",
            "password": password
        }
    )
    if auth_response.status_code == 201:
        print(f"✅ User registered: {email}")
    elif auth_response.status_code == 409:
        print(f"✅ User already exists: {email}")
    else:
        print(f"⚠️  Registration response: {auth_response.status_code}")
        print(f"   {auth_response.text[:100]}")
except Exception as e:
    print(f"❌ User setup failed: {e}")
    exit(1)

# Step 2: Login to get token
print("\n[2/5] Authenticating...")
try:
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    print(f"Login status: {login_response.status_code}")
    
    if login_response.status_code not in [200, 201]:
        print(f"❌ Login failed: {login_response.text}")
        exit(1)
    
    login_data = login_response.json()
    token = login_data.get("token") or login_data.get("access_token")
    if not token:
        print(f"❌ No token in response: {login_response.text}")
        exit(1)
    
    print(f"✅ Authenticated (token: {token[:20]}...)")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
except Exception as e:
    print(f"❌ Authentication failed: {e}")
    exit(1)

# Step 3: Get a READ_ALOUD question
print("\n[3/5] Fetching READ_ALOUD question...")
try:
    questions_response = requests.get(
        f"{BASE_URL}/questions",
        headers=headers
    )
    print(f"Questions status: {questions_response.status_code}")
    
    if questions_response.status_code != 200:
        print(f"❌ Failed to get questions: {questions_response.text}")
        exit(1)
    
    questions_data = questions_response.json()
    
    # Handle if questions is wrapped in a data field or is direct array
    if isinstance(questions_data, dict) and 'data' in questions_data:
        questions = questions_data['data']
    elif isinstance(questions_data, list):
        questions = questions_data
    else:
        questions = [questions_data] if isinstance(questions_data, dict) else []
    
    read_aloud_q = None
    for q in questions:
        if q.get("type") == "SPEAKING_READ_ALOUD":
            read_aloud_q = q
            break
    
    if not read_aloud_q:
        print(f"⚠️  No READ_ALOUD questions found. Available types:")
        for q in questions[:3]:
            if isinstance(q, dict):
                print(f"   - {q.get('type', 'Unknown')}")
        print(f"Creating a test with first available question...")
        if questions and isinstance(questions[0], dict):
            read_aloud_q = questions[0]
        else:
            print("❌ No suitable questions found")
            exit(1)
    
    print(f"✅ Found question: {read_aloud_q.get('title', 'Untitled')[:50]}")
    question_id = read_aloud_q.get("id")
except Exception as e:
    print(f"❌ Question fetch failed: {e}")
    import traceback
    traceback.print_exc()

# Step 4: Load test audio and submit attempt
print("\n[4/5] Submitting speaking attempt with audio...")

# Try to use smaller existing test audio, or create one
audio_files = [
    "test_audio_q1.wav",
    "test_audio_q2.wav",
    "test_phase2.wav",
]

audio_file = None
for af in audio_files:
    if os.path.exists(af):
        size = os.path.getsize(af)
        if size < 100000:  # Prefer smaller files
            audio_file = af
            break

if not audio_file:
    # Try first available
    for af in audio_files:
        if os.path.exists(af):
            audio_file = af
            break

if not audio_file:
    print(f"❌ Test audio files not found")
    print(f"Tried: {audio_files}")
    exit(1)

audio_size = os.path.getsize(audio_file)
print(f"Using audio file: {audio_file} ({audio_size} bytes)")

try:
    with open(audio_file, "rb") as f:
        audio_bytes = f.read()
    
    # If audio is too large, truncate for testing (just send first 50KB)
    if len(audio_bytes) > 50000:
        print(f"⚠️  Audio too large, truncating from {len(audio_bytes)} to 50KB")
        audio_bytes = audio_bytes[:50000]
    
    audio_base64 = base64.b64encode(audio_bytes).decode()
    
    submit_response = requests.post(
        f"{BASE_URL}/attempts/speaking",
        headers=headers,
        json={
            "questionId": question_id,
            "audioBase64": audio_base64,
            "duration": 4.0
        }
    )
    
    print(f"Submit status: {submit_response.status_code}")
    
    if submit_response.status_code not in [201, 200]:
        print(f"❌ Submit failed: {submit_response.text}")
        exit(1)
    
    attempt_data = submit_response.json()
    attempt_id = attempt_data.get("id")
    print(f"✅ Attempt submitted (ID: {attempt_id}, Status: {attempt_data.get('status')})")
except Exception as e:
    print(f"❌ Attempt submission failed: {e}")
    import traceback
    traceback.print_exc()

# Step 5: Poll for scoring result
print("\n[5/5] Polling for scoring result...")
max_polls = 60
poll_count = 0

while poll_count < max_polls:
    try:
        result_response = requests.get(
            f"{BASE_URL}/attempts/{attempt_id}/score",
            headers=headers
        )
        
        if result_response.status_code != 200:
            print(f"⏳ Waiting... ({poll_count}s) - Status: {result_response.status_code}")
            poll_count += 1
            time.sleep(1)
            continue
        
        result = result_response.json()
        status = result.get("status")
        
        if status == "SCORED":
            print(f"\n✅ SCORING COMPLETE!")
            
            # Display results
            score_breakdown = result.get("scoreBreakdown", {})
            total_score = result.get("totalScore", 0)
            feedback = result.get("feedback", "")
            transcription = result.get("transcription", "")
            
            print(f"\n📊 RESULTS:")
            print(f"   Total Score: {total_score}/15")
            print(f"   Content: {score_breakdown.get('content', 'N/A')}/5")
            print(f"   Pronunciation: {score_breakdown.get('pronunciation', 'N/A')}/5")
            print(f"   Fluency: {score_breakdown.get('fluency', 'N/A')}/5")
            print(f"\n   Transcription: {transcription[:80] if transcription else 'N/A'}...")
            print(f"\n   Feedback: {feedback[:100] if feedback else 'N/A'}...")
            
            # Check for Phase 2 data
            phase2_data = score_breakdown.get("phase2", {})
            if phase2_data:
                print(f"\n✅ PHASE 2 DATA FOUND:")
                
                pauses = phase2_data.get("pauses", {})
                if pauses:
                    print(f"   Pauses: {pauses.get('total_pauses', 0)} detected")
                    print(f"   Pause ratio: {pauses.get('pause_ratio', 0):.1%}")
                
                pitch = phase2_data.get("pitch", {})
                if pitch:
                    f0_mean = pitch.get('f0_mean', 'N/A')
                    stab = pitch.get('stability_score', 'N/A')
                    if isinstance(f0_mean, (int, float)):
                        print(f"   Pitch F0 Mean: {f0_mean:.1f} Hz")
                    if isinstance(stab, (int, float)):
                        print(f"   Pitch Stability: {stab:.1f}/100")
                
                fluency_analysis = phase2_data.get("fluency_analysis", {})
                if fluency_analysis:
                    deductions = fluency_analysis.get("deductions", [])
                    if deductions:
                        print(f"   Fluency Deductions:")
                        for d in deductions:
                            print(f"     - {d}")
            else:
                print(f"\n⚠️  Phase 2 data NOT found in response")
            
            break
            
        elif status == "SCORING":
            poll_count += 1
            print(f"⏳ Scoring... ({poll_count}s)")
            time.sleep(1)
            
        elif status == "ERROR":
            print(f"❌ Scoring error: {result.get('feedback', 'Unknown error')}")
            exit(1)
            
        else:
            print(f"⏳ Status: {status} ({poll_count}s)")
            poll_count += 1
            time.sleep(1)
            
    except Exception as e:
        print(f"❌ Poll failed: {e}")
        exit(1)

if poll_count >= max_polls:
    print(f"❌ Scoring timeout after {max_polls} seconds")
    exit(1)

print("\n" + "=" * 80)
print("✅ PHASE 3 INTEGRATION TEST COMPLETE!")
print("=" * 80)