import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import {
  IntegratedReportData,
  IntegratedReportRequest,
  KeywordExpansionResult,
  KeywordExpansionGPTAnalysis,
  KeywordAnalysisResult,
  AdAnalysisResult,
  ShoppingSearchAnalysisResult,
  ShoppingPlatformData,
  BrandComparisonResult,
  BrandComparisonData,
  BrandKeywordComparisonGPTAnalysis,
  BrandContentComparisonGPTAnalysis,
  ContentType,
  KeywordType,
  channelNames,
} from '../../types/integrated-analysis';

// OpenAI 클라이언트 생성
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ report: IntegratedReportData } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      keyword,
      keywordType = 'general',
      companyName,
      keywordExpansion,
      keywordExpansionGPTAnalysis,
      contentAnalysis,
      adAnalysis,
      shoppingAnalysis,
      brandComparison,
      brandKeywordExpansionGPT,
      brandContentComparisonGPT,
      brandAdAnalysis,
    }: IntegratedReportRequest = req.body;

    if (!keyword) {
      return res.status(400).json({ error: '키워드가 누락되었습니다.' });
    }

    if (!keywordExpansion) {
      return res.status(400).json({ error: '키워드 확장 데이터가 누락되었습니다.' });
    }

    // 분석 데이터 요약 생성
    const dataSummary = buildDataSummary(keyword, keywordType, keywordExpansion, keywordExpansionGPTAnalysis, contentAnalysis, adAnalysis, shoppingAnalysis, brandComparison, brandKeywordExpansionGPT, brandContentComparisonGPT, brandAdAnalysis);

    // GPT를 사용하여 종합 리포트 생성
    const report = await generateIntegratedReport(keyword, keywordType, companyName, dataSummary, keywordExpansion, contentAnalysis, adAnalysis, shoppingAnalysis, brandComparison, brandKeywordExpansionGPT, brandContentComparisonGPT, brandAdAnalysis);

    res.status(200).json({ report });
  } catch (error) {
    console.error('종합 리포트 생성 오류:', error);
    res.status(500).json({ error: '종합 리포트 생성 중 오류가 발생했습니다.' });
  }
}

// 총 검색량 계산
function calculateTotalSearchVolume(keywordExpansion: KeywordExpansionResult): number {
  if (!keywordExpansion.keywordList) return 0;
  return keywordExpansion.keywordList.reduce((sum, kw) => {
    const pc = kw.monthlyPcQcCnt === '< 10' ? 5 : parseInt(kw.monthlyPcQcCnt) || 0;
    const mobile = kw.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(kw.monthlyMobileQcCnt) || 0;
    return sum + pc + mobile;
  }, 0);
}

// 모바일 비중 계산
function calculateMobileShare(keywordExpansion: KeywordExpansionResult): number {
  if (!keywordExpansion.keywordList) return 0;
  let totalPc = 0;
  let totalMobile = 0;
  keywordExpansion.keywordList.forEach(kw => {
    totalPc += kw.monthlyPcQcCnt === '< 10' ? 5 : parseInt(kw.monthlyPcQcCnt) || 0;
    totalMobile += kw.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(kw.monthlyMobileQcCnt) || 0;
  });
  const total = totalPc + totalMobile;
  return total > 0 ? Math.round((totalMobile / total) * 100) : 0;
}

// ===== 사전 계산 지표 (PreMetrics) =====

interface PreMetrics {
  // 공통
  totalVolume: number;
  mobileShare: number;
  keywordCount: number;
  avgMobileCtr: string;
  dominantCompIdx: string;
  avgPositive: number;
  avgNegative: number;
  // 쇼핑
  shopping?: {
    totalRevenue: number;
    averagePrice: number;
    totalReviews: number;
    averageRating: number;
    topSellerName: string;
    topSellerRevenue: number;
    topRevenueRange: string;
    platformLabel: string;
    sellerCount: number;
  };
  // 브랜드
  brand?: {
    ownBrandName: string;
    ownSearchVolume: number;
    competitorCount: number;
    sov: number;
    ownPositive: number;
    ownNegative: number;
    sentimentGap: number;
    bestCompetitorName: string;
    ownKeywordCount: number;
    totalBrandVolume: number;
    competitors: Array<{ name: string; searchVolume: number; positive: number; negative: number }>;
  };
  // 일반 (광고)
  adRank?: number;
}

function calculatePreMetrics(
  keywordType: KeywordType,
  keywordExpansion: KeywordExpansionResult,
  contentAnalysis: { blog?: KeywordAnalysisResult; cafe?: KeywordAnalysisResult; youtube?: KeywordAnalysisResult; news?: KeywordAnalysisResult },
  adAnalysis?: AdAnalysisResult,
  shoppingAnalysis?: ShoppingSearchAnalysisResult,
  brandComparison?: BrandComparisonResult
): PreMetrics {
  const totalVolume = calculateTotalSearchVolume(keywordExpansion);
  const mobileShare = calculateMobileShare(keywordExpansion);
  const keywordCount = keywordExpansion.keywordList?.length || 0;

  // 평균 모바일 CTR (상위 10개)
  let avgMobileCtr = '-';
  if (keywordExpansion.keywordList?.length > 0) {
    const top10 = keywordExpansion.keywordList.slice(0, 10);
    const validCtrs = top10
      .map(k => k.monthlyAveMobileCtr)
      .filter(c => c !== '< 10' && c !== '-' && c !== '')
      .map(c => parseFloat(c));
    if (validCtrs.length > 0) {
      avgMobileCtr = (validCtrs.reduce((s, v) => s + v, 0) / validCtrs.length).toFixed(1) + '%';
    }
  }

  // 가장 빈번한 경쟁도
  let dominantCompIdx = '중간';
  if (keywordExpansion.keywordList?.length > 0) {
    const highComp = keywordExpansion.keywordList.filter(k => k.compIdx === '높음').length;
    const midComp = keywordExpansion.keywordList.filter(k => k.compIdx === '중간').length;
    const lowComp = keywordExpansion.keywordList.filter(k => k.compIdx === '낮음').length;
    if (highComp >= midComp && highComp >= lowComp) dominantCompIdx = '높음';
    else if (lowComp >= midComp && lowComp >= highComp) dominantCompIdx = '낮음';
  }

  // 전체 감성 평균
  const channels: ContentType[] = ['blog', 'cafe', 'youtube', 'news'];
  let totalPositive = 0, totalNegative = 0, channelCount = 0;
  channels.forEach(ch => {
    const data = contentAnalysis[ch];
    if (data?.sentiment) {
      totalPositive += data.sentiment.positive;
      totalNegative += data.sentiment.negative;
      channelCount++;
    }
  });
  const avgPositive = channelCount > 0 ? Math.round(totalPositive / channelCount) : 0;
  const avgNegative = channelCount > 0 ? Math.round(totalNegative / channelCount) : 0;

  const metrics: PreMetrics = {
    totalVolume, mobileShare, keywordCount, avgMobileCtr, dominantCompIdx,
    avgPositive, avgNegative,
  };

  // 광고 순위
  if (adAnalysis && adAnalysis.ourAd.rank > 0) {
    metrics.adRank = adAnalysis.ourAd.rank;
  }

  // 쇼핑 지표 계산
  if (keywordType === 'shopping' && shoppingAnalysis) {
    const gpt = shoppingAnalysis.gptAnalysis;
    const isDual = shoppingAnalysis.sources.length === 2;
    // 사용할 플랫폼 데이터 결정
    const platforms: ShoppingPlatformData[] = [];
    if (isDual && gpt.naver) platforms.push(gpt.naver);
    if (isDual && gpt.coupang) platforms.push(gpt.coupang);
    if (!isDual && gpt.combined) platforms.push(gpt.combined);

    let totalRevenue = 0, totalReviews = 0, totalProducts = 0;
    let sumPrice = 0, sumRating = 0, platformCount = 0;
    let topSellerName = '-', topSellerRevenue = 0;
    let topRevenueRange = '-', topRevenueValue = 0;

    platforms.forEach(p => {
      totalRevenue += p.overall.estimatedRevenue;
      totalReviews += p.overall.totalReviews;
      totalProducts += p.overall.totalProducts;
      sumPrice += p.overall.averagePrice;
      sumRating += p.overall.averageRating;
      platformCount++;

      if (p.sellers.topSellers.length > 0) {
        const topSeller = p.sellers.topSellers[0];
        if (topSeller.estimatedRevenue > topSellerRevenue) {
          topSellerName = topSeller.seller;
          topSellerRevenue = topSeller.estimatedRevenue;
        }
      }

      p.priceRanges.priceRanges.forEach(pr => {
        if (pr.estimatedRevenue > topRevenueValue) {
          topRevenueValue = pr.estimatedRevenue;
          topRevenueRange = pr.range;
        }
      });
    });

    const sourceLabel = shoppingAnalysis.sources.length === 2
      ? '네이버 쇼핑 + 쿠팡'
      : shoppingAnalysis.sources.includes('coupang') ? '쿠팡' : '네이버 쇼핑';

    metrics.shopping = {
      totalRevenue,
      averagePrice: platformCount > 0 ? Math.round(sumPrice / platformCount) : 0,
      totalReviews,
      averageRating: platformCount > 0 ? parseFloat((sumRating / platformCount).toFixed(1)) : 0,
      topSellerName,
      topSellerRevenue,
      topRevenueRange,
      platformLabel: sourceLabel,
      sellerCount: platforms.reduce((sum, p) => sum + p.sellers.topSellers.length, 0),
    };
  }

  // 브랜드 지표 계산
  if (keywordType === 'brand' && brandComparison) {
    const ownBrand = brandComparison.ownBrand;
    const calcBrandSearchVolume = (brand: BrandComparisonData): number => {
      if (!brand.keywordExpansion?.keywordList) return 0;
      return brand.keywordExpansion.keywordList.reduce((sum, kw) => {
        const pc = kw.monthlyPcQcCnt === '< 10' ? 5 : parseInt(kw.monthlyPcQcCnt) || 0;
        const mobile = kw.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(kw.monthlyMobileQcCnt) || 0;
        return sum + pc + mobile;
      }, 0);
    };

    const calcBrandSentiment = (brand: BrandComparisonData): { positive: number; negative: number } => {
      const chs = ['blog', 'cafe', 'youtube', 'news'] as const;
      let pos = 0, neg = 0, cnt = 0;
      chs.forEach(ch => {
        const d = brand.contentAnalysis?.[ch];
        if (d?.sentiment) {
          pos += d.sentiment.positive || 0;
          neg += d.sentiment.negative || 0;
          cnt++;
        }
      });
      return { positive: cnt > 0 ? Math.round(pos / cnt) : 0, negative: cnt > 0 ? Math.round(neg / cnt) : 0 };
    };

    const ownVolume = calcBrandSearchVolume(ownBrand);
    const ownSentiment = calcBrandSentiment(ownBrand);
    const ownKeywordCount = ownBrand.keywordExpansion?.keywordList?.length || 0;

    const competitorData = brandComparison.competitors.map(comp => {
      const vol = calcBrandSearchVolume(comp);
      const sent = calcBrandSentiment(comp);
      return { name: comp.brandKeyword, searchVolume: vol, positive: sent.positive, negative: sent.negative };
    });

    const totalBrandVolume = ownVolume + competitorData.reduce((s, c) => s + c.searchVolume, 0);
    const sov = totalBrandVolume > 0 ? parseFloat(((ownVolume / totalBrandVolume) * 100).toFixed(1)) : 0;

    const bestCompetitor = competitorData.length > 0
      ? competitorData.reduce((best, c) => c.positive > best.positive ? c : best, competitorData[0])
      : null;
    const sentimentGap = bestCompetitor ? parseFloat((ownSentiment.positive - bestCompetitor.positive).toFixed(1)) : 0;

    metrics.brand = {
      ownBrandName: ownBrand.brandKeyword,
      ownSearchVolume: ownVolume,
      competitorCount: brandComparison.competitors.length,
      sov,
      ownPositive: ownSentiment.positive,
      ownNegative: ownSentiment.negative,
      sentimentGap,
      bestCompetitorName: bestCompetitor?.name || '-',
      ownKeywordCount,
      totalBrandVolume,
      competitors: competitorData,
    };
  }

  return metrics;
}

