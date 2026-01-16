# 키워드 통합 분석 페이지 개발 명세서

## 개요
키워드 분석, 키워드 확장, 콘텐츠 감성 분석, 광고 분석을 통합하여 5단계 위저드 형태로 종합 마케팅 리포트를 생성하는 페이지입니다.

---

## 1. 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 13.4.4 (Pages Router) |
| Language | TypeScript 5.1.3 |
| Styling | Tailwind CSS 3.3.2 |
| AI | OpenAI GPT-4.1 (gpt-4.1) |
| PPT 생성 | pptxgenjs 4.0.1 |
| HTTP Client | axios 1.6.8 |
| Form 처리 | formidable 2.1.1 |
| Excel | xlsx 0.18.5 |

---

## 2. 필수 환경 변수

```env
# OpenAI API
OPENAI_API_KEY=sk-xxxx

# 네이버 검색 API (블로그, 카페, 뉴스 콘텐츠 수집용)
NAVER_CLIENT_ID=xxxx
NAVER_CLIENT_SECRET=xxxx

# 네이버 광고 API (키워드 확장용)
NAVER_API_KEY=xxxx
NAVER_SECRET_KEY=xxxx
NAVER_CUSTOMER_ID=xxxx

# YouTube API (유튜브 콘텐츠 수집용)
YOUTUBE_API_KEY=xxxx
```

---

## 3. 디렉토리 구조

```
/pages
  /api
    keyword-expansion.ts          # Step 2: 키워드 확장 API
    keyword-expansion-analysis.ts # Step 2: 키워드 확장 GPT 분석
    keyword-analysis.ts           # Step 3: 콘텐츠 분석 API
    ad-analysis.ts                # Step 4: 광고 분석 API
    integrated-report.ts          # Step 5: 종합 리포트 생성
    generate-ppt.ts               # PPT 다운로드 API
  integrated-analysis.tsx         # 통합 분석 메인 페이지
/types
  integrated-analysis.ts          # 타입 정의
/tmp                              # 이미지 업로드 임시 폴더
```

---

## 4. 페이지 플로우 (5단계 위저드)

```
[Step 1] 키워드 입력
    ↓
[Step 2] 키워드 확장 분석
    ↓
[Step 3] 콘텐츠 분석 (채널별)
    ↓
[Step 4] 광고 분석 (선택)
    ↓
[Step 5] 종합 리포트 + PPT 다운로드
```

---

## 5. API 명세

### 5.1 키워드 확장 API

**Endpoint:** `POST /api/keyword-expansion`

**Request:**
```typescript
{
  keyword: string  // 분석할 키워드
}
```

**Response:**
```typescript
{
  message: string,
  data: {
    keyword: string,
    timestamp: string,
    status: 'success',
    keywordList: Array<{
      relKeyword: string,         // 연관 키워드
      monthlyPcQcCnt: string,     // 월간 PC 검색량 (숫자 또는 "< 10")
      monthlyMobileQcCnt: string, // 월간 모바일 검색량
      monthlyAvePcClkCnt: string, // 월간 평균 PC 클릭수
      monthlyAveMobileClkCnt: string,
      monthlyAvePcCtr: string,    // PC CTR (%)
      monthlyAveMobileCtr: string,
      plAvgDepth: string,         // 평균 광고 노출 깊이
      compIdx: string             // 경쟁도 ("높음" | "중간" | "낮음")
    }>
  }
}
```

