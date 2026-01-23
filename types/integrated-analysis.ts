// 키워드 통합 분석 타입 정의

// ===== 키워드 유형 =====
export type KeywordType = 'general' | 'shopping' | 'brand';

// ===== 기존 페이지에서 가져온 타입 =====

// 키워드 분석 관련 타입
export interface KeywordData {
  keyword: string;
  frequency: number;
}

export interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
  positiveKeywords: Array<{ keyword: string; score: number }>;
  negativeKeywords: Array<{ keyword: string; score: number }>;
}

export interface ContentItem {
  title: string;
  link: string;
  description: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  score?: number;
  publishedAt?: string;
}

export interface KeywordAnalysisResult {
  keywords: KeywordData[];
  sentiment?: SentimentData;
  contentType?: string;
  contentItems?: ContentItem[];
}

// 키워드 확장 관련 타입
export interface KeywordExpansionData {
  relKeyword: string;
  monthlyPcQcCnt: string;
  monthlyMobileQcCnt: string;
  monthlyAvePcClkCnt: string;
  monthlyAveMobileClkCnt: string;
  monthlyAvePcCtr: string;
  monthlyAveMobileCtr: string;
  plAvgDepth: string;
  compIdx: string;
}

export interface KeywordExpansionResult {
  keyword: string;
  timestamp: string;
  status: string;
  keywordList: KeywordExpansionData[];
}

// 키워드 확장 GPT 분석 결과 (간소화)
export interface KeywordExpansionGPTAnalysis {
  searchVolumeAnalysis: string;      // 1. 검색량(수요) 분석
  engagementAnalysis: string;        // 2. 클릭수 및 클릭율 분석
  competitionAnalysis: string;       // 3. 경쟁강도 분석
  consumerTrendAnalysis: string;     // 4. 소비자 인식 및 행동 트렌드
  conclusion: string;                // 5. 결론 및 마케팅 시사점
}

// 광고 분석 관련 타입
export interface AdAnalysisResult {
  ourAd: {
    rank: number;
    evaluation: {
      title: string;
      description: string;
    };
  };
  competitorAnalysis: string;
  adSuggestions: Array<{
    title: string;
    description: string;
    improvementPoints: string;
  }>;
}

// 쇼핑 검색 분석 결과 (텍스트 붙여넣기 기반)
export interface ShoppingSearchAnalysisResult {
  keyword: string;
  timestamp: string;
  inputText: string;
  gptAnalysis: {
    priceAnalysis: string;
    topBrands: string;
    productFeatures: string;
    purchaseFactors: string;
    marketPositioning: string;
    recommendations: string[];
  };
}

// 브랜드 비교 데이터
export interface BrandComparisonData {
  brandKeyword: string;
  isOwnBrand: boolean;
  keywordExpansion: KeywordExpansionResult | null;
  contentAnalysis: {
    blog: KeywordAnalysisResult | null;
    cafe: KeywordAnalysisResult | null;
    youtube: KeywordAnalysisResult | null;
    news: KeywordAnalysisResult | null;
  };
}

export interface BrandComparisonResult {
  ownBrand: BrandComparisonData;
  competitors: BrandComparisonData[];
}

// ===== 통합 분석 전용 타입 =====

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type ContentType = 'blog' | 'cafe' | 'youtube' | 'news';

export interface StepStatus {
  step: WizardStep;
  isCompleted: boolean;
  isLoading: boolean;
  error?: string;
}

// 채널별 요약 정보
export interface ChannelSummary {
  channel: ContentType;
  channelName: string;
  totalContents: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topKeywords: string[];
  keyFindings: string[];
}

// 실행 가능한 마케팅 전략
export interface ActionableStrategy {
  strategy: string;
  priority: 'high' | 'medium' | 'low';
  timeline: string;
  expectedOutcome: string;
}

// 종합 리포트 데이터 구조 (PPT 수준 확장 버전)
export interface IntegratedReportData {
  generatedAt: string;
  keyword: string;
  companyName?: string;

  // 1. Executive Summary (핵심 요약)
  executiveSummary: {
    keyMetrics: Array<{
      label: string;
      value: string;
      description: string;
    }>;
    winningFormula: string;
    marketOpportunity: string;
  };

  // 2. 3단계 소비자 인식 구조
  perceptionStages: {
    stage1_awareness: {
      title: string;
      insight: string;
      keywords: string[];
      metrics: string;
    };
    stage2_comparison: {
      title: string;
      insight: string;
      keywords: string[];
      metrics: string;
    };
    stage3_conversion: {
      title: string;
      insight: string;
      painPoints: string[];
      sentiment: string;
    };
  };

  // 3. 핵심 키워드 맵
  keywordMap: {
    totalSearchVolume: string;
    topKeywords: Array<{
      rank: number;
      keyword: string;
      frequency: number;
    }>;
    painPointKeywords: Array<{
      keyword: string;
      frequency: number;
    }>;
    dataInsights: string[];
  };

  // 4. 채널별 소비자 반응
  channelBreakdown: Array<{
    channel: string;
    channelName: string;
    role: string;
    keyInterests: string[];
    strategy: string;
    sentimentBreakdown?: {
      positive: number;
      negative: number;
      neutral: number;
    };
  }>;

  // 5. 시장 환경 분석
  marketEnvironment: {
    competitionAnalysis: {
      level: string;
      insight: string;
      keyPlayers: string[];
    };
    digitalTrends: {
      mobileShare: string;
      contentFreshness: string;
      orgChanges: string[];
    };
  };

