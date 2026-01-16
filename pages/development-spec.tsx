import React, { useState } from 'react';
import Head from 'next/head';

// 개발 명세서 데이터
const specData = {
  title: '키워드 통합 분석 페이지 개발 명세서',
  overview: '키워드 분석, 키워드 확장, 콘텐츠 감성 분석, 광고 분석을 통합하여 5단계 위저드 형태로 종합 마케팅 리포트를 생성하는 페이지입니다.',
  sections: [
    {
      id: 'tech-stack',
      title: '1. 기술 스택',
      icon: '🛠️',
      content: [
        { label: 'Framework', value: 'Next.js 13.4.4 (Pages Router)' },
        { label: 'Language', value: 'TypeScript 5.1.3' },
        { label: 'Styling', value: 'Tailwind CSS 3.3.2' },
        { label: 'AI', value: 'OpenAI GPT-4.1' },
        { label: 'PPT 생성', value: 'pptxgenjs 4.0.1' },
        { label: 'HTTP Client', value: 'axios 1.6.8' },
        { label: 'Form 처리', value: 'formidable 2.1.1' },
        { label: 'Excel', value: 'xlsx 0.18.5' },
      ],
    },
    {
      id: 'env-variables',
      title: '2. 필수 환경 변수',
      icon: '🔑',
      content: [
        { label: 'OPENAI_API_KEY', value: 'OpenAI API 키', category: 'OpenAI' },
        { label: 'NAVER_CLIENT_ID', value: '네이버 검색 API Client ID', category: '네이버 검색 API' },
        { label: 'NAVER_CLIENT_SECRET', value: '네이버 검색 API Secret', category: '네이버 검색 API' },
        { label: 'NAVER_API_KEY', value: '네이버 광고 API Key', category: '네이버 광고 API' },
        { label: 'NAVER_SECRET_KEY', value: '네이버 광고 API Secret', category: '네이버 광고 API' },
        { label: 'NAVER_CUSTOMER_ID', value: '네이버 광고 Customer ID', category: '네이버 광고 API' },
        { label: 'YOUTUBE_API_KEY', value: 'YouTube Data API Key', category: 'YouTube API' },
      ],
    },
    {
      id: 'directory-structure',
      title: '3. 디렉토리 구조',
      icon: '📁',
      directoryTree: `
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
      `.trim(),
    },
    {
      id: 'page-flow',
      title: '4. 페이지 플로우',
      icon: '🔄',
      steps: [
        { step: 1, title: '키워드 입력', description: '분석할 키워드와 업체명 입력' },
        { step: 2, title: '키워드 확장', description: '연관 키워드 및 검색량 분석 (네이버 광고 API)' },
        { step: 3, title: '콘텐츠 분석', description: '채널별(블로그/카페/유튜브/뉴스) 감성 분석' },
        { step: 4, title: '광고 분석', description: '경쟁 광고 분석 (선택, 건너뛰기 가능)' },
        { step: 5, title: '종합 리포트', description: 'GPT 기반 마케팅 리포트 + PPT 다운로드' },
      ],
    },
    {
      id: 'api-list',
      title: '5. API 명세',
      icon: '🔌',
      apiDetails: [
        {
          endpoint: '/api/keyword-expansion',
          method: 'POST',
          title: '키워드 확장 API',
          description: '네이버 광고 API를 통해 연관 키워드와 검색량 데이터를 조회합니다.',
          external: '네이버 광고 API (https://api.searchad.naver.com/keywordstool)',
          request: `{
  keyword: string  // 분석할 키워드
}`,
          response: `{
  message: string,
  data: {
    keyword: string,
    timestamp: string,
    status: 'success',
    keywordList: Array<{
      relKeyword: string,         // 연관 키워드
      monthlyPcQcCnt: string,     // 월간 PC 검색량
      monthlyMobileQcCnt: string, // 월간 모바일 검색량
      monthlyAvePcClkCnt: string, // 월간 평균 PC 클릭수
      monthlyAveMobileClkCnt: string,
      monthlyAvePcCtr: string,    // PC CTR (%)
      monthlyAveMobileCtr: string,
      plAvgDepth: string,         // 평균 광고 노출 깊이
      compIdx: string             // 경쟁도 ("높음"|"중간"|"낮음")
    }>
  }
}`,
          authCode: `// HMAC-SHA256 서명 생성
const generateSignature = (secretKey, timestamp, method, uri) => {
  const message = \`\${timestamp}.\${method}.\${uri}\`;
  return crypto.createHmac('sha256', secretKey)
    .update(message).digest('base64');
};

// 헤더
headers: {
  'X-Timestamp': timestamp,
  'X-API-KEY': apiKey,
  'X-Customer': customerId,
  'X-Signature': signature,
  'Content-Type': 'application/json'
}`,
        },
        {
          endpoint: '/api/keyword-expansion-analysis',
          method: 'POST',
          title: '키워드 확장 GPT 분석 API',
          description: '키워드 확장 데이터를 GPT로 분석하여 5개 항목의 인사이트를 생성합니다.',
          external: 'OpenAI GPT-4.1',
          request: `{
  keyword: string,
  keywordExpansion: KeywordExpansionResult
}`,
          response: `{
  analysis: {
    searchVolumeAnalysis: string,    // 검색량 분석
    engagementAnalysis: string,      // 클릭율 분석
    competitionAnalysis: string,     // 경쟁강도 분석
    consumerTrendAnalysis: string,   // 소비자 트렌드
    conclusion: string               // 결론
  }
}`,
        },
        {
          endpoint: '/api/keyword-analysis',
          method: 'POST',
          title: '콘텐츠 분석 API',
          description: '채널별 콘텐츠를 수집하고 GPT로 감성 분석을 수행합니다.',
          external: '네이버 검색 API, YouTube API, OpenAI GPT-4.1',
          request: `{
  keyword: string,
  contentType: 'blog' | 'cafe' | 'youtube' | 'news'
}`,
          response: `{
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
    publishedAt?: string
  }>
}`,
          processingFlow: `1. 채널별 API로 콘텐츠 30개 수집 (display=30)
2. 키워드 빈도 분석 (불용어 제거 후 상위 10개)
3. GPT로 전체 감성 분석 (긍정/부정/중립 비율)
4. GPT로 개별 콘텐츠 감성 분석`,
        },
        {
          endpoint: '/api/ad-analysis',
          method: 'POST',
          title: '광고 분석 API',
          description: '텍스트 또는 이미지로 광고를 분석합니다.',
          external: 'OpenAI GPT-4.1 (Vision)',
          contentType: 'multipart/form-data',
          request: `{
  keyword: string,
  companyName: string,
  inputMode: 'image' | 'text',
  image?: File,   // inputMode === 'image'
  adText?: string // inputMode === 'text'
}`,
          response: `{
  ourAd: {
    rank: number,  // 광고 순위 (0이면 미노출)
    evaluation: {
      title: string,
      description: string
    }
  },
  competitorAnalysis: string,
  adSuggestions: Array<{
    title: string,
    description: string,
    improvementPoints: string
  }>
}`,
        },
        {
          endpoint: '/api/integrated-report',
          method: 'POST',
          title: '종합 리포트 생성 API',
          description: '전체 분석 데이터를 바탕으로 9개 섹션의 마케팅 리포트를 생성합니다.',
          external: 'OpenAI GPT-4.1 (max_tokens: 8000)',
          request: `{
  keyword: string,
  companyName?: string,
  keywordExpansion: KeywordExpansionResult,
  keywordExpansionGPTAnalysis?: KeywordExpansionGPTAnalysis,
  contentAnalysis: {
    blog?: KeywordAnalysisResult,
    cafe?: KeywordAnalysisResult,
    youtube?: KeywordAnalysisResult,
    news?: KeywordAnalysisResult
  },
  adAnalysis?: AdAnalysisResult
}`,
          response: `{
  report: IntegratedReportData  // 9개 섹션 포함
}`,
        },
        {
          endpoint: '/api/generate-ppt',
          method: 'POST',
          title: 'PPT 생성 API',
          description: '종합 리포트를 PPT 파일로 변환합니다.',
          external: 'pptxgenjs',
          request: `{
  report: IntegratedReportData
}`,
          response: `Binary PPT 파일
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="{keyword}_marketing_report.pptx"`,
          slideStructure: `1. 표지
2. 목차
3. Executive Summary
4. 3단계 소비자 인식 구조
5. 핵심 키워드 맵
6. 채널별 소비자 반응
7. 시장 환경 분석
8-11. 마케팅 인사이트 (4개)
12-16. 실행 전략 (5개)
17. 90일 액션플랜
18. 종합 결론
19. Thank You`,
        },
      ],
    },
    {
      id: 'report-structure',
      title: '6. 종합 리포트 구조',
      icon: '📊',
      reportSections: [
        { num: 1, title: 'Executive Summary', items: ['핵심 지표 5개', 'Winning Formula', 'Market Opportunity'] },
        { num: 2, title: '3단계 소비자 인식 구조', items: ['인지(Awareness)', '비교(Comparison)', '전환(Conversion)'] },
        { num: 3, title: '핵심 키워드 맵', items: ['상위 키워드 랭킹', 'Pain Point 키워드', '데이터 인사이트'] },
        { num: 4, title: '채널별 소비자 반응', items: ['채널별 역할', '핵심 관심사', '마케팅 전략'] },
        { num: 5, title: '시장 환경 분석', items: ['경쟁 구도', '디지털 트렌드'] },
        { num: 6, title: '마케팅 인사이트', items: ['Pain Point → Opportunity → Action 구조', '4개 인사이트'] },
        { num: 7, title: '실행 전략', items: ['콘텐츠 마케팅', '모바일 퍼널', '비교 경험', '검색 광고', '프로모션'] },
        { num: 8, title: '90일 액션플랜', items: ['Key Findings', 'NOW → 30d → 60d → 90d 타임라인'] },
        { num: 9, title: '종합 결론', items: ['요약', '핵심 추천사항'] },
      ],
      reportDataStructure: `interface IntegratedReportData {
  generatedAt: string;
  keyword: string;
  companyName?: string;

  // 1. Executive Summary
  executiveSummary: {
    keyMetrics: Array<{ label, value, description }>;
    winningFormula: string;
    marketOpportunity: string;
  };

  // 2. 3단계 소비자 인식 구조
  perceptionStages: {
    stage1_awareness: { title, insight, keywords[], metrics };
    stage2_comparison: { title, insight, keywords[], metrics };
    stage3_conversion: { title, insight, painPoints[], sentiment };
  };

  // 3. 핵심 키워드 맵
  keywordMap: {
    totalSearchVolume: string;
    topKeywords: Array<{ rank, keyword, frequency }>;
    painPointKeywords: Array<{ keyword, frequency }>;
    dataInsights: string[];
  };

  // 4. 채널별 소비자 반응
  channelBreakdown: Array<{
    channel, channelName, role,
    keyInterests[], strategy, sentimentBreakdown?
  }>;

  // 5. 시장 환경 분석
  marketEnvironment: {
    competitionAnalysis: { level, insight, keyPlayers[] };
    digitalTrends: { mobileShare, contentFreshness, orgChanges[] };
  };

  // 6. 마케팅 인사이트 (4개)
  marketingInsights: Array<{
    id, title,
    painPoint: { label, details[] },
    opportunity: { label, details[] },
    action: string
  }>;

  // 7. 실행 전략 (5개)
  actionStrategies: Array<{
    id, title, subtitle,
    sections: Array<{ heading, items[] }>,
    expectedMetrics?: Array<{ label, value }>
  }>;

  // 8. 90일 액션플랜
  actionPlan: {
    keyFindings: string[];
    timeline: Array<{ phase, label, category, action }>;
  };

  // 9. 종합 결론
  conclusion: { summary, recommendations[] };
}`,
    },
    {
      id: 'data-summary',
      title: '6-1. dataSummary 구조',
      icon: '📝',
      description: 'buildDataSummary() 함수가 생성하는 텍스트 요약으로, GPT 프롬프트의 컨텍스트로 사용됩니다.',
      dataSummarySections: [
        {
          section: '키워드 확장 분석 데이터',
          items: [
            '검색량 개요: 총 월간 검색량, 모바일 비중, 연관 키워드 수',
            '상위 연관 키워드 (20개): PC/모바일 검색량, CTR, 경쟁도',
            '경쟁도 분포: 높음/중간/낮음 비율',
            'AI 분석 인사이트: 검색량/클릭율/경쟁강도/소비자트렌드/결론',
          ],
        },
        {
          section: '채널별 콘텐츠 분석 데이터',
          items: [
            '채널별 감성 분석: 긍정/중립/부정 비율',
            '긍정/부정 키워드: 키워드명 + 점수(1-10)',
            '주요 키워드: 빈도순 상위 10개',
            '분석된 콘텐츠 수',
            '전체 채널 감성 평균',
          ],
        },
        {
          section: '광고 분석 데이터 (선택)',
          items: [
            '자사 광고 현황: 순위, 제목/설명 평가',
            '경쟁사 광고 분석: 넘버링된 경쟁사별 분석',
            '광고 개선 제안: 제목/설명/개선포인트',
          ],
        },
      ],
      dataSummaryTemplate: `## 키워드 확장 분석 데이터

### 검색량 개요
- 총 월간 검색량: {totalVolume}건
- 모바일 비중: {mobileShare}%
- 분석된 연관 키워드 수: {count}개

### 상위 연관 키워드 (검색량 기준) - 상위 20개
1. {keyword} - PC: {pcVol}, 모바일: {mobileVol}, CTR: {ctr}, 경쟁도: {compIdx}
...

### 경쟁도 분포
- 높음: {highComp}개 ({highPercent}%)
- 중간: {midComp}개 ({midPercent}%)
- 낮음: {lowComp}개 ({lowPercent}%)

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
...`,
    },
    {
      id: 'frontend-state',
      title: '7. 프론트엔드 상태 관리',
      icon: '🧠',
      stateStructure: `interface IntegratedAnalysisState {
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
}`,
      stepLogic: `// 단계 완료 조건
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
};`,
    },
    {
      id: 'components',
      title: '8. UI 컴포넌트',
      icon: '🧩',
      components: [
        { name: 'LoadingModal', description: '로딩 상태 모달 (어두운 배경 + 스피너 + 메시지)' },
        { name: 'StepIndicator', description: '5단계 진행 표시기 (클릭 네비게이션 지원)' },
        { name: 'Step1KeywordInput', description: '키워드/업체명 입력 폼' },
        { name: 'Step2KeywordExpansion', description: '키워드 확장 결과 테이블 + GPT 분석 + AI 분석용 상위 20개 키워드 표시' },
        { name: 'Step3ContentAnalysis', description: '채널별 콘텐츠 분석 결과 (탭 UI) + 감성 키워드 분석(점수 1-10) + 콘텐츠 감성 뱃지([긍정]/[부정]/[중립])' },
        { name: 'Step4AdAnalysis', description: '광고 분석 (텍스트/이미지 입력 모드)' },
        { name: 'IntegratedReport', description: '종합 리포트 뷰 (9개 섹션 아코디언)' },
      ],
      loadingModalCode: `const LoadingModal = ({ isOpen, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50
      flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl
        flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10
          border-t-2 border-b-2 border-blue-500 mb-4" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};`,
      loadingMessages: [
        { state: 'keywordExpansionLoading', message: '연관 키워드를 분석 중입니다...' },
        { state: 'keywordExpansionGPTLoading', message: 'AI가 키워드 데이터를 분석 중입니다...' },
        { state: 'isAnyContentLoading', message: '채널별 콘텐츠를 분석 중입니다...' },
        { state: 'adAnalysisLoading', message: '광고를 분석 중입니다...' },
        { state: 'reportLoading', message: '종합 리포트를 생성 중입니다...' },
      ],
    },
    {
      id: 'ui-ux',
      title: '9. UI/UX 세부 사항',
      icon: '🎨',
      stylingRules: [
        { element: '그라데이션 버튼', style: 'bg-gradient-to-r from-blue-600 to-indigo-600' },
        { element: '카드 헤더', style: '섹션별 색상 그라데이션 적용' },
        { element: '감성 바', style: '긍정(green-500) / 중립(gray-400) / 부정(red-500)' },
        { element: '경쟁도 배지', style: '높음(red) / 중간(yellow) / 낮음(green)' },
        { element: '콘텐츠 감성 뱃지', style: '[긍정] bg-green-100 / [부정] bg-red-100 / [중립] bg-gray-100' },
      ],
      step3UI: {
        sentimentKeywordsCode: `{/* 긍정/부정 키워드 (좌우 2컬럼) */}
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
</div>`,
        contentBadgeCode: `<span className={\`text-xs font-medium px-1.5 py-0.5 rounded mr-2 \${
  sentiment === 'positive' ? 'bg-green-100 text-green-700'
  : sentiment === 'negative' ? 'bg-red-100 text-red-700'
  : 'bg-gray-100 text-gray-600'
}\`}>
  {sentiment === 'positive' ? '긍정'
    : sentiment === 'negative' ? '부정' : '중립'}
</span>`,
      },
    },
    {
      id: 'keyword-table',
      title: '10. 키워드 테이블 기능',
      icon: '📋',
      sortingCode: `const handleSort = (key: string) => {
  let direction = 'asc';
  if (sortConfig.key === key) {
    if (sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.direction === 'desc') direction = null;
  }
  setSortConfig({ key, direction });
};

// 경쟁도 정렬 시 매핑
const compMap = { '높음': 3, '중간': 2, '낮음': 1 };`,
      features: [
        '기본 화면: 상위 20개만 표시',
        '"전체보기" 버튼 클릭 시 모달로 전체 키워드 표시',
        '모달 내 sticky 헤더 + 스크롤',
        '컬럼별 오름차순/내림차순/원본 순서 토글',
      ],
    },
    {
      id: 'error-handling',
      title: '11. 에러 처리',
      icon: '⚠️',
      errorCodes: [
        { code: 400, meaning: '필수 파라미터 누락' },
        { code: 405, meaning: 'Method Not Allowed (POST만 허용)' },
        { code: 500, meaning: '서버 내부 오류' },
      ],
      frontendErrorCode: `try {
  const response = await axios.post('/api/keyword-expansion', { keyword });
  // 성공 처리
} catch (error) {
  console.error('키워드 확장 오류:', error);
  alert('키워드 확장 분석에 실패했습니다. 다시 시도해주세요.');
}`,
    },
    {
      id: 'gpt-prompts',
      title: '12. GPT 시스템 프롬프트 전문',
      icon: '🤖',
      fullPrompts: [
        {
          api: '키워드 확장 GPT 분석',
          endpoint: '/api/keyword-expansion-analysis',
          model: 'gpt-4.1',
          maxTokens: 1500,
          temperature: 0.7,
          responseFormat: 'json_object',
          systemPrompt: `당신은 마케팅 데이터 분석가입니다. 키워드 데이터를 분석하여 간결한 인사이트를 제공합니다.
반드시 JSON 형식으로 응답하세요. 각 항목은 2-3문장으로 핵심만 작성하세요.`,
          userPromptTemplate: `키워드: "{keyword}"
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
}`,
        },
        {
          api: '콘텐츠 감성 분석 (전체 비율)',
          endpoint: '/api/keyword-analysis',
          model: 'gpt-4.1',
          maxTokens: '기본값',
          temperature: '기본값',
          responseFormat: 'json_object',
          systemPrompt: `당신은 텍스트의 감정을 분석하는 전문가입니다. 주어진 텍스트에서 다음 정보를 추출해주세요:
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

숫자만 제공하고 설명은 하지 마세요.`,
          userPromptTemplate: `[수집된 콘텐츠 텍스트 전체]`,
        },
        {
          api: '콘텐츠 감성 분석 (개별 콘텐츠)',
          endpoint: '/api/keyword-analysis',
          model: 'gpt-4.1',
          maxTokens: '기본값',
          temperature: 0.2,
          responseFormat: 'JSON 배열',
          systemPrompt: `당신은 텍스트의 감정을 분석하는 전문가입니다. 여러 텍스트를 분석하여 각각의 감정(긍정/부정/중립)과 그 강도를 평가해주세요.`,
          userPromptTemplate: `다음은 {count}개의 컨텐츠 항목입니다. 각 항목에 대해 감정 분석을 수행하고 JSON 배열 형식으로 결과를 반환해주세요.
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
...`,
        },
        {
          api: '광고 분석 (텍스트 모드)',
          endpoint: '/api/ad-analysis',
          model: 'gpt-4.1',
          maxTokens: 1500,
          temperature: '기본값',
          responseFormat: 'JSON (텍스트에서 추출)',
          systemPrompt: `당신은 검색 광고 텍스트 분석 전문가입니다.
사용자가 제공한 검색 광고 결과 텍스트에서 광고를 식별하고, 특정 업체('{companyName}')의 광고를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

{
  "ourAd": {
    "rank": 숫자 (해당 업체의 광고 순위, 없으면 0),
    "evaluation": {
      "title": "광고 제목에 대한 평가",
      "description": "광고 설명에 대한 평가"
    }
  },
  "competitorAnalysis": "경쟁사 광고에 대한 넘버링된 분석. '1. [경쟁사명] - 분석내용\\n2. [경쟁사명] - 분석내용\\n3. [경쟁사명] - 분석내용' 형식으로 최소 3개 이상의 경쟁사 광고를 포함해 분석해주세요.",
  "adSuggestions": [
    {
      "title": "제안 광고 제목 1",
      "description": "제안 광고 설명 1",
      "improvementPoints": "개선 포인트 설명 1"
    },
    // ... 총 3개
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
- 광고집행기간 (61개월 이상은 오래된 광고, 0~3개월은 신규 광고)`,
          userPromptTemplate: `다음은 '{keyword}' 키워드에 대한 검색 광고 결과입니다. '{companyName}'이라는 업체 광고를 분석하고 순위, 평가, 개선점을 알려주세요.

{adText}`,
        },
        {
          api: '광고 분석 (이미지 모드)',
          endpoint: '/api/ad-analysis',
          model: 'gpt-4.1 (Vision)',
          maxTokens: 1500,
          temperature: '기본값',
          responseFormat: 'JSON (텍스트에서 추출)',
          systemPrompt: `당신은 검색 광고 이미지 분석 전문가입니다.
업로드된 검색 결과 이미지에서 광고를 식별하고, 특정 업체('{companyName}')의 광고를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

(광고 분석 텍스트 모드와 동일한 JSON 구조)

분석 시 다음 요소들을 고려하세요:
- 광고 카피의 강점과 약점
- 키워드 관련성
- 호소력과 차별화 요소
- 타겟팅 전략
- 클릭 유도 요소
- 가독성과 간결성`,
          userPromptTemplate: `[이미지 첨부 - base64 인코딩]

이 이미지는 '{keyword}' 키워드에 대한 검색 결과입니다. '{companyName}'이라는 업체 광고를 분석하고 순위, 평가, 개선점을 알려주세요.`,
        },
        {
          api: '종합 리포트 생성',
          endpoint: '/api/integrated-report',
          model: 'gpt-4.1',
          maxTokens: 8000,
          temperature: 0.7,
          responseFormat: 'json_object',
          systemPrompt: `당신은 디지털 마케팅 전략 컨설턴트입니다. 제공된 키워드 분석 데이터를 바탕으로 PPT 수준의 전문적인 마케팅 인텔리전스 리포트를 생성해주세요.

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

응답은 반드시 아래 JSON 형식으로 제공해주세요. 모든 텍스트는 한국어로, 전문적이고 구체적으로 작성하세요. 수치는 제공된 데이터를 기반으로 정확하게 인용하세요.`,
          userPromptTemplate: `다음은 "{keyword}" 키워드에 대한 분석 데이터입니다. (분석 대상 업체: {companyName})

=== 핵심 수치 ===
- 총 월간 검색량: {totalVolume}건
- 모바일 비중: {mobileShare}%
- 분석된 연관 키워드: {keywordCount}개

{dataSummary}

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
  "perceptionStages": {...},
  "keywordMap": {...},
  "channelBreakdown": [...],
  "marketEnvironment": {...},
  "marketingInsights": [...],
  "actionStrategies": [...],
  "actionPlan": {...},
  "conclusion": {...}
}`,
        },
      ],
    },
    {
      id: 'gpt-cost',
      title: '13. GPT 호출 비용 최적화',
      icon: '💰',
      costTable: [
        { api: 'keyword-expansion-analysis', model: 'gpt-4.1', maxTokens: '1,500', cost: '낮음' },
        { api: 'keyword-analysis (감성)', model: 'gpt-4.1', maxTokens: '기본값', cost: '중간' },
        { api: 'keyword-analysis (개별)', model: 'gpt-4.1', maxTokens: '기본값', cost: '중간' },
        { api: 'ad-analysis', model: 'gpt-4.1', maxTokens: '1,500', cost: '낮음~중간' },
        { api: 'integrated-report', model: 'gpt-4.1', maxTokens: '8,000', cost: '높음' },
      ],
      optimizationTips: [
        '불필요한 재분석 방지 (캐싱 고려)',
        'response_format: json_object 사용으로 파싱 실패 최소화',
        'temperature 조절 (0.2~0.7)',
        '개별 콘텐츠 분석은 최대 30개로 제한',
      ],
    },
    {
      id: 'checklist',
      title: '14. 구현 체크리스트',
      icon: '✅',
      phases: [
        {
          phase: 'Phase 1: 기본 구조',
          tasks: [
            '프로젝트 초기 설정 (Next.js + TypeScript + Tailwind)',
            '환경 변수 설정',
            '타입 정의 파일 생성',
            '임시 폴더 생성 스크립트',
          ],
        },
        {
          phase: 'Phase 2: API 구현',
          tasks: [
            '/api/keyword-expansion - 네이버 광고 API 연동',
            '/api/keyword-expansion-analysis - GPT 키워드 분석',
            '/api/keyword-analysis - 콘텐츠 수집 + 감성 분석',
            '/api/ad-analysis - 광고 분석 (텍스트/이미지)',
            '/api/integrated-report - 종합 리포트 생성',
            '/api/generate-ppt - PPT 생성',
          ],
        },
        {
          phase: 'Phase 3: 프론트엔드 구현',
          tasks: [
            '페이지 레이아웃',
            'LoadingModal 컴포넌트',
            'StepIndicator 컴포넌트',
            'Step1~4 컴포넌트',
            'IntegratedReport 컴포넌트',
          ],
        },
        {
          phase: 'Phase 4: PPT 생성',
          tasks: [
            'pptxgenjs 설정',
            '표지/목차 슬라이드',
            '각 섹션별 슬라이드',
            '다운로드 기능',
          ],
        },
        {
          phase: 'Phase 5: 테스트',
          tasks: [
            '각 API 엔드포인트 테스트',
            '단계별 플로우 테스트',
            '에러 케이스 처리',
            '로딩 상태 UX 검증',
          ],
        },
      ],
    },
    {
      id: 'cautions',
      title: '15. 주의사항',
      icon: '🚨',
      items: [
        { title: 'API 키 보안', description: '모든 API 키는 서버 사이드에서만 사용 (클라이언트 노출 금지)' },
        { title: 'GPT 비용 관리', description: 'max_tokens 제한, 불필요한 호출 방지, 캐싱 고려' },
        { title: '이미지 업로드', description: 'tmp 폴더 정리, 파일 크기 제한 (10MB)' },
        { title: '네이버 API 제한', description: '일일 쿼터 확인 필요' },
        { title: 'PPT 생성 시간', description: '리포트 크기에 따라 수 초 소요' },
      ],
    },
    {
      id: 'references',
      title: '16. 참고 자료',
      icon: '📚',
      links: [
        { name: '네이버 검색 API', url: 'https://developers.naver.com/docs/serviceapi/search/' },
        { name: '네이버 광고 API', url: 'https://naver.github.io/searchad-apidoc/' },
        { name: 'YouTube Data API', url: 'https://developers.google.com/youtube/v3' },
        { name: 'pptxgenjs', url: 'https://gitbrent.github.io/PptxGenJS/' },
        { name: 'OpenAI API', url: 'https://platform.openai.com/docs/api-reference' },
      ],
    },
  ],
};

