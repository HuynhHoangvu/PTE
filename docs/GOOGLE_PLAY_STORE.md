# Hướng dẫn đưa Fly PTE lên Google Play (CH Play)

Tài liệu này mô tả luồng từ code hiện tại (React + Vite + Capacitor) tới bản **AAB** trên Play Console.

## Tiếp tục ngay — Internal testing (thứ tự làm)

1. **Backend Railway:** `FRONTEND_URL` gồm domain web Play Store / Railway (ví dụ `https://flypte.up.railway.app`) và (tuỳ chọn) `http://localhost:5173`. Code đã thêm origin WebView Capacitor (`https://localhost`, `capacitor://localhost`, …).
2. **Frontend build cho app:** trong `frontend/`, tạo file **`.env.production`** (không commit — đã có trong `.gitignore` gốc repo):
   - `VITE_API_BASE_URL=https://<host-backend-railway>` (HTTPS, **không** thêm `/api`).
   - `VITE_GOOGLE_CLIENT_ID=<cùng Web Client ID với backend GOOGLE_CLIENT_ID>` nếu dùng đăng nhập Google.
3. **Đồng bộ Android (bản gửi Play):** `npm run cap:sync:release` — script kiểm tra đã có `VITE_API_BASE_URL` (tránh lỗi API trỏ tới `/api` trong WebView).  
   Đồng bộ nhanh không kiểm tra: `npm run cap:sync` (chỉ dùng khi bạn chắc env đã đúng).
4. **Android Studio:** `npm run cap:open` → **Build → Generate Signed App Bundle** → tạo/chọn keystore → xuất file **`.aab`**.
5. **[Play Console](https://play.google.com/console):** Tạo app (nếu chưa) → **Testing → Internal testing** → tạo release → tải AAB → thêm Gmail tester → gửi link cài nội bộ.
6. **Store listing (có thể làm song song):** Chính sách quyền riêng tư (URL), **Data safety**, ảnh màn hình, icon 512×512, mô tả — xem mục 4 dưới.

Sau khi internal ổn → closed/open testing → production.

## Kiến trúc nhanh

- **Web UI:** `Fly_PTE/frontend` — build ra `dist/`.
- **Capacitor:** bọc WebView, project native ở `Fly_PTE/frontend/android/`.
- **API:** NestJS `Fly_PTE/backend` — prefix toàn cục `api` (ví dụ `https://your-api.com/api/auth/login`).
- **App gọi API:** biến `VITE_API_BASE_URL` trỏ tới host API (không kèm `/api`); axios dùng `${VITE_API_BASE_URL}/api`.

## Luồng đề xuất: test mobile UI trước, rồi mới đẩy CH Play

Làm lần lượt; mỗi bước bắt lỗi sớm hơn bước sau.

### Bước A — Web trên máy tính (nhanh, không build app)

1. Mở frontend đã deploy (ví dụ `https://flypte.up.railway.app`) hoặc `npm run dev` local.
2. Chrome: **F12 → biểu tượng điện thoại (Toggle device toolbar)** — chọn iPhone / Pixel, xoay ngang.
3. Kiểm tra: menu hamburger, dashboard, skill, làm 1 câu (đặc biệt Speaking nếu có quyền mic trên desktop).

### Bước B — Trình duyệt trên điện thoại thật (Safari / Chrome)

1. Mở đúng URL production trên điện thoại (HTTPS).
2. Thử đăng nhập, cuộn dài, bàn phím ảo (Writing), mic (Speaking — trình duyệt sẽ hỏi quyền).
3. So với bước A: cảm giác chạm, kích thước nút, thanh dưới (nếu có) không che nội dung.

### Bước C — App Android thật (Capacitor), chưa cần Play Store

Đây là cách gần với trải nghiệm app store nhất.

1. Tạo `frontend/.env.production` với `VITE_API_BASE_URL=https://<host-backend-railway-khong-co-path-api>` (ví dụ `https://backend-production-xxx.up.railway.app`).
2. Trong `frontend`: `npm run cap:sync`.
3. Cài **Android Studio**, mở: `npm run cap:open`.
4. Cắm điện thoại bật **USB debugging** *hoặc* tạo **AVD** (máy ảo).
5. Trong Android Studio: chọn thiết bị → nút **Run** (tam giác xanh) để cài bản debug lên máy.
6. Trên máy: mở app **Fly PTE**, test đăng nhập, API Railway, mic, v.v.

Nếu chỉ cần file cài nhanh không qua Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)** rồi chép `.apk` sang máy cài (debug), vẫn nên test **AAB** trước khi lên Play.

### Bước D — Gần giống người dùng CH Play: Internal testing

1. Tạo **AAB đã ký** (mục 3 dưới đây).
2. Play Console → **Internal testing** → tải AAB → thêm Gmail tester.
3. Tester nhận link Play để cài bản nội bộ (giống store, nhưng chỉ nhóm được mời).

Khi B–D đều ổn thì mới nên mở **Production**.

## 1. Chuẩn bị backend production

1. Deploy backend lên HTTPS (Railway, VPS, v.v.).
2. Trong `.env` backend:
   - `FRONTEND_URL`: danh sách origin web (phân tách dấu phẩy), ví dụ `https://app.yourdomain.com,http://localhost:5173`.
   - CORS đã gộp thêm origin WebView Capacitor: `https://localhost`, `http://localhost`, `capacitor://localhost` (trong code `main.ts`).