**외부 API:** 네이버 광고 API (https://api.searchad.naver.com/keywordstool)

**인증 방식:**
```typescript
// HMAC-SHA256 서명 생성
const generateSignature = (secretKey: string, timestamp: string, method: string, uri: string) => {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
};

// 헤더
headers: {
  'X-Timestamp': timestamp,
  'X-API-KEY': apiKey,
  'X-Customer': customerId,
  'X-Signature': signature,
  'Content-Type': 'application/json'
}
```

---

### 5.2 키워드 확장 GPT 분석 API

**Endpoint:** `POST /api/keyword-expansion-analysis`

**Request:**
```typescript
{
  keyword: string,
  keywordExpansion: KeywordExpansionResult
}
```

**Response:**
```typescript
{
  analysis: {
    searchVolumeAnalysis: string,    // 1. 검색량(수요) 분석
    engagementAnalysis: string,      // 2. 클릭수 및 클릭율 분석
    competitionAnalysis: string,     // 3. 경쟁강도 분석
    consumerTrendAnalysis: string,   // 4. 소비자 인식 및 행동 트렌드
    conclusion: string               // 5. 결론 및 마케팅 시사점
  }
}
```

**GPT 프롬프트:**
- System: "당신은 마케팅 데이터 분석가입니다. 키워드 데이터를 분석하여 간결한 인사이트를 제공합니다."
- 각 항목은 2-3문장으로 작성
- response_format: { type: 'json_object' }
- max_tokens: 1500

---

### 5.3 콘텐츠 분석 API

**Endpoint:** `POST /api/keyword-analysis`

**Request:**
```typescript
{
  keyword: string,
  contentType: 'blog' | 'cafe' | 'youtube' | 'news'
}
```

**Response:**
```typescript
{
  keywords: Array<{
    keyword: string,
    frequency: number
  }>,
  sentiment: {
    positive: number,   // 0-100%
    negative: number,
    neutral: number,
    positiveKeywords: Array<{ keyword: string, score: number }>,
    negativeKeywords: Array<{ keyword: string, score: number }>
  },
  contentType: string,
  contentItems: Array<{
    title: string,
    link: string,
    description: string,
    sentiment: 'positive' | 'negative' | 'neutral',
    score: number,        // 0.0 ~ 1.0
    publishedAt?: string  // ISO 8601
  }>
}
```

**외부 API:**
- 블로그: https://openapi.naver.com/v1/search/blog.json
- 카페: https://openapi.naver.com/v1/search/cafearticle.json
- 뉴스: https://openapi.naver.com/v1/search/news.json
- 유튜브: https://www.googleapis.com/youtube/v3/search

**처리 흐름:**
1. 채널별 API로 콘텐츠 30개 수집 (display=30)
2. 키워드 빈도 분석 (불용어 제거 후 상위 10개)
3. GPT로 전체 감성 분석 (긍정/부정/중립 비율)
4. GPT로 개별 콘텐츠 감성 분석 (각 콘텐츠별 긍정/부정/중립)

---

### 5.4 광고 분석 API

**Endpoint:** `POST /api/ad-analysis`

**Content-Type:** multipart/form-data (bodyParser 비활성화)

**Request:**
```typescript
{
  keyword: string,
  companyName: string,
  inputMode: 'image' | 'text',
  image?: File,   // inputMode === 'image'인 경우
  adText?: string // inputMode === 'text'인 경우
}
```

**Response:**
```typescript
{
  ourAd: {
    rank: number,  // 광고 순위 (0이면 미노출)
    evaluation: {
      title: string,       // 제목 평가
      description: string  // 설명 평가
    }
  },
  competitorAnalysis: string,  // 경쟁사 분석 (줄바꿈으로 구분)
  adSuggestions: Array<{
    title: string,
    description: string,
    improvementPoints: string
  }>
}
```

**GPT 프롬프트 핵심:**
- 텍스트 모드: 광고 텍스트 분석 (favicon, 업체명, 도메인, 제목, 설명, 집행기간 순서 파악)
- 이미지 모드: GPT-4 Vision으로 스크린샷 분석
- 경쟁사 분석은 "1. [경쟁사명] - 분석내용\n2. [경쟁사명] - 분석내용" 형식

---

### 5.5 종합 리포트 생성 API

**Endpoint:** `POST /api/integrated-report`

**Request:**
```typescript
{
  keyword: string,
  companyName?: string,
  keywordExpansion: KeywordExpansionResult,
  contentAnalysis: {
    blog?: KeywordAnalysisResult,
    cafe?: KeywordAnalysisResult,
    youtube?: KeywordAnalysisResult,
    news?: KeywordAnalysisResult
  },
  adAnalysis?: AdAnalysisResult
}
```

**Response:**
```typescript
{
  report: IntegratedReportData
}
```

**IntegratedReportData 구조 (9개 섹션):**
```typescript
interface IntegratedReportData {
  generatedAt: string;
  keyword: string;
  companyName?: string;

  // 1. Executive Summary
  executiveSummary: {
    keyMetrics: Array<{
      label: string,
      value: string,
      description: string
    }>;  // 5개 핵심 지표
    winningFormula: string;
    marketOpportunity: string;
  };

  // 2. 3단계 소비자 인식 구조
  perceptionStages: {
    stage1_awareness: {
      title: string,
      insight: string,
      keywords: string[],
      metrics: string
    };
    stage2_comparison: {
      title: string,
      insight: string,
      keywords: string[],
      metrics: string
    };
    stage3_conversion: {
      title: string,
      insight: string,
      painPoints: string[],
      sentiment: string
    };
  };

  // 3. 핵심 키워드 맵
  keywordMap: {
    totalSearchVolume: string;
    topKeywords: Array<{
      rank: number,
      keyword: string,
      frequency: number
    }>;
    painPointKeywords: Array<{
      keyword: string,
      frequency: number
    }>;
    dataInsights: string[];
  };

  // 4. 채널별 소비자 반응
  channelBreakdown: Array<{
    channel: string,
    channelName: string,
    role: string,
    keyInterests: string[],
    strategy: string,
    sentimentBreakdown?: {
      positive: number,
      negative: number,
      neutral: number
    }
  }>;

  // 5. 시장 환경 분석
  marketEnvironment: {
    competitionAnalysis: {
      level: string,  // "높음" | "중간" | "낮음"
      insight: string,
      keyPlayers: string[]
    };
    digitalTrends: {
      mobileShare: string,
      contentFreshness: string,
      orgChanges: string[]
    };
  };

  // 6. 마케팅 인사이트 (4개)
  marketingInsights: Array<{
    id: number,
    title: string,
    painPoint: {
      label: string,
      details: string[]
    },
    opportunity: {
      label: string,
      details: string[]
    },
    action: string
  }>;

  // 7. 실행 전략 (5개)
  actionStrategies: Array<{
    id: number,
    title: string,
    subtitle: string,
    sections: Array<{
      heading: string,
      items: string[]
    }>,
    expectedMetrics?: Array<{
      label: string,
      value: string
    }>
  }>;

  // 8. 90일 액션플랜
  actionPlan: {
    keyFindings: string[];
    timeline: Array<{
      phase: 'NOW' | '30d' | '60d' | '90d',
      label: string,
      category: string,
      action: string
    }>;
  };

  // 9. 종합 결론
  conclusion: {
    summary: string,
    recommendations: string[]
  };
}
```

**GPT 프롬프트:**
- Model: gpt-4.1
- max_tokens: 8000
- response_format: { type: 'json_object' }
- System: "당신은 디지털 마케팅 전략 컨설턴트입니다..."
- 각 섹션별 상세 가이드라인 제공

**dataSummary 구조 (GPT에 전달되는 분석 데이터 요약):**

`buildDataSummary()` 함수가 생성하는 텍스트 요약으로, GPT 프롬프트의 컨텍스트로 사용됩니다.

```
## 키워드 확장 분석 데이터

### 검색량 개요
- 총 월간 검색량: {totalVolume}건
- 모바일 비중: {mobileShare}%
- 분석된 연관 키워드 수: {count}개

### 상위 연관 키워드 (검색량 기준) - 상위 20개
1. {keyword} - PC: {pcVol}, 모바일: {mobileVol}, CTR: {ctr}, 경쟁도: {compIdx}
...

### 경쟁도 분포
- 높음: {highComp}개 키워드 ({highPercent}%)
- 중간: {midComp}개 키워드 ({midPercent}%)
- 낮음: {lowComp}개 키워드 ({lowPercent}%)

### AI 분석 인사이트
- 검색량 분석: {searchVolumeAnalysis}
- 클릭율 분석: {engagementAnalysis}
- 경쟁강도 분석: {competitionAnalysis}
- 소비자 트렌드: {consumerTrendAnalysis}
- 결론: {conclusion}

## 채널별 콘텐츠 분석 데이터

### 블로그
- 감성 분석: 긍정 {positive}%, 중립 {neutral}%, 부정 {negative}%
- 긍정 키워드: {keyword}({score}), ...
- 부정 키워드: {keyword}({score}), ...
- 주요 키워드 (빈도순): {keyword}({frequency}), ...
- 분석된 콘텐츠 수: {count}개

### 카페 / 유튜브 / 뉴스
(동일 구조)

### 전체 채널 감성 평균
- 긍정: {avgPositive}%
- 중립: {avgNeutral}%
- 부정: {avgNegative}%

## 광고 분석 데이터 (선택)

### 자사 광고 현황
- 현재 순위: {rank}위 (또는 미노출)
- 제목 평가: {titleEvaluation}
- 설명 평가: {descEvaluation}

### 경쟁사 광고 분석
1. [경쟁사A] - 분석 내용
...

### 광고 개선 제안
1. 제안 제목 / 설명 / 개선포인트
...
```

---

### 5.6 PPT 생성 API

**Endpoint:** `POST /api/generate-ppt`

**Request:**
```typescript
{
  report: IntegratedReportData
}
```

**Response:** Binary PPT 파일
```
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="{keyword}_marketing_report.pptx"
```

**슬라이드 구성 (15+ 슬라이드):**
1. 표지
2. 목차
3. Executive Summary
4. 3단계 소비자 인식 구조
5. 핵심 키워드 맵
6. 채널별 소비자 반응
7. 시장 환경 분석
8-11. 마케팅 인사이트 (1개씩 4 슬라이드)
12-16. 실행 전략 (5개)
17. 90일 액션플랜
18. 종합 결론
19. Thank You

**pptxgenjs 설정:**
```typescript
const COLORS = {
  primary: '4F46E5',
  secondary: '7C3AED',
  accent: '059669',
  warning: 'D97706',
  danger: 'DC2626',
  success: '16A34A',
  dark: '1F2937',
  light: 'F3F4F6',
  white: 'FFFFFF',
  teal: '0D9488',
  cyan: '0891B2',
  orange: 'EA580C',
  pink: 'DB2777',
  slate: '475569',
};

// API config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
```

---

## 6. 프론트엔드 컴포넌트 구조

### 6.1 메인 상태 관리

```typescript
interface IntegratedAnalysisState {
  // Step 1
  keyword: string;
  companyName: string;

  // Step 2
  keywordExpansion: KeywordExpansionResult | null;
  keywordExpansionLoading: boolean;
  keywordExpansionGPTAnalysis: KeywordExpansionGPTAnalysis | null;
  keywordExpansionGPTLoading: boolean;

  // Step 3
  contentAnalysis: {
    blog: KeywordAnalysisResult | null;
    cafe: KeywordAnalysisResult | null;
    youtube: KeywordAnalysisResult | null;
    news: KeywordAnalysisResult | null;
  };
  contentAnalysisLoading: {
    blog: boolean;
    cafe: boolean;
    youtube: boolean;
    news: boolean;
  };
  selectedChannels: ContentType[];  // 기본값: 4개 모두

  // Step 4
  adAnalysis: AdAnalysisResult | null;
  adAnalysisLoading: boolean;
  skipAdAnalysis: boolean;
  adInputMode: 'image' | 'text';
  adText: string;

  // Step 5
  integratedReport: IntegratedReportData | null;
  reportLoading: boolean;
}
```

### 6.2 컴포넌트 목록

| 컴포넌트 | 역할 |
|---------|------|
| `LoadingModal` | 로딩 상태 모달 (어두운 배경 + 스피너 + 메시지) |
| `StepIndicator` | 5단계 진행 표시기 (클릭 네비게이션 지원) |
| `Step1KeywordInput` | 키워드/업체명 입력 폼 |
| `Step2KeywordExpansion` | 키워드 확장 결과 테이블 + GPT 분석 + AI 분석용 상위 20개 키워드 표시 |
| `Step3ContentAnalysis` | 채널별 콘텐츠 분석 결과 (탭 UI) + 감성 키워드 분석 + 콘텐츠 감성 뱃지 |
| `Step4AdAnalysis` | 광고 분석 (텍스트/이미지 입력 모드) |
| `IntegratedReport` | 종합 리포트 뷰 (9개 섹션 아코디언) |

### 6.3 단계 이동 로직

```typescript
// 단계 완료 조건
const canProceedToStep = {
  2: () => keyword.trim() !== '',
  3: () => keywordExpansion !== null,
  4: () => Object.values(contentAnalysis).some(Boolean),
  5: () => true  // Step 4는 건너뛰기 가능
};

// 재분석 시 하위 단계 리셋
const resetFromStep = (fromStep: WizardStep) => {
  if (fromStep <= 2) {
    // Step 3, 4, 5 데이터 리셋
    setContentAnalysis({ blog: null, cafe: null, youtube: null, news: null });
    setAdAnalysis(null);
    setIntegratedReport(null);
  }
  if (fromStep <= 3) {
    setAdAnalysis(null);
    setIntegratedReport(null);
  }
  if (fromStep <= 4) {
    setIntegratedReport(null);
  }
};
```

---

## 7. UI/UX 세부 사항

### 7.1 로딩 모달
```tsx
const LoadingModal = ({ isOpen, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};
```

### 7.2 로딩 메시지 매핑
| 상태 | 메시지 |
|------|--------|
| keywordExpansionLoading | "연관 키워드를 분석 중입니다..." |
| keywordExpansionGPTLoading | "AI가 키워드 데이터를 분석 중입니다..." |
| isAnyContentLoading | "채널별 콘텐츠를 분석 중입니다..." |
| adAnalysisLoading | "광고를 분석 중입니다..." |
| reportLoading | "종합 리포트를 생성 중입니다..." |

### 7.3 스타일링 규칙
- 그라데이션 버튼: `bg-gradient-to-r from-blue-600 to-indigo-600`
- 카드 헤더: 섹션별 색상 그라데이션 적용
- 감성 바: 긍정(green-500) / 중립(gray-400) / 부정(red-500)
- 경쟁도 배지: 높음(red) / 중간(yellow) / 낮음(green)

### 7.4 Step 3 콘텐츠 분석 UI

#### 감성 키워드 분석 섹션
감성 분석 바 아래에 GPT가 분석한 긍정/부정 키워드를 표시:
```tsx
{/* 긍정/부정 키워드 (좌우 2컬럼) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* 긍정 키워드 */}
  <div className="bg-green-50 rounded-lg p-4">
    <h4>● 긍정 키워드</h4>
    {positiveKeywords.slice(0, 5).map(kw => (
      <div>{kw.keyword} <span>{kw.score}/10</span></div>
    ))}
  </div>
  {/* 부정 키워드 */}
  <div className="bg-red-50 rounded-lg p-4">
    <h4>● 부정 키워드</h4>
    {negativeKeywords.slice(0, 5).map(kw => (
      <div>{kw.keyword} <span>{kw.score}/10</span></div>
    ))}
  </div>
</div>
```

#### 콘텐츠 목록 감성 뱃지
각 콘텐츠 항목에 텍스트 뱃지로 감성 표시:
```tsx
<span className={`text-xs font-medium px-1.5 py-0.5 rounded mr-2 ${
  sentiment === 'positive' ? 'bg-green-100 text-green-700'
  : sentiment === 'negative' ? 'bg-red-100 text-red-700'
  : 'bg-gray-100 text-gray-600'
}`}>
  {sentiment === 'positive' ? '긍정' : sentiment === 'negative' ? '부정' : '중립'}
</span>
```

**UI 미리보기:**
```
┌─────────────────────────────────────────────────┐
│ 분석된 콘텐츠 (30개)                              │
├─────────────────────────────────────────────────┤
│ [긍정] 제목1: 매우 만족스러운 경험이었습니다...      │
│ [긍정] 제목2: 가격 대비 괜찮은 품질...              │
│ [중립] 제목3: 보통 수준의 서비스입니다...           │
│ [부정] 제목4: 기대에 미치지 못했네요...             │
└─────────────────────────────────────────────────┘
```

---

## 8. 키워드 테이블 기능

### 8.1 정렬 기능
```typescript
const handleSort = (key: string) => {
  let direction = 'asc';
  if (sortConfig.key === key) {
    if (sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.direction === 'desc') direction = null;
  }
  setSortConfig({ key, direction });
};

// 경쟁도 정렬 시 매핑
const compMap = { '높음': 3, '중간': 2, '낮음': 1 };
```

### 8.2 전체보기 팝업
- 기본 화면: 상위 20개만 표시
- "전체보기" 버튼 클릭 시 모달로 전체 키워드 표시
- 모달 내 sticky 헤더 + 스크롤

---

## 9. 에러 처리

### 9.1 API 에러 코드
| 코드 | 의미 |
|------|------|
| 400 | 필수 파라미터 누락 |
| 405 | Method Not Allowed (POST만 허용) |
| 500 | 서버 내부 오류 |

### 9.2 프론트엔드 에러 처리
```typescript
try {
  const response = await axios.post('/api/keyword-expansion', { keyword });
  // 성공 처리
} catch (error) {
  console.error('키워드 확장 오류:', error);
  alert('키워드 확장 분석에 실패했습니다. 다시 시도해주세요.');
}
```

---

## 10. 구현 체크리스트

### Phase 1: 기본 구조
- [ ] 프로젝트 초기 설정 (Next.js + TypeScript + Tailwind)
- [ ] 환경 변수 설정
- [ ] 타입 정의 파일 생성 (`types/integrated-analysis.ts`)
- [ ] 임시 폴더 생성 스크립트 (`postinstall`)

### Phase 2: API 구현
- [ ] `/api/keyword-expansion` - 네이버 광고 API 연동
- [ ] `/api/keyword-expansion-analysis` - GPT 키워드 분석
- [ ] `/api/keyword-analysis` - 네이버/유튜브 콘텐츠 수집 + 감성 분석
- [ ] `/api/ad-analysis` - 광고 분석 (텍스트/이미지)
- [ ] `/api/integrated-report` - 종합 리포트 생성
- [ ] `/api/generate-ppt` - PPT 생성

### Phase 3: 프론트엔드 구현
- [ ] 페이지 레이아웃 (`integrated-analysis.tsx`)
- [ ] LoadingModal 컴포넌트
- [ ] StepIndicator 컴포넌트
- [ ] Step1KeywordInput 컴포넌트
- [ ] Step2KeywordExpansion 컴포넌트 (테이블 + 정렬 + 팝업 + AI 분석용 상위 20개 키워드 표시)
- [ ] Step3ContentAnalysis 컴포넌트 (탭 UI)
- [ ] Step4AdAnalysis 컴포넌트 (텍스트/이미지 모드)
- [ ] IntegratedReport 컴포넌트 (9개 섹션 아코디언)

### Phase 4: PPT 생성
- [ ] pptxgenjs 설정
- [ ] 표지/목차 슬라이드
- [ ] 각 섹션별 슬라이드 구현
- [ ] 다운로드 기능

### Phase 5: 테스트 및 최적화
- [ ] 각 API 엔드포인트 테스트
- [ ] 단계별 플로우 테스트
- [ ] 에러 케이스 처리
- [ ] 로딩 상태 UX 검증

---

## 11. 주의사항

1. **API 키 보안**: 모든 API 키는 서버 사이드에서만 사용 (클라이언트 노출 금지)
2. **GPT 비용 관리**: max_tokens 제한, 불필요한 호출 방지
3. **이미지 업로드**: tmp 폴더 정리, 파일 크기 제한 (10MB)
4. **네이버 API 호출 제한**: 일일 쿼터 확인
5. **PPT 생성 시간**: 리포트 데이터 크기에 따라 수 초 소요

---

## 12. 참고 자료

- 네이버 검색 API 문서: https://developers.naver.com/docs/serviceapi/search/
- 네이버 광고 API 문서: https://naver.github.io/searchad-apidoc/
- YouTube Data API 문서: https://developers.google.com/youtube/v3
- pptxgenjs 문서: https://gitbrent.github.io/PptxGenJS/
- OpenAI API 문서: https://platform.openai.com/docs/api-reference

---

## 13. GPT 시스템 프롬프트 전문

### 13.1 키워드 확장 GPT 분석 (`/api/keyword-expansion-analysis`)

**Model:** gpt-4.1
**Temperature:** 0.7
**max_tokens:** 1500
**response_format:** { type: 'json_object' }

**System Prompt:**
```
당신은 마케팅 데이터 분석가입니다. 키워드 데이터를 분석하여 간결한 인사이트를 제공합니다.
반드시 JSON 형식으로 응답하세요. 각 항목은 2-3문장으로 핵심만 작성하세요.
```

**User Prompt 템플릿:**
```
키워드: "{keyword}"
총 연관키워드: {count}개
총 검색량: {totalVolume}건 (모바일 {mobileShare}%)
경쟁도: 높음 {highComp}개, 중간 {midComp}개, 낮음 {lowComp}개

검색량 기준 상위 20개 키워드:
(PC+모바일 합계 검색량 내림차순 정렬)
1. {relKeyword} (검색량: {vol}, CTR: {ctr}, 경쟁: {compIdx})
...

위 데이터를 분석하여 다음 5개 항목을 각각 2-3문장으로 작성해주세요:

{
  "searchVolumeAnalysis": "검색량 분석 (수요 규모, 모바일/PC 비중 의미)",
  "engagementAnalysis": "클릭율 분석 (CTR 패턴, 구매의도 높은/낮은 키워드)",
  "competitionAnalysis": "경쟁강도 분석 (시장 경쟁 상황, 진입 전략)",
  "consumerTrendAnalysis": "소비자 트렌드 (검색 의도, 행동 패턴)",
  "conclusion": "결론 및 마케팅 시사점 (핵심 권고사항)"
}
```

---

### 13.2 콘텐츠 감성 분석 (`/api/keyword-analysis`)

#### 13.2.1 전체 감성 비율 분석

**Model:** gpt-4.1
**response_format:** { type: 'json_object' }

**System Prompt:**
```
당신은 텍스트의 감정을 분석하는 전문가입니다. 주어진 텍스트에서 다음 정보를 추출해주세요:
1. 긍정적, 부정적, 중립적 감정의 비율(%)
2. 가장 빈번한 긍정적 키워드 5개와 그 점수(1-10)
3. 가장 빈번한 부정적 키워드 5개와 그 점수(1-10)

응답은 다음 JSON 형식으로 제공해주세요:
{
  "positive": 숫자,
  "negative": 숫자,
  "neutral": 숫자,
  "positiveKeywords": [{"keyword": "단어", "score": 숫자}, ...],
  "negativeKeywords": [{"keyword": "단어", "score": 숫자}, ...]
}

숫자만 제공하고 설명은 하지 마세요.
```

#### 13.2.2 개별 콘텐츠 감성 분석

**Model:** gpt-4.1
**Temperature:** 0.2

**System Prompt:**
```
당신은 텍스트의 감정을 분석하는 전문가입니다. 여러 텍스트를 분석하여 각각의 감정(긍정/부정/중립)과 그 강도를 평가해주세요.
```

**User Prompt 템플릿:**
```
다음은 {count}개의 컨텐츠 항목입니다. 각 항목에 대해 감정 분석을 수행하고 JSON 배열 형식으로 결과를 반환해주세요.
각 항목은 "positive"(긍정), "negative"(부정), "neutral"(중립) 중 하나의 감정으로 분류하고, 0.0에서 1.0 사이의 점수로 그 강도를 표시해주세요.
점수가 높을수록 해당 감정이 강하게 표현된 것입니다.

반환 형식:
[
  {"index": 0, "sentiment": "positive", "score": 0.8},
  {"index": 1, "sentiment": "negative", "score": 0.7},
  {"index": 2, "sentiment": "neutral", "score": 0.5},
  ...
]

분석할 컨텐츠:
[0] 제목: {title}
내용: {description}
...
```

---

### 13.3 광고 분석 (`/api/ad-analysis`)

#### 13.3.1 텍스트 모드

**Model:** gpt-4.1
**max_tokens:** 1500

**System Prompt:**
```
당신은 검색 광고 텍스트 분석 전문가입니다.
사용자가 제공한 검색 광고 결과 텍스트에서 광고를 식별하고, 특정 업체('{companyName}')의 광고를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

{
  "ourAd": {
    "rank": 숫자 (해당 업체의 광고 순위, 없으면 0),
    "evaluation": {
      "title": "광고 제목에 대한 평가",
      "description": "광고 설명에 대한 평가"
    }
  },
  "competitorAnalysis": "경쟁사 광고에 대한 넘버링된 분석. '1. [경쟁사명] - 분석내용\n2. [경쟁사명] - 분석내용\n3. [경쟁사명] - 분석내용' 형식으로 최소 3개 이상의 경쟁사 광고를 포함해 분석해주세요.",
  "adSuggestions": [
    {
      "title": "제안 광고 제목 1",
      "description": "제안 광고 설명 1",
      "improvementPoints": "개선 포인트 설명 1"
    },
    {
      "title": "제안 광고 제목 2",
      "description": "제안 광고 설명 2",
      "improvementPoints": "개선 포인트 설명 2"
    },
    {
      "title": "제안 광고 제목 3",
      "description": "제안 광고 설명 3",
      "improvementPoints": "개선 포인트 설명 3"
    }
  ]
}

텍스트 형식 설명:
- 각 광고는 보통 favicon, 업체명, 도메인, 광고 제목, 광고 설명, 확장 링크, 광고집행기간 순으로 나열됩니다.
- "광고집행기간" 다음에 새로운 favicon이 나오면 다음 광고의 시작입니다.
- 광고 순위는 텍스트에서 나타나는 순서대로 1위, 2위, 3위... 입니다.

분석 시 다음 요소들을 고려하세요:
- 광고 카피의 강점과 약점
- 키워드 관련성
- 호소력과 차별화 요소
- 타겟팅 전략
- 클릭 유도 요소
- 가독성과 간결성
- 광고집행기간 (61개월 이상은 오래된 광고, 0~3개월은 신규 광고)
```

#### 13.3.2 이미지 모드

**Model:** gpt-4.1 (Vision)
**max_tokens:** 1500

**System Prompt:**
```
당신은 검색 광고 이미지 분석 전문가입니다.
업로드된 검색 결과 이미지에서 광고를 식별하고, 특정 업체('{companyName}')의 광고를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

{
  "ourAd": {
    "rank": 숫자 (해당 업체의 광고 순위, 없으면 0),
    "evaluation": {
      "title": "광고 제목에 대한 평가",
      "description": "광고 설명에 대한 평가"
    }
  },
  "competitorAnalysis": "경쟁사 광고에 대한 넘버링된 분석. '1. [경쟁사명] - 분석내용\n2. [경쟁사명] - 분석내용\n3. [경쟁사명] - 분석내용' 형식으로 최소 3개 이상의 경쟁사 광고를 포함해 분석해주세요.",
  "adSuggestions": [
    {
      "title": "제안 광고 제목 1",
      "description": "제안 광고 설명 1",
      "improvementPoints": "개선 포인트 설명 1"
    },
    {
      "title": "제안 광고 제목 2",
      "description": "제안 광고 설명 2",
      "improvementPoints": "개선 포인트 설명 2"
    },
    {
      "title": "제안 광고 제목 3",
      "description": "제안 광고 설명 3",
      "improvementPoints": "개선 포인트 설명 3"
    }
  ]
}

분석 시 다음 요소들을 고려하세요:
- 광고 카피의 강점과 약점
- 키워드 관련성
- 호소력과 차별화 요소
- 타겟팅 전략
- 클릭 유도 요소
- 가독성과 간결성
```

**User Message 구조 (Vision):**
```typescript
{
  role: "user",
  content: [
    {
      type: "text",
      text: `이 이미지는 '${keyword}' 키워드에 대한 검색 결과입니다. '${companyName}'이라는 업체 광고를 분석하고 순위, 평가, 개선점을 알려주세요.`
    },
    {
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`
      }
    }
  ]
}
```

---

### 13.4 종합 리포트 생성 (`/api/integrated-report`)

**Model:** gpt-4.1
**Temperature:** 0.7
**max_tokens:** 8000
**response_format:** { type: 'json_object' }

**System Prompt:**
```
당신은 디지털 마케팅 전략 컨설턴트입니다. 제공된 키워드 분석 데이터를 바탕으로 PPT 수준의 전문적인 마케팅 인텔리전스 리포트를 생성해주세요.

