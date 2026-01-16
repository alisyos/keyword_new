import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import {
  KeywordExpansionResult,
  KeywordExpansionData,
  KeywordExpansionGPTAnalysis,
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
    const { keyword, keywordExpansion }: { keyword: string; keywordExpansion: KeywordExpansionResult } = req.body;

    if (!keyword || !keywordExpansion?.keywordList?.length) {
      return res.status(400).json({ error: '키워드 확장 데이터가 누락되었습니다.' });
    }

    const analysis = await generateKeywordExpansionAnalysis(keyword, keywordExpansion);
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

async function generateKeywordExpansionAnalysis(
  keyword: string,
  keywordExpansion: KeywordExpansionResult
): Promise<KeywordExpansionGPTAnalysis> {
  const summary = buildSimpleSummary(keyword, keywordExpansion.keywordList);

  const systemPrompt = `당신은 마케팅 데이터 분석가입니다. 키워드 데이터를 분석하여 간결한 인사이트를 제공합니다.
반드시 JSON 형식으로 응답하세요. 각 항목은 2-3문장으로 핵심만 작성하세요.`;

  const userPrompt = `${summary}

위 데이터를 분석하여 다음 5개 항목을 각각 2-3문장으로 작성해주세요:

{
  "searchVolumeAnalysis": "검색량 분석 (수요 규모, 모바일/PC 비중 의미)",
  "engagementAnalysis": "클릭율 분석 (CTR 패턴, 구매의도 높은/낮은 키워드)",
  "competitionAnalysis": "경쟁강도 분석 (시장 경쟁 상황, 진입 전략)",
  "consumerTrendAnalysis": "소비자 트렌드 (검색 의도, 행동 패턴)",
  "conclusion": "결론 및 마케팅 시사점 (핵심 권고사항)"
}`;

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
