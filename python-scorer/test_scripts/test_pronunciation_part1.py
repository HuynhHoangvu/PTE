"""
🎯 Giai đoạn 1: Xây dựng Core Model - Pronunciation Assessment (Text-to-Text)

Mục tiêu: 
- Nhận file audio (.wav, .mp3)
- Chuyển thành text bằng Whisper
- So sánh với text gốc bằng WER (Word Error Rate)
- Trả về điểm số từ 0-100

Chạy: python test_pronunciation_part1.py
"""

import os
import whisper
import jiwer
from pathlib import Path
import string
import warnings

warnings.filterwarnings("ignore")

# ═══════════════════════════════════════════════════════════════════════════
# 1. HÀM LÀM SẠCH VĂN BẢN (giúp chấm điểm công bằng hơn)
# ═══════════════════════════════════════════════════════════════════════════

def clean_text(text):
    """
    Làm sạch văn bản:
    - Chuyển thành chữ thường → khống phân biệt hoa thường
    - Xóa dấu câu (.,?!...) → không phạt nhầm dấu
    - Xóa khoảng trắng thừa
    """
    text = text.lower()
    # Xóa toàn bộ dấu câu
    text = text.translate(str.maketrans('', '', string.punctuation))
    # Xóa khoảng trắng thừa
    return " ".join(text.split())


# ═══════════════════════════════════════════════════════════════════════════
# 2. HÀM TÍNH ĐIỂM PHÁT ÂM (Speech-to-Text + WER)
# ═══════════════════════════════════════════════════════════════════════════

class PronunciationAssessor:
    def __init__(self, model_size="base"):
        """
        model_size: "tiny" (low quality, very fast, ~1GB)
                    "base" (balanced, ~140MB)
                    "small" (better quality, ~461MB)
                    "medium" (good quality, ~1.4GB)
                    "large" (best quality, ~2.9GB) — requires GPU
        """
        print(f"🔄 Đang tải mô hình Whisper '{model_size}'... (chỉ tải lần đầu)")
        self.model = whisper.load_model(model_size)
        print(f"✅ Mô hình đã sẵn sàng!")

    def score_from_audio_file(self, audio_path, reference_text, language="en"):
        """
        Chấm điểm phát âm từ file audio

        Args:
            audio_path: đường dẫn file .wav, .mp3, .m4a
            reference_text: văn bản gốc cần so sánh
            language: "en" (Anh), "vi" (Việt), etc.

        Returns:
            dict: {
                "total_score": 0-100,
                "wer": 0-1 (Word Error Rate),
                "reference_text": văn bản gốc (đã làm sạch),
                "transcribed_text": AI nghe được (đã làm sạch),
                "feedback": gợi ý cải thiện,
                "transcribe_raw": văn bản gốc từ AI (chưa làm sạch)
            }
        """
        
        print(f"\n📂 File: {audio_path}")
        print(f"🔊 Ngôn ngữ: {language}")
        
        # Kiểm tra file tồn tại
        if not os.path.exists(audio_path):
            return {
                "total_score": 0,
                "error": f"❌ File không tìm thấy: {audio_path}"
            }

        try:
            # Bước 1: Transcribe audio bằng Whisper
            print("🎙️ Đang nghe và nhận diện giọng nói...")
            result = self.model.transcribe(audio_path, language=language)
            transcribed_text_raw = result["text"]
            print(f"   ✓ AI nghe được: {transcribed_text_raw}")

            # Bước 2: Làm sạch cả hai đoạn text
            clean_ref = clean_text(reference_text)
            clean_rec = clean_text(transcribed_text_raw)

            print(f"\n📊 Kết quả:")
            print(f"   📝 Văn bản gốc: {clean_ref}")
            print(f"   🗣️  AI nghe được: {clean_rec}")

            # Bước 3: Tính Word Error Rate (WER)
            # WER = (S + D + I) / N
            # S: Substitution, D: Deletion, I: Insertion, N: Total words
            wer = jiwer.wer(clean_ref, clean_rec)
            
            # Chuyển WER thành điểm số (0-100)
            # WER=0 → 100 điểm
            # WER=1 → 0 điểm
            score = max(0, 100 - (wer * 100))

            # Bước 4: Tạo feedback
            feedback = self._generate_feedback(score, wer, clean_ref, clean_rec)

            return {
                "total_score": round(score, 2),
                "wer": round(wer, 4),
                "reference_text": clean_ref,
                "transcribed_text": clean_rec,
                "transcribe_raw": transcribed_text_raw,
                "feedback": feedback,
                "status": "✅ Thành công"
            }

        except Exception as e:
            return {
                "total_score": 0,
                "error": f"❌ Lỗi: {str(e)}"
            }

    def _generate_feedback(self, score, wer, ref_text, rec_text):
        """Tạo nhận xét chi tiết dựa trên điểm số"""
        if score >= 95:
            return "🌟 Xuất sắc! Phát âm chuẩn như người bản xứ."
        elif score >= 85:
            return "👍 Tốt lắm! Chỉ có một chút nhỏ cần cải thiện."
        elif score >= 75:
            return "✓ Khá tốt! Hãy luyện tập thêm để phát âm rõ ràng hơn."
        elif score >= 60:
            return "💪 Còn cần cố gắng. Hãy đọc chậm lại và chú ý từng âm tiết."
        else:
            return "🎯 Hãy luyện tập nhiều hơn. Thử ghi âm lại và so sánh với bản gốc."


