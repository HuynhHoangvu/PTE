## Android release config for Google Play

1. Create upload keystore (one-time):
   - `keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`
2. Put `upload-keystore.jks` inside `frontend/`.
3. Copy `android/key.properties.example` to `android/key.properties` and update real passwords.
4. Build AAB (skip test/lint):
   - `npm run android:aab:release`
5. Output file:
   - `android/app/build/outputs/bundle/release/app-release.aab`

Optional version override:
- `cd android && gradlew bundleRelease -PVERSION_CODE=2 -PVERSION_NAME=1.0.1 -x test -x lint`
