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

// 비교 행 데이터 (표 렌더링용) - 동적 키워드 수 지원
export interface BidComparisonRow {
  position: number;
  bids: number[];              // 키워드별 입찰가 배열
  maxBid: number;              // 해당 순위 최고 입찰가
  minBid: number;              // 해당 순위 최저 입찰가
  maxKeyword: string;          // 최고 입찰가 키워드명
  minKeyword: string;          // 최저 입찰가 키워드명
  difference: number;          // 최고 - 최저 차액
  percentDiff: number;         // 차이 퍼센트
}

// API 응답 - 동적 키워드 배열 지원 (2~5개)
export interface BidComparisonResult {
  keywords: KeywordBidResult[];  // 2~5개 키워드
  adType: AdType;
  timestamp: string;
}

// GPT 분석 결과 (PC/모바일 분리) - 동적 키워드 수 지원
export interface BidComparisonAnalysis {
  strategicInflectionPc: string;      // 전략적 분기점 - PC
  strategicInflectionMobile: string;  // 전략적 분기점 - 모바일
  keywordStrategies: {                // 동적 키워드 전략 배열
    keyword: string;
    pc: string;
    mobile: string;
  }[];
}
