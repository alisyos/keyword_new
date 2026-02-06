import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { BidComparisonResult, BidComparisonAnalysis } from '../../types/bid-comparison';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AD_TYPE_LABEL: Record<string, string> = {
  powerlink: '파워링크',
  powercontent: '파워콘텐츠',
};

function buildDataSummary(data: BidComparisonResult): string {
  const { keywords, adType } = data;

  const formatBids = (bids: { position: number; bid: number }[]) =>
    bids.map((b) => `  ${b.position}위: ${b.bid.toLocaleString()}원`).join('\n');

  let summary = `광고 유형: ${AD_TYPE_LABEL[adType] || adType}\n분석 키워드 수: ${keywords.length}개\n\n`;

  keywords.forEach((kwResult, index) => {
    summary += `[${index + 1}. ${kwResult.keyword}]\n`;
    summary += `PC 입찰가:\n${formatBids(kwResult.pc)}\n\n`;
    summary += `모바일 입찰가:\n${formatBids(kwResult.mobile)}\n\n`;
  });

  return summary;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ analysis: BidComparisonAnalysis } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { bidData } = req.body as { bidData: BidComparisonResult };

    if (!bidData?.keywords || bidData.keywords.length < 2) {
      return res.status(400).json({ error: '입찰가 데이터가 누락되었습니다.' });
    }

    const summary = buildDataSummary(bidData);
    const keywordNames = bidData.keywords.map(k => k.keyword);

    const systemPrompt = `당신은 네이버 검색광고 입찰 전략 전문가입니다.
${keywordNames.length}개 키워드의 순위별 입찰가 데이터를 비교 분석하여, 광고주가 즉시 활용할 수 있는 전략적 인사이트를 제공합니다.`;

    // 키워드별 전략 요청 문구 동적 생성
    const keywordStrategyRequests = keywordNames.map((name, idx) =>
      `  - "${name}": PC 운영전략과 모바일 운영전략 각각 3-4문장`
    ).join('\n');

    const userPrompt = `아래 ${keywordNames.length}개 키워드의 순위별 입찰가 데이터를 분석해주세요.

${summary}

PC와 모바일을 각각 분리하여 분석해주세요. 다음 JSON 형식으로 응답해주세요:
{
  "strategicInflectionPc": "PC 전략적 분기점 분석 - 모든 키워드 간 입찰가 비교 시 어느 순위에서 입찰가 역전이나 큰 격차가 발생하는지, 순위별 한계비용(입찰가 증가분) 분석을 포함하여 3-4문장으로 작성",
  "strategicInflectionMobile": "모바일 전략적 분기점 분석 - 모바일 입찰가 기준으로 어느 순위에서 입찰가 역전이나 큰 격차가 발생하는지, 순위별 한계비용(입찰가 증가분) 분석을 포함하여 3-4문장으로 작성",
  "keywordStrategies": [
${keywordNames.map((name, idx) => `    {
      "keyword": "${name}",
      "pc": "${name} PC 운영전략 - PC에서 효율적인 순위대, 추천 입찰가 범위, PC 공략 포인트를 3-4문장으로 작성",
      "mobile": "${name} 모바일 운영전략 - 모바일에서 효율적인 순위대, 추천 입찰가 범위, 모바일 공략 포인트를 3-4문장으로 작성"
    }`).join(',\n')}
  ]
}`;

    // JSON 스키마 동적 생성
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      instructions: systemPrompt,
      input: userPrompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'bid_comparison_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              strategicInflectionPc: { type: 'string' },
              strategicInflectionMobile: { type: 'string' },
              keywordStrategies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    keyword: { type: 'string' },
                    pc: { type: 'string' },
                    mobile: { type: 'string' },
                  },
                  required: ['keyword', 'pc', 'mobile'],
                  additionalProperties: false,
                },
              },
            },
            required: [
              'strategicInflectionPc',
              'strategicInflectionMobile',
              'keywordStrategies',
            ],
            additionalProperties: false,
          },
        },
      },
    });

    console.log('GPT 응답 상태:', response.status, '| incomplete_details:', JSON.stringify(response.incomplete_details));

    const parsed = JSON.parse(response.output_text || '{}');

    const analysis: BidComparisonAnalysis = {
      strategicInflectionPc: parsed.strategicInflectionPc || '',
      strategicInflectionMobile: parsed.strategicInflectionMobile || '',
      keywordStrategies: parsed.keywordStrategies || [],
    };

    return res.status(200).json({ analysis });
  } catch (error: any) {
    console.error('입찰가 분석 오류:', error.message);
    return res.status(500).json({ error: '입찰가 분석 중 오류가 발생했습니다.' });
  }
}