// ===== 유형별 핵심 수치 섹션 =====

function buildKeyMetricsSection(keywordType: KeywordType, metrics: PreMetrics): string {
  if (keywordType === 'shopping' && metrics.shopping) {
    const s = metrics.shopping;
    return `=== 핵심 수치 (이커머스) ===
- 총 추정 매출액: ${s.totalRevenue.toLocaleString()}원
- 평균 상품 가격: ${s.averagePrice.toLocaleString()}원
- 총 리뷰 수: ${s.totalReviews.toLocaleString()}개
- 평균 평점: ${s.averageRating}
- TOP 판매자 1위: ${s.topSellerName} (매출 추정 ${s.topSellerRevenue.toLocaleString()}원)
- 최고 매출 가격대: ${s.topRevenueRange}
- 분석 플랫폼: ${s.platformLabel}
- 총 월간 검색량: ${metrics.totalVolume.toLocaleString()}건
- 모바일 비중: ${metrics.mobileShare}%`;
  }

  if (keywordType === 'brand' && metrics.brand) {
    const b = metrics.brand;
    return `=== 핵심 수치 (브랜드 비교) ===
- 자사 브랜드(${b.ownBrandName}) 검색량: ${b.ownSearchVolume.toLocaleString()}건
- 경쟁사 수: ${b.competitorCount}개 브랜드
- 자사 SOV (검색 점유율): ${b.sov}%
- 자사 감성: 긍정 ${b.ownPositive}%, 부정 ${b.ownNegative}%
- 감성 격차: 자사 vs 최고 경쟁사(${b.bestCompetitorName}) ${b.sentimentGap > 0 ? '+' : ''}${b.sentimentGap}%p
- 자사 연관 키워드: ${b.ownKeywordCount}개
- 전체 브랜드 합산 검색량: ${b.totalBrandVolume.toLocaleString()}건`;
  }

  // general
  let section = `=== 핵심 수치 ===
- 총 월간 검색량: ${metrics.totalVolume.toLocaleString()}건
- 모바일 비중: ${metrics.mobileShare}%
- 분석된 연관 키워드: ${metrics.keywordCount}개
- 평균 모바일 CTR: ${metrics.avgMobileCtr}
- 주요 경쟁도: ${metrics.dominantCompIdx}
- 전체 감성: 긍정 ${metrics.avgPositive}%, 부정 ${metrics.avgNegative}%`;
  if (metrics.adRank) {
    section += `\n- 자사 광고 순위: ${metrics.adRank}위`;
  }
  return section;
}

// ===== 데이터 → 리포트 매핑 가이드 =====

function buildDataMappingGuide(keywordType: KeywordType): string {
  if (keywordType === 'shopping') {
    return `=== 데이터 → 리포트 매핑 ===
- "쇼핑 검색 분석 > 전체 분석" → executiveSummary.keyMetrics
- "쇼핑 검색 분석 > TOP 판매자" → marketEnvironment.competitionAnalysis.keyPlayers + insight
- "쇼핑 검색 분석 > 가격대 분석" → actionStrategies[1] (가격 경쟁력 전략)
- "채널별 콘텐츠 분석" → channelBreakdown (감성 수치 반영)`;
  }

  if (keywordType === 'brand') {
    return `=== 데이터 → 리포트 매핑 ===
- "브랜드 비교 > 자사 브랜드" → executiveSummary.keyMetrics (SOV, 검색량)
- "브랜드 비교 > 경쟁사" → marketEnvironment.competitionAnalysis
- "브랜드 경쟁 구도 요약" → keywordMap.dataInsights
- 자사 vs 경쟁사 감성 차이 → perceptionStages.stage2_comparison`;
  }

  // general
  return `=== 데이터 → 리포트 매핑 ===
- 키워드 확장 데이터 → executiveSummary.keyMetrics (검색량, CTR, 경쟁도)
- 광고 분석 데이터 → actionStrategies (광고 순위, 경쟁사 분석)
- 채널별 콘텐츠 분석 → channelBreakdown (감성 수치 반영)`;
}