  // 6-7. 마케팅 인사이트 (Pain Point → Opportunity 구조)
  marketingInsights: Array<{
    id: number;
    title: string;
    painPoint: {
      label: string;
      details: string[];
    };
    opportunity: {
      label: string;
      details: string[];
    };
    action: string;
  }>;

  // 8-12. 실행 전략 (5개 상세)
  actionStrategies: Array<{
    id: number;
    title: string;
    subtitle: string;
    sections: Array<{
      heading: string;
      items: string[];
    }>;
    expectedMetrics?: Array<{
      label: string;
      value: string;
    }>;
  }>;

  // 13. 90일 액션플랜
  actionPlan: {
    keyFindings: string[];
    timeline: Array<{
      phase: 'NOW' | '30d' | '60d' | '90d';
      label: string;
      category: string;
      action: string;
    }>;
  };

  // 14. 종합 결론
  conclusion: {
    summary: string;
    recommendations: string[];
  };
}

// 통합 분석 전체 상태
export interface IntegratedAnalysisState {
  // Step 1: 키워드 입력
  keyword: string;
  keywordType: KeywordType;
  companyName: string;
  competitorBrands: string[];

  // Step 2: 키워드 확장
  keywordExpansion: KeywordExpansionResult | null;
  keywordExpansionLoading: boolean;
  keywordExpansionGPTAnalysis: KeywordExpansionGPTAnalysis | null;
  keywordExpansionGPTLoading: boolean;

  // Step 3: 콘텐츠 분석 (채널별)
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
  selectedChannels: ContentType[];

  // Step 4: 광고 분석 (선택사항)
  adAnalysis: AdAnalysisResult | null;
  adAnalysisLoading: boolean;
  skipAdAnalysis: boolean;
  adInputMode: 'image' | 'text';
  adText: string;

  // Step 4: 쇼핑 검색 분석 (쇼핑 유형용)
  shoppingAnalysis: ShoppingSearchAnalysisResult | null;
  shoppingAnalysisLoading: boolean;
  shoppingText: string;

  // 브랜드 비교 (브랜드 유형용)
  brandComparison: BrandComparisonResult | null;
  brandComparisonLoading: boolean;

  // 종합 리포트
  integratedReport: IntegratedReportData | null;
  reportLoading: boolean;
}

// API 요청 타입
export interface IntegratedReportRequest {
  keyword: string;
  keywordType: KeywordType;
  companyName?: string;
  keywordExpansion: KeywordExpansionResult;
  keywordExpansionGPTAnalysis?: KeywordExpansionGPTAnalysis;
  contentAnalysis: {
    blog?: KeywordAnalysisResult;
    cafe?: KeywordAnalysisResult;
    youtube?: KeywordAnalysisResult;
    news?: KeywordAnalysisResult;
  };
  adAnalysis?: AdAnalysisResult;
  shoppingAnalysis?: ShoppingSearchAnalysisResult;
  brandComparison?: BrandComparisonResult;
}

// 초기 상태
export const initialAnalysisState: IntegratedAnalysisState = {
  keyword: '',
  keywordType: 'general',
  companyName: '',
  competitorBrands: [],
  keywordExpansion: null,
  keywordExpansionLoading: false,
  keywordExpansionGPTAnalysis: null,
  keywordExpansionGPTLoading: false,
  contentAnalysis: {
    blog: null,
    cafe: null,
    youtube: null,
    news: null,
  },
  contentAnalysisLoading: {
    blog: false,
    cafe: false,
    youtube: false,
    news: false,
  },
  selectedChannels: ['blog', 'cafe', 'youtube', 'news'],
  adAnalysis: null,
  adAnalysisLoading: false,
  skipAdAnalysis: false,
  adInputMode: 'text',
  adText: '',
  shoppingAnalysis: null,
  shoppingAnalysisLoading: false,
  shoppingText: '',
  brandComparison: null,
  brandComparisonLoading: false,
  integratedReport: null,
  reportLoading: false,
};

// 채널 이름 매핑
export const channelNames: Record<ContentType, string> = {
  blog: '블로그',
  cafe: '카페',
  youtube: '유튜브',
  news: '뉴스',
};

// 단계 정보 (키워드 유형에 따라 동적으로 생성)
export const getStepInfo = (keywordType: KeywordType): Array<{ step: WizardStep; title: string; description: string }> => {
  const step4Info = {
    general: { title: '광고 분석', description: '경쟁 광고를 분석합니다 (선택)' },
    shopping: { title: '쇼핑 검색 분석', description: '쇼핑 검색 결과를 분석합니다' },
    brand: { title: '광고 분석', description: '자사 브랜드 광고를 분석합니다 (선택)' },
  };

  return [
    { step: 1, title: '키워드 입력', description: '분석할 키워드와 업체명을 입력하세요' },
    { step: 2, title: keywordType === 'brand' ? '브랜드별 키워드 확장' : '키워드 확장', description: keywordType === 'brand' ? '자사/경쟁사 브랜드별 연관 키워드를 분석합니다' : '연관 키워드와 검색량을 분석합니다' },
    { step: 3, title: keywordType === 'brand' ? '브랜드별 콘텐츠 분석' : '콘텐츠 분석', description: keywordType === 'brand' ? '브랜드별 채널 콘텐츠를 비교 분석합니다' : '채널별 콘텐츠와 감성을 분석합니다' },
    { step: 4, title: step4Info[keywordType].title, description: step4Info[keywordType].description },
    { step: 5, title: '종합 리포트', description: '분석 결과를 종합한 마케팅 리포트입니다' },
  ];
};

// 기본 단계 정보 (하위 호환성용)
export const stepInfo = getStepInfo('general');
