# ✈️ Fly-Edu – PTE Academic Practice Platform

Full-stack hệ thống ôn luyện PTE Academic với AI Scoring, hỗ trợ Web, Android (Capacitor) và iOS (Capacitor + Codemagic).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS + TypeScript + TypeORM |
| **Database** | PostgreSQL |
| **Frontend** | Vite + React + TypeScript + TailwindCSS |
| **State** | Zustand + TanStack Query |
| **AI Scoring** | OpenAI GPT-4o-mini + Whisper |
| **Auth** | JWT + Passport |
| **Mobile Shell** | Capacitor (Android & iOS) |
| **CI/CD Mobile** | Codemagic (iOS Archive & Publish) |

---

## Quick Start

### 1. Database
```bash
createdb fly_edu
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Chỉnh sửa .env với DB credentials và OpenAI API key

npm install
npm run start:dev
# → http://localhost:3000
# → Swagger docs: http://localhost:3000/api/docs
```

### 3. Frontend (Web)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Hướng dẫn Build & Deploy Mobile (Capacitor)

### 1. Cấu hình môi trường Production cho Mobile
Vì lý do bảo mật, file cấu hình API production của Mobile nằm trong `.gitignore` và không được commit lên Git.
Khi chạy ở local (Android Studio hoặc Xcode), bạn cần tạo file này:
* Tạo file `frontend/.env.production` và điền:
  ```env
  VITE_API_BASE_URL=https://backend-production-29fd8.up.railway.app
  VITE_GOOGLE_CLIENT_ID=1002878505918-pvrkkjjs8lg8042arlusrlknigg6q63q.apps.googleusercontent.com
  ```

---

### 2. Android (Google Play Console)
1. Cấu hình API production (xem phần 1).
2. Build và đồng bộ mã nguồn web vào Android project:
   ```bash
   cd frontend
   npm run cap:sync
   ```
3. Mở Android Studio:
   ```bash
   npm run cap:open
   ```
4. Tạo mã nhị phân ký **AAB** (Build -> Generate Signed Bundle) để tải lên Google Play Console.
5. Chi tiết cấu hình bảo mật dữ liệu, tạo Keystore: xem tài liệu tại [docs/GOOGLE_PLAY_STORE.md](docs/GOOGLE_PLAY_STORE.md).

---

### 3. iOS (App Store & TestFlight qua Codemagic)
Quá trình build và ký ứng dụng (Code Signing) iOS được thực hiện hoàn toàn tự động thông qua **Codemagic** bằng tài khoản **App Store Connect API Key**.

#### A. Cách hoạt động của Quy trình CI/CD trên Codemagic:
* Mã nguồn đẩy lên GitHub (nhánh `main`) sẽ tự động kích hoạt Codemagic build.
* Script trong `codemagic.yaml` sẽ tự động:
  1. Tạo động file `frontend/.env.production` với các cấu hình API Production của dự án.
  2. Cài đặt các thư viện Node, chạy `npm run build`, đồng bộ code sang iOS qua `npx cap sync ios`.
  3. Ký ứng dụng bằng **Xcode Automatic Signing** sử dụng API Key.
  4. Xuất file `.ipa` và tự động tải lên TestFlight của App Store Connect.

#### B. Khắc phục lỗi Code Signing phổ biến trên Codemagic:
Khi sử dụng **Xcode Automatic Signing**, lỗi sau thường xuất hiện trên các máy ảo build mới:
> *error: Revoke certificate: Your account already has an Apple Development signing certificate for this machine, but its private key is not installed in your keychain.*

* **Nguyên nhân:** Do tài khoản Apple Developer đã có chứng chỉ Development từ lần build trước, nhưng máy ảo build mới của Codemagic không chứa khóa bí mật (private key) của chứng chỉ này.
* **Cách khắc phục:**
  1. Đăng nhập vào trang quản lý **[Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)**.
  2. Tìm chứng chỉ loại **Apple Development** hoặc **iOS Development** và nhấn **Revoke** (Thu hồi/Xóa).
  3. Quay lại Codemagic bấm **Start new build** để hệ thống tự tạo mới cặp chứng chỉ và khóa bí mật.