리포트는 다음 구조로 작성해야 합니다:

1. **Executive Summary** (핵심 요약)
   - 5개의 핵심 지표 (구체적 수치 포함)
   - 승리 공식 (Winning Formula) - 성공을 위한 핵심 전략 한 문장
   - 시장 기회 요약

2. **3단계 소비자 인식 구조**
   - Stage 1 (개념 이해): 소비자가 키워드를 어떻게 인식하는지
   - Stage 2 (적극 비교): 구매 의사결정을 위한 비교 행동
   - Stage 3 (전환 장벽): 구매를 막는 Pain Points

3. **핵심 키워드 맵**
   - 상위 키워드 랭킹 (빈도 기반)
   - Pain Point 키워드 분리
   - 데이터 기반 인사이트 3개

4. **채널별 소비자 반응**
   - 각 채널의 역할 정의
   - 채널별 핵심 관심사
   - 채널별 마케팅 전략

5. **시장 환경 분석**
   - 경쟁 구도 분석
   - 디지털 트렌드 (모바일 비중, 콘텐츠 동향)

6. **마케팅 인사이트** (4개)
   - 각 인사이트는 Pain Point → Opportunity → Action 구조

7. **실행 전략** (5개)
   - 전략 1: 콘텐츠 마케팅 (SEO)
   - 전략 2: 모바일 퍼널 최적화
   - 전략 3: 차별화된 비교 경험
   - 전략 4: 검색 광고 최적화
   - 전략 5: 프로모션 설계

