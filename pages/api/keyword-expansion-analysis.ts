import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import {
  KeywordExpansionResult,
  KeywordExpansionData,
  KeywordExpansionGPTAnalysis,
  KeywordType,
} from '../../types/integrated-analysis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ analysis: KeywordExpansionGPTAnalysis } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { keyword, keywordExpansion, keywordType = 'general' }: {
      keyword: string;
      keywordExpansion: KeywordExpansionResult;
      keywordType?: KeywordType;
    } = req.body;

    if (!keyword || !keywordExpansion?.keywordList?.length) {
      return res.status(400).json({ error: '키워드 확장 데이터가 누락되었습니다.' });
    }

    const analysis = await generateKeywordExpansionAnalysis(keyword, keywordExpansion, keywordType);
    res.status(200).json({ analysis });
  } catch (error) {
    console.error('키워드 확장 분석 오류:', error);
    res.status(500).json({ error: '키워드 확장 분석 중 오류가 발생했습니다.' });
  }
}

// 간소화된 데이터 요약 생성
function buildSimpleSummary(keyword: string, keywordList: KeywordExpansionData[]): string {
  // 기본 통계 계산
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

  // PC+모바일 합계 검색량 기준 상위 20개 키워드
  const sortedByVolume = [...keywordList].sort((a, b) => {
    const volA = (a.monthlyPcQcCnt === '< 10' ? 5 : parseInt(a.monthlyPcQcCnt) || 0)
               + (a.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(a.monthlyMobileQcCnt) || 0);
    const volB = (b.monthlyPcQcCnt === '< 10' ? 5 : parseInt(b.monthlyPcQcCnt) || 0)
               + (b.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(b.monthlyMobileQcCnt) || 0);
    return volB - volA;
  });
  const top20 = sortedByVolume.slice(0, 20).map((kw, i) => {
    const vol = (kw.monthlyPcQcCnt === '< 10' ? 5 : parseInt(kw.monthlyPcQcCnt) || 0)
              + (kw.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(kw.monthlyMobileQcCnt) || 0);
    const ctr = kw.monthlyAveMobileCtr !== '< 10' ? parseFloat(kw.monthlyAveMobileCtr).toFixed(1) + '%' : '-';
    return `${i + 1}. ${kw.relKeyword} (검색량: ${vol.toLocaleString()}, CTR: ${ctr}, 경쟁: ${kw.compIdx})`;
  }).join('\n');

  return `키워드: "${keyword}"
총 연관키워드: ${keywordList.length}개
총 검색량: ${totalVolume.toLocaleString()}건 (모바일 ${mobileShare}%)
경쟁도: 높음 ${highComp}개, 중간 ${midComp}개, 낮음 ${lowComp}개

검색량 기준 상위 20개 키워드:
${top20}`;
}

// 키워드 유형별 분석 프롬프트 생성
function getKeywordExpansionPrompts(keywordType: KeywordType): { systemPrompt: string; analysisContext: string } {
  const baseSystem = `당신은 마케팅 데이터 분석가입니다. 키워드 데이터를 분석하여 간결한 인사이트를 제공합니다.
반드시 JSON 형식으로 응답하세요. 각 항목은 2-3문장으로 핵심만 작성하세요.`;

  const typePrompts: Record<KeywordType, { context: string }> = {
    general: {
      context: `검색광고 캠페인 최적화 관점에서 키워드 데이터를 분석해주세요.
중점 분석 사항:
- 검색 의도(Search Intent) 분류: 정보성/비교성/구매성
- 전환 가능성 높은 키워드 식별
- 광고 입찰 전략 방향 (고경쟁 vs 틈새 키워드)
- 시즌성/트렌드 패턴`
    },
    shopping: {
      context: `이커머스 상품 판매 최적화 관점에서 키워드 데이터를 분석해주세요.
중점 분석 사항:
- 구매 의도 키워드 vs 정보 탐색 키워드 분류
- 가격대별 검색 패턴 (저가/중가/고가)
- 브랜드명 포함 키워드 vs 일반 키워드 비율
- 상품 속성 키워드 (색상, 사이즈, 기능 등)`
    },
    brand: {
      context: `브랜드 경쟁력 분석 관점에서 키워드 데이터를 분석해주세요.
중점 분석 사항:
- 브랜드 인지도 지표 (순수 브랜드 검색량)
- 경쟁 브랜드 대비 검색량 점유율(SOV)
- 브랜드 연관 키워드 성격 (긍정/부정/기능)
- 브랜드 전환 가능성 (타 브랜드 → 자사)`
    }
  };

  return {
    systemPrompt: baseSystem + '\n\n' + typePrompts[keywordType].context,
    analysisContext: typePrompts[keywordType].context
  };
}

