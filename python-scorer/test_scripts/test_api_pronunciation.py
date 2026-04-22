#!/usr/bin/env python3
"""
🎯 Test script cho Pronunciation Assessment API endpoint

Chạy API server trước:
  uvicorn main:app --host 0.0.0.0 --port 8001 --reload

Sau đó chạy script này:
  python test_api_pronunciation.py
"""

import asyncio
import aiohttp
import base64
import json
from pathlib import Path

API_URL = "http://localhost:8001"


async def test_pronunciation_assessment_json():
    """Test endpoint /pronunciation-assessment với JSON request"""
    print("\n" + "="*70)
    print("🧪 TEST 1: /pronunciation-assessment (JSON Request)")
    print("="*70)
    
    audio_file = Path("test_audio_q1.wav")
    if not audio_file.exists():
        print(f"❌ File không tồn tại: {audio_file}")
        return
    
    # Read and encode audio to base64
    with open(audio_file, "rb") as f:
        audio_data = f.read()
    audio_b64 = base64.b64encode(audio_data).decode()
    
    payload = {
        "reference_text": "Climate change is one of the most pressing challenges facing humanity today.",
        "audio_base64": audio_b64,
        "audio_mime": "audio/wav",
        "language": "en"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{API_URL}/pronunciation-assessment",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"\n✅ Status: {resp.status}")
                    print(f"\n📊 Kết quả:")
                    print(f"   🎯 Score: {result.get('total_score', 0)}/100")
                    print(f"   📈 WER: {result.get('wer', 0)*100:.2f}%")
                    print(f"   📝 Reference: {result.get('reference_text', '')}")
                    print(f"   🗣️  Transcribed: {result.get('transcribed_text', '')}")
                    print(f"   💬 Feedback: {result.get('feedback', '')}")
                    print(f"\nFull response:")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
                else:
                    text = await resp.text()
                    print(f"❌ Status: {resp.status}")
                    print(f"Response:\n{text}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_pronunciation_assessment_upload():
    """Test endpoint /pronunciation-assessment/upload với form upload"""
    print("\n" + "="*70)
    print("🧪 TEST 2: /pronunciation-assessment/upload (Form Upload)")
    print("="*70)
    
    audio_file = Path("test_audio_q2.wav")
    if not audio_file.exists():
        print(f"❌ File không tồn tại: {audio_file}")
        return
    
    try:
        async with aiohttp.ClientSession() as session:
            with open(audio_file, "rb") as f:
                data = aiohttp.FormData()
                data.add_field('reference_text', 'The university library will be closed on public holidays.')
                data.add_field('audio', f, filename='audio.wav')
                data.add_field('language', 'en')
                
                async with session.post(
                    f"{API_URL}/pronunciation-assessment/upload",
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        print(f"\n✅ Status: {resp.status}")
                        print(f"\n📊 Kết quả:")
                        print(f"   🎯 Score: {result.get('total_score', 0)}/100")
                        print(f"   📈 WER: {result.get('wer', 0)*100:.2f}%")
                        print(f"   💬 Feedback: {result.get('feedback', '')}")
                        print(f"\nFull response:")
                        print(json.dumps(result, indent=2, ensure_ascii=False))
                    else:
                        text = await resp.text()
                        print(f"❌ Status: {resp.status}")
                        print(f"Response:\n{text}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_health_check():
    """Test /health endpoint"""
    print("\n" + "="*70)
    print("🧪 TEST 0: /health (Health Check)")
    print("="*70)
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_URL}/health") as resp:
                result = await resp.json()
                print(f"\n✅ Status: {resp.status}")
                print(f"   Response: {result}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def main():
    print("\n🎯 PRONUNCIATION ASSESSMENT API TEST SUITE")
    print("="*70)
    print(f"API Server: {API_URL}")
    print(f"Đảm bảo server đang chạy trước!")
    
    # Test health check
    try:
        await test_health_check()
    except Exception as e:
        print(f"\n❌ Cannot connect to server: {e}")
        print(f"\nHãy chạy server trước:")
        print(f"  uvicorn main:app --host 0.0.0.0 --port 8001 --reload")
        return
    
    # Test JSON endpoint
    await test_pronunciation_assessment_json()
    
    # Test form upload endpoint
    await test_pronunciation_assessment_upload()
    
    print("\n" + "="*70)
    print("✅ Hoàn tất tất cả tests!")
    print("="*70)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Dừng lại...")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