// 분석 데이터 요약 생성
function buildDataSummary(
  keyword: string,
  keywordType: KeywordType,
  keywordExpansion: KeywordExpansionResult,
  keywordExpansionGPTAnalysis: KeywordExpansionGPTAnalysis | undefined,
  contentAnalysis: { blog?: KeywordAnalysisResult; cafe?: KeywordAnalysisResult; youtube?: KeywordAnalysisResult; news?: KeywordAnalysisResult },
  adAnalysis?: AdAnalysisResult,
  shoppingAnalysis?: ShoppingSearchAnalysisResult,
  brandComparison?: BrandComparisonResult,
  brandKeywordExpansionGPT?: BrandKeywordComparisonGPTAnalysis,
  brandContentComparisonGPT?: BrandContentComparisonGPTAnalysis,
  brandAdAnalysis?: Array<{ brandKeyword: string; isOwnBrand: boolean; result: AdAnalysisResult }>
): string {
  // 분석 목적 컨텍스트 추가
  const analysisContext: Record<KeywordType, string> = {
    general: '📋 분석 목적: 검색광고 캠페인 최적화를 위한 키워드/광고 전략 수립',
    shopping: '🛒 분석 목적: 네이버 쇼핑/쿠팡 멀티 플랫폼 상품 판매 최적화를 위한 시장/가격/경쟁 전략 수립',
    brand: '🏷️ 분석 목적: 브랜드 경쟁력 강화를 위한 포지셔닝/차별화 전략 수립',
  };

  let summary = `# ${analysisContext[keywordType]}\n\n`;

  // 키워드 확장 데이터 요약
  summary += '## 키워드 확장 분석 데이터\n\n';
  if (keywordExpansion.keywordList && keywordExpansion.keywordList.length > 0) {
    const totalVolume = calculateTotalSearchVolume(keywordExpansion);
    const mobileShare = calculateMobileShare(keywordExpansion);

    summary += `### 검색량 개요\n`;
    summary += `- 총 월간 검색량: ${totalVolume.toLocaleString()}건\n`;
    summary += `- 모바일 비중: ${mobileShare}%\n`;
    summary += `- 분석된 연관 키워드 수: ${keywordExpansion.keywordList.length}개\n\n`;

    const topKeywords = keywordExpansion.keywordList.slice(0, 20);
    summary += '### 상위 연관 키워드 (검색량 기준)\n';
    topKeywords.forEach((kw, idx) => {
      const pcVol = kw.monthlyPcQcCnt === '< 10' ? '10 미만' : parseInt(kw.monthlyPcQcCnt).toLocaleString();
      const mobileVol = kw.monthlyMobileQcCnt === '< 10' ? '10 미만' : parseInt(kw.monthlyMobileQcCnt).toLocaleString();
      const ctr = kw.monthlyAveMobileCtr !== '< 10' ? `${parseFloat(kw.monthlyAveMobileCtr).toFixed(1)}%` : '-';
      summary += `${idx + 1}. ${kw.relKeyword} - PC: ${pcVol}, 모바일: ${mobileVol}, CTR: ${ctr}, 경쟁도: ${kw.compIdx}\n`;
    });

    // 경쟁도 분포
    const highComp = keywordExpansion.keywordList.filter(k => k.compIdx === '높음').length;
    const midComp = keywordExpansion.keywordList.filter(k => k.compIdx === '중간').length;
    const lowComp = keywordExpansion.keywordList.filter(k => k.compIdx === '낮음').length;
    summary += `\n### 경쟁도 분포\n`;
    summary += `- 높음: ${highComp}개 키워드 (${Math.round(highComp / keywordExpansion.keywordList.length * 100)}%)\n`;
    summary += `- 중간: ${midComp}개 키워드 (${Math.round(midComp / keywordExpansion.keywordList.length * 100)}%)\n`;
    summary += `- 낮음: ${lowComp}개 키워드 (${Math.round(lowComp / keywordExpansion.keywordList.length * 100)}%)\n`;

    // AI 분석 인사이트 추가
    if (keywordExpansionGPTAnalysis) {
      summary += `\n### AI 분석 인사이트\n`;
      summary += `- 검색량 분석: ${keywordExpansionGPTAnalysis.searchVolumeAnalysis}\n`;
      summary += `- 클릭율 분석: ${keywordExpansionGPTAnalysis.engagementAnalysis}\n`;
      summary += `- 경쟁강도 분석: ${keywordExpansionGPTAnalysis.competitionAnalysis}\n`;
      summary += `- 소비자 트렌드: ${keywordExpansionGPTAnalysis.consumerTrendAnalysis}\n`;
      summary += `- 결론: ${keywordExpansionGPTAnalysis.conclusion}\n`;
    }
  }

  // 콘텐츠 분석 데이터 요약
  summary += '\n## 채널별 콘텐츠 분석 데이터\n\n';

  const channels: ContentType[] = ['blog', 'cafe', 'youtube', 'news'];
  let totalPositive = 0;
  let totalNegative = 0;
  let totalNeutral = 0;
  let channelCount = 0;

  channels.forEach(channel => {
    const data = contentAnalysis[channel];
    if (data) {
      channelCount++;
      summary += `### ${channelNames[channel]}\n`;

      // 감성 분석
      if (data.sentiment) {
        totalPositive += data.sentiment.positive;
        totalNegative += data.sentiment.negative;
        totalNeutral += data.sentiment.neutral;
        summary += `- 감성 분석: 긍정 ${data.sentiment.positive}%, 중립 ${data.sentiment.neutral}%, 부정 ${data.sentiment.negative}%\n`;

        if (data.sentiment.positiveKeywords && data.sentiment.positiveKeywords.length > 0) {
          summary += `- 긍정 키워드: ${data.sentiment.positiveKeywords.slice(0, 5).map(k => `${k.keyword}(${k.score})`).join(', ')}\n`;
        }
        if (data.sentiment.negativeKeywords && data.sentiment.negativeKeywords.length > 0) {
          summary += `- 부정 키워드: ${data.sentiment.negativeKeywords.slice(0, 5).map(k => `${k.keyword}(${k.score})`).join(', ')}\n`;
        }
      }

      // 주요 키워드
      if (data.keywords && data.keywords.length > 0) {
        summary += `- 주요 키워드 (빈도순): ${data.keywords.slice(0, 10).map(k => `${k.keyword}(${k.frequency})`).join(', ')}\n`;
      }

      // 콘텐츠 수
      if (data.contentItems) {
        summary += `- 분석된 콘텐츠 수: ${data.contentItems.length}개\n`;
      }

      // 작성일 기준 분석
      if ((data as any).dateAnalysis) {
        const da = (data as any).dateAnalysis;
        const dated = da.threeMonths + da.oneYear + da.twoYears + da.older;
        if (dated > 0) {
          const pct = (n: number) => Math.round(n / dated * 100);
          summary += `- 작성일 분포 (총 ${dated}개): 최근 3개월 ${da.threeMonths}개(${pct(da.threeMonths)}%), 3개월~1년 ${da.oneYear}개(${pct(da.oneYear)}%), 1년~2년 ${da.twoYears}개(${pct(da.twoYears)}%), 2년 이상 ${da.older}개(${pct(da.older)}%)\n`;
        }
      }

      summary += '\n';
    }
  });

  // 전체 감성 평균
  if (channelCount > 0) {
    summary += `### 전체 채널 감성 평균\n`;
    summary += `- 긍정: ${Math.round(totalPositive / channelCount)}%\n`;
    summary += `- 중립: ${Math.round(totalNeutral / channelCount)}%\n`;
    summary += `- 부정: ${Math.round(totalNegative / channelCount)}%\n\n`;
  }

  // 광고 분석 데이터 요약 (일반/브랜드 유형만)
  if (adAnalysis && (keywordType === 'general' || keywordType === 'brand')) {
    summary += '## 광고 분석 데이터\n\n';
    summary += `### 자사 광고 현황\n`;
    summary += `- 현재 순위: ${adAnalysis.ourAd.rank > 0 ? `${adAnalysis.ourAd.rank}위` : '미노출'}\n`;
    if (adAnalysis.ourAd.rank > 0) {
      summary += `- 제목 평가: ${adAnalysis.ourAd.evaluation.title}\n`;
      summary += `- 설명 평가: ${adAnalysis.ourAd.evaluation.description}\n`;
    }

    summary += `\n### 경쟁사 광고 분석\n`;
    summary += adAnalysis.competitorAnalysis + '\n';

    summary += `\n### 광고 개선 제안\n`;
    adAnalysis.adSuggestions.forEach((s, idx) => {
      summary += `${idx + 1}. ${s.title}\n   설명: ${s.description}\n   개선포인트: ${s.improvementPoints}\n`;
    });
  }

  // 쇼핑 검색 분석 데이터 요약 (쇼핑 유형)
  if (shoppingAnalysis && keywordType === 'shopping') {
    const sourceLabel = shoppingAnalysis.sources?.length === 2
      ? '네이버 쇼핑 + 쿠팡'
      : shoppingAnalysis.sources?.includes('coupang') ? '쿠팡' : '네이버 쇼핑';
    summary += `\n## 쇼핑 검색 분석 데이터 (소스: ${sourceLabel})\n\n`;

    const renderPlatformSummary = (data: ShoppingPlatformData, label: string) => {
      let s = `### ${label} 전체 분석\n`;
      s += `- 총 상품 수: ${data.overall.totalProducts}개\n`;
      s += `- 평균 가격: ${data.overall.averagePrice.toLocaleString()}원\n`;
      s += `- 총 리뷰 수: ${data.overall.totalReviews.toLocaleString()}개\n`;
      s += `- 평균 평점: ${data.overall.averageRating.toFixed(1)}\n`;
      s += `- 총 매출액(추정): ${data.overall.estimatedRevenue.toLocaleString()}원\n`;
      if (data.overall.insight) s += `- 인사이트: ${data.overall.insight}\n`;

      s += `\n### ${label} TOP 판매자\n`;
      data.sellers.topSellers.forEach((seller) => {
        s += `${seller.rank}. ${seller.seller} - ${seller.productName} (가격: ${seller.price.toLocaleString()}원, 리뷰: ${seller.reviews}, 평점: ${seller.rating.toFixed(1)}, 매출 추정: ${seller.estimatedRevenue.toLocaleString()}원)\n`;
      });
      if (data.sellers.insight) s += `- 인사이트: ${data.sellers.insight}\n`;

      s += `\n### ${label} 가격대 분석\n`;
      data.priceRanges.priceRanges.forEach((pr) => {
        s += `- ${pr.range}: 상품 ${pr.productCount}개, 평균가 ${pr.averagePrice.toLocaleString()}원, 리뷰 ${pr.totalReviews}, 평점 ${pr.averageRating.toFixed(1)}, 매출 추정 ${pr.estimatedRevenue.toLocaleString()}원\n`;
      });
      if (data.priceRanges.insight) s += `- 인사이트: ${data.priceRanges.insight}\n`;

      return s;
    };

    const gpt = shoppingAnalysis.gptAnalysis;
    const isDual = shoppingAnalysis.sources.length === 2;

    if (isDual && gpt.naver && gpt.coupang) {
      summary += renderPlatformSummary(gpt.naver, '네이버 쇼핑');
      summary += '\n';
      summary += renderPlatformSummary(gpt.coupang, '쿠팡');
    } else if (gpt.combined) {
      summary += renderPlatformSummary(gpt.combined, sourceLabel);
    }

    summary += `\n### 전략\n`;
    if (gpt.strategy.marketPositioning) {
      summary += `- 시장 포지셔닝: ${gpt.strategy.marketPositioning}\n`;
    }
    if (gpt.strategy.marketingStrategy) {
      summary += `- 마케팅 전략: ${gpt.strategy.marketingStrategy}\n`;
    }
  }

  // 브랜드 비교 데이터 요약 (브랜드 유형)
  if (brandComparison && keywordType === 'brand') {
    summary += '\n## 브랜드 비교 분석 데이터\n\n';

    // 자사 브랜드 상세
    const ownBrand = brandComparison.ownBrand;
    summary += `### 자사 브랜드: ${ownBrand.brandKeyword}\n`;
    if (ownBrand.keywordExpansion?.keywordList) {
      const ownKeywords = ownBrand.keywordExpansion.keywordList;
      summary += `- 연관 키워드 수: ${ownKeywords.length}개\n`;
      if (ownKeywords.length > 0) {
        summary += `- 주요 연관 키워드: ${ownKeywords.slice(0, 10).map((k: any) => k.relKeyword).join(', ')}\n`;
      }
    }
    // 자사 브랜드 감성 분석
    if (ownBrand.contentAnalysis) {
      const channels = ['blog', 'cafe', 'youtube', 'news'] as const;
      let totalPositive = 0, totalNegative = 0, channelCount = 0;
      channels.forEach(ch => {
        const data = ownBrand.contentAnalysis?.[ch];
        if (data?.sentiment) {
          totalPositive += data.sentiment.positive || 0;
          totalNegative += data.sentiment.negative || 0;
          channelCount++;
        }
      });
      if (channelCount > 0) {
        summary += `- 평균 감성: 긍정 ${Math.round(totalPositive / channelCount)}%, 부정 ${Math.round(totalNegative / channelCount)}%\n`;
      }
      // 자사 브랜드 작성일 분포
      channels.forEach(ch => {
        const data = ownBrand.contentAnalysis?.[ch] as any;
        if (data?.dateAnalysis) {
          const da = data.dateAnalysis;
          const dated = da.threeMonths + da.oneYear + da.twoYears + da.older;
          if (dated > 0) {
            const pct = (n: number) => Math.round(n / dated * 100);
            summary += `- ${ch} 작성일 분포 (${dated}개): 최근3개월 ${da.threeMonths}개(${pct(da.threeMonths)}%), 3개월~1년 ${da.oneYear}개(${pct(da.oneYear)}%), 1~2년 ${da.twoYears}개(${pct(da.twoYears)}%), 2년+ ${da.older}개(${pct(da.older)}%)\n`;
          }
        }
      });
    }

    // 경쟁사 브랜드들 (상세 데이터 포함)
    summary += '\n### 경쟁사 브랜드 비교\n';
    brandComparison.competitors.forEach((comp: any, idx: number) => {
      summary += `\n${idx + 1}. ${comp.brandKeyword}\n`;
      if (comp.keywordExpansion?.keywordList) {
        const compKeywords = comp.keywordExpansion.keywordList;
        summary += `   - 연관 키워드 수: ${compKeywords.length}개\n`;
        if (compKeywords.length > 0) {
          // 상위 15개 키워드를 검색량/CTR/경쟁도와 함께 표시
          summary += `   - 검색량 상위 15개 키워드:\n`;
          compKeywords.slice(0, 15).forEach((k: any, i: number) => {
            const pcVol = k.monthlyPcQcCnt === '< 10' ? '10미만' : parseInt(k.monthlyPcQcCnt).toLocaleString();
            const moVol = k.monthlyMobileQcCnt === '< 10' ? '10미만' : parseInt(k.monthlyMobileQcCnt).toLocaleString();
            const ctr = k.monthlyAveMobileCtr !== '< 10' ? `${parseFloat(k.monthlyAveMobileCtr).toFixed(1)}%` : '-';
            summary += `     ${i + 1}. ${k.relKeyword} - PC: ${pcVol}, 모바일: ${moVol}, CTR: ${ctr}, 경쟁도: ${k.compIdx}\n`;
          });
        }
      }
      // 경쟁사 감성 분석 + 감성 키워드
      if (comp.contentAnalysis) {
        const channels = ['blog', 'cafe', 'youtube', 'news'] as const;
        let totalPositive = 0, totalNegative = 0, totalNeutral = 0, channelCount = 0;
        channels.forEach(ch => {
          const data = comp.contentAnalysis?.[ch];
          if (data?.sentiment) {
            totalPositive += data.sentiment.positive || 0;
            totalNegative += data.sentiment.negative || 0;
            totalNeutral += data.sentiment.neutral || 0;
            channelCount++;
          }
        });
        if (channelCount > 0) {
          summary += `   - 평균 감성: 긍정 ${Math.round(totalPositive / channelCount)}%, 중립 ${Math.round(totalNeutral / channelCount)}%, 부정 ${Math.round(totalNegative / channelCount)}%\n`;
        }
        // 채널별 감성 + 상위 긍정/부정 키워드
        channels.forEach(ch => {
          const data = comp.contentAnalysis?.[ch] as any;
          if (!data) return;
          if (data.sentiment) {
            summary += `   - [${channelNames[ch]}] 긍정 ${data.sentiment.positive}%, 중립 ${data.sentiment.neutral}%, 부정 ${data.sentiment.negative}%`;
            const pos = (data.sentiment.positiveKeywords || []).slice(0, 5).map((k: any) => `${k.keyword}(${k.score})`).join(', ');
            const neg = (data.sentiment.negativeKeywords || []).slice(0, 5).map((k: any) => `${k.keyword}(${k.score})`).join(', ');
            if (pos) summary += `; 긍정키워드: ${pos}`;
            if (neg) summary += `; 부정키워드: ${neg}`;
            summary += `\n`;
          }
          if (data.keywords && data.keywords.length > 0) {
            summary += `     상위 키워드: ${data.keywords.slice(0, 8).map((k: any) => `${k.keyword}(${k.frequency})`).join(', ')}\n`;
          }
          if (data.dateAnalysis) {
            const da = data.dateAnalysis;
            const dated = da.threeMonths + da.oneYear + da.twoYears + da.older;
            if (dated > 0) {
              const pct = (n: number) => Math.round(n / dated * 100);
              summary += `     작성일 (${dated}개): 최근3개월 ${da.threeMonths}(${pct(da.threeMonths)}%), 3개월~1년 ${da.oneYear}(${pct(da.oneYear)}%), 1~2년 ${da.twoYears}(${pct(da.twoYears)}%), 2년+ ${da.older}(${pct(da.older)}%)\n`;
            }
          }
        });
      }
    });

    // 브랜드 간 비교 인사이트
    summary += '\n### 브랜드 경쟁 구도 요약\n';
    const allBrands = [ownBrand, ...brandComparison.competitors];
    const brandKeywordCounts = allBrands.map((b: any) => ({
      name: b.brandKeyword,
      count: b.keywordExpansion?.keywordList?.length || 0,
    })).sort((a, b) => b.count - a.count);
    summary += `- 연관 키워드 수 순위: ${brandKeywordCounts.map((b, i) => `${i + 1}. ${b.name}(${b.count}개)`).join(', ')}\n`;

    // === Step 2 AI 키워드 비교 분석 결과 ===
    if (brandKeywordExpansionGPT) {
      summary += '\n### AI 키워드 비교 분석 (Step 2)\n';
      brandKeywordExpansionGPT.perBrand.forEach((p) => {
        summary += `\n#### ${p.brandKeyword}${p.isOwnBrand ? ' (자사)' : ''}\n`;
        summary += `- 검색량: ${p.searchVolumeAnalysis}\n`;
        summary += `- 관여도: ${p.engagementAnalysis}\n`;
        summary += `- 경쟁: ${p.competitionAnalysis}\n`;
        summary += `- 트렌드: ${p.consumerTrendAnalysis}\n`;
        summary += `- 결론: ${p.conclusion}\n`;
      });
      summary += `\n#### 브랜드 비교 인사이트\n`;
      summary += `- SOV 해석: ${brandKeywordExpansionGPT.comparison.sovInterpretation}\n`;
      summary += `- 키워드 겹침: ${brandKeywordExpansionGPT.comparison.keywordOverlap}\n`;
      summary += `- 자사 우위: ${brandKeywordExpansionGPT.comparison.competitiveAdvantage}\n`;
      summary += `- 위협 키워드: ${(brandKeywordExpansionGPT.comparison.threatKeywords || []).join(', ') || '-'}\n`;
      summary += `- 기회 키워드: ${(brandKeywordExpansionGPT.comparison.opportunityKeywords || []).join(', ') || '-'}\n`;
      summary += `- 전략 권고: ${brandKeywordExpansionGPT.comparison.strategicRecommendation}\n`;
    }

    // === Step 3 AI 콘텐츠 비교 분석 결과 ===
    if (brandContentComparisonGPT) {
      summary += '\n### AI 콘텐츠 비교 분석 (Step 3)\n';
      brandContentComparisonGPT.perBrand.forEach((p) => {
        summary += `\n#### ${p.brandKeyword}${p.isOwnBrand ? ' (자사)' : ''}\n`;
        summary += `- 강점: ${(p.strengths || []).join('; ') || '-'}\n`;
        summary += `- 약점: ${(p.weaknesses || []).join('; ') || '-'}\n`;
        summary += `- 감성 해석: ${p.sentimentInterpretation}\n`;
        summary += `- 연관 이미지: ${(p.topAssociations || []).join(', ') || '-'}\n`;
        if (p.channelHighlights) {
          Object.entries(p.channelHighlights).forEach(([ch, note]) => {
            if (note) summary += `- [${channelNames[ch as ContentType] || ch}]: ${note}\n`;
          });
        }
      });
      summary += `\n#### 콘텐츠 비교 인사이트\n`;
      summary += `- 감성 격차: ${brandContentComparisonGPT.comparison.sentimentGapAnalysis}\n`;
      summary += `- 인식 포지셔닝: ${brandContentComparisonGPT.comparison.perceivedPositioning}\n`;
      (brandContentComparisonGPT.comparison.keyDifferentiators || []).forEach((d) => {
        summary += `- 차별화(${d.dimension}): 자사 "${d.ownBrand}" vs 경쟁 "${d.competitors}"\n`;
      });
      summary += `- 경쟁 위협: ${(brandContentComparisonGPT.comparison.competitiveThreats || []).join('; ') || '-'}\n`;
      summary += `- 성장 기회: ${(brandContentComparisonGPT.comparison.growthOpportunities || []).join('; ') || '-'}\n`;
    }
  }

  // === 브랜드별 광고 분석 데이터 (브랜드 유형, Step 4 자사 + 경쟁사) ===
  if (keywordType === 'brand' && brandAdAnalysis && brandAdAnalysis.length > 0) {
    summary += '\n## 브랜드별 광고 분석 데이터 (자사 + 경쟁사)\n';
    brandAdAnalysis.forEach((item) => {
      if (!item.result) return;
      summary += `\n### ${item.brandKeyword}${item.isOwnBrand ? ' (자사)' : ' (경쟁사)'}\n`;
      summary += `- 광고 순위: ${item.result.ourAd.rank > 0 ? `${item.result.ourAd.rank}위` : '미노출'}\n`;
      if (item.result.ourAd.rank > 0) {
        summary += `- 제목 평가: ${item.result.ourAd.evaluation.title}\n`;
        summary += `- 설명 평가: ${item.result.ourAd.evaluation.description}\n`;
      }
      if (item.result.competitorAnalysis) {
        summary += `- 동시 노출 경쟁사 광고 분석: ${item.result.competitorAnalysis.replace(/\n+/g, ' / ')}\n`;
      }
      if (item.result.adSuggestions && item.result.adSuggestions.length > 0) {
        summary += `- 광고 개선 제안:\n`;
        item.result.adSuggestions.slice(0, 3).forEach((s, i) => {
          summary += `  ${i + 1}. ${s.title} — ${s.description}\n`;
        });
      }
    });
  }

  return summary;
}

