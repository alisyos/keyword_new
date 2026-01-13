import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import {
  IntegratedReportData,
  IntegratedReportRequest,
  KeywordExpansionResult,
  KeywordAnalysisResult,
  AdAnalysisResult,
  ChannelSummary,
  ContentType,
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
      companyName,
      keywordExpansion,
      contentAnalysis,
      adAnalysis,
    }: IntegratedReportRequest = req.body;

    if (!keyword) {
      return res.status(400).json({ error: '키워드가 누락되었습니다.' });
    }

    if (!keywordExpansion) {
      return res.status(400).json({ error: '키워드 확장 데이터가 누락되었습니다.' });
    }

    // 분석 데이터 요약 생성
    const dataSummary = buildDataSummary(keyword, keywordExpansion, contentAnalysis, adAnalysis);

    // GPT를 사용하여 종합 리포트 생성
    const report = await generateIntegratedReport(keyword, companyName, dataSummary);

    res.status(200).json({ report });
  } catch (error) {
    console.error('종합 리포트 생성 오류:', error);
    res.status(500).json({ error: '종합 리포트 생성 중 오류가 발생했습니다.' });
  }
}

// 분석 데이터 요약 생성
function buildDataSummary(
  keyword: string,
  keywordExpansion: KeywordExpansionResult,
  contentAnalysis: { blog?: KeywordAnalysisResult; cafe?: KeywordAnalysisResult; youtube?: KeywordAnalysisResult; news?: KeywordAnalysisResult },
  adAnalysis?: AdAnalysisResult
): string {
  let summary = '';

  // 키워드 확장 데이터 요약
  summary += '## 키워드 확장 분석 데이터\n\n';
  if (keywordExpansion.keywordList && keywordExpansion.keywordList.length > 0) {
    const topKeywords = keywordExpansion.keywordList.slice(0, 15);
    summary += '### 상위 연관 키워드 (검색량 기준)\n';
    topKeywords.forEach((kw, idx) => {
      const pcVol = kw.monthlyPcQcCnt === '< 10' ? '10 미만' : parseInt(kw.monthlyPcQcCnt).toLocaleString();
      const mobileVol = kw.monthlyMobileQcCnt === '< 10' ? '10 미만' : parseInt(kw.monthlyMobileQcCnt).toLocaleString();
      summary += `${idx + 1}. ${kw.relKeyword} - PC: ${pcVol}, 모바일: ${mobileVol}, 경쟁도: ${kw.compIdx}\n`;
    });

    // 경쟁도 분포
    const highComp = keywordExpansion.keywordList.filter(k => k.compIdx === '높음').length;
    const midComp = keywordExpansion.keywordList.filter(k => k.compIdx === '중간').length;
    const lowComp = keywordExpansion.keywordList.filter(k => k.compIdx === '낮음').length;
    summary += `\n### 경쟁도 분포\n`;
    summary += `- 높음: ${highComp}개 키워드\n`;
    summary += `- 중간: ${midComp}개 키워드\n`;
    summary += `- 낮음: ${lowComp}개 키워드\n`;
  }

  // 콘텐츠 분석 데이터 요약
  summary += '\n## 채널별 콘텐츠 분석 데이터\n\n';

  const channels: ContentType[] = ['blog', 'cafe', 'youtube', 'news'];
  channels.forEach(channel => {
    const data = contentAnalysis[channel];
    if (data) {
      summary += `### ${channelNames[channel]}\n`;

      // 감성 분석
      if (data.sentiment) {
        summary += `- 감성 분석: 긍정 ${data.sentiment.positive}%, 중립 ${data.sentiment.neutral}%, 부정 ${data.sentiment.negative}%\n`;

        if (data.sentiment.positiveKeywords && data.sentiment.positiveKeywords.length > 0) {
          summary += `- 긍정 키워드: ${data.sentiment.positiveKeywords.slice(0, 5).map(k => k.keyword).join(', ')}\n`;
        }
        if (data.sentiment.negativeKeywords && data.sentiment.negativeKeywords.length > 0) {
          summary += `- 부정 키워드: ${data.sentiment.negativeKeywords.slice(0, 5).map(k => k.keyword).join(', ')}\n`;
        }
      }

      // 주요 키워드
      if (data.keywords && data.keywords.length > 0) {
        summary += `- 주요 키워드: ${data.keywords.slice(0, 8).map(k => `${k.keyword}(${k.frequency})`).join(', ')}\n`;
      }

      // 콘텐츠 수
      if (data.contentItems) {
        summary += `- 분석된 콘텐츠 수: ${data.contentItems.length}개\n`;
      }

      summary += '\n';
    }
  });

  // 광고 분석 데이터 요약
  if (adAnalysis) {
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

  return summary;
}

// GPT를 사용하여 종합 리포트 생성
async function generateIntegratedReport(
  keyword: string,
  companyName: string | undefined,
  dataSummary: string
): Promise<IntegratedReportData> {
  const systemPrompt = `당신은 디지털 마케팅 전략 전문가입니다. 제공된 키워드 분석 데이터를 바탕으로 종합적인 마케팅 리포트를 생성해주세요.

리포트는 다음 6개 섹션으로 구성되어야 합니다:

1. 소비자 인식 종합 분석 (consumerPerception)
   - 전반적인 감정 분석 결과 요약
   - 핵심 인사이트 도출 (3-5개)
   - 긍정/부정 키워드 분석

2. 채널별 소비자 반응 (channelAnalysis)
   - 전체 요약
   - 각 채널별 특성과 주요 발견 사항

3. 시장 환경 분석 (marketEnvironment)
   - 검색량 트렌드 분석
   - 경쟁 강도 평가
   - 기회 요인 및 위협 요인

4. 핵심 마케팅 인사이트 (marketingInsights)
   - 요약
   - 주요 인사이트 (4-6개)

5. 실행 가능한 마케팅 전략 (actionableStrategies)
   - 요약
   - 우선순위별 전략 제안 (3-5개)
   - 각 전략별 타임라인과 예상 성과

6. 종합 결론 (conclusion)
   - 전체 요약
   - 핵심 추천 사항 (3-5개)

응답은 반드시 아래 JSON 형식으로 제공해주세요. 모든 텍스트는 한국어로 작성하세요.`;

  const userPrompt = `다음은 "${keyword}" 키워드에 대한 분석 데이터입니다.${companyName ? ` (분석 대상 업체: ${companyName})` : ''}

${dataSummary}

위 데이터를 바탕으로 종합 마케팅 리포트를 JSON 형식으로 생성해주세요.

JSON 구조:
{
  "consumerPerception": {
    "overallSentiment": "전반적인 소비자 인식 요약 (2-3문장)",
    "keyInsights": ["인사이트1", "인사이트2", "인사이트3"],
    "topPositiveKeywords": [{"keyword": "키워드", "score": 8}],
    "topNegativeKeywords": [{"keyword": "키워드", "score": 6}]
  },
  "channelAnalysis": {
    "summary": "채널 분석 전체 요약",
    "channels": [
      {
        "channel": "blog",
        "channelName": "블로그",
        "totalContents": 30,
        "sentimentBreakdown": {"positive": 60, "negative": 15, "neutral": 25},
        "topKeywords": ["키워드1", "키워드2"],
        "keyFindings": ["발견1", "발견2"]
      }
    ]
  },
  "marketEnvironment": {
    "searchVolumeTrend": "검색량 트렌드 분석",
    "competitionLevel": "경쟁 강도 평가",
    "competitionAnalysis": "경쟁 환경 상세 분석",
    "keyOpportunities": ["기회1", "기회2"],
    "potentialThreats": ["위협1", "위협2"]
  },
  "marketingInsights": {
    "summary": "마케팅 인사이트 요약",
    "insights": ["인사이트1", "인사이트2", "인사이트3", "인사이트4"]
  },
  "actionableStrategies": {
    "summary": "전략 요약",
    "strategies": [
      {
        "strategy": "전략 이름",
        "priority": "high",
        "timeline": "실행 기간",
        "expectedOutcome": "예상 성과"
      }
    ]
  },
  "conclusion": {
    "summary": "종합 결론 요약",
    "recommendations": ["추천1", "추천2", "추천3"]
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
      max_tokens: 4000,
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
        sections: {
          consumerPerception: {
            overallSentiment: parsedResponse.consumerPerception?.overallSentiment || '분석 데이터가 충분하지 않습니다.',
            keyInsights: parsedResponse.consumerPerception?.keyInsights || [],
            topPositiveKeywords: parsedResponse.consumerPerception?.topPositiveKeywords || [],
            topNegativeKeywords: parsedResponse.consumerPerception?.topNegativeKeywords || [],
          },
          channelAnalysis: {
            summary: parsedResponse.channelAnalysis?.summary || '채널 분석 데이터가 충분하지 않습니다.',
            channels: parsedResponse.channelAnalysis?.channels || [],
          },
          marketEnvironment: {
            searchVolumeTrend: parsedResponse.marketEnvironment?.searchVolumeTrend || '데이터 부족',
            competitionLevel: parsedResponse.marketEnvironment?.competitionLevel || '데이터 부족',
            competitionAnalysis: parsedResponse.marketEnvironment?.competitionAnalysis || '',
            keyOpportunities: parsedResponse.marketEnvironment?.keyOpportunities || [],
            potentialThreats: parsedResponse.marketEnvironment?.potentialThreats || [],
          },
          marketingInsights: {
            summary: parsedResponse.marketingInsights?.summary || '',
            insights: parsedResponse.marketingInsights?.insights || [],
          },
          actionableStrategies: {
            summary: parsedResponse.actionableStrategies?.summary || '',
            strategies: (parsedResponse.actionableStrategies?.strategies || []).map((s: any) => ({
              strategy: s.strategy || '',
              priority: s.priority || 'medium',
              timeline: s.timeline || '',
              expectedOutcome: s.expectedOutcome || '',
            })),
          },
          conclusion: {
            summary: parsedResponse.conclusion?.summary || '',
            recommendations: parsedResponse.conclusion?.recommendations || [],
          },
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
