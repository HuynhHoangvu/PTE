"""
Phase 3: Full End-to-End Integration Test (FIXED)
Frontend → NestJS Backend (/api) → Python Scorer (port 8002)

KEY FIX: Send audio as multipart/form-data, not JSON base64
"""
import requests
import json
import time
import os

BASE_URL = "http://127.0.0.1:3000/api"
PYTHON_SCORER_URL = "http://127.0.0.1:8002"

print("=" * 80)
print("PHASE 3: END-TO-END INTEGRATION TEST (MULTIPART AUDIO FIX)")
print("Flow: Frontend → NestJS Backend → Python Scorer (with Phase 2)")
print("=" * 80)

# Step 1: Create test user
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
    if auth_response.status_code in [201, 409]:
        print(f"✅ User registered/exists: {email}")
    else:
        print(f"⚠️  Registration response: {auth_response.status_code}")
except Exception as e:
    print(f"❌ User setup failed: {e}")
    exit(1)

# Step 2: Login
print("\n[2/5] Authenticating...")
try:
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    
    if login_response.status_code not in [200, 201]:
        print(f"❌ Login failed: {login_response.text[:100]}")
        exit(1)
    
    login_data = login_response.json()
    token = login_data.get("token")
    if not token:
        print(f"❌ No token in response")
        exit(1)
    
    print(f"✅ Authenticated (token: {token[:20]}...)")
    headers = {"Authorization": f"Bearer {token}"}
except Exception as e:
    print(f"❌ Authentication failed: {e}")
    exit(1)

# Step 3: Get READ_ALOUD question
print("\n[3/5] Fetching READ_ALOUD question...")
try:
    questions_response = requests.get(f"{BASE_URL}/questions", headers=headers)
    
    if questions_response.status_code != 200:
        print(f"❌ Failed to get questions: {questions_response.text[:100]}")
        exit(1)
    
    data = questions_response.json()
    questions = data.get('data', []) if isinstance(data, dict) else data
    
    read_aloud_q = None
    for q in questions:
        if q.get("type") == "SPEAKING_READ_ALOUD":
            read_aloud_q = q
            break
    
    if not read_aloud_q and questions:
        read_aloud_q = questions[0]
    
    if not read_aloud_q:
        print("❌ No questions found")
        exit(1)
    
    print(f"✅ Found question: {read_aloud_q.get('title', 'Untitled')[:50]}")
    question_id = read_aloud_q.get("id")
except Exception as e:
    print(f"❌ Question fetch failed: {e}")
    exit(1)

# Step 4: Submit speaking attempt with MULTIPART audio
print("\n[4/5] Submitting speaking attempt with audio (multipart)...")

# Find test audio file
audio_file = None
for af in ["test_audio_q1.wav", "test_audio_q2.wav", "test_phase2.wav", "test_audio_q3.wav", "test_audio_q4.wav"]:
    if os.path.exists(af):
        audio_file = af
        break

if not audio_file:
    print(f"❌ No test audio file found")
    exit(1)

print(f"   Using audio file: {audio_file}")

try:
    with open(audio_file, "rb") as f:
        audio_bytes = f.read()
    
    print(f"   Audio size: {len(audio_bytes)} bytes")
    
    # Send as MULTIPART form data (not JSON base64)
    files = {
        'audio': ('audio.wav', audio_bytes, 'audio/wav')
    }
    data = {
        'questionId': question_id,
        'duration': '4.0'
    }
    
    submit_response = requests.post(
        f"{BASE_URL}/attempts/speaking",
        headers=headers,
        files=files,
        data=data
    )
    
    if submit_response.status_code not in [200, 201]:
        print(f"❌ Submit failed: {submit_response.status_code}")
        print(f"   Response: {submit_response.text[:200]}")
        exit(1)
    
    attempt_data = submit_response.json()
    attempt_id = attempt_data.get("id")
    print(f"✅ Attempt submitted (ID: {attempt_id}, Status: {attempt_data.get('status')})")
except Exception as e:
    print(f"❌ Attempt submission failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Step 5: Poll for result
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
            print(f"⏳ Waiting ({poll_count}s)... Status: {result_response.status_code}")
            poll_count += 1
            time.sleep(1)
            continue
        
        result = result_response.json()
        status = result.get("status")
        
        if status == "SCORED":
            print(f"\n✅ SCORING COMPLETE!")
            
            score_breakdown = result.get("scoreBreakdown", {})
            total_score = result.get("totalScore", 0)
            feedback = result.get("feedback", "")
            transcription = result.get("transcription", "")
            
            print(f"\n📊 RESULTS:")
            print(f"   Total Score: {total_score}/15")
            print(f"   Content: {score_breakdown.get('content', 'N/A')}/5")
            print(f"   Pronunciation: {score_breakdown.get('pronunciation', 'N/A')}/5")
            print(f"   Fluency: {score_breakdown.get('fluency', 'N/A')}/5")
            print(f"\n   Transcription: {str(transcription)[:80]}...")
            print(f"\n   Feedback: {str(feedback)[:100]}...")
            
            # Check for Phase 2 data
            phase2_data = score_breakdown.get("phase2", {})
            if phase2_data:
                print(f"\n✅ PHASE 2 DATA INCLUDED IN RESPONSE:")
                
                pauses = phase2_data.get("pauses", {})
                if pauses and pauses.get('total_pauses') is not None:
                    print(f"   Pauses: {pauses.get('total_pauses', 0)} segments detected")
                    print(f"   Total pause time: {pauses.get('total_pause_time', 0):.2f}s")
                
                wpm_data = phase2_data.get("wpm_detailed", {})
                if wpm_data:
                    print(f"   Syllable-based WPM: {wpm_data.get('wpm', 'N/A')}")
                
                pitch = phase2_data.get("pitch", {})
                if pitch:
                    f0 = pitch.get('f0_mean')
                    stab = pitch.get('stability_score')
                    if f0 is not None:
                        print(f"   Pitch F0 Mean: {float(f0):.1f} Hz")
                    if stab is not None:
                        print(f"   Pitch Stability: {float(stab):.1f}/100")
                
                fluency_analysis = phase2_data.get("fluency_analysis", {})
                if fluency_analysis:
                    print(f"   Fluency Score with Phase 2: {fluency_analysis.get('fluency_score', 'N/A')}/5")
                    deductions = fluency_analysis.get("deductions", [])
                    if deductions:
                        for d in deductions:
                            print(f"     • {d}")
            else:
                print(f"\n⚠️  Phase 2 data NOT found in response")
                print(f"   Full breakdown: {json.dumps(score_breakdown, indent=2)[:500]}")
            
            break
        
        elif status == "SCORING":
            poll_count += 1
            print(f"⏳ Scoring... ({poll_count}s)")
            time.sleep(1)
        elif status == "ERROR":
            print(f"❌ Scoring error")
            error_msg = result.get("feedback", "Unknown error")
            print(f"   Error: {error_msg}")
            exit(1)
        else:
            poll_count += 1
            print(f"⏳ Status: {status} ({poll_count}s)")
            time.sleep(1)
    
    except Exception as e:
        print(f"❌ Poll error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

if poll_count >= max_polls:
    print(f"❌ Timeout after {max_polls}s")
    exit(1)

print("\n" + "=" * 80)
print("✅ PHASE 3 INTEGRATION TEST COMPLETE")
print("=" * 80)