// 유형별 섹션 설명 반환
function getTypeSpecificSections(keywordType: KeywordType): string {
  const commonSections = `
1. **Executive Summary** (핵심 요약)
   - 5개의 핵심 지표 (구체적 수치 포함)
   - 승리 공식 (Winning Formula) - 성공을 위한 핵심 전략 한 문장
   - 시장 기회 요약

3. **핵심 키워드 맵**
   - 상위 키워드 랭킹 (빈도 기반)
   - Pain Point 키워드 분리
   - 데이터 기반 인사이트 3개

4. **채널별 소비자 반응**
   - 각 채널의 역할 정의
   - 채널별 핵심 관심사
   - 채널별 마케팅 전략

6. **마케팅 인사이트** (4개)
   - 각 인사이트는 Pain Point → Opportunity → Action 구조

8. **90일 액션플랜**
   - Key Findings (4개)
   - 타임라인: NOW → 30일 → 60일 → 90일

9. **종합 결론**
   - 요약
   - 핵심 추천사항`;

  if (keywordType === 'shopping') {
    return commonSections + `

2. **3단계 구매 여정** (쇼핑 특화)
   - Stage 1 (상품 발견): 소비자가 상품을 어떻게 발견하는지 (검색어, 카테고리 진입 등)
   - Stage 2 (가격/판매자 비교): 가격, 판매자 신뢰도, 리뷰를 비교하는 행동
   - Stage 3 (구매 결정 장벽): 구매를 망설이게 하는 요인 (가격 불만, 품질 우려, 배송 불안)

5. **이커머스 시장 환경 분석**
   - 판매자 경쟁 구도 (TOP 셀러 점유율, 가격 경쟁 현황)
   - 쇼핑 플랫폼 트렌드 (네이버 쇼핑 vs 쿠팡, 모바일 쇼핑 비중)

7. **실행 전략** (이커머스 5대 전략)
   - 전략 1: 상품 리스팅 최적화 (상품명/이미지/상세페이지)
   - 전략 2: 가격 경쟁력 전략 (포지셔닝/할인)
   - 전략 3: 리뷰/평점 관리 전략
   - 전략 4: 쇼핑 플랫폼별 최적화 (네이버 쇼핑 SEO/쿠팡 로켓)
   - 전략 5: 멀티채널 판매 최적화`;
  }

  if (keywordType === 'brand') {
    return commonSections + `

2. **3단계 브랜드 인식 구조** (브랜드 특화)
   - Stage 1 (브랜드 인지): 소비자가 브랜드를 어떻게 인식하는지 (검색량, 연관 이미지)
   - Stage 2 (브랜드 비교): 경쟁 브랜드와 비교하는 행동 (SOV, 감성 격차)
   - Stage 3 (브랜드 전환 장벽): 브랜드 전환을 막는 요인 (충성도, 전환 비용)

5. **브랜드 경쟁 환경 분석**
   - 브랜드 경쟁 구도 (SOV 비교, 감성 비교, 강약점 분석)
   - 브랜드 디지털 트렌드 (검색량 추이, 콘텐츠 점유율)

7. **실행 전략** (브랜드 5대 전략)
   - 전략 1: 브랜드 SOV 확대 전략
   - 전략 2: 브랜드 콘텐츠 차별화 (스토리텔링/포지셔닝)
   - 전략 3: 경쟁 방어 전략 (자사 키워드 보호)
   - 전략 4: 브랜드 인식 개선 (감성 격차 해소)
   - 전략 5: 브랜드 전환 유도 (경쟁사 고객 획득)`;
  }

  // general (기본)
  return commonSections + `

2. **3단계 소비자 인식 구조**
   - Stage 1 (검색 의도 인지): 소비자가 키워드를 어떻게 인식하는지
   - Stage 2 (적극적 비교): 구매 의사결정을 위한 비교 행동
   - Stage 3 (전환 장벽): 구매를 막는 Pain Points

5. **시장 환경 분석**
   - 경쟁 구도 분석
   - 디지털 트렌드 (모바일 비중, 콘텐츠 동향)

7. **실행 전략** (5대 전략)
   - 전략 1: 콘텐츠 마케팅 (SEO 기반 키워드 타겟팅)
   - 전략 2: 모바일 퍼널 최적화
   - 전략 3: 차별화된 비교 경험 제공
   - 전략 4: 검색 광고 최적화 (입찰/카피)
   - 전략 5: 프로모션 캠페인 설계`;
}

