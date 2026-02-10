import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { ShoppingSearchAnalysisResult } from '../../types/integrated-analysis';

// OpenAI 클라이언트 생성
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ analysis: ShoppingSearchAnalysisResult } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { keyword, naverShoppingText, coupangShoppingText } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: '키워드가 누락되었습니다.' });
    }

    const hasNaver = naverShoppingText && naverShoppingText.trim();
    const hasCoupang = coupangShoppingText && coupangShoppingText.trim();

    if (!hasNaver && !hasCoupang) {
      return res.status(400).json({ error: '네이버 쇼핑 또는 쿠팡 검색 결과 중 하나 이상을 입력해주세요.' });
    }

    // GPT를 사용하여 쇼핑 검색 결과 분석
    const analysis = await analyzeShoppingSearch(
      keyword,
      hasNaver ? naverShoppingText.trim() : undefined,
      hasCoupang ? coupangShoppingText.trim() : undefined
    );

    res.status(200).json({ analysis });
  } catch (error) {
    console.error('쇼핑 검색 분석 오류:', error);
    res.status(500).json({ error: '쇼핑 검색 분석 중 오류가 발생했습니다.' });
  }
}

async function analyzeShoppingSearch(
  keyword: string,
  naverText?: string,
  coupangText?: string
): Promise<ShoppingSearchAnalysisResult> {
  const hasBoth = !!naverText && !!coupangText;
  const sources: ('naver' | 'coupang')[] = [];
  if (naverText) sources.push('naver');
  if (coupangText) sources.push('coupang');

  const platformLabel = hasBoth
    ? '네이버 쇼핑과 쿠팡'
    : naverText ? '네이버 쇼핑' : '쿠팡';

  const comparisonInstruction = hasBoth
    ? `\n  "platformComparison": "네이버 쇼핑과 쿠팡 플랫폼 간 가격, 브랜드, 배송, 리뷰 등의 차이점 비교 분석"`
    : '';

  const systemPrompt = `당신은 이커머스 마케팅 전문가입니다. ${platformLabel} 검색 결과 데이터를 분석하여 시장 인사이트를 도출해주세요.
${hasBoth ? '\n두 플랫폼의 데이터가 모두 제공되었으므로, 각 플랫폼의 특성을 비교하여 플랫폼별 전략 차이도 분석해주세요.' : ''}

분석 결과는 반드시 다음 JSON 형식으로 반환해주세요:
{
  "priceAnalysis": "가격대 분석 (최저가, 최고가, 평균가 범위, 가격 분포 특성)",
  "topBrands": "주요 브랜드/판매처 분석 (상위 노출 브랜드, 시장 점유 추정)",
  "productFeatures": "상품 특성 및 차별화 포인트 (주요 제품 유형, 스펙, 특징)",
  "purchaseFactors": "소비자 구매 결정 요인 분석 (리뷰, 평점, 배송, 혜택 등)",
  "marketPositioning": "시장 포지셔닝 전략 제안 (경쟁 우위 확보 방안)",
  "recommendations": ["마케팅 추천 사항 1", "마케팅 추천 사항 2", "마케팅 추천 사항 3"]${comparisonInstruction}
}

모든 텍스트는 한국어로, 구체적인 수치나 브랜드명을 인용하여 작성하세요.`;

  // 텍스트 제한: 단일 플랫폼 8000자, 두 플랫폼 각 6000자
  const charLimit = hasBoth ? 6000 : 8000;

  let userPromptData = '';
  if (naverText) {
    userPromptData += `=== 네이버 쇼핑 검색 결과 ===\n${naverText.slice(0, charLimit)}\n\n`;
  }
  if (coupangText) {
    userPromptData += `=== 쿠팡 검색 결과 ===\n${coupangText.slice(0, charLimit)}\n\n`;
  }

  const userPrompt = `다음은 "${keyword}" 키워드로 ${platformLabel}에서 검색한 결과입니다.

${userPromptData}위 데이터를 분석하여 이커머스 마케팅 관점의 인사이트를 JSON 형식으로 제공해주세요.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: hasBoth ? 2500 : 2000,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0].message.content || '';
    const parsedResponse = JSON.parse(responseText);

    return {
      keyword,
      timestamp: new Date().toISOString(),
      naverInputText: naverText,
      coupangInputText: coupangText,
      sources,
      gptAnalysis: {
        priceAnalysis: parsedResponse.priceAnalysis || '분석 결과 없음',
        topBrands: parsedResponse.topBrands || '분석 결과 없음',
        productFeatures: parsedResponse.productFeatures || '분석 결과 없음',
        purchaseFactors: parsedResponse.purchaseFactors || '분석 결과 없음',
        marketPositioning: parsedResponse.marketPositioning || '분석 결과 없음',
        recommendations: parsedResponse.recommendations || [],
        platformComparison: hasBoth ? (parsedResponse.platformComparison || undefined) : undefined,
      },
    };
  } catch (error) {
    console.error('OpenAI API 오류:', error);
    throw error;
  }
}
