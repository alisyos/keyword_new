import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import crypto from 'crypto';
import { AdType, BidComparisonResult, KeywordBidResult, BidByPosition } from '../../types/bid-comparison';

const generateSignature = (secretKey: string, timestamp: string, method: string, uri: string) => {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');
};

// 광고 유형별 API URI prefix
const AD_TYPE_URI: Record<AdType, string> = {
  powerlink: '/estimate/average-position-bid/keyword',
  powercontent: '/npc-estimate/average-position-bid/keyword',
};

// PC: 1~10, Mobile: 1~5
const POSITION_RANGE: Record<string, number> = {
  PC: 10,
  MOBILE: 5,
};

interface EstimateItem {
  key: string;
  position: number;
}

interface EstimateResponseItem {
  key: string;
  keyword?: string;
  position: number;
  bid: number;
}

interface EstimateApiResponse {
  device: string;
  estimate: EstimateResponseItem[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BidComparisonResult | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { keywords, adType } = req.body as {
    keywords: string[];
    adType: AdType;
  };

  // 키워드 배열 검증 (2~5개)
  if (!Array.isArray(keywords) || keywords.length < 2 || keywords.length > 5) {
    return res.status(400).json({ error: '키워드는 2개 이상 5개 이하로 입력해주세요.' });
  }

  // 빈 키워드 검증
  const trimmedKeywords = keywords.map(k => k?.trim()).filter(k => k);
  if (trimmedKeywords.length < 2) {
    return res.status(400).json({ error: '최소 2개의 키워드를 입력해주세요.' });
  }

  if (!AD_TYPE_URI[adType]) {
    return res.status(400).json({ error: '올바른 광고 유형을 선택해주세요.' });
  }

  const apiKey = process.env.NAVER_API_KEY;
  const secretKey = process.env.NAVER_SECRET_KEY;
  const customerId = process.env.NAVER_CUSTOMER_ID;

  if (!apiKey || !secretKey || !customerId) {
    return res.status(500).json({ error: '네이버 API 인증 정보가 설정되지 않았습니다.' });
  }

  const uri = AD_TYPE_URI[adType];

  try {
    // PC, MOBILE 각각의 요청 items 생성 (모든 키워드에 대해)
    const buildItems = (device: string): EstimateItem[] => {
      const maxPos = POSITION_RANGE[device];
      const items: EstimateItem[] = [];
      for (let pos = 1; pos <= maxPos; pos++) {
        for (const keyword of trimmedKeywords) {
          items.push({ key: keyword, position: pos });
        }
      }
      return items;
    };

    const callApi = async (device: string): Promise<EstimateResponseItem[]> => {
      const timestamp = Date.now().toString();
      const method = 'POST';
      const signature = generateSignature(secretKey, timestamp, method, uri);

      const response = await axios.post<EstimateApiResponse>(
        `https://api.searchad.naver.com${uri}`,
        {
          device,
          items: buildItems(device),
        },
        {
          headers: {
            'X-Timestamp': timestamp,
            'X-API-KEY': apiKey,
            'X-Customer': customerId,
            'X-Signature': signature,
            'Content-Type': 'application/json',
          },
        }
      );

      // API 응답: { device: "PC", estimate: [...] }
      const data = response.data;
      if (data && Array.isArray(data.estimate)) {
        return data.estimate;
      }
      // 직접 배열로 올 경우 대비
      if (Array.isArray(data)) {
        return data as unknown as EstimateResponseItem[];
      }
      return [];
    };

    // PC, MOBILE 병렬 호출
    const [pcData, mobileData] = await Promise.all([
      callApi('PC'),
      callApi('MOBILE'),
    ]);

    // 응답 데이터를 KeywordBidResult 구조로 변환
    // 응답 item의 key 또는 keyword 필드로 키워드 매칭
    const matchKeyword = (item: EstimateResponseItem, keyword: string) =>
      item.key === keyword || item.keyword === keyword;

    const parseResult = (
      keyword: string,
      pcItems: EstimateResponseItem[],
      mobileItems: EstimateResponseItem[]
    ): KeywordBidResult => {
      const pc: BidByPosition[] = pcItems
        .filter((item) => matchKeyword(item, keyword))
        .map((item) => ({ position: item.position, bid: item.bid || 0 }))
        .sort((a, b) => a.position - b.position);

      const mobile: BidByPosition[] = mobileItems
        .filter((item) => matchKeyword(item, keyword))
        .map((item) => ({ position: item.position, bid: item.bid || 0 }))
        .sort((a, b) => a.position - b.position);

      return { keyword, pc, mobile };
    };

    // 모든 키워드에 대해 결과 파싱
    const keywordResults = trimmedKeywords.map(keyword =>
      parseResult(keyword, pcData, mobileData)
    );

    const result: BidComparisonResult = {
      keywords: keywordResults,
      adType,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('입찰가 조회 오류:', error.response?.data || error.message);
    const message =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      '입찰가 데이터를 가져오는 중 오류가 발생했습니다.';
    return res.status(500).json({ error: message });
  }
}