// 유형별 JSON 예시 템플릿 반환
function getTypeSpecificJsonTemplate(keywordType: KeywordType, metrics: PreMetrics): string {
  const totalVolume = metrics.totalVolume;
  const mobileShare = metrics.mobileShare;
  // 공통 JSON 구조 (channelBreakdown, marketingInsights, conclusion)
  const commonChannelBreakdown = `"channelBreakdown": [
    {
      "channel": "blog",
      "channelName": "블로그",
      "role": "정보 탐색 중심",
      "keyInterests": ["실용 정보 선호", "할인 팁"],
      "strategy": "5분 완성 가이드 등 실용형 콘텐츠 배포",
      "sentimentBreakdown": {"positive": 60, "negative": 15, "neutral": 25}
    }
  ]`;

  const commonMarketingInsights = `"marketingInsights": [
    {
      "id": 1,
      "title": "인사이트 제목",
      "painPoint": {
        "label": "Pain Point 요약",
        "details": ["상세 내용1", "상세 내용2"]
      },
      "opportunity": {
        "label": "Opportunity 요약",
        "details": ["상세 내용1", "상세 내용2"]
      },
      "action": "실행 권고 사항"
    }
  ]`;

  const commonConclusion = `"conclusion": {
    "summary": "종합 결론 요약 (2-3문장)",
    "recommendations": [
      "핵심 추천사항 1",
      "핵심 추천사항 2",
      "핵심 추천사항 3"
    ]
  },
  "contentDateAnalysis": {
    "overall": "전체 채널 콘텐츠 작성일 분포 요약 (예: 최근 3개월 콘텐츠가 40%로 활발한 시장, 또는 1년 이상 콘텐츠가 60%로 정보 갱신 필요 등)",
    "channels": [
      {
        "channel": "blog",
        "channelName": "블로그",
        "summary": "채널별 작성일 특성 요약 (데이터 기반)",
        "distribution": {"threeMonths": 0, "oneYear": 0, "twoYears": 0, "older": 0}
      }
    ]
  }`;

  if (keywordType === 'shopping') {
    const s = metrics.shopping;
    return `{
  "executiveSummary": {
    "keyMetrics": [
      {"label": "총 추정 매출액", "value": "${s ? s.totalRevenue.toLocaleString() + '원' : '분석 데이터 기반 수치'}", "description": "시장 규모 지표"},
      {"label": "평균 상품 가격", "value": "${s ? s.averagePrice.toLocaleString() + '원' : '수치'}", "description": "가격 포지셔닝 기준"},
      {"label": "총 리뷰 수", "value": "${s ? s.totalReviews.toLocaleString() + '개' : '수치'}", "description": "시장 활성도"},
      {"label": "평균 평점", "value": "${s ? s.averageRating + '점' : '수치'}", "description": "소비자 만족도"},
      {"label": "TOP 판매자", "value": "${s ? s.sellerCount + '개 셀러' : '수치'}", "description": "경쟁 집중도"}
    ],
    "winningFormula": "이커머스 성공 전략 (예: '리스팅 최적화 + 리뷰 관리 + 가격 포지셔닝')",
    "marketOpportunity": "이커머스 시장 기회 요약 (2-3문장)"
  },
  "perceptionStages": {
    "stage1_awareness": {
      "title": "상품 발견",
      "insight": "소비자가 상품을 발견하는 경로와 검색 패턴",
      "keywords": ["상품 발견 관련 키워드1", "키워드2"],
      "metrics": "관련 검색량 수치"
    },
    "stage2_comparison": {
      "title": "가격/판매자 비교",
      "insight": "가격, 리뷰, 판매자 신뢰도 비교 행동",
      "keywords": ["가격비교", "리뷰"],
      "metrics": "비교 관련 수치"
    },
    "stage3_conversion": {
      "title": "구매 결정 장벽",
      "insight": "구매를 망설이게 하는 요인",
      "painPoints": ["가격 불만", "품질 우려", "배송 불안"],
      "sentiment": "감성 분석 결과"
    }
  },
  "keywordMap": {
    "totalSearchVolume": "${totalVolume.toLocaleString()}건",
    "topKeywords": [
      {"rank": 1, "keyword": "구매 의도 키워드", "frequency": 54}
    ],
    "painPointKeywords": [
      {"keyword": "가격 불만 키워드", "frequency": 5},
      {"keyword": "품질 우려 키워드", "frequency": 3}
    ],
    "dataInsights": [
      "가격대별 시장 세분화 인사이트",
      "리뷰/평점과 매출 상관관계 인사이트",
      "구매 전환 의도 키워드 인사이트"
    ]
  },
  ${commonChannelBreakdown},
  "marketEnvironment": {
    "competitionAnalysis": {
      "level": "높음",
      "insight": "판매자 경쟁 구도 분석 (TOP 셀러 점유율, 가격 경쟁 현황)",
      "keyPlayers": ["TOP 판매자1", "TOP 판매자2"]
    },
    "digitalTrends": {
      "mobileShare": "${mobileShare}%",
      "contentFreshness": "채널별 작성일 분포 데이터를 기반으로 콘텐츠 신선도 + 쇼핑 플랫폼 트렌드 요약",
      "orgChanges": ["모바일 쇼핑 트렌드", "플랫폼별 변화"]
    }
  },
  ${commonMarketingInsights},
  "actionStrategies": [
    {
      "id": 1,
      "title": "상품 리스팅 최적화",
      "subtitle": "상품명/이미지/상세페이지 최적화",
      "sections": [
        {"heading": "상품명 최적화", "items": ["키워드 포함 상품명", "검색 노출 전략"]},
        {"heading": "상세페이지 개선", "items": ["구매 전환율 향상 요소"]}
      ],
      "expectedMetrics": [{"label": "예상 노출 증가", "value": "수치"}]
    },
    {
      "id": 2,
      "title": "가격 경쟁력 전략",
      "subtitle": "가격 포지셔닝 및 할인 전략",
      "sections": [
        {"heading": "가격 포지셔닝", "items": ["적정 가격대 분석"]},
        {"heading": "할인/프로모션", "items": ["할인 전략"]}
      ],
      "expectedMetrics": [{"label": "예상 전환율", "value": "수치"}]
    },
    {
      "id": 3,
      "title": "리뷰/평점 관리 전략",
      "subtitle": "리뷰 확보 및 평점 관리",
      "sections": [
        {"heading": "리뷰 확보 전략", "items": ["리뷰 요청 방법"]},
        {"heading": "부정 리뷰 대응", "items": ["대응 전략"]}
      ],
      "expectedMetrics": [{"label": "목표 리뷰 수", "value": "수치"}]
    },
    {
      "id": 4,
      "title": "쇼핑 플랫폼별 최적화",
      "subtitle": "네이버 쇼핑 SEO / 쿠팡 로켓 전략",
      "sections": [
        {"heading": "네이버 쇼핑 SEO", "items": ["네이버 최적화 전략"]},
        {"heading": "쿠팡 전략", "items": ["쿠팡 로켓 활용"]}
      ],
      "expectedMetrics": [{"label": "예상 순위 상승", "value": "수치"}]
    },
    {
      "id": 5,
      "title": "멀티채널 판매 최적화",
      "subtitle": "다중 플랫폼 판매 확장",
      "sections": [
        {"heading": "채널 확장", "items": ["플랫폼별 입점 전략"]},
        {"heading": "재고/물류 최적화", "items": ["통합 관리 방안"]}
      ],
      "expectedMetrics": [{"label": "예상 매출 증가", "value": "수치"}]
    }
  ],
  "actionPlan": {
    "keyFindings": [
      "리스팅 최적화가 매출 직결",
      "리뷰/평점이 구매 전환의 핵심",
      "가격 포지셔닝 재조정 필요",
      "멀티 플랫폼 진출로 매출 확대 기회"
    ],
    "timeline": [
      {"phase": "NOW", "label": "리스팅 감사 착수", "category": "AUDIT", "action": "현재 상품 리스팅 전수 점검 및 개선점 도출"},
      {"phase": "30d", "label": "리뷰 캠페인 실행", "category": "REVIEW", "action": "리뷰 확보 캠페인 및 평점 관리 시스템 구축"},
      {"phase": "60d", "label": "가격 최적화 실행", "category": "PRICING", "action": "경쟁 가격 모니터링 및 동적 가격 전략 적용"},
      {"phase": "90d", "label": "멀티플랫폼 확장", "category": "SCALE-UP", "action": "신규 플랫폼 입점 및 통합 재고 관리 체계 구축"}
    ]
  },
  ${commonConclusion}
}`;
  }

  if (keywordType === 'brand') {
    const b = metrics.brand;
    return `{
  "executiveSummary": {
    "keyMetrics": [
      {"label": "자사 브랜드 검색량", "value": "${b ? b.ownSearchVolume.toLocaleString() + '건' : '분석 데이터 기반 수치'}", "description": "브랜드 인지도"},
      {"label": "브랜드 SOV", "value": "${b ? b.sov + '%' : '수치'}", "description": "검색 점유율"},
      {"label": "감성 격차", "value": "${b ? (b.sentimentGap > 0 ? '+' : '') + b.sentimentGap + '%p' : '수치'}", "description": "자사 vs 최고 경쟁사"},
      {"label": "경쟁사 수", "value": "${b ? b.competitorCount + '개 브랜드' : '수치'}", "description": "브랜드 경쟁 강도"},
      {"label": "자사 연관 키워드", "value": "${b ? b.ownKeywordCount + '개' : '수치'}", "description": "브랜드 연상 강도"}
    ],
    "winningFormula": "브랜드 성공 전략 (예: 'SOV 확대 + 감성 격차 해소 + 경쟁 방어')",
    "marketOpportunity": "브랜드 시장 기회 요약 (2-3문장)"
  },
  "perceptionStages": {
    "stage1_awareness": {
      "title": "브랜드 인지",
      "insight": "소비자가 브랜드를 인식하는 방식과 연관 이미지",
      "keywords": ["브랜드 인지 관련 키워드1", "키워드2"],
      "metrics": "브랜드 검색량 수치"
    },
    "stage2_comparison": {
      "title": "브랜드 비교",
      "insight": "경쟁 브랜드와의 비교 행동 및 SOV 분석",
      "keywords": ["브랜드비교", "vs"],
      "metrics": "SOV 관련 수치",
      "brandSovTable": [
        {"brand": "${b ? b.ownBrandName : '자사'}", "sov": ${b ? b.sov : 0}, "rank": 1}
      ]
    },
    "stage3_conversion": {
      "title": "브랜드 전환 장벽",
      "insight": "브랜드 전환을 막는 요인",
      "painPoints": ["충성도 장벽", "전환 비용", "인식 차이"],
      "sentiment": "브랜드별 감성 분석 결과"
    }
  },
  "keywordMap": {
    "totalSearchVolume": "${totalVolume.toLocaleString()}건",
    "topKeywords": [
      {"rank": 1, "keyword": "브랜드별 키워드", "frequency": 54}
    ],
    "painPointKeywords": [
      {"keyword": "부정 인식 키워드", "frequency": 5},
      {"keyword": "브랜드 불만 키워드", "frequency": 3}
    ],
    "dataInsights": [
      "자사 vs 경쟁사 키워드 랭킹 비교 인사이트",
      "브랜드 연관 이미지 분석 인사이트",
      "브랜드 전환 의도 키워드 인사이트"
    ]
  },
  ${commonChannelBreakdown},
  "marketEnvironment": {
    "competitionAnalysis": {
      "level": "높음",
      "insight": "브랜드 경쟁 구도 분석 (SOV 비교, 감성 비교, 강약점)",
      "keyPlayers": ["경쟁 브랜드1", "경쟁 브랜드2"],
      "brandSnapshots": [
        {"brand": "${b ? b.ownBrandName : '자사'}", "sov": ${b ? b.sov : 0}, "sentiment": {"positive": ${b ? b.ownPositive : 0}, "negative": ${b ? b.ownNegative : 0}}, "shortNote": "자사 한 줄 요약"}
      ]
    },
    "digitalTrends": {
      "mobileShare": "${mobileShare}%",
      "contentFreshness": "채널별 작성일 분포 데이터를 기반으로 콘텐츠 신선도 + 브랜드 콘텐츠 트렌드 요약",
      "orgChanges": ["브랜드 디지털 트렌드", "검색량 추이 변화"]
    }
  },
  ${commonMarketingInsights},
  "actionStrategies": [
    {
      "id": 1,
      "title": "브랜드 SOV 확대 전략",
      "subtitle": "검색 점유율 확대를 통한 인지도 강화",
      "sections": [
        {"heading": "SOV 확대 방안", "items": ["콘텐츠 확대", "키워드 점유"]},
        {"heading": "인지도 강화", "items": ["브랜드 검색량 증가 전략"]}
      ],
      "expectedMetrics": [{"label": "목표 SOV", "value": "수치"}]
    },
    {
      "id": 2,
      "title": "브랜드 콘텐츠 차별화",
      "subtitle": "스토리텔링과 포지셔닝 강화",
      "sections": [
        {"heading": "스토리텔링 전략", "items": ["브랜드 스토리 구축"]},
        {"heading": "포지셔닝 강화", "items": ["차별화 포인트"]}
      ],
      "expectedMetrics": [{"label": "콘텐츠 도달률", "value": "수치"}]
    },
    {
      "id": 3,
      "title": "경쟁 방어 전략",
      "subtitle": "자사 브랜드 키워드 보호",
      "sections": [
        {"heading": "키워드 방어", "items": ["자사 키워드 보호 전략"]},
        {"heading": "경쟁사 견제", "items": ["경쟁 대응 방안"]}
      ],
      "expectedMetrics": [{"label": "키워드 방어율", "value": "수치"}]
    },
    {
      "id": 4,
      "title": "브랜드 인식 개선",
      "subtitle": "감성 격차 해소 전략",
      "sections": [
        {"heading": "긍정 인식 강화", "items": ["긍정 콘텐츠 확대"]},
        {"heading": "부정 인식 대응", "items": ["부정 리뷰/콘텐츠 대응"]}
      ],
      "expectedMetrics": [{"label": "목표 긍정 비율", "value": "수치"}]
    },
    {
      "id": 5,
      "title": "브랜드 전환 유도",
      "subtitle": "경쟁사 고객 획득 전략",
      "sections": [
        {"heading": "전환 유도 캠페인", "items": ["경쟁사 고객 타겟팅"]},
        {"heading": "로열티 프로그램", "items": ["고객 유지 전략"]}
      ],
      "expectedMetrics": [{"label": "목표 전환율", "value": "수치"}]
    }
  ],
  "actionPlan": {
    "keyFindings": [
      "브랜드 SOV 확대가 인지도의 핵심",
      "감성 격차 해소가 전환의 열쇠",
      "자사 키워드 방어 체계 구축 필수",
      "경쟁사 고객 전환 기회 포착"
    ],
    "timeline": [
      {"phase": "NOW", "label": "브랜드 모니터링 체계 구축", "category": "MONITOR", "action": "자사/경쟁사 브랜드 검색량 및 감성 실시간 추적 시작"},
      {"phase": "30d", "label": "콘텐츠 캠페인 실행", "category": "CONTENT", "action": "브랜드 스토리텔링 콘텐츠 제작 및 배포"},
      {"phase": "60d", "label": "경쟁 대응 전략 가동", "category": "DEFENSE", "action": "자사 키워드 방어 및 경쟁사 키워드 공략"},
      {"phase": "90d", "label": "로열티 프로그램 론칭", "category": "LOYALTY", "action": "충성 고객 유지 및 경쟁사 고객 전환 프로그램 실행"}
    ]
  },
  "brandComparison": {
    "comparisonMatrix": [
      {"metric": "월 검색량", "ownValue": "${b ? b.ownSearchVolume.toLocaleString() + '건' : '0건'}", "competitors": [{"brandKeyword": "경쟁사1", "value": "수치"}], "winner": "own", "insight": "비교 인사이트 1-2문장"},
      {"metric": "SOV", "ownValue": "${b ? b.sov + '%' : '0%'}", "competitors": [{"brandKeyword": "경쟁사1", "value": "수치%"}], "winner": "own", "insight": "SOV 인사이트"},
      {"metric": "긍정 감성", "ownValue": "${b ? b.ownPositive + '%' : '0%'}", "competitors": [{"brandKeyword": "경쟁사1", "value": "수치%"}], "winner": "own", "insight": "감성 인사이트"},
      {"metric": "연관 키워드 수", "ownValue": "${b ? b.ownKeywordCount + '개' : '0개'}", "competitors": [{"brandKeyword": "경쟁사1", "value": "수치개"}], "winner": "neutral", "insight": "키워드 인사이트"},
      {"metric": "평균 모바일 CTR", "ownValue": "${metrics.avgMobileCtr}", "competitors": [{"brandKeyword": "경쟁사1", "value": "수치%"}], "winner": "neutral", "insight": "CTR 인사이트"}
    ],
    "sov": {
      "ownShare": ${b ? b.sov : 0},
      "competitorShares": [{"brandKeyword": "경쟁사1", "share": 0}],
      "interpretation": "SOV 분포 해석 (2-3문장)"
    },
    "ownStrengths": ["자사 강점1", "자사 강점2", "자사 강점3"],
    "ownWeaknesses": ["자사 약점1", "자사 약점2"],
    "competitorProfiles": [
      {"brandKeyword": "경쟁사1", "positioning": "한 줄 포지셔닝", "strengths": ["강점1", "강점2"], "weaknesses": ["약점1"], "threatLevel": "high", "counterStrategy": "자사 대응 전략"}
    ],
    "differentiationAxes": [
      {"axis": "가격|품질|신뢰도|디자인 등", "description": "차별화 축 설명", "ownPosition": "자사 포지션", "competitorPosition": "경쟁사 포지션"}
    ],
    "conquestKeywords": [
      {"keyword": "공략 가능 키워드", "currentLeader": "현재 우위 브랜드", "rationale": "공략 근거"}
    ],
    "keywordComparison": [
      {"keyword": "공통 키워드", "ownRank": 1, "competitorRanks": [{"brandKeyword": "경쟁사1", "rank": 3}]}
    ],
    "sentimentComparison": [
      {"brandKeyword": "${b ? b.ownBrandName : '자사'}", "positive": ${b ? b.ownPositive : 0}, "neutral": 0, "negative": ${b ? b.ownNegative : 0}, "topPositiveKeywords": ["키워드1"], "topNegativeKeywords": ["키워드2"]}
    ]
  },
  ${commonConclusion}
}`;
  }

  // general (기본)
  return `{
  "executiveSummary": {
    "keyMetrics": [
      {"label": "월 핵심 키워드 검색량", "value": "${totalVolume.toLocaleString()}건", "description": "시장 성숙도 입증"},
      {"label": "모바일 비중", "value": "${mobileShare}%", "description": "모바일 퍼널 최적화 필수"},
      {"label": "광고 경쟁도", "value": "${metrics.dominantCompIdx}", "description": "입찰 전략 기준"},
      {"label": "평균 모바일 CTR", "value": "${metrics.avgMobileCtr}", "description": "광고 효율 지표"},
      {"label": "전체 감성 긍정률", "value": "${metrics.avgPositive}%", "description": "소비자 인식 수준"}
    ],
    "winningFormula": "성공을 위한 핵심 전략 (예: '비교 경험 단순화 + 모바일 퍼널 최적화')",
    "marketOpportunity": "시장 기회 요약 (2-3문장)"
  },
  "perceptionStages": {
    "stage1_awareness": {
      "title": "검색 의도 인지",
      "insight": "소비자의 기본 인식 설명",
      "keywords": ["관련 키워드1", "관련 키워드2"],
      "metrics": "관련 수치 (예: 월 검색량 30,000건)"
    },
    "stage2_comparison": {
      "title": "적극적 비교",
      "insight": "비교 행동 패턴 설명",
      "keywords": ["비교", "견적"],
      "metrics": "CTR 등 관련 수치"
    },
    "stage3_conversion": {
      "title": "전환 장벽",
      "insight": "구매를 막는 요인",
      "painPoints": ["복잡함", "고민"],
      "sentiment": "긍정 67% 등 감성 분석 결과"
    }
  },
  "keywordMap": {
    "totalSearchVolume": "${totalVolume.toLocaleString()}건",
    "topKeywords": [
      {"rank": 1, "keyword": "키워드", "frequency": 54}
    ],
    "painPointKeywords": [
      {"keyword": "복잡", "frequency": 5}
    ],
    "dataInsights": [
      "가격 vs 보장의 균형 - 인사이트 설명",
      "편의성 수요 급증 - 인사이트 설명",
      "구매 직전 의도 포착 - 인사이트 설명"
    ]
  },
  ${commonChannelBreakdown},
  "marketEnvironment": {
    "competitionAnalysis": {
      "level": "높음",
      "insight": "경쟁 구도 상세 분석",
      "keyPlayers": ["주요 경쟁사1", "주요 경쟁사2"]
    },
    "digitalTrends": {
      "mobileShare": "${mobileShare}%",
      "contentFreshness": "채널별 작성일 분포 데이터를 기반으로 콘텐츠 신선도 요약 (예: 최근 3개월 콘텐츠 XX%, 1년 이상 콘텐츠 XX%)",
      "orgChanges": ["디지털 채널 강화 트렌드"]
    }
  },
  ${commonMarketingInsights},
  "actionStrategies": [
    {
      "id": 1,
      "title": "콘텐츠 마케팅",
      "subtitle": "SEO 기반 타겟 키워드 전략",
      "sections": [
        {"heading": "핵심 키워드 군", "items": ["키워드1", "키워드2"]},
        {"heading": "틈새 키워드", "items": ["롱테일 키워드1"]}
      ],
      "expectedMetrics": [{"label": "예상 CTR", "value": "35%"}]
    },
    {
      "id": 2,
      "title": "모바일 퍼널 최적화",
      "subtitle": "모바일 전환율 극대화",
      "sections": [
        {"heading": "모바일 UX 개선", "items": ["페이지 속도 최적화"]},
        {"heading": "전환 퍼널 단순화", "items": ["CTA 최적화"]}
      ],
      "expectedMetrics": [{"label": "예상 전환율", "value": "수치"}]
    },
    {
      "id": 3,
      "title": "차별화된 비교 경험",
      "subtitle": "경쟁사 대비 비교 우위 확보",
      "sections": [
        {"heading": "비교 콘텐츠", "items": ["비교표 제작"]},
        {"heading": "신뢰 구축", "items": ["리뷰/사례 활용"]}
      ],
      "expectedMetrics": [{"label": "예상 이탈율 감소", "value": "수치"}]
    },
    {
      "id": 4,
      "title": "검색 광고 최적화",
      "subtitle": "입찰/카피 전략 고도화",
      "sections": [
        {"heading": "입찰 전략", "items": ["키워드별 입찰가 최적화"]},
        {"heading": "광고 카피", "items": ["A/B 테스트 계획"]}
      ],
      "expectedMetrics": [{"label": "예상 CPC 절감", "value": "수치"}]
    },
    {
      "id": 5,
      "title": "프로모션 캠페인 설계",
      "subtitle": "시즌별 프로모션 전략",
      "sections": [
        {"heading": "프로모션 설계", "items": ["시즌 캠페인"]},
        {"heading": "실행 계획", "items": ["캠페인 일정"]}
      ],
      "expectedMetrics": [{"label": "예상 ROI", "value": "수치"}]
    }
  ],
  "actionPlan": {
    "keyFindings": [
      "비교 경험의 단순화가 핵심",
      "모바일 퍼널 최적화 필수",
      "브랜드 신뢰 × 투명 비교 공존",
      "합리적 가치 제안 중요"
    ],
    "timeline": [
      {"phase": "NOW", "label": "퍼널 지표 개선 착수", "category": "URGENT", "action": "이탈 마찰 요소 즉시 제거"},
      {"phase": "30d", "label": "핵심 기능 MVP 론치", "category": "DEVELOP", "action": "AI 추천 로직 베타 오픈"},
      {"phase": "60d", "label": "SEO 더블트랙 운영", "category": "MARKETING", "action": "대표 + 틈새 키워드 콘텐츠 배포"},
      {"phase": "90d", "label": "시즌 캠페인 확대", "category": "SCALE-UP", "action": "데이터 기반 메시지로 집중 공략"}
    ]
  },
  ${commonConclusion}
}`;
}

