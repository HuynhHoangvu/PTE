# ✈️ Fly-Edu – PTE Academic Practice Platform

Full-stack hệ thống ôn luyện PTE Academic với AI Scoring.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeScript + TypeORM |
| Database | PostgreSQL |
| Frontend | Vite + React + TypeScript + TailwindCSS |
| State | Zustand + TanStack Query |
| AI Scoring | OpenAI GPT-4o-mini + Whisper |
| Auth | JWT + Passport |

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

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## API Endpoints

### Auth
- `POST /api/auth/register` – Đăng ký
- `POST /api/auth/login` – Đăng nhập
- `GET /api/auth/me` – Lấy thông tin user hiện tại

### Questions
- `GET /api/questions?skill=SPEAKING&type=SPEAKING_READ_ALOUD&page=1&limit=50`
- `GET /api/questions/:id`
- `GET /api/questions/skill/:skill/progress`
- `GET /api/questions/:code/adjacent?direction=next&type=SPEAKING_READ_ALOUD`

### Attempts (AI Scoring)
- `POST /api/attempts/speaking` – Submit audio (multipart/form-data)
- `POST /api/attempts/text` – Submit text/MC/FIB answers
- `GET /api/attempts/:id/score` – Poll for AI score result
- `GET /api/attempts/question/:questionId` – Lịch sử của 1 câu hỏi

### Mock Tests
- `GET /api/mock-tests` – Danh sách mock tests
- `POST /api/mock-tests/:id/start` – Bắt đầu thi
- `PATCH /api/mock-tests/attempts/:attemptId/progress` – Lưu tiến độ
- `POST /api/mock-tests/attempts/:attemptId/submit` – Nộp bài

### Users
- `GET /api/users/stats` – Thống kê cá nhân
- `GET /api/users/leaderboard`

## Question Types (22 loại)

### Speaking (7)
| Code | Type |
|------|------|
| RA | SPEAKING_READ_ALOUD |
| RS | SPEAKING_REPEAT_SENTENCE |
| DI | SPEAKING_DESCRIBE_IMAGE |
| RL | SPEAKING_RETELL_LECTURE |
| ASQ | SPEAKING_ANSWER_SHORT_QUESTION |
| SGD | SPEAKING_SUMMARISE_GROUP_DISCUSSION |
| RASA | SPEAKING_RESPOND_TO_SITUATION |

### Writing (2)
| SWT | WRITING_SUMMARIZE_WRITTEN_TEXT |
| WE | WRITING_ESSAY |

### Reading (5)
| RWFIB | READING_FIB_R_W |
| RMA | READING_MCQ_MULTIPLE_ANSWER |
| ROP | READING_RE_ORDER_PARAGRAPH |
| RFIB | READING_FIB_R |
| RSA | READING_MCQ_SINGLE_ANSWER |

### Listening (8)
| SST | LISTENING_SUMMARIZE_SPOKEN_TEXT |
| LMA | LISTENING_MCQ_MULTIPLE_ANSWER |
| LFIB | LISTENING_FIB_L |
| HCS | LISTENING_HIGHLIGHT_CORRECT_SUMMARY |
| LSA | LISTENING_MCQ_SINGLE_ANSWER |
| SMW | LISTENING_SELECT_MISSING_WORD |
| HIW | LISTENING_HIGHLIGHT_INCORRECT_WORD |
| WFD | LISTENING_DICTATION |

## Project Structure

```
fly-edu/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT Auth
│   │   ├── users/          # User management
│   │   ├── questions/      # Question CRUD
│   │   ├── attempts/       # Practice attempts + audio upload
│   │   ├── mock-test/      # Mock test sessions
│   │   ├── ai-scoring/     # OpenAI GPT + Whisper integration
│   │   └── common/         # Guards, decorators
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/            # Axios API client
    │   ├── components/
    │   │   ├── ui/         # Button, Badge, AudioPlayer, Waveform, ScorePanel...
    │   │   ├── layout/     # Sidebar, MainLayout
    │   │   └── practice/   # PracticeLayout, all QuestionTypes
    │   ├── hooks/          # useRecorder, useTimer
    │   ├── pages/
    │   │   ├── auth/       # Login, Register
    │   │   ├── DashboardPage.tsx
    │   │   ├── SkillPage.tsx
    │   │   ├── QuestionPage.tsx
    │   │   └── MockTestPage.tsx
    │   ├── stores/         # Zustand auth store
    │   └── types/          # TypeScript types
    └── package.json
```

## Seed Data

Để thêm câu hỏi mẫu, gọi API:
```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "RA0002",
    "skill": "SPEAKING",
    "type": "SPEAKING_READ_ALOUD",
    "title": "Major Conclusion",
    "content": "Our major conclusion is that the current measure needs to be revised...",
    "level": "Easy",
    "isTrending": true,
    "isRepeated": false,
    "prepTime": 40,
    "responseTime": 40
  }'
```

## Brand Colors

| Name | Hex |
|------|-----|
| Yellow | `#F5C518` |
| Yellow Deep | `#D4A600` |
| Orange | `#FF6B1A` |
| Black | `#0E0E0E` |

## Features

- ✅ Auth (Register/Login/JWT)
- ✅ 22 question types với UI riêng biệt
- ✅ AI Scoring qua OpenAI GPT-4o-mini
- ✅ Speech-to-text qua Whisper
- ✅ Audio recording trong browser
- ✅ Progress tracking per skill/type
- ✅ Mock Test với timer 3h
- ✅ Question list drawer với filter/search
- ✅ Analysis table (lịch sử attempt)
- ✅ Streak tracking
- ✅ Responsive sidebar
- ✅ Yellow/Black/Orange brand theme