8. **90일 액션플랜**
   - Key Findings (4개)
   - 타임라인: NOW → 30일 → 60일 → 90일

9. **종합 결론**
   - 요약
   - 핵심 추천사항

응답은 반드시 아래 JSON 형식으로 제공해주세요. 모든 텍스트는 한국어로, 전문적이고 구체적으로 작성하세요. 수치는 제공된 데이터를 기반으로 정확하게 인용하세요.
```

**User Prompt 템플릿:**
```
다음은 "{keyword}" 키워드에 대한 분석 데이터입니다. (분석 대상 업체: {companyName})

=== 핵심 수치 ===
- 총 월간 검색량: {totalVolume}건
- 모바일 비중: {mobileShare}%
- 분석된 연관 키워드: {keywordCount}개

=== 키워드 확장 데이터 요약 ===
{keywordExpansionSummary}

=== 채널별 분석 데이터 ===
[블로그] 감성: 긍정 {blogPositive}%, 부정 {blogNegative}%, 중립 {blogNeutral}%
주요 키워드: {blogTopKeywords}

[카페] 감성: 긍정 {cafePositive}%, 부정 {cafeNegative}%, 중립 {cafeNeutral}%
주요 키워드: {cafeTopKeywords}

[유튜브] 감성: 긍정 {youtubePositive}%, 부정 {youtubeNegative}%, 중립 {youtubeNeutral}%
주요 키워드: {youtubeTopKeywords}

