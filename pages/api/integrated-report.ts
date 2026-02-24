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
    }: IntegratedReportRequest = req.body;

    if (!keyword) {
      return res.status(400).json({ error: '키워드가 누락되었습니다.' });
    }

    if (!keywordExpansion) {
      return res.status(400).json({ error: '키워드 확장 데이터가 누락되었습니다.' });
    }

    // 분석 데이터 요약 생성
    const dataSummary = buildDataSummary(keyword, keywordType, keywordExpansion, keywordExpansionGPTAnalysis, contentAnalysis, adAnalysis, shoppingAnalysis, brandComparison);

    // GPT를 사용하여 종합 리포트 생성
    const report = await generateIntegratedReport(keyword, keywordType, companyName, dataSummary, keywordExpansion, contentAnalysis, shoppingAnalysis);

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

// 분석 데이터 요약 생성
function buildDataSummary(
  keyword: string,
  keywordType: KeywordType,
  keywordExpansion: KeywordExpansionResult,
  keywordExpansionGPTAnalysis: KeywordExpansionGPTAnalysis | undefined,
  contentAnalysis: { blog?: KeywordAnalysisResult; cafe?: KeywordAnalysisResult; youtube?: KeywordAnalysisResult; news?: KeywordAnalysisResult },
  adAnalysis?: AdAnalysisResult,
  shoppingAnalysis?: ShoppingSearchAnalysisResult,
  brandComparison?: BrandComparisonResult
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
    }

    // 경쟁사 브랜드들
    summary += '\n### 경쟁사 브랜드 비교\n';
    brandComparison.competitors.forEach((comp: any, idx: number) => {
      summary += `\n${idx + 1}. ${comp.brandKeyword}\n`;
      if (comp.keywordExpansion?.keywordList) {
        const compKeywords = comp.keywordExpansion.keywordList;
        summary += `   - 연관 키워드 수: ${compKeywords.length}개\n`;
        if (compKeywords.length > 0) {
          summary += `   - 주요 연관 키워드: ${compKeywords.slice(0, 5).map((k: any) => k.relKeyword).join(', ')}\n`;
        }
      }
      // 경쟁사 감성 분석
      if (comp.contentAnalysis) {
        const channels = ['blog', 'cafe', 'youtube', 'news'] as const;
        let totalPositive = 0, totalNegative = 0, channelCount = 0;
        channels.forEach(ch => {
          const data = comp.contentAnalysis?.[ch];
          if (data?.sentiment) {
            totalPositive += data.sentiment.positive || 0;
            totalNegative += data.sentiment.negative || 0;
            channelCount++;
          }
        });
        if (channelCount > 0) {
          summary += `   - 평균 감성: 긍정 ${Math.round(totalPositive / channelCount)}%, 부정 ${Math.round(totalNegative / channelCount)}%\n`;
        }
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
  }

  return summary;
}

// GPT를 사용하여 종합 리포트 생성
async function generateIntegratedReport(
  keyword: string,
  keywordType: KeywordType,
  companyName: string | undefined,
  dataSummary: string,
  keywordExpansion: KeywordExpansionResult,
  contentAnalysis: { blog?: KeywordAnalysisResult; cafe?: KeywordAnalysisResult; youtube?: KeywordAnalysisResult; news?: KeywordAnalysisResult },
  shoppingAnalysis?: ShoppingSearchAnalysisResult
): Promise<IntegratedReportData> {

  const totalVolume = calculateTotalSearchVolume(keywordExpansion);
  const mobileShare = calculateMobileShare(keywordExpansion);

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
핵심 질문: "우리 브랜드가 경쟁사 대비 어떤 위치이며, 어떻게 차별화할 것인가"`,
    };

    return basePrompt + typeSpecificPrompt[type];
  };

  const systemPrompt = getSystemPrompt(keywordType) + `

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

응답은 반드시 아래 JSON 형식으로 제공해주세요. 모든 텍스트는 한국어로, 전문적이고 구체적으로 작성하세요. 수치는 제공된 데이터를 기반으로 정확하게 인용하세요.`;

  const analysisTypeLabel: Record<KeywordType, string> = {
    general: '검색광고 최적화',
    shopping: '쇼핑 마케팅',
    brand: '브랜드 경쟁력',
  };

  const userPrompt = `다음은 "${keyword}" 키워드에 대한 【${analysisTypeLabel[keywordType]} 분석】 데이터입니다.
분석 유형: ${keywordType.toUpperCase()} (${analysisTypeLabel[keywordType]})
${companyName ? `분석 대상 업체: ${companyName}` : ''}

=== 핵심 수치 ===
- 총 월간 검색량: ${totalVolume.toLocaleString()}건
- 모바일 비중: ${mobileShare}%
- 분석된 연관 키워드: ${keywordExpansion.keywordList?.length || 0}개

${dataSummary}

위 데이터를 바탕으로 PPT 수준의 종합 마케팅 리포트를 JSON 형식으로 생성해주세요.

JSON 구조:
{
  "executiveSummary": {
    "keyMetrics": [
      {"label": "월 핵심 키워드 검색량", "value": "${totalVolume.toLocaleString()}", "description": "시장 성숙도 입증"},
      {"label": "지표명", "value": "수치", "description": "의미"}
    ],
    "winningFormula": "성공을 위한 핵심 전략 (예: '비교 경험 단순화 + 모바일 퍼널 최적화')",
    "marketOpportunity": "시장 기회 요약 (2-3문장)"
  },
  "perceptionStages": {
    "stage1_awareness": {
      "title": "개념 이해",
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
  "channelBreakdown": [
    {
      "channel": "blog",
      "channelName": "블로그",
      "role": "정보 탐색 중심",
      "keyInterests": ["실용 정보 선호", "할인 팁"],
      "strategy": "5분 완성 가이드 등 실용형 콘텐츠 배포",
      "sentimentBreakdown": {"positive": 60, "negative": 15, "neutral": 25}
    }
  ],
  "marketEnvironment": {
    "competitionAnalysis": {
      "level": "높음",
      "insight": "경쟁 구도 상세 분석",
      "keyPlayers": ["주요 경쟁사1", "주요 경쟁사2"]
    },
    "digitalTrends": {
      "mobileShare": "${mobileShare}%",
      "contentFreshness": "최근 3개월 내 콘텐츠 비중",
      "orgChanges": ["디지털 채널 강화 트렌드"]
    }
  },
  "marketingInsights": [
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
  ],
  "actionStrategies": [
    {
      "id": 1,
      "title": "콘텐츠 마케팅",
      "subtitle": "SEO 기반 타겟 키워드 전략",
      "sections": [
        {"heading": "핵심 키워드 군", "items": ["키워드1", "키워드2"]},
        {"heading": "틈새 키워드", "items": ["롱테일 키워드1"]}
      ],
      "expectedMetrics": [
        {"label": "예상 CTR", "value": "35%"}
      ]
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
  "conclusion": {
    "summary": "종합 결론 요약 (2-3문장)",
    "recommendations": [
      "핵심 추천사항 1",
      "핵심 추천사항 2",
      "핵심 추천사항 3"
    ]
  }
}`;

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

      // 리포트 데이터 구조화
      const report: IntegratedReportData = {
        generatedAt: new Date().toISOString(),
        keyword,
        companyName,

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
          totalSearchVolume: parsedResponse.keywordMap?.totalSearchVolume || `${totalVolume.toLocaleString()}건`,
          topKeywords: parsedResponse.keywordMap?.topKeywords || [],
          painPointKeywords: parsedResponse.keywordMap?.painPointKeywords || [],
          dataInsights: parsedResponse.keywordMap?.dataInsights || [],
        },

        channelBreakdown: parsedResponse.channelBreakdown || [],

        marketEnvironment: {
          competitionAnalysis: parsedResponse.marketEnvironment?.competitionAnalysis || {
            level: '분석 중', insight: '', keyPlayers: []
          },
          digitalTrends: parsedResponse.marketEnvironment?.digitalTrends || {
            mobileShare: `${mobileShare}%`, contentFreshness: '', orgChanges: []
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