# ═══════════════════════════════════════════════════════════════════════════
# 3. TEST CÁC BÀI SPEAKING LOẠI READ ALOUD & REPEAT SENTENCE
# ═══════════════════════════════════════════════════════════════════════════

def print_header(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)


def test_speaking_samples():
    """Test các câu mẫu cho bài Speaking"""
    
    print_header("🎯 PTE PRONUNCIATION ASSESSMENT - GIAI ĐOẠN 1")
    print("\n📌 Danh sách câu hỏi Speaking (Read Aloud + Repeat Sentence):\n")

    # Danh sách các câu hỏi Speaking mẫu từ đề thi PTE
    speaking_questions = [
        {
            "id": 1,
            "type": "SPEAKING_READ_ALOUD",
            "content": "Climate change is one of the most pressing challenges facing humanity today.",
            "description": "Đọc thành tiếng về biến đổi khí hậu"
        },
        {
            "id": 2,
            "type": "SPEAKING_READ_ALOUD",
            "content": "The university library will be closed on public holidays.",
            "description": "Đọc thông báo về thư viện"
        },
        {
            "id": 3,
            "type": "SPEAKING_READ_ALOUD",
            "content": "Artificial intelligence is revolutionizing various industries and creating new job opportunities.",
            "description": "Đọc về trí tuệ nhân tạo"
        },
        {
            "id": 4,
            "type": "SPEAKING_REPEAT_SENTENCE",
            "content": "The graph shows the relationship between education level and employment rate.",
            "description": "Lặp lại câu về giáo dục"
        },
        {
            "id": 5,
            "type": "SPEAKING_REPEAT_SENTENCE",
            "content": "Mobile phones have made communication faster and more convenient than ever before.",
            "description": "Lặp lại câu về điện thoại di động"
        },
    ]

    for q in speaking_questions:
        print(f"\n📌 {q['id']}. {q['type']}")
        print(f"   Nội dung: {q['content']}")
        print(f"   👉 Yêu cầu: {q['description']}")
        print(f"   \n   ⚠️  Để test, bạn cần ghi âm câu này rồi lưu vào:")
        audio_filename = f"test_audio_q{q['id']}.wav"
        print(f"      📁 {audio_filename}")

    print("\n" + "="*70)
    print("💡 HƯỚNG DẪN GHI ÂM:")
    print("="*70)
    print("""
1. Dùng phần mềm GoldWave, Audacity hoặc voice recorder trên điện thoại
2. Ghi âm câu, lưu dưới định dạng WAV (16kHz, mono chuẩn nhất)
3. Để file WAV cùng thư mục với script này
4. Chạy test_pronunciation_part1.py lại

Ví dụ: python test_pronunciation_part1.py

Hoặc test bằng API endpoint khi deploy trên FastAPI
    """)

    # Hỏi người dùng muốn test cái nào
    print("\n" + "="*70)
    print("🔍 KIỂM TRA FILE AUDIO CÓ SẴN:")
    print("="*70 + "\n")

    assessor = PronunciationAssessor(model_size="base")
    
    found_audio = False
    for q in speaking_questions:
        audio_file = f"test_audio_q{q['id']}.wav"
        if os.path.exists(audio_file):
            found_audio = True
            print_header(f"TEST: {q['type']} (Câu {q['id']})")
            print(f"📝 Câu gốc: {q['content']}\n")
            
            result = assessor.score_from_audio_file(
                audio_file,
                q['content'],
                language="en"
            )

            if "error" in result:
                print(f"\n❌ {result['error']}")
            else:
                print(f"\n🎯 ĐIỂM SỐ: {result['total_score']}/100")
                print(f"📊 WER (Word Error Rate): {result['wer']*100:.2f}%")
                print(f"💬 Feedback: {result['feedback']}")
                print(f"\n📋 So sánh chi tiết:")
                print(f"   Gốc:  {result['reference_text']}")
                print(f"   Nghe:  {result['transcribed_text']}")

    if not found_audio:
        print("⚠️  Chưa tìm thấy file audio (.wav)")
        print("\n🎓 HƯỚNG DẪN TẠO FILE AUDIO TEST:")
        print("""
Bạn có thể tạo file WAV test nhanh chóng bằng ba cách:

A. CÁCH 1: Dùng Text-to-Speech (Python)
   ────────────────────────────────────
   pip install pyttsx3
   
   import pyttsx3
   engine = pyttsx3.init()
   engine.save_to_file(
       "Climate change is one of the most pressing challenges facing humanity today.",
       "test_audio_q1.wav"
   )
   engine.runAndWait()

B. CÁCH 2: Ghi âm thủ công
   ────────────────────────
   - Dùng Voice Memos (iPhone), Google Recorder (Android)
   - Hoặc Audacity (máy tính)
   - Lưu dưới định dạng WAV

C. CÁCH 3: Tải AI voice từ Google Cloud Text-to-Speech
   ──────────────────────────────────────────────────
   pip install google-cloud-texttospeech
        """)


if __name__ == "__main__":
    try:
        test_speaking_samples()
    except KeyboardInterrupt:
        print("\n\n👋 Dừng lại...")
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