#### C. Lưu ý khi cấu hình Microphone (Speaking):
* Hệ điều hành iOS bắt buộc ứng dụng phải khai báo lý do truy cập micro.
* Cấu hình này nằm trong file [Info.plist](frontend/ios/App/App/Info.plist) của dự án:
  ```xml
  <key>NSMicrophoneUsageDescription</key>
  <string>Ứng dụng cần truy cập micro để bạn thực hiện phần thi nói (Speaking) và ghi âm bài trả lời.</string>
  ```
  *Nếu thiếu cấu hình này, ứng dụng iOS sẽ tự động chặn quyền ghi âm và hiển thị lỗi thiết bị không hỗ trợ.*

---

## Tính năng mới trên Mobile (v2.0)

### 1. Ghi nhớ tài khoản (Remember Me)
* Thêm ô kiểm **Nhớ tài khoản** tại màn hình đăng nhập di động. Khi được tích, ứng dụng sẽ lưu email của người dùng lại để tự động điền trong những lần đăng nhập sau.

### 2. Đăng nhập nhanh bằng Face ID / Touch ID
* **Cài đặt:** Người dùng có thể bật/tắt tính năng **Đăng nhập bằng sinh trắc học** trực tiếp tại tab *Hồ sơ cá nhân*.
* **Đăng nhập nhanh:** Khi được kích hoạt, một nút icon ID (🆔) sẽ xuất hiện tại màn hình đăng nhập. Nhấn nút này sẽ kích hoạt màn hình quét Face ID / Touch ID và tự động đăng nhập thẳng vào hệ thống mà không cần nhập mật khẩu.

### 3. Quy chuẩn kiểm soát phiên bản (Version Control Check)
* Hệ thống backend có tính năng kiểm tra phiên bản bắt buộc qua API `/api/app-version`.
* Cấu hình `minVersionCode` trong backend điều khiển phiên bản tối thiểu được phép sử dụng ứng dụng. Khi chạy test phiên bản mới (TestFlight/Internal test), cấu hình này cần đặt là `1` để tránh bị màn hình yêu cầu cập nhật chặn lại.

---

## Question Types (22 loại câu hỏi)

### Speaking (7)
* **RA** – SPEAKING_READ_ALOUD
* **RS** – SPEAKING_REPEAT_SENTENCE
* **DI** – SPEAKING_DESCRIBE_IMAGE
* **RL** – SPEAKING_RETELL_LECTURE
* **ASQ** – SPEAKING_ANSWER_SHORT_QUESTION
* **SGD** – SPEAKING_SUMMARISE_GROUP_DISCUSSION
* **RASA** – SPEAKING_RESPOND_TO_SITUATION

### Writing (2)
* **SWT** – WRITING_SUMMARIZE_WRITTEN_TEXT
* **WE** – WRITING_ESSAY

### Reading (5)
* **RWFIB** – READING_FIB_R_W
* **RMA** – READING_MCQ_MULTIPLE_ANSWER
* **ROP** – READING_RE_ORDER_PARAGRAPH
* **RFIB** – READING_FIB_R
* **RSA** – READING_MCQ_SINGLE_ANSWER

### Listening (8)
* **SST** – LISTENING_SUMMARIZE_SPOKEN_TEXT
* **LMA** – LISTENING_MCQ_MULTIPLE_ANSWER
* **LFIB** – LISTENING_FIB_L
* **HCS** – LISTENING_HIGHLIGHT_CORRECT_SUMMARY
* **LSA** – LISTENING_MCQ_SINGLE_ANSWER
* **SMW** – LISTENING_SELECT_MISSING_WORD
* **HIW** – LISTENING_HIGHLIGHT_INCORRECT_WORD
* **WFD** – LISTENING_DICTATION
