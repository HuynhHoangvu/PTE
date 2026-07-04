import { Question } from "../../../types";
import { MicSection } from "../shared/MicSection";
import { PracticeContentFrame, PracticeStepHint } from "../shared/PracticeContentFrame";
import { SpeakingPromptAudio } from "../shared/SpeakingPromptAudio";
import { getMaxScore } from "../../../constants/scoring";

export function DescribeImage({ question }: { question: Question }) {
  if (!question.imageUrl) {
    return (
      <PracticeContentFrame>
        <div className="practice-body-plain py-8 sm:py-12 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-8 max-w-md mx-auto">
            <p className="text-4xl sm:text-5xl mb-3 sm:mb-4">🖼️❓</p>
            <h3 className="text-base sm:text-lg font-bold text-amber-900">Thiếu hình</h3>
            <p className="text-sm text-amber-700 mt-2 leading-relaxed">
              Câu Describe Image này chưa có ảnh. Vui lòng chọn câu khác.
            </p>
          </div>
        </div>
      </PracticeContentFrame>
    );
  }

  return (
    <div>
      <PracticeStepHint>Xem hình → Mô tả đủ ý bằng mic</PracticeStepHint>
      {/* Mobile: ảnh gọn (max-height) để MicSection còn chỗ; desktop: layout 2 cột.
          Vùng đọc (SpeakingPromptAudio) chỉ bọc cột ảnh — không có "đề" dạng chữ ở
          đây nên chủ yếu để nhất quán, tránh bọc luôn MicSection (kết quả/nút bấm). */}
      <div className="flex flex-col lg:flex-row lg:min-h-0 gap-3 lg:gap-0">
        <SpeakingPromptAudio
          question={question}
          className="px-3 pt-2 pb-1 sm:px-6 sm:py-5 lg:border-r lg:border-gray-100 lg:flex-[1.15] lg:min-w-0 flex flex-col"
        >
          <div
            className="rounded-2xl border border-gray-200 bg-gray-50/90 p-1.5 sm:p-3 flex items-center justify-center
                       max-h-[38vh] sm:max-h-[48vh] overflow-auto
                       lg:max-h-[min(78vh,880px)] lg:min-h-[min(48vh,480px)]"
          >
            <img
              src={question.imageUrl}
              alt="Biểu đồ cần mô tả"
              className="w-full h-auto max-h-[34vh] sm:max-h-[44vh] object-contain rounded-xl shadow-sm
                         lg:max-h-[min(74vh,840px)]"
            />
          </div>
        </SpeakingPromptAudio>
        <div className="w-full shrink-0 lg:flex-1 lg:min-w-[280px] lg:max-w-xl">
          <MicSection
            questionId={question.id}
            prepSeconds={question.prepTime || 25}
            maxSeconds={question.responseTime || 40}
            label="Xem hình ở trên, rồi chạm mic vàng; hoặc chờ hết đếm ngược sẽ tự ghi."
            wordComparisonStatus="disabled"
            maxScore={getMaxScore(question.type)}
          />
        </div>
      </div>

      {question.suggestedAnswer && (
        <div className="px-3 pb-3 sm:px-5 sm:pb-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3 sm:px-4 sm:py-4 mt-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">
              💡Gợi ý mẫu 
            </h4>
            <p className="text-sm text-blue-900 leading-relaxed">
              {question.suggestedAnswer}
            </p>
            <p className="text-[10px] text-blue-400 mt-3 italic">
              * Tham khảo, không cần học thuộc nguyên văn.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