3. Kiểm tra từ máy: `curl https://your-api.com/` → `OK`.

## 2. Build frontend cho Android

Trong thư mục `Fly_PTE/frontend`:

1. Tạo file `.env.production` (không commit secret không cần thiết; có thể dùng CI secrets):

   ```env
   VITE_API_BASE_URL=https://your-api-host.com
   ```

2. Build và đồng bộ web vào Android:

   ```bash
   npm run cap:sync
   ```

   Hoặc tách bước: `npm run build` rồi `npx cap sync android`.

3. Mở Android Studio:

   ```bash
   npm run cap:open
   ```

## 3. Ký bản build (Play App Signing)

1. Trong Android Studio: **Build → Generate Signed App Bundle / APK**.
2. Chọn **Android App Bundle (.aab)**.
3. Tạo hoặc dùng keystore (upload key). Lưu file `.jks` và mật khẩu ở nơi an toàn.
4. Play Console khuyên dùng **Play App Signing** (Google giữ key production).

## 4. Google Play Console

1. Đăng ký [Google Play Console](https://play.google.com/console) (phí một lần theo khu vực).
2. **Tạo ứng dụng mới** — tên hiển thị, ngôn ngữ mặc định, loại ứng dụng (ứng dụng / trò chơi), miễn phí hay trả phí.
3. Điền **Chính sách quyền riêng tư** (URL công khai).
4. **An toàn dữ liệu (Data safety):** khai báo dữ liệu thu thập (email, mật khẩu hash, token, v.v.).
5. **Nội dung cửa hàng:** mô tả ngắn/dài, ảnh chụp màn hình (đủ kích thước yêu cầu), biểu tượng 512×512, graphic tính năng nếu cần.
6. **Kiểm thử nội bộ (Internal testing):** tạo track, tải **AAB** lên, thêm tester bằng email hoặc nhóm Google.
7. Sau khi ổn định: **Closed/Open testing** rồi **Production**.

## 5. Thông tin kỹ thuật app (đã cấu hình trong repo)

| Mục | Giá trị |
|-----|---------|
| Application ID (có thể đổi trước khi publish) | `com.flyedu.pte` — sửa trong `frontend/capacitor.config.ts` rồi `npx cap sync android` |
| Tên app | `Fly PTE` |
| `webDir` | `dist` |
| Quyền Android | `INTERNET`, `RECORD_AUDIO` (Speaking / mic) |

Đổi `appId`: chỉnh `capacitor.config.ts`, chạy `npx cap sync android`, kiểm tra `android/app/build.gradle` (`applicationId`).

## 6. Checklist trước khi nộp production

- Đã qua ít nhất **Bước B** hoặc **C** trên điện thoại thật.
- Đăng nhập, vài skill, **Speaking** (mic), **Writing** (bàn phím), **Mock test** một vòng.
- Bản release dùng đúng `VITE_API_BASE_URL` production (không trỏ `localhost`).
- (Tuỳ chọn nhưng nên có) Một vòng **Internal testing** (Bước D) với AAB.

## 7. Lệnh npm hữu ích

| Lệnh | Mục đích |
|------|----------|
| `npm run dev` | Dev web, proxy `/api` |
| `npm run build` | Chỉ build `dist/` |
| `npm run cap:sync` | Build + `cap sync android` |
| `npm run cap:sync:release` | Kiểm tra `.env.production` / env → build + sync (dùng trước khi ký AAB) |
| `npm run cap:open` | Mở project trong Android Studio |

## 8. Gỡ lỗi thường gặp

- **`Unable to launch Android Studio. Is it installed?`:** Capacitor không tìm thấy Studio.
  1. Cài [Android Studio](https://developer.android.com/studio) (Windows: bật **Android SDK** trong trình cài).
  2. **Không cần** `npm run cap:open` nếu bạn mở tay: Android Studio → **File → Open** → chọn thư mục **`Fly_PTE/frontend/android`** (đúng folder có `build.gradle`, không phải `frontend` gốc).
  3. Nếu đã cài mà `cap open` vẫn lỗi: đặt biến môi trường trỏ tới file **`studio64.exe`**, ví dụ PowerShell (chỉnh đường dẫn nếu máy bạn khác):
     ```powershell
     $env:CAPACITOR_ANDROID_STUDIO_PATH = "C:\Program Files\Android\Android Studio\bin\studio64.exe"
     npm run cap:open
     ```
     Hoặc bản cài theo user: `%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe`.
  4. Có thể thêm `CAPACITOR_ANDROID_STUDIO_PATH` vào **Biến môi trường người dùng** (Windows) để khỏi set mỗi lần.
- **401 / CORS trên app:** kiểm tra `VITE_API_BASE_URL`, backend chạy HTTPS, `FRONTEND_URL` có domain web; Capacitor origins đã có trong backend.
- **Trắng màn hình sau cài:** kiểm tra `vite` `base: './'` và chạy lại `npm run build` + `cap sync`.
- **Mic không hoạt động:** đã thêm `RECORD_AUDIO`; trên thiết bị cấp quyền khi hệ thống hỏi.

## 9. Tuỳ chọn sau này

- `@capacitor/splash-screen`, `@capacitor/status-bar` để đồng bộ splash/status với brand.
- Tăng `versionCode` / `versionName` trong `android/app/build.gradle` mỗi lần gửi bản mới lên Play.

---

Cập nhật theo trạng thái repo: Capacitor 6, Android project trong `frontend/android/`.
