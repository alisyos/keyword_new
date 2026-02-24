import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import {
  ShoppingSearchAnalysisResult,
  ShoppingPlatformData,
  ShoppingAnalysisData,
  ShoppingSellerRankItem,
  ShoppingPriceRangeItem,
} from '../../types/integrated-analysis';

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

// 플랫폼 데이터 유효성 검증 및 기본값 적용
function validatePlatformData(raw: any): ShoppingPlatformData {
  const overall = raw?.overall || {};
  const sellers = raw?.sellers || {};
  const priceRanges = raw?.priceRanges || {};

  return {
    overall: {
      totalProducts: Number(overall.totalProducts) || 0,
      averagePrice: Number(overall.averagePrice) || 0,
      totalReviews: Number(overall.totalReviews) || 0,
      averageRating: Number(overall.averageRating) || 0,
      estimatedRevenue: Number(overall.estimatedRevenue) || 0,
      insight: overall.insight || '',
    },
    sellers: {
      topSellers: (sellers.topSellers || []).map((s: any, idx: number): ShoppingSellerRankItem => ({
        rank: idx + 1,
        seller: s.seller || '',
        productName: s.productName || '',
        price: Number(s.price) || 0,
        reviews: Number(s.reviews) || 0,
        rating: Number(s.rating) || 0,
        estimatedRevenue: Number(s.estimatedRevenue) || 0,
      })),
      insight: sellers.insight || '',
    },
    priceRanges: {
      priceRanges: (priceRanges.priceRanges || []).map((p: any): ShoppingPriceRangeItem => ({
        range: p.range || '',
        productCount: Number(p.productCount) || 0,
        averagePrice: Number(p.averagePrice) || 0,
        totalReviews: Number(p.totalReviews) || 0,
        averageRating: Number(p.averageRating) || 0,
        estimatedRevenue: Number(p.estimatedRevenue) || 0,
      })),
      insight: priceRanges.insight || '',
    },
  };
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

  // 플랫폼 데이터 스키마 (재사용)
  const platformSchema = `{
      "overall": {
        "totalProducts": 숫자(총 상품 수),
        "averagePrice": 숫자(원 단위 평균 가격),
        "totalReviews": 숫자(총 리뷰 수),
        "averageRating": 숫자(소수점 평점, 예: 4.5),
        "estimatedRevenue": 숫자(원 단위 추정 총 매출액 = 평균가격 × 총리뷰수 근사),
        "insight": "핵심 인사이트 1~2문장"
      },
      "sellers": {
        "topSellers": [
          {
            "seller": "판매자명",
            "productName": "대표 상품명",
            "price": 숫자(원 단위),
            "reviews": 숫자(리뷰 수),
            "rating": 숫자(소수점 평점),
            "estimatedRevenue": 숫자(원 단위 추정 매출 = 가격 × 리뷰수)
          }
        ],
        "insight": "판매자 분석 인사이트 1~2문장"
      },
      "priceRanges": {
        "priceRanges": [
          {
            "range": "가격대 구간 (예: 1~3만원)",
            "productCount": 숫자,
            "averagePrice": 숫자(원 단위),
            "totalReviews": 숫자,
            "averageRating": 숫자(소수점),
            "estimatedRevenue": 숫자(원 단위)
          }
        ],
        "insight": "가격대 분석 인사이트 1~2문장"
      }
    }`;

  const responseStructure = hasBoth
    ? `{
  "naver": ${platformSchema},
  "coupang": ${platformSchema},
  "strategy": {
    "marketPositioning": "네이버/쿠팡 매체별 시장 포지셔닝 전략 (3~5문장)",
    "marketingStrategy": "종합 마케팅 전략 (3~5문장)"
  }
}`
    : `{
  "combined": ${platformSchema},
  "strategy": {
    "marketPositioning": "매체별 시장 포지셔닝 전략 (3~5문장)",
    "marketingStrategy": "종합 마케팅 전략 (3~5문장)"
  }
}`;

  const systemPrompt = `당신은 이커머스 데이터 분석가입니다. ${platformLabel} 검색 결과 데이터를 분석하여 구조화된 수치 기반 인사이트를 도출해주세요.
${hasBoth ? '\n두 플랫폼의 데이터가 모두 제공되었으므로, 각 플랫폼을 개별 분석하고 전략에서 비교 관점을 포함해주세요.' : ''}

### 수치 규칙
- 모든 가격/매출은 숫자(원 단위)로 반환 (예: 29900, 1500000)
- 평점은 소수점 1자리 (예: 4.3)
- 추정 매출 = 가격 × 리뷰 수 근사치
- topSellers는 상위 5개 판매자 (데이터가 부족하면 가능한 만큼)
- priceRanges는 3~6개 구간으로 분류

분석 결과는 반드시 다음 JSON 형식으로 반환해주세요:
${responseStructure}

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

${userPromptData}위 데이터를 분석하여 구조화된 JSON 형식으로 제공해주세요.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: hasBoth ? 4500 : 3000,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0].message.content || '';
    const parsedResponse = JSON.parse(responseText);

    // 구조화된 분석 데이터 생성
    const gptAnalysis: ShoppingAnalysisData = {
      strategy: {
        marketPositioning: parsedResponse.strategy?.marketPositioning || '',
        marketingStrategy: parsedResponse.strategy?.marketingStrategy || '',
      },
    };

    if (hasBoth) {
      gptAnalysis.naver = validatePlatformData(parsedResponse.naver);
      gptAnalysis.coupang = validatePlatformData(parsedResponse.coupang);
    } else {
      gptAnalysis.combined = validatePlatformData(parsedResponse.combined);
    }

    return {
      keyword,
      timestamp: new Date().toISOString(),
      naverInputText: naverText,
      coupangInputText: coupangText,
      sources,
      gptAnalysis,
    };
  } catch (error) {
    console.error('OpenAI API 오류:', error);
    throw error;
  }
}
