// 광고 유형
export type AdType = 'powerlink' | 'powercontent';

// 순위별 입찰가 데이터 (단일 키워드, 단일 디바이스)
export interface BidByPosition {
  position: number;    // 1~10 (PC), 1~5 (Mobile)
  bid: number;         // 입찰가 (원)
}

// 키워드별 입찰가 결과
export interface KeywordBidResult {
  keyword: string;
  pc: BidByPosition[];
  mobile: BidByPosition[];
}

// 비교 행 데이터 (표 렌더링용)
export interface BidComparisonRow {
  position: number;
  bid1: number;
  bid2: number;
  difference: number;       // bid2 - bid1
  percentDiff: number;      // 차이 퍼센트
  higherKeyword: string;    // 더 높은 키워드명
}

// API 응답
export interface BidComparisonResult {
  keyword1: KeywordBidResult;
  keyword2: KeywordBidResult;
  adType: AdType;
  timestamp: string;
}

// GPT 분석 결과 (PC/모바일 분리)
export interface BidComparisonAnalysis {
  strategicInflectionPc: string;      // 전략적 분기점 - PC
  strategicInflectionMobile: string;  // 전략적 분기점 - 모바일
  keyword1StrategyPc: string;         // 키워드1 운영전략 - PC
  keyword1StrategyMobile: string;     // 키워드1 운영전략 - 모바일
  keyword2StrategyPc: string;         // 키워드2 운영전략 - PC
  keyword2StrategyMobile: string;     // 키워드2 운영전략 - 모바일
}
