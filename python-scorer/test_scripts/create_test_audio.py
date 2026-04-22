"""
🔊 Tạo file audio test bằng Text-to-Speech

Để test Pronunciation Assessment, chúng ta cần file audio.
Script này sẽ tạo 5 file audio mẫu từ Google Text-to-Speech

Chạy: python create_test_audio.py
"""

import os
import sys

def create_test_audio_pyttsx3():
    """Tạo file audio test bằng pyttsx3 (offline, nhẹ)"""
    try:
        import pyttsx3
        
        print("🔊 Sử dụng pyttsx3 (offline)")
        print("="*70)
        
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)  # Tốc độ nói (từ mỗi giây)
        
        test_sentences = [
            ("test_audio_q1.wav", "Climate change is one of the most pressing challenges facing humanity today."),
            ("test_audio_q2.wav", "The university library will be closed on public holidays."),
            ("test_audio_q3.wav", "Artificial intelligence is revolutionizing various industries and creating new job opportunities."),
            ("test_audio_q4.wav", "The graph shows the relationship between education level and employment rate."),
            ("test_audio_q5.wav", "Mobile phones have made communication faster and more convenient than ever before."),
        ]
        
        for filename, text in test_sentences:
            print(f"\n📝 Tạo: {filename}")
            print(f"   📄 Text: {text[:60]}...")
            engine.save_to_file(text, filename)
            engine.runAndWait()
            print(f"   ✅ Lưu: {os.getcwd()}/{filename}")
        
        return True
        
    except ImportError:
        print("❌ pyttsx3 chưa được cài đặt")
        print("   Chạy: pip install pyttsx3")
        return False
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False


def create_test_audio_google_tts():
    """Tạo file audio test bằng Google Text-to-Speech (online, chất lượng cao)"""
    try:
        from google.cloud import texttospeech
        
        print("🔊 Sử dụng Google Cloud Text-to-Speech")
        print("="*70)
        
        # Cần xác thực Google Cloud
        # Đặt GOOGLE_APPLICATION_CREDENTIALS environment variable
        if not os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
            print("⚠️  GOOGLE_APPLICATION_CREDENTIALS chưa được đặt")
            print("   Cần file JSON credentials từ Google Cloud")
            return False
        
        client = texttospeech.TextToSpeechClient()
        
        test_sentences = [
            ("test_audio_q1.wav", "Climate change is one of the most pressing challenges facing humanity today."),
            ("test_audio_q2.wav", "The university library will be closed on public holidays."),
            ("test_audio_q3.wav", "Artificial intelligence is revolutionizing various industries and creating new job opportunities."),
            ("test_audio_q4.wav", "The graph shows the relationship between education level and employment rate."),
            ("test_audio_q5.wav", "Mobile phones have made communication faster and more convenient than ever before."),
        ]
        
        for filename, text in test_sentences:
            print(f"\n📝 Tạo: {filename}")
            print(f"   📄 Text: {text[:60]}...")
            
            synthesis_input = texttospeech.SynthesisInput(text=text)
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Neural2-A"  # Giọng nữ tự nhiên
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
            )
            
            response = client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            with open(filename, "wb") as out:
                out.write(response.audio_content)
            
            print(f"   ✅ Lưu: {os.getcwd()}/{filename}")
        
        return True
        
    except ImportError:
        print("❌ google-cloud-texttospeech chưa được cài")
        print("   Chạy: pip install google-cloud-texttospeech")
        return False
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False


def create_test_audio_simple():
    """Tạo file WAV đơn giản bằng numpy + soundfile"""
    try:
        import numpy as np
        import soundfile as sf
        
        print("🔊 Tạo file WAV mẫu (sine wave test)")
        print("="*70)
        
        # Tạo một file WAV đơn giản (không phải tiếng nói thực)
        # Chỉ dùng để test flow của Whisper
        
        sample_rate = 16000
        duration = 3  # giây
        
        # Tạo sine wave
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio = 0.3 * np.sin(2 * np.pi * 440 * t)  # 440Hz sine wave
        
        filename = "test_sine_wave.wav"
        sf.write(filename, audio, sample_rate)
        
        print(f"✅ Tạo: {filename} (sine wave test, không phải tiếng nói)")
        return True
        
    except ImportError as e:
        print(f"❌ Thiếu thư viện: {e}")
        return False
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False


if __name__ == "__main__":
    print("\n🎯 TẠO FILE AUDIO TEST CHO PRONUNCIATION ASSESSMENT")
    print("="*70)
    
    # Thử pyttsx3 trước (offline, tiện)
    success = create_test_audio_pyttsx3()
    
    if not success:
        print("\n💡 Thử phương án khác...")
        # Thử Google TTS
        success = create_test_audio_google_tts()
    
    if not success:
        print("\n💡 Tạo file test sine wave để kiểm tra flow...")
        success = create_test_audio_simple()
    
    if success:
        print("\n" + "="*70)
        print("✅ HOÀN TẤT! File audio test đã được tạo")
        print("="*70)
        print("\n🚀 Bước tiếp theo:")
        print("   1. Chạy: python test_pronunciation_part1.py")
        print("   2. Script sẽ tự động chấm điểm các file audio")
        print("   3. Xem kết quả WER (Word Error Rate) và điểm số (0-100)")
    else:
        print("\n❌ Không thể tạo file audio. Vui lòng:")
        print("   1. Cài pyttsx3: pip install pyttsx3")
        print("   2. Hoặc ghi âm thủ công bằng Audacity hoặc Voice Memos")
        sys.exit(1)
