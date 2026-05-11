import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import {
  BrandComparisonResult,
  BrandComparisonData,
  BrandContentComparisonGPTAnalysis,
  ContentType,
  channelNames,
} from '../../types/integrated-analysis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ analysis: BrandContentComparisonGPTAnalysis } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      ownBrand,
      brandComparison,
    }: {
      ownBrand: string;
      brandComparison: BrandComparisonResult;
    } = req.body;

    if (!brandComparison?.ownBrand) {
      return res.status(400).json({ error: '브랜드 비교 데이터가 누락되었습니다.' });
    }

    const analysis = await generateBrandContentComparison(ownBrand, brandComparison);
    res.status(200).json({ analysis });
  } catch (error) {
    console.error('브랜드 콘텐츠 비교 분석 오류:', error);
    res.status(500).json({ error: '브랜드 콘텐츠 비교 분석 중 오류가 발생했습니다.' });
  }
}

// 단일 브랜드의 콘텐츠 요약 작성
function buildBrandContentSummary(brand: BrandComparisonData): string {
  const channels: ContentType[] = ['blog', 'cafe', 'youtube', 'news'];
  let summary = `브랜드: "${brand.brandKeyword}"${brand.isOwnBrand ? ' (자사)' : ''}\n`;

  let avgPositive = 0, avgNegative = 0, avgNeutral = 0, ch = 0;

  channels.forEach((c) => {
    const data = brand.contentAnalysis?.[c];
    if (!data) return;
    ch++;
    const s = data.sentiment;
    if (s) {
      avgPositive += s.positive;
      avgNegative += s.negative;
      avgNeutral += s.neutral;
    }
    summary += `\n  [${channelNames[c]}]\n`;
    if (s) {
      summary += `  - 감성: 긍정 ${s.positive}%, 중립 ${s.neutral}%, 부정 ${s.negative}%\n`;
      const pos = (s.positiveKeywords || []).slice(0, 5).map(k => `${k.keyword}(${k.score})`).join(', ');
      const neg = (s.negativeKeywords || []).slice(0, 5).map(k => `${k.keyword}(${k.score})`).join(', ');
      if (pos) summary += `  - 긍정 키워드: ${pos}\n`;
      if (neg) summary += `  - 부정 키워드: ${neg}\n`;
    }
    if (data.keywords && data.keywords.length > 0) {
      summary += `  - 상위 키워드: ${data.keywords.slice(0, 10).map(k => `${k.keyword}(${k.frequency})`).join(', ')}\n`;
    }
    if (data.contentItems && data.contentItems.length > 0) {
      const samples = data.contentItems.slice(0, 3).map((item, i) => `    ${i + 1}. ${item.title}`).join('\n');
      summary += `  - 콘텐츠 샘플:\n${samples}\n`;
    }
  });

  if (ch > 0) {
    summary += `\n- 평균 감성: 긍정 ${Math.round(avgPositive / ch)}%, 중립 ${Math.round(avgNeutral / ch)}%, 부정 ${Math.round(avgNegative / ch)}%\n`;
  } else {
    summary += `\n- (콘텐츠 분석 데이터 없음)\n`;
  }

  return summary;
}

async function generateBrandContentComparison(
  ownBrandName: string,
  brandComparison: BrandComparisonResult
): Promise<BrandContentComparisonGPTAnalysis> {
  const allBrands = [brandComparison.ownBrand, ...brandComparison.competitors];
  const brandSummaries = allBrands.map(buildBrandContentSummary).join('\n\n---\n\n');

  const systemPrompt = `당신은 브랜드 인식/포지셔닝 분석 전문가입니다. 자사 브랜드와 경쟁 브랜드들의 채널별 콘텐츠 분석(블로그/카페/유튜브/뉴스)을 비교하여, 브랜드별 강점·약점과 전략적 차별화 포인트를 도출합니다.
반드시 JSON 형식으로 응답하세요. 각 브랜드별 개별 분석 + 브랜드 간 비교 인사이트를 모두 작성해주세요.`;

  const responseSchema = `{
  "perBrand": [
    {
      "brandKeyword": "브랜드명",
      "isOwnBrand": true|false,
      "strengths": ["강점1", "강점2", "강점3"],
      "weaknesses": ["약점1", "약점2", "약점3"],
      "sentimentInterpretation": "감성 분포 해석 (2-3문장)",
      "topAssociations": ["연관 이미지1", "연관 이미지2", "연관 이미지3"],
      "channelHighlights": {
        "blog": "블로그에서 두드러진 특성 (1문장)",
        "cafe": "카페 특성",
        "youtube": "유튜브 특성",
        "news": "뉴스 특성"
      }
    }
  ],
  "comparison": {
    "sentimentGapAnalysis": "자사 vs 경쟁사 감성 격차 분석 (2-3문장)",
    "perceivedPositioning": "자사 vs 경쟁사 인식 포지셔닝 분석 (3-4문장)",
    "keyDifferentiators": [
      {"dimension": "가격|품질|신뢰도|디자인|서비스 등 차별화 축", "ownBrand": "자사 포지션", "competitors": "경쟁사 포지션"}
    ],
    "competitiveThreats": ["위협 요소1", "위협 요소2"],
    "growthOpportunities": ["성장 기회1", "성장 기회2"]
  }
}

키 차별화 축(keyDifferentiators)은 3-5개 작성.`;

  const userPrompt = `[브랜드 콘텐츠 비교 분석]

자사 브랜드: ${ownBrandName}
비교 브랜드: ${allBrands.map(b => b.brandKeyword).join(' / ')}

=== 브랜드별 채널 콘텐츠 분석 데이터 ===

${brandSummaries}

위 데이터를 분석하여 각 브랜드의 강점/약점/감성 해석/연관 이미지/채널 특성을 도출하고, 자사 관점에서 경쟁사 대비 차별화 포인트와 성장 기회를 제시해주세요. perBrand 배열에는 자사를 포함한 모든 브랜드(${allBrands.length}개)가 빠짐없이 들어가야 합니다.

${responseSchema}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 3500,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');

  return {
    perBrand: Array.isArray(parsed.perBrand)
      ? parsed.perBrand.map((p: any) => ({
          brandKeyword: p.brandKeyword || '',
          isOwnBrand: !!p.isOwnBrand,
          strengths: Array.isArray(p.strengths) ? p.strengths : [],
          weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
          sentimentInterpretation: p.sentimentInterpretation || '',
          topAssociations: Array.isArray(p.topAssociations) ? p.topAssociations : [],
          channelHighlights: p.channelHighlights && typeof p.channelHighlights === 'object'
            ? p.channelHighlights
            : {},
        }))
      : [],
    comparison: {
      sentimentGapAnalysis: parsed.comparison?.sentimentGapAnalysis || '',
      perceivedPositioning: parsed.comparison?.perceivedPositioning || '',
      keyDifferentiators: Array.isArray(parsed.comparison?.keyDifferentiators)
        ? parsed.comparison.keyDifferentiators.map((d: any) => ({
            dimension: d.dimension || '',
            ownBrand: d.ownBrand || '',
            competitors: d.competitors || '',
          }))
        : [],
      competitiveThreats: Array.isArray(parsed.comparison?.competitiveThreats) ? parsed.comparison.competitiveThreats : [],
      growthOpportunities: Array.isArray(parsed.comparison?.growthOpportunities) ? parsed.comparison.growthOpportunities : [],
    },
  };
}
