import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import {
  BrandComparisonResult,
  BrandComparisonData,
  BrandKeywordComparisonGPTAnalysis,
  BrandKeywordFilter,
  KeywordExpansionData,
} from '../../types/integrated-analysis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ analysis: BrandKeywordComparisonGPTAnalysis } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      ownBrand,
      competitors,
      brandComparison,
      brandKeywordFilters,
    }: {
      ownBrand: string;
      competitors: string[];
      brandComparison: BrandComparisonResult;
      brandKeywordFilters?: BrandKeywordFilter[];
    } = req.body;

    if (!brandComparison?.ownBrand) {
      return res.status(400).json({ error: '브랜드 비교 데이터가 누락되었습니다.' });
    }

    const analysis = await generateBrandKeywordComparison(
      ownBrand,
      competitors || [],
      brandComparison,
      brandKeywordFilters || []
    );
    res.status(200).json({ analysis });
  } catch (error) {
    console.error('브랜드 키워드 비교 분석 오류:', error);
    res.status(500).json({ error: '브랜드 키워드 비교 분석 중 오류가 발생했습니다.' });
  }
}

// 키워드 리스트에서 통계 계산
function computeBrandKeywordStats(keywordList: KeywordExpansionData[]) {
  let totalPc = 0, totalMobile = 0;
  let highComp = 0, midComp = 0, lowComp = 0;

  keywordList.forEach(kw => {
    totalPc += kw.monthlyPcQcCnt === '< 10' ? 5 : parseInt(kw.monthlyPcQcCnt) || 0;
    totalMobile += kw.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(kw.monthlyMobileQcCnt) || 0;
    if (kw.compIdx === '높음') highComp++;
    else if (kw.compIdx === '중간') midComp++;
    else lowComp++;
  });

  const totalVolume = totalPc + totalMobile;
  const mobileShare = totalVolume > 0 ? Math.round((totalMobile / totalVolume) * 100) : 0;
  return { totalVolume, mobileShare, highComp, midComp, lowComp };
}

// 단일 브랜드의 데이터 요약 (상위 20개 키워드 포함)
function buildBrandSummary(brand: BrandComparisonData): string {
  const list = brand.keywordExpansion?.keywordList || [];
  const stats = computeBrandKeywordStats(list);

  const sorted = [...list].sort((a, b) => {
    const volA = (a.monthlyPcQcCnt === '< 10' ? 5 : parseInt(a.monthlyPcQcCnt) || 0)
               + (a.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(a.monthlyMobileQcCnt) || 0);
    const volB = (b.monthlyPcQcCnt === '< 10' ? 5 : parseInt(b.monthlyPcQcCnt) || 0)
               + (b.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(b.monthlyMobileQcCnt) || 0);
    return volB - volA;
  });

  const top20 = sorted.slice(0, 20).map((kw, i) => {
    const vol = (kw.monthlyPcQcCnt === '< 10' ? 5 : parseInt(kw.monthlyPcQcCnt) || 0)
              + (kw.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(kw.monthlyMobileQcCnt) || 0);
    const ctr = kw.monthlyAveMobileCtr !== '< 10' ? parseFloat(kw.monthlyAveMobileCtr).toFixed(1) + '%' : '-';
    return `  ${i + 1}. ${kw.relKeyword} (검색량: ${vol.toLocaleString()}, CTR: ${ctr}, 경쟁: ${kw.compIdx})`;
  }).join('\n');

  return `브랜드: "${brand.brandKeyword}"${brand.isOwnBrand ? ' (자사)' : ''}
- 총 연관키워드: ${list.length}개
- 총 검색량: ${stats.totalVolume.toLocaleString()}건 (모바일 ${stats.mobileShare}%)
- 경쟁도: 높음 ${stats.highComp}개, 중간 ${stats.midComp}개, 낮음 ${stats.lowComp}개
- 검색량 상위 20개 키워드:
${top20}`;
}

