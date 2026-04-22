"""
Quick test for Whisper transcription fix
Kiểm tra Whisper hoạt động sau khi switch từ Gemini
"""

import os
import base64
import sys

# Test if we can import and load Whisper model
print("=" * 70)
print("🧪 TESTING WHISPER TRANSCRIPTION FIX")
print("=" * 70)

print("\n[Step 1] Importing whisper...")
try:
    import whisper
    print("✅ Whisper imported successfully")
except ImportError as e:
    print(f"❌ Failed to import whisper: {e}")
    print("Run: pip install openai-whisper")
    sys.exit(1)

print("\n[Step 2] Loading Whisper model (base)...")
try:
    model = whisper.load_model("base")
    print("✅ Whisper model loaded successfully")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    sys.exit(1)

print("\n[Step 3] Testing with test audio files...")
test_files = [
    "test_audio_q1.wav",
    "test_audio_q2.wav",
]

for audio_file in test_files:
    if not os.path.exists(audio_file):
        print(f"⏭️ {audio_file} not found, skipping...")
        continue
    
    print(f"\n📄 Transcribing: {audio_file}")
    try:
        result = model.transcribe(audio_file, language="en", verbose=False)
        text = result["text"].strip()
        print(f"✅ Result: {text[:100]}...")
    except Exception as e:
        print(f"❌ Transcription failed: {e}")

print("\n" + "=" * 70)
print("✅ Whisper test complete!")
print("=" * 70)
print("\nNext: Restart the server with:")
print("  python -c \"import uvicorn; from main import app; uvicorn.run(app, host='127.0.0.1', port=8001, reload=True)\"")