// 섹션 컴포넌트
const Section: React.FC<{ section: any; isOpen: boolean; onToggle: () => void }> = ({
  section,
  isOpen,
  onToggle,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{section.icon}</span>
          <h2 className="text-lg font-semibold text-gray-800">{section.title}</h2>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 py-5 border-t border-gray-100">
          {/* 기술 스택 */}
          {section.content && section.id === 'tech-stack' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {section.content.map((item: any, idx: number) => (
                <div key={idx} className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-medium">{item.label}</div>
                  <div className="text-sm text-gray-800 font-semibold mt-1">{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* 환경 변수 */}
          {section.content && section.id === 'env-variables' && (
            <div className="space-y-4">
              {['OpenAI', '네이버 검색 API', '네이버 광고 API', 'YouTube API'].map((category) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
                  <div className="space-y-2">
                    {section.content
                      .filter((item: any) => item.category === category)
                      .map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
                          <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono text-gray-700">
                            {item.label}
                          </code>
                          <span className="text-sm text-gray-600">{item.value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 디렉토리 구조 */}
          {section.directoryTree && (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre">
              {section.directoryTree}
            </pre>
          )}

          {/* 페이지 플로우 */}
          {section.steps && (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 overflow-x-auto pb-2">
              {section.steps.map((step: any, idx: number) => (
                <React.Fragment key={step.step}>
                  <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white min-w-[180px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                        {step.step}
                      </span>
                      <span className="font-semibold">{step.title}</span>
                    </div>
                    <p className="text-xs text-blue-100">{step.description}</p>
                  </div>
                  {idx < section.steps.length - 1 && (
                    <svg className="w-6 h-6 text-gray-400 flex-shrink-0 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* API 상세 명세 */}
          {section.apiDetails && (
            <div className="space-y-6">
              {section.apiDetails.map((api: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  {/* API 헤더 */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded">
                        {api.method}
                      </span>
                      <code className="text-sm font-mono text-white">{api.endpoint}</code>
                    </div>
                    <p className="text-sm text-blue-100">{api.title}</p>
                  </div>

                  <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-700">{api.description}</p>

                    {api.external && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">외부 API:</span> {api.external}
                      </div>
                    )}

                    {api.contentType && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Content-Type:</span> {api.contentType}
                      </div>
                    )}

                    {api.request && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">Request:</div>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                          {api.request}
                        </pre>
                      </div>
                    )}

                    {api.response && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">Response:</div>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                          {api.response}
                        </pre>
                      </div>
                    )}

                    {api.authCode && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">인증 코드:</div>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                          {api.authCode}
                        </pre>
                      </div>
                    )}

                    {api.processingFlow && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">처리 흐름:</div>
                        <pre className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap">
                          {api.processingFlow}
                        </pre>
                      </div>
                    )}

                    {api.slideStructure && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">슬라이드 구성:</div>
                        <pre className="bg-purple-50 text-purple-800 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap">
                          {api.slideStructure}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 리포트 구조 */}
          {section.reportSections && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {section.reportSections.map((rs: any) => (
                  <div key={rs.num} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {rs.num}
                      </span>
                      <span className="font-semibold text-gray-800 text-sm">{rs.title}</span>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {rs.items.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-indigo-400">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {section.reportDataStructure && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">IntegratedReportData 타입 정의:</div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
                    {section.reportDataStructure}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* dataSummary 구조 */}
          {section.dataSummarySections && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                <code className="bg-gray-100 px-2 py-0.5 rounded text-purple-600">buildDataSummary()</code> 함수가 생성하는 텍스트 요약으로, GPT 프롬프트의 컨텍스트로 사용됩니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {section.dataSummarySections.map((ds: any, idx: number) => (
                  <div key={idx} className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                    <h4 className="font-semibold text-teal-800 text-sm mb-3 flex items-center gap-2">
                      <span className="w-5 h-5 bg-teal-500 text-white rounded flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      {ds.section}
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1.5">
                      {ds.items.map((item: string, itemIdx: number) => (
                        <li key={itemIdx} className="flex items-start gap-1">
                          <span className="text-teal-400">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {section.dataSummaryTemplate && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">dataSummary 전체 템플릿:</div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {section.dataSummaryTemplate}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* 프론트엔드 상태 관리 */}
          {section.stateStructure && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">상태 구조 (IntegratedAnalysisState):</div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-80 overflow-y-auto">
                  {section.stateStructure}
                </pre>
              </div>

              {section.stepLogic && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">단계 이동 로직:</div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                    {section.stepLogic}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* 컴포넌트 */}
          {section.components && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.components.map((comp: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <code className="text-sm font-mono text-purple-600">{comp.name}</code>
                    <p className="text-xs text-gray-600 mt-1">{comp.description}</p>
                  </div>
                ))}
              </div>

              {section.loadingModalCode && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">LoadingModal 코드:</div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                    {section.loadingModalCode}
                  </pre>
                </div>
              )}

              {section.loadingMessages && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">로딩 메시지 매핑:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {section.loadingMessages.map((msg: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                        <code className="text-xs bg-blue-200 px-2 py-0.5 rounded font-mono text-blue-800">
                          {msg.state}
                        </code>
                        <span className="text-sm text-gray-700">{msg.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UI/UX 세부 사항 */}
          {section.stylingRules && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">스타일링 규칙:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {section.stylingRules.map((rule: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-gray-700">{rule.element}:</span>
                      <code className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono text-gray-600">
                        {rule.style}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {section.step3UI && (
                <div className="space-y-4 mt-4">
                  <div className="text-sm font-semibold text-gray-700">Step 3 콘텐츠 분석 UI:</div>

                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">감성 키워드 섹션:</div>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                      {section.step3UI.sentimentKeywordsCode}
                    </pre>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">콘텐츠 감성 뱃지:</div>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                      {section.step3UI.contentBadgeCode}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 키워드 테이블 기능 */}
          {section.sortingCode && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">정렬 기능:</div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                  {section.sortingCode}
                </pre>
              </div>

              {section.features && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">기능 목록:</div>
                  <ul className="space-y-1">
                    {section.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-blue-500">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 에러 처리 */}
          {section.errorCodes && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">API 에러 코드:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {section.errorCodes.map((err: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                      <span className="font-bold text-red-600">{err.code}</span>
                      <span className="text-sm text-gray-700">{err.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>

              {section.frontendErrorCode && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">프론트엔드 에러 처리:</div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                    {section.frontendErrorCode}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* GPT 프롬프트 전문 */}
          {section.fullPrompts && (
            <div className="space-y-6">
              {section.fullPrompts.map((prompt: any, idx: number) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* 헤더 */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{prompt.api}</span>
                      <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                        {prompt.model}
                      </span>
                    </div>
                    <code className="text-xs text-emerald-100 mt-1 block">{prompt.endpoint}</code>
                  </div>

                  {/* 설정 정보 */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">max_tokens:</span>
                        <span className="ml-1 font-medium text-gray-700">{prompt.maxTokens}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">temperature:</span>
                        <span className="ml-1 font-medium text-gray-700">{prompt.temperature}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">response_format:</span>
                        <span className="ml-1 font-medium text-gray-700">{prompt.responseFormat}</span>
                      </div>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">SYSTEM</span>
                      <span className="text-sm font-medium text-gray-700">시스템 프롬프트</span>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                      {prompt.systemPrompt}
                    </pre>
                  </div>

                  {/* User Prompt Template */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">USER</span>
                      <span className="text-sm font-medium text-gray-700">사용자 프롬프트 템플릿</span>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                      {prompt.userPromptTemplate}
                    </pre>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      * 중괄호({'{'}...{'}'}) 안의 변수들은 실제 데이터로 치환됩니다.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GPT 비용 최적화 */}
          {section.costTable && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">API별 비용 예상:</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left font-medium text-gray-700">API</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Model</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">max_tokens</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">예상 비용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.costTable.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="px-4 py-2 font-mono text-xs text-blue-600">{row.api}</td>
                          <td className="px-4 py-2 text-gray-700">{row.model}</td>
                          <td className="px-4 py-2 text-gray-700">{row.maxTokens}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              row.cost === '낮음' ? 'bg-green-100 text-green-700' :
                              row.cost === '중간' ? 'bg-yellow-100 text-yellow-700' :
                              row.cost === '높음' ? 'bg-red-100 text-red-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {row.cost}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {section.optimizationTips && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">비용 절감 팁:</div>
                  <ul className="space-y-1">
                    {section.optimizationTips.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-green-500">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 체크리스트 */}
          {section.phases && (
            <div className="space-y-4">
              {section.phases.map((phase: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    {phase.phase}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {phase.tasks.map((task: string, tIdx: number) => (
                      <div key={tIdx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0"></span>
                        {task}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 주의사항 */}
          {section.items && section.id === 'cautions' && (
            <div className="space-y-3">
              {section.items.map((item: any, idx: number) => (
                <div key={idx} className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4">
                  <h4 className="font-semibold text-amber-800">{item.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* 참고 자료 */}
          {section.links && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.links.map((link: any, idx: number) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-50 hover:bg-blue-100 rounded-lg p-4 border border-blue-200 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-700">{link.name}</span>
                    <svg
                      className="w-4 h-4 text-blue-400 group-hover:text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{link.url}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 메인 페이지
export default function DevelopmentSpec() {
  const [openSections, setOpenSections] = useState<string[]>(specData.sections.map((s) => s.id));

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const expandAll = () => setOpenSections(specData.sections.map((s) => s.id));
  const collapseAll = () => setOpenSections([]);

  return (
    <>
      <Head>
        <title>개발 명세서 - 키워드 통합 분석</title>
        <meta name="description" content="키워드 통합 분석 페이지 개발 명세서" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    DEVELOPMENT SPEC
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">{specData.title}</h1>
                <p className="text-sm text-gray-500 mt-1">{specData.overview}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  모두 펼치기
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  모두 접기
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 목차 */}
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">목차</h3>
            <div className="flex flex-wrap gap-2">
              {specData.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    if (!openSections.includes(section.id)) {
                      setOpenSections((prev) => [...prev, section.id]);
                    }
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-lg transition-colors"
                >
                  {section.icon} {section.title.replace(/^\d+(-\d+)?\.\s*/, '')}
                </button>
              ))}
            </div>
          </div>

          {/* 섹션들 */}
          <div className="space-y-4">
            {specData.sections.map((section) => (
              <div key={section.id} id={section.id}>
                <Section
                  section={section}
                  isOpen={openSections.includes(section.id)}
                  onToggle={() => toggleSection(section.id)}
                />
              </div>
            ))}
          </div>

          {/* 푸터 */}
          <footer className="mt-8 py-6 text-center text-sm text-gray-500">
            <p>Generated by GPTKOREA Keyword Analysis Service</p>
            <p className="mt-1">Last Updated: {new Date().toLocaleDateString('ko-KR')}</p>
          </footer>
        </div>
      </div>
    </>
  );
}