async function generateBrandKeywordComparison(
  ownBrandName: string,
  competitorNames: string[],
  brandComparison: BrandComparisonResult,
  filters: BrandKeywordFilter[]
): Promise<BrandKeywordComparisonGPTAnalysis> {
  // SOV 계산
  const allBrands = [brandComparison.ownBrand, ...brandComparison.competitors];
  const brandVolumes = allBrands.map(b => {
    const stats = computeBrandKeywordStats(b.keywordExpansion?.keywordList || []);
    return { name: b.brandKeyword, volume: stats.totalVolume, isOwn: b.isOwnBrand };
  });
  const totalAllVolume = brandVolumes.reduce((s, b) => s + b.volume, 0);
  const sovTable = brandVolumes.map(b => ({
    name: b.name,
    isOwn: b.isOwn,
    sov: totalAllVolume > 0 ? parseFloat(((b.volume / totalAllVolume) * 100).toFixed(1)) : 0,
    volume: b.volume,
  }));

  const sovSummary = sovTable
    .sort((a, b) => b.sov - a.sov)
    .map(b => `${b.name}${b.isOwn ? '(자사)' : ''}: ${b.sov}% (${b.volume.toLocaleString()}건)`)
    .join(', ');

  // 모든 브랜드 데이터 요약
  const brandSummaries = allBrands.map(buildBrandSummary).join('\n\n');

  const filterDescription = filters.length > 0
    ? `\n적용된 필터: ${filters.filter(f => f.isEnabled).map(f => `${f.brandKeyword}→"${f.filterText}"`).join(', ')}`
    : '';

  const systemPrompt = `당신은 브랜드 마케팅 전략 컨설턴트입니다. 자사 브랜드와 경쟁 브랜드들의 키워드 확장 데이터를 비교 분석하여 전략적 인사이트를 도출합니다.
반드시 JSON 형식으로 응답하세요. 각 브랜드별 개별 분석 + 브랜드 간 비교 인사이트를 모두 작성해주세요.`;

  const responseSchema = `{
  "perBrand": [
    {
      "brandKeyword": "브랜드명",
      "isOwnBrand": true|false,
      "searchVolumeAnalysis": "이 브랜드의 검색량/인지도 분석 (2-3문장)",
      "engagementAnalysis": "CTR/관여도 분석 (2-3문장)",
      "competitionAnalysis": "경쟁/연관 키워드 성격 분석 (2-3문장)",
      "consumerTrendAnalysis": "소비자 트렌드 분석 (2-3문장)",
      "conclusion": "이 브랜드의 핵심 결론 (2-3문장)"
    }
  ],
  "comparison": {
    "sovInterpretation": "SOV 분포에 대한 해석 (2-3문장)",
    "keywordOverlap": "브랜드 간 키워드 겹침과 차별화 분석 (2-3문장)",
    "competitiveAdvantage": "자사가 우위인 키워드/영역 분석 (2-3문장)",
    "threatKeywords": ["경쟁사가 강한 키워드1", "키워드2", "키워드3"],
    "opportunityKeywords": ["자사가 노릴 만한 빈 시장 키워드1", "키워드2", "키워드3"],
    "strategicRecommendation": "자사 브랜드 전략 권고 (3-4문장)"
  }
}`;

  const userPrompt = `[브랜드 키워드 비교 분석]

자사 브랜드: ${ownBrandName}
경쟁 브랜드: ${competitorNames.join(', ')}${filterDescription}

=== 브랜드별 SOV (검색 점유율) ===
${sovSummary}
전체 합산 검색량: ${totalAllVolume.toLocaleString()}건

=== 브랜드별 키워드 확장 데이터 ===

${brandSummaries}

위 데이터를 분석하여 다음 JSON 스키마에 맞춰 응답해주세요. 각 브랜드는 반드시 별도 객체로 perBrand 배열에 포함되어야 하며, 자사(isOwnBrand=true)와 모든 경쟁사를 빠짐없이 다뤄야 합니다.

${responseSchema}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');

  return {
    perBrand: Array.isArray(parsed.perBrand)
      ? parsed.perBrand.map((p: any) => ({
          brandKeyword: p.brandKeyword || '',
          isOwnBrand: !!p.isOwnBrand,
          searchVolumeAnalysis: p.searchVolumeAnalysis || '',
          engagementAnalysis: p.engagementAnalysis || '',
          competitionAnalysis: p.competitionAnalysis || '',
          consumerTrendAnalysis: p.consumerTrendAnalysis || '',
          conclusion: p.conclusion || '',
        }))
      : [],
    comparison: {
      sovInterpretation: parsed.comparison?.sovInterpretation || '',
      keywordOverlap: parsed.comparison?.keywordOverlap || '',
      competitiveAdvantage: parsed.comparison?.competitiveAdvantage || '',
      threatKeywords: Array.isArray(parsed.comparison?.threatKeywords) ? parsed.comparison.threatKeywords : [],
      opportunityKeywords: Array.isArray(parsed.comparison?.opportunityKeywords) ? parsed.comparison.opportunityKeywords : [],
      strategicRecommendation: parsed.comparison?.strategicRecommendation || '',
    },
  };
}