// 키워드 유형별 응답 구조 가이드 생성
function getResponseGuide(keywordType: KeywordType): string {
  const guides: Record<KeywordType, string> = {
    general: `{
  "searchVolumeAnalysis": "검색량 분석 (수요 규모, 모바일/PC 비중 의미)",
  "engagementAnalysis": "검색 의도 분류 (정보:__%, 비교:__%, 구매:__%) 및 전환 가능성 높은 키워드 TOP 5",
  "competitionAnalysis": "경쟁강도 분석 (고경쟁 vs 틈새 키워드 입찰 전략)",
  "consumerTrendAnalysis": "소비자 행동 패턴 및 시즌성/트렌드 분석",
  "conclusion": "검색광고 ROI 극대화를 위한 핵심 권고사항"
}`,
    shopping: `{
  "searchVolumeAnalysis": "검색량 분석 (구매 의도 vs 정보 탐색 비율)",
  "engagementAnalysis": "가격대별 검색 패턴 분석 (저가/중가/고가 선호도)",
  "competitionAnalysis": "브랜드 키워드 vs 일반 키워드 경쟁 분석",
  "consumerTrendAnalysis": "상품 속성 키워드 패턴 (색상, 사이즈, 기능 등)",
  "conclusion": "네이버 쇼핑 상품 판매 최적화를 위한 핵심 권고사항"
}`,
    brand: `{
  "searchVolumeAnalysis": "브랜드 인지도 지표 분석 (순수 브랜드 검색량)",
  "engagementAnalysis": "경쟁 브랜드 대비 검색량 점유율(SOV) 분석",
  "competitionAnalysis": "브랜드 연관 키워드 성격 분석 (긍정/부정/기능)",
  "consumerTrendAnalysis": "브랜드 전환 가능성 분석 (타 브랜드 → 자사)",
  "conclusion": "브랜드 경쟁력 강화를 위한 핵심 권고사항"
}`
  };

  return guides[keywordType];
}

async function generateKeywordExpansionAnalysis(
  keyword: string,
  keywordExpansion: KeywordExpansionResult,
  keywordType: KeywordType = 'general'
): Promise<KeywordExpansionGPTAnalysis> {
  const summary = buildSimpleSummary(keyword, keywordExpansion.keywordList);
  const { systemPrompt } = getKeywordExpansionPrompts(keywordType);
  const responseGuide = getResponseGuide(keywordType);

  const analysisTypeLabel: Record<KeywordType, string> = {
    general: '검색광고 최적화',
    shopping: '쇼핑 마케팅',
    brand: '브랜드 경쟁력'
  };

  const userPrompt = `[${analysisTypeLabel[keywordType]} 분석]

${summary}

위 데이터를 【${analysisTypeLabel[keywordType]}】 관점에서 분석하여 다음 5개 항목을 각각 2-3문장으로 작성해주세요:

${responseGuide}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');

  return {
    searchVolumeAnalysis: parsed.searchVolumeAnalysis || '',
    engagementAnalysis: parsed.engagementAnalysis || '',
    competitionAnalysis: parsed.competitionAnalysis || '',
    consumerTrendAnalysis: parsed.consumerTrendAnalysis || '',
    conclusion: parsed.conclusion || '',
  };
}