// GPT를 사용하여 종합 리포트 생성
async function generateIntegratedReport(
  keyword: string,
  keywordType: KeywordType,
  companyName: string | undefined,
  dataSummary: string,
  keywordExpansion: KeywordExpansionResult,
  contentAnalysis: { blog?: KeywordAnalysisResult; cafe?: KeywordAnalysisResult; youtube?: KeywordAnalysisResult; news?: KeywordAnalysisResult },
  adAnalysis?: AdAnalysisResult,
  shoppingAnalysis?: ShoppingSearchAnalysisResult,
  brandComparison?: BrandComparisonResult,
  brandKeywordExpansionGPT?: BrandKeywordComparisonGPTAnalysis,
  brandContentComparisonGPT?: BrandContentComparisonGPTAnalysis,
  brandAdAnalysis?: Array<{ brandKeyword: string; isOwnBrand: boolean; result: AdAnalysisResult }>
): Promise<IntegratedReportData> {

  // 사전 지표 계산
  const metrics = calculatePreMetrics(keywordType, keywordExpansion, contentAnalysis, adAnalysis, shoppingAnalysis, brandComparison);

  // 키워드 유형별 시스템 프롬프트 생성
  const getSystemPrompt = (type: KeywordType): string => {
    const basePrompt = `당신은 디지털 마케팅 전략 컨설턴트입니다. 제공된 키워드 분석 데이터를 바탕으로 PPT 수준의 전문적인 마케팅 인텔리전스 리포트를 생성해주세요.`;

    const typeSpecificPrompt = {
      general: `
【검색광고 최적화 리포트】
다음 관점에서 분석하세요:
- 검색 의도(Search Intent) 분류 및 전환 가능성
- 광고 경쟁 환경 및 입찰 전략 방향
- 키워드별 광고 효율성 예측 (CTR, CVR)
- 랜딩페이지 및 광고 카피 최적화 방향
- 콘텐츠 마케팅과 검색광고 연계 전략
핵심 질문: "이 키워드로 검색광고를 집행할 때 ROI를 어떻게 극대화할 것인가"`,

      shopping: `
【이커머스 판매 최적화 리포트】
다음 관점에서 분석하세요:
- 가격 경쟁력 및 가격대별 시장 포지셔닝
- 쇼핑 검색 결과 상위 노출 전략
- 상품 차별화 포인트 및 셀링포인트
- 리뷰/평점 관리 전략
- 프로모션 및 할인 전략
핵심 질문: "이 상품을 네이버 쇼핑에서 어떻게 더 잘 팔 것인가"`,

      brand: `
【브랜드 경쟁력 분석 리포트】
다음 관점에서 분석하세요:
- 자사 브랜드 vs 경쟁 브랜드 검색량/인지도 비교
- 브랜드별 소비자 인식 및 연관 이미지
- 브랜드 키워드 점유율(SOV) 분석
- 경쟁 브랜드 대비 강점/약점
- 브랜드 포지셔닝 및 차별화 전략
핵심 질문: "우리 브랜드가 경쟁사 대비 어떤 위치이며, 어떻게 차별화할 것인가"

【브랜드 비교 섹션 작성 규칙】
- 응답 JSON에는 반드시 brandComparison 섹션을 포함해야 합니다.
- 자사 vs 각 경쟁사를 5개 차원(월 검색량, SOV, 긍정 감성, 연관 키워드 수, 평균 CTR)으로 비교한 comparisonMatrix를 작성하세요.
- 경쟁사 각각에 대해 competitorProfiles에서 positioning, strengths, weaknesses, threatLevel, counterStrategy를 빠짐없이 작성하세요.
- "Step 2 AI 키워드 비교 분석"과 "Step 3 AI 콘텐츠 비교 분석" 결과를 brandComparison.ownStrengths/ownWeaknesses/competitorProfiles/differentiationAxes 등에 정확히 반영하세요.
- marketEnvironment.competitionAnalysis.brandSnapshots와 perceptionStages.stage2_comparison.brandSovTable에도 자사+경쟁사 모든 브랜드의 수치 데이터를 채워주세요.
- adAnalysis 데이터가 있으면 actionStrategies 중 최소 1개 전략에 광고 순위·개선 제안을 구체적으로 인용하세요.
- "브랜드별 광고 분석 데이터(자사 + 경쟁사)"가 제공되면, 각 경쟁사의 광고 순위/제목·설명 평가/개선 제안을 brandComparison.competitorProfiles[].weaknesses 또는 strengths에 직접 인용하세요. 또한 actionStrategies 중 한 전략(예: 경쟁 방어 또는 브랜드 SOV 확대)에서 경쟁사 광고 카피를 분석한 결과를 활용해 차별화 권고를 작성하세요.`,
    };

    return basePrompt + typeSpecificPrompt[type];
  };

  // 유형별 필수 데이터 참조 지침
  const getDataReferenceGuide = (type: KeywordType): string => {
    if (type === 'shopping') {
      return `

【필수 데이터 참조 지침】
1. "쇼핑 검색 분석 데이터"의 총 매출액, 평균 가격, 리뷰 수, 평점을 Executive Summary keyMetrics에 그대로 인용
2. TOP 판매자 이름/가격/매출을 marketEnvironment.competitionAnalysis에 구체적 언급
3. 가격대별 상품 수/매출을 actionStrategies "가격 경쟁력 전략"에서 참조
4. 네이버 vs 쿠팡 비교 데이터가 있으면 플랫폼별 차이를 digitalTrends에 명시
5. 채널별 작성일 분포 데이터가 있으면 contentFreshness에 실제 수치 기반으로 반영하고, contentDateAnalysis에 채널별 분포와 요약을 정확히 작성
수치를 임의 생성하지 말고, 제공된 실제 수치를 정확히 인용하세요.`;
    }
    if (type === 'brand') {
      return `

【필수 데이터 참조 지침】
1. 자사/경쟁사별 연관 키워드 수, 감성 수치를 Executive Summary에 정확히 인용
2. SOV와 감성 격차를 perceptionStages.stage2_comparison에 명시. brandSovTable에는 모든 브랜드(자사 + 경쟁사)의 sov/rank를 채울 것
3. 각 경쟁사 브랜드명과 감성 수치를 competitionAnalysis.keyPlayers에 구체적 나열하고, brandSnapshots에 sov/sentiment/shortNote도 모두 채울 것
4. 자사 vs 경쟁사 연관 키워드 랭킹을 keywordMap.dataInsights에서 비교
5. 채널별 작성일 분포 데이터가 있으면 contentFreshness에 실제 수치 기반으로 반영하고, contentDateAnalysis에 채널별 분포와 요약을 정확히 작성
6. brandComparison.comparisonMatrix는 5개 핵심 차원(월 검색량/SOV/긍정 감성/연관 키워드 수/평균 CTR)으로 작성하고, 각 행의 winner를 결정하며 insight 1-2문장 작성
7. brandComparison.competitorProfiles는 입력 데이터의 경쟁사 N개 모두를 1:1 매핑하여 positioning/strengths/weaknesses/threatLevel/counterStrategy를 모두 채울 것 (빈 배열 금지)
8. brandComparison.differentiationAxes는 Step 3 AI 콘텐츠 비교 분석의 keyDifferentiators를 그대로 활용 (3-5개)
9. brandComparison.conquestKeywords는 Step 2 AI 키워드 비교의 opportunityKeywords를 활용해 작성
10. brandComparison.sentimentComparison은 자사+모든 경쟁사 각각의 채널 평균 감성(긍/중/부)과 topPositiveKeywords/topNegativeKeywords(상위 5개)를 포함
11. 광고 분석 데이터가 있으면 actionStrategies 중 최소 1개 전략에 광고 순위/제안을 명시
12. "브랜드별 광고 분석 데이터"가 있으면 각 경쟁사의 광고 순위·제목·설명 평가를 brandComparison.competitorProfiles[].positioning 또는 weaknesses에 명시하고, marketEnvironment.competitionAnalysis.insight에서도 경쟁사 광고 활동 수준을 언급
수치를 임의 생성하지 말고, 제공된 실제 수치를 정확히 인용하세요.`;
    }
    // general
    return `

【필수 데이터 참조 지침】
1. 검색량, CTR, 경쟁도를 Executive Summary keyMetrics에 정확히 인용
2. 광고 분석 데이터가 있으면 광고 순위/경쟁사 분석을 actionStrategies에 반영
3. 채널별 감성 수치를 channelBreakdown.sentimentBreakdown에 정확히 반영
4. 채널별 작성일 분포 데이터가 있으면 contentFreshness에 실제 수치 기반으로 반영하고, contentDateAnalysis에 채널별 분포와 요약을 정확히 작성
수치를 임의 생성하지 말고, 제공된 실제 수치를 정확히 인용하세요.`;
  };

  const systemPrompt = getSystemPrompt(keywordType) + `

리포트는 다음 구조로 작성해야 합니다:

${getTypeSpecificSections(keywordType)}
${getDataReferenceGuide(keywordType)}

응답은 반드시 아래 JSON 형식으로 제공해주세요. 모든 텍스트는 한국어로, 전문적이고 구체적으로 작성하세요. 수치는 제공된 데이터를 기반으로 정확하게 인용하세요.`;

  const analysisTypeLabel: Record<KeywordType, string> = {
    general: '검색광고 최적화',
    shopping: '쇼핑 마케팅',
    brand: '브랜드 경쟁력',
  };

  const userPrompt = `다음은 "${keyword}" 키워드에 대한 【${analysisTypeLabel[keywordType]} 분석】 데이터입니다.
분석 유형: ${keywordType.toUpperCase()} (${analysisTypeLabel[keywordType]})
${companyName ? `분석 대상 업체: ${companyName}` : ''}

${buildKeyMetricsSection(keywordType, metrics)}

${dataSummary}

${buildDataMappingGuide(keywordType)}

위 데이터를 바탕으로 PPT 수준의 종합 마케팅 리포트를 JSON 형식으로 생성해주세요.

JSON 구조:
${getTypeSpecificJsonTemplate(keywordType, metrics)}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0].message.content || '';

    try {
      const parsedResponse = JSON.parse(responseText);

      // === 브랜드 비교 폴백 데이터 생성 (GPT가 비웠을 경우 대비) ===
      const buildBrandComparisonFallback = () => {
        if (keywordType !== 'brand' || !brandComparison || !metrics.brand) return undefined;
        const b = metrics.brand;
        const ownName = b.ownBrandName;
        const competitorCount = b.competitorCount;

        // sentimentComparison: 자사 + 경쟁사
        const sentimentRows = [
          {
            brandKeyword: ownName,
            positive: b.ownPositive,
            neutral: Math.max(0, 100 - b.ownPositive - b.ownNegative),
            negative: b.ownNegative,
            topPositiveKeywords: [] as string[],
            topNegativeKeywords: [] as string[],
          },
          ...b.competitors.map(c => ({
            brandKeyword: c.name,
            positive: c.positive,
            neutral: Math.max(0, 100 - c.positive - c.negative),
            negative: c.negative,
            topPositiveKeywords: [] as string[],
            topNegativeKeywords: [] as string[],
          })),
        ];

        // 자사/경쟁사 상위 긍정·부정 키워드 추출
        const channels: ContentType[] = ['blog', 'cafe', 'youtube', 'news'];
        const collectTopSentimentKeywords = (brand: any) => {
          const posMap = new Map<string, number>();
          const negMap = new Map<string, number>();
          channels.forEach(ch => {
            const d = brand?.contentAnalysis?.[ch];
            (d?.sentiment?.positiveKeywords || []).forEach((k: any) => {
              posMap.set(k.keyword, (posMap.get(k.keyword) || 0) + (k.score || 1));
            });
            (d?.sentiment?.negativeKeywords || []).forEach((k: any) => {
              negMap.set(k.keyword, (negMap.get(k.keyword) || 0) + (k.score || 1));
            });
          });
          const sortBy = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
          return { topPos: sortBy(posMap), topNeg: sortBy(negMap) };
        };
        const ownKw = collectTopSentimentKeywords(brandComparison.ownBrand);
        sentimentRows[0].topPositiveKeywords = ownKw.topPos;
        sentimentRows[0].topNegativeKeywords = ownKw.topNeg;
        brandComparison.competitors.forEach((comp, idx) => {
          const k = collectTopSentimentKeywords(comp);
          sentimentRows[idx + 1].topPositiveKeywords = k.topPos;
          sentimentRows[idx + 1].topNegativeKeywords = k.topNeg;
        });

        // 비교 매트릭스 (실데이터 기반)
        const compMatrix = [
          {
            metric: '월 검색량',
            ownValue: `${b.ownSearchVolume.toLocaleString()}건`,
            competitors: b.competitors.map(c => ({ brandKeyword: c.name, value: `${c.searchVolume.toLocaleString()}건` })),
            winner: (b.competitors.length === 0 || b.ownSearchVolume >= Math.max(...b.competitors.map(c => c.searchVolume), 0)) ? 'own' as const : 'competitor' as const,
            insight: `자사 검색량은 ${b.ownSearchVolume.toLocaleString()}건이며 전체 ${b.totalBrandVolume.toLocaleString()}건 중 ${b.sov}%를 차지`,
          },
          {
            metric: 'SOV (검색 점유율)',
            ownValue: `${b.sov}%`,
            competitors: b.competitors.map(c => ({
              brandKeyword: c.name,
              value: `${b.totalBrandVolume > 0 ? ((c.searchVolume / b.totalBrandVolume) * 100).toFixed(1) : 0}%`,
            })),
            winner: (b.sov >= 50 ? 'own' : (b.sov < 30 ? 'competitor' : 'neutral')) as 'own' | 'competitor' | 'neutral',
            insight: b.sov >= 50 ? 'SOV에서 자사 우위' : (b.sov < 30 ? 'SOV에서 자사 열위' : 'SOV 격차 미세'),
          },
          {
            metric: '긍정 감성',
            ownValue: `${b.ownPositive}%`,
            competitors: b.competitors.map(c => ({ brandKeyword: c.name, value: `${c.positive}%` })),
            winner: (b.competitors.length === 0 || b.ownPositive >= Math.max(...b.competitors.map(c => c.positive), 0)) ? 'own' as const : 'competitor' as const,
            insight: `자사 긍정 감성 ${b.ownPositive}% / 부정 ${b.ownNegative}%`,
          },
        ];

        // competitor shares
        const competitorShares = b.competitors.map(c => ({
          brandKeyword: c.name,
          share: b.totalBrandVolume > 0 ? parseFloat(((c.searchVolume / b.totalBrandVolume) * 100).toFixed(1)) : 0,
        }));

        // GPT 결과 활용
        const ownInsightFromGPT = brandContentComparisonGPT?.perBrand.find(p => p.isOwnBrand);
        const compProfilesFromGPT = (brandContentComparisonGPT?.perBrand || []).filter(p => !p.isOwnBrand);

        return {
          comparisonMatrix: compMatrix,
          sov: {
            ownShare: b.sov,
            competitorShares,
            interpretation: brandKeywordExpansionGPT?.comparison.sovInterpretation
              || `자사 SOV ${b.sov}% (총 검색량 ${b.totalBrandVolume.toLocaleString()}건 중)`,
          },
          ownStrengths: ownInsightFromGPT?.strengths || [],
          ownWeaknesses: ownInsightFromGPT?.weaknesses || [],
          competitorProfiles: b.competitors.map((c) => {
            const gpt = compProfilesFromGPT.find(p => p.brandKeyword === c.name);
            const compAd = brandAdAnalysis?.find(a => a.brandKeyword === c.name && !a.isOwnBrand);
            const adNote = compAd
              ? `광고 ${compAd.result.ourAd.rank > 0 ? `${compAd.result.ourAd.rank}위 노출` : '미노출'}`
              : '';
            const positioning = gpt?.sentimentInterpretation
              || [`검색량 ${c.searchVolume.toLocaleString()}건`, `긍정 감성 ${c.positive}%`, adNote]
                  .filter(Boolean).join(', ');
            // 광고 분석 결과에서 강·약점 보강
            const adStrength = compAd && compAd.result.ourAd.rank > 0
              ? `광고 ${compAd.result.ourAd.rank}위 노출 (제목 평가: ${compAd.result.ourAd.evaluation.title})`
              : null;
            const adWeakness = compAd && compAd.result.ourAd.rank === 0
              ? '광고 미노출로 검색 트래픽 손실 가능'
              : null;
            const counterStrategy = compAd && compAd.result.adSuggestions?.length > 0
              ? `경쟁사 광고 분석 결과: ${compAd.result.adSuggestions[0].title} — ${compAd.result.adSuggestions[0].description}`
              : '';
            return {
              brandKeyword: c.name,
              positioning,
              strengths: [...(gpt?.strengths || []), ...(adStrength ? [adStrength] : [])],
              weaknesses: [...(gpt?.weaknesses || []), ...(adWeakness ? [adWeakness] : [])],
              threatLevel: (c.searchVolume > b.ownSearchVolume * 0.7 ? 'high' : (c.searchVolume > b.ownSearchVolume * 0.3 ? 'medium' : 'low')) as 'high' | 'medium' | 'low',
              counterStrategy,
            };
          }),
          differentiationAxes: (brandContentComparisonGPT?.comparison.keyDifferentiators || []).map(d => ({
            axis: d.dimension,
            description: '',
            ownPosition: d.ownBrand,
            competitorPosition: d.competitors,
          })),
          conquestKeywords: (brandKeywordExpansionGPT?.comparison.opportunityKeywords || []).slice(0, 5).map(kw => ({
            keyword: kw,
            currentLeader: '경쟁사',
            rationale: brandKeywordExpansionGPT?.comparison.strategicRecommendation || '공략 가능 키워드',
          })),
          keywordComparison: [],
          sentimentComparison: sentimentRows,
        };
      };

      // GPT 응답 brandComparison을 폴백과 머지
      const mergeBrandComparison = (gpt: any, fallback: any): any => {
        if (!fallback) return undefined;
        if (!gpt) return fallback;
        return {
          comparisonMatrix: Array.isArray(gpt.comparisonMatrix) && gpt.comparisonMatrix.length > 0 ? gpt.comparisonMatrix : fallback.comparisonMatrix,
          sov: gpt.sov && typeof gpt.sov.ownShare === 'number' ? gpt.sov : fallback.sov,
          ownStrengths: Array.isArray(gpt.ownStrengths) && gpt.ownStrengths.length > 0 ? gpt.ownStrengths : fallback.ownStrengths,
          ownWeaknesses: Array.isArray(gpt.ownWeaknesses) && gpt.ownWeaknesses.length > 0 ? gpt.ownWeaknesses : fallback.ownWeaknesses,
          competitorProfiles: Array.isArray(gpt.competitorProfiles) && gpt.competitorProfiles.length > 0 ? gpt.competitorProfiles : fallback.competitorProfiles,
          differentiationAxes: Array.isArray(gpt.differentiationAxes) && gpt.differentiationAxes.length > 0 ? gpt.differentiationAxes : fallback.differentiationAxes,
          conquestKeywords: Array.isArray(gpt.conquestKeywords) && gpt.conquestKeywords.length > 0 ? gpt.conquestKeywords : fallback.conquestKeywords,
          keywordComparison: Array.isArray(gpt.keywordComparison) ? gpt.keywordComparison : fallback.keywordComparison,
          sentimentComparison: Array.isArray(gpt.sentimentComparison) && gpt.sentimentComparison.length > 0 ? gpt.sentimentComparison : fallback.sentimentComparison,
        };
      };

      const brandComparisonFallback = buildBrandComparisonFallback();

      // 리포트 데이터 구조화
      const report: IntegratedReportData = {
        generatedAt: new Date().toISOString(),
        keyword,
        companyName,
        keywordType,

        executiveSummary: {
          keyMetrics: parsedResponse.executiveSummary?.keyMetrics || [],
          winningFormula: parsedResponse.executiveSummary?.winningFormula || '',
          marketOpportunity: parsedResponse.executiveSummary?.marketOpportunity || '',
        },

        perceptionStages: {
          stage1_awareness: parsedResponse.perceptionStages?.stage1_awareness || {
            title: '개념 이해', insight: '', keywords: [], metrics: ''
          },
          stage2_comparison: parsedResponse.perceptionStages?.stage2_comparison || {
            title: '적극적 비교', insight: '', keywords: [], metrics: ''
          },
          stage3_conversion: parsedResponse.perceptionStages?.stage3_conversion || {
            title: '전환 장벽', insight: '', painPoints: [], sentiment: ''
          },
        },

        keywordMap: {
          totalSearchVolume: parsedResponse.keywordMap?.totalSearchVolume || `${metrics.totalVolume.toLocaleString()}건`,
          topKeywords: parsedResponse.keywordMap?.topKeywords || [],
          painPointKeywords: parsedResponse.keywordMap?.painPointKeywords || [],
          dataInsights: parsedResponse.keywordMap?.dataInsights || [],
        },

        channelBreakdown: (parsedResponse.channelBreakdown || []).map((cb: any) => {
          const chData = contentAnalysis[cb.channel as ContentType] as any;
          return {
            ...cb,
            dateAnalysis: chData?.dateAnalysis || null,
            contentSentimentCounts: chData?.contentSentimentCounts || null,
          };
        }),

        marketEnvironment: {
          competitionAnalysis: parsedResponse.marketEnvironment?.competitionAnalysis || {
            level: '분석 중', insight: '', keyPlayers: []
          },
          digitalTrends: parsedResponse.marketEnvironment?.digitalTrends || {
            mobileShare: `${metrics.mobileShare}%`, contentFreshness: '', orgChanges: []
          },
        },

        marketingInsights: parsedResponse.marketingInsights || [],

        actionStrategies: parsedResponse.actionStrategies || [],

        actionPlan: {
          keyFindings: parsedResponse.actionPlan?.keyFindings || [],
          timeline: parsedResponse.actionPlan?.timeline || [],
        },

        conclusion: {
          summary: parsedResponse.conclusion?.summary || '',
          recommendations: parsedResponse.conclusion?.recommendations || [],
        },

        contentDateAnalysis: parsedResponse.contentDateAnalysis || undefined,

        brandComparison: keywordType === 'brand'
          ? mergeBrandComparison(parsedResponse.brandComparison, brandComparisonFallback)
          : undefined,
      };

      return report;
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('리포트 데이터 파싱에 실패했습니다.');
    }
  } catch (error) {
    console.error('OpenAI API 오류:', error);
    throw error;
  }
}
