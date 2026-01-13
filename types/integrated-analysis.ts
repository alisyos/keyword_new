// 키워드 통합 분석 타입 정의

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
  companyName: string;

  // Step 2: 키워드 확장
  keywordExpansion: KeywordExpansionResult | null;
  keywordExpansionLoading: boolean;

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

  // 종합 리포트
  integratedReport: IntegratedReportData | null;
  reportLoading: boolean;
}

// API 요청 타입
export interface IntegratedReportRequest {
  keyword: string;
  companyName?: string;
  keywordExpansion: KeywordExpansionResult;
  contentAnalysis: {
    blog?: KeywordAnalysisResult;
    cafe?: KeywordAnalysisResult;
    youtube?: KeywordAnalysisResult;
    news?: KeywordAnalysisResult;
  };
  adAnalysis?: AdAnalysisResult;
}

// 초기 상태
export const initialAnalysisState: IntegratedAnalysisState = {
  keyword: '',
  companyName: '',
  keywordExpansion: null,
  keywordExpansionLoading: false,
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
  selectedChannels: ['blog', 'youtube'],
  adAnalysis: null,
  adAnalysisLoading: false,
  skipAdAnalysis: false,
  adInputMode: 'text',
  adText: '',
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

// 단계 정보
export const stepInfo: Array<{ step: WizardStep; title: string; description: string }> = [
  { step: 1, title: '키워드 입력', description: '분석할 키워드와 업체명을 입력하세요' },
  { step: 2, title: '키워드 확장', description: '연관 키워드와 검색량을 분석합니다' },
  { step: 3, title: '콘텐츠 분석', description: '채널별 콘텐츠와 감성을 분석합니다' },
  { step: 4, title: '광고 분석', description: '경쟁 광고를 분석합니다 (선택)' },
  { step: 5, title: '종합 리포트', description: '분석 결과를 종합한 마케팅 리포트입니다' },
];
