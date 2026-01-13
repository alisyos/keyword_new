# GPTKOREA 키워드 분석 서비스

## 프로젝트 개요
네이버 검색 API와 OpenAI GPT를 활용한 키워드 분석 및 마케팅 인사이트 도출 서비스

## 기술 스택
- **Framework**: Next.js 13.4.4 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4.1
- **Deployment**: Render

---

## 디렉토리 구조

```
keyword_new/
├── pages/
│   ├── api/                    # API 라우트
│   │   ├── keyword-analysis.ts   # 키워드 분석 API
│   │   ├── keyword-expansion.ts  # 키워드 확장 API (네이버 광고 API)
│   │   ├── ad-analysis.ts        # 광고 분석 API (이미지/텍스트)
│   │   ├── integrated-report.ts  # 종합 리포트 생성 API
│   │   ├── analyze-keywords.ts   # GPT 키워드 분석
│   │   ├── generate-ad-suggestions.ts
│   │   ├── convert-to-excel.ts   # 엑셀 다운로드
│   │   └── search.ts             # 네이버 검색 API
│   ├── index.tsx                 # 메인 (키워드 분석)
│   ├── keyword-expansion.tsx     # 키워드 확장 페이지
│   ├── ad-analysis.tsx           # 광고 분석 페이지
│   ├── integrated-analysis.tsx   # 통합 분석 페이지
│   └── _app.tsx
├── components/
│   └── Navbar.tsx               # 네비게이션 바
├── types/
│   └── integrated-analysis.ts   # 통합 분석 타입 정의
├── styles/
│   └── globals.css
└── tmp/                         # 임시 파일 (이미지 업로드)
```

---

## 주요 페이지

### 1. 키워드 분석 (`/`)
- 네이버 블로그, 카페, 뉴스, 유튜브 콘텐츠 수집
- 키워드 빈도 분석
- 감성 분석 (긍정/부정/중립)
- GPT 기반 AI 분석

### 2. 키워드 확장 (`/keyword-expansion`)
- 네이버 광고 API 연동
- 연관 키워드 조회
- PC/모바일 검색량, CTR, 경쟁도 표시
- 정렬 및 엑셀 다운로드 기능

### 3. 광고 분석 (`/ad-analysis`)
- **이미지 모드**: 광고 스크린샷 업로드 후 GPT Vision 분석
- **텍스트 모드**: 광고 검색결과 텍스트 붙여넣기 후 분석
- 자사 광고 순위 확인
- 경쟁사 광고 분석
- 광고 카피 개선 제안

### 4. 통합 분석 (`/integrated-analysis`) - 신규
5단계 위저드 형식으로 3개 페이지 기능 통합:

| 단계 | 기능 | 설명 |
|------|------|------|
| Step 1 | 키워드 입력 | 분석 키워드 + 업체명 입력 |
| Step 2 | 키워드 확장 | 연관 키워드 및 검색량 분석 |
| Step 3 | 콘텐츠 분석 | 채널별 (블로그/카페/유튜브/뉴스) 감성 분석 |
| Step 4 | 광고 분석 | 경쟁 광고 분석 (선택) |
| Step 5 | 종합 리포트 | GPT 기반 마케팅 리포트 생성 |

#### 종합 리포트 구조 (6개 섹션)
1. 소비자 인식 종합 분석
2. 채널별 소비자 반응
3. 시장 환경 분석
4. 핵심 마케팅 인사이트
5. 실행 가능한 마케팅 전략
6. 종합 결론

---

## 통합 분석 페이지 주요 기능

### 단계 표시기 (Step Indicator)
- 5단계 진행 상황 시각화
- **클릭 네비게이션**: 완료된 단계 또는 현재 단계 클릭 시 이동
- 호버 시 scale 효과, 미완료 단계는 비활성화 표시

### 재분석 기능
각 단계에서 "다시 분석" 버튼으로 해당 단계 데이터 재생성 가능:

| 단계 | 버튼 | 동작 |
|------|------|------|
| Step 2 | ↻ 다시 분석 | 키워드 확장 재실행 + Step 3~5 리셋 |
| Step 3 | ↻ 다시 분석 | 콘텐츠 분석 재실행 + Step 4~5 리셋 |
| Step 4 | ↻ 다시 분석 | 광고 입력 UI로 복귀 + Step 5 리셋 |
| Step 5 | ↻ 리포트 재생성 | 종합 리포트 재생성 |

### 키워드 변경 시 자동 리셋
- Step 1에서 키워드 변경 시 Step 2~5 데이터 자동 초기화
- `resetFromStep(fromStep)` 함수로 특정 단계 이후 데이터 리셋
- `completedSteps` 배열에서 해당 단계 제거

---

## API 엔드포인트

### `/api/keyword-analysis` (POST)
```typescript
// Request
{ keyword: string, contentType: 'blog' | 'cafe' | 'youtube' | 'news' }

// Response
{ keywords: KeywordData[], sentiment: SentimentData, contentItems: ContentItem[] }
```

### `/api/keyword-expansion` (POST)
```typescript
// Request
{ keyword: string }

// Response
{ data: { keyword: string, keywordList: KeywordExpansionData[] } }
```

### `/api/ad-analysis` (POST, multipart/form-data)
```typescript
// Request
{
  keyword: string,
  companyName: string,
  inputMode: 'image' | 'text',
  image?: File,        // inputMode === 'image'
  adText?: string      // inputMode === 'text'
}

// Response
{ ourAd: {...}, competitorAnalysis: string, adSuggestions: [...] }
```

### `/api/integrated-report` (POST)
```typescript
// Request
{
  keyword: string,
  companyName?: string,
  keywordExpansion: KeywordExpansionResult,
  contentAnalysis: { blog?: ..., cafe?: ..., youtube?: ..., news?: ... },
  adAnalysis?: AdAnalysisResult
}

// Response
{ report: IntegratedReportData }
```

---

## 타입 정의 (`types/integrated-analysis.ts`)

### 주요 타입
```typescript
type WizardStep = 1 | 2 | 3 | 4 | 5;
type ContentType = 'blog' | 'cafe' | 'youtube' | 'news';

interface IntegratedAnalysisState {
  keyword: string;
  companyName: string;
  keywordExpansion: KeywordExpansionResult | null;
  contentAnalysis: { blog: ..., cafe: ..., youtube: ..., news: ... };
  adAnalysis: AdAnalysisResult | null;
  integratedReport: IntegratedReportData | null;
  // ... loading states
}

interface IntegratedReportData {
  generatedAt: string;
  keyword: string;
  sections: {
    consumerPerception: {...},
    channelAnalysis: {...},
    marketEnvironment: {...},
    marketingInsights: {...},
    actionableStrategies: {...},
    conclusion: {...}
  }
}
```

---

## 환경 변수

```env
# .env.local
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx
NAVER_AD_API_KEY=xxx
NAVER_AD_SECRET_KEY=xxx
NAVER_AD_CUSTOMER_ID=xxx
OPENAI_API_KEY=xxx
```

---

## 개발 및 배포

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

### Render 배포 설정 (`render.yaml`)
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

---

## 최근 업데이트 이력

### 2025-01-13
- **광고 분석 페이지**: 텍스트 붙여넣기 모드 추가 (기존 이미지 업로드 + 텍스트 입력 선택)
- **통합 분석 페이지 신규**: 키워드 분석 + 키워드 확장 + 광고 분석 통합
- **5단계 위저드**: Step 5 "종합 리포트" 추가, 클릭 네비게이션 기능
- **재분석 기능**: 각 단계별 "다시 분석" 버튼, 키워드 변경 시 하위 단계 자동 리셋