[뉴스] 감성: 긍정 {newsPositive}%, 부정 {newsNegative}%, 중립 {newsNeutral}%
주요 키워드: {newsTopKeywords}

=== 광고 분석 데이터 (선택) ===
{adAnalysisSummary}

위 데이터를 바탕으로 PPT 수준의 종합 마케팅 리포트를 JSON 형식으로 생성해주세요.

JSON 구조:
{
  "executiveSummary": {
    "keyMetrics": [
      {"label": "월 핵심 키워드 검색량", "value": "{totalVolume}", "description": "시장 성숙도 입증"},
      {"label": "지표명", "value": "수치", "description": "의미"}
    ],
    "winningFormula": "성공을 위한 핵심 전략",
    "marketOpportunity": "시장 기회 요약"
  },
  "perceptionStages": {
    "stage1_awareness": {...},
    "stage2_comparison": {...},
    "stage3_conversion": {...}
  },
  "keywordMap": {...},
  "channelBreakdown": [...],
  "marketEnvironment": {...},
  "marketingInsights": [...],
  "actionStrategies": [...],
  "actionPlan": {...},
  "conclusion": {...}
}
```

---

## 14. GPT 호출 비용 최적화

| API | 모델 | max_tokens | 예상 비용 |
|-----|------|------------|----------|
| keyword-expansion-analysis | gpt-4.1 | 1,500 | 낮음 |
| keyword-analysis (감성) | gpt-4.1 | 기본값 | 중간 |
| keyword-analysis (개별) | gpt-4.1 | 기본값 | 중간 |
| ad-analysis | gpt-4.1 | 1,500 | 낮음~중간 |
| integrated-report | gpt-4.1 | 8,000 | 높음 |

**비용 절감 팁:**
- 불필요한 재분석 방지 (캐싱 고려)
- response_format: json_object 사용으로 파싱 실패 최소화
- temperature 조절 (0.2~0.7)
- 개별 콘텐츠 분석은 최대 30개로 제한
