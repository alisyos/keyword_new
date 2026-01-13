import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { OpenAI } from 'openai';
import path from 'path';

// FormData 파싱을 위해 bodyParser 비활성화
export const config = {
  api: {
    bodyParser: false,
  },
};

// OpenAI 클라이언트 생성
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AdAnalysisResult {
  ourAd: {
    rank: number;
    evaluation: {
      title: string;
      description: string;
    };
  };
  competitorAnalysis: string;
  adSuggestions: Array<{
    title: string;
    description: string;
    improvementPoints: string;
  }>;
}

// formidable을 사용한 폼 파싱
async function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFiles: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      uploadDir: path.join(process.cwd(), 'tmp'),
      keepExtensions: true,
      filter: part => part.name === 'image' && part.mimetype?.includes('image')
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      resolve({ fields, files });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdAnalysisResult | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 파일과 필드 파싱
    const { fields, files } = await parseForm(req);

    // 필수 필드 검증
    const keyword = Array.isArray(fields.keyword) ? fields.keyword[0] : fields.keyword;
    const companyName = Array.isArray(fields.companyName) ? fields.companyName[0] : fields.companyName;
    const inputMode = Array.isArray(fields.inputMode) ? fields.inputMode[0] : fields.inputMode;
    const adText = Array.isArray(fields.adText) ? fields.adText[0] : fields.adText;

    if (!keyword) {
      return res.status(400).json({ error: '검색 키워드가 누락되었습니다.' });
    }

    if (!companyName) {
      return res.status(400).json({ error: '업체명이 누락되었습니다.' });
    }

    let analysisResult: AdAnalysisResult;

    // 텍스트 모드인 경우
    if (inputMode === 'text') {
      if (!adText || !adText.trim()) {
        return res.status(400).json({ error: '광고 검색결과 텍스트가 누락되었습니다.' });
      }

      // 텍스트 분석 및 광고 순위 확인
      analysisResult = await analyzeAdText(adText, keyword, companyName);
    } else {
      // 이미지 모드인 경우 (기본값)
      const imageFile = files.image;
      if (!imageFile) {
        return res.status(400).json({ error: '이미지 파일이 누락되었습니다.' });
      }

      // 이미지 파일 검증
      const filePath = imageFile.filepath || imageFile.path;
      if (!filePath) {
        return res.status(400).json({ error: '이미지 파일 처리 중 오류가 발생했습니다.' });
      }

      // 이미지 분석을 위해 base64로 변환
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');

      // 이미지 분석 및 광고 순위 확인
      analysisResult = await analyzeAdImage(base64Image, keyword, companyName);

      // 임시 파일 삭제
      fs.unlinkSync(filePath);
    }

    // 분석 결과 응답
    res.status(200).json(analysisResult);
  } catch (error) {
    console.error('광고 분석 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

// 텍스트 분석 및 광고 순위 확인 함수
async function analyzeAdText(adText: string, keyword: string, companyName: string): Promise<AdAnalysisResult> {
  try {
    // OpenAI API를 사용하여 텍스트 분석
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `당신은 검색 광고 텍스트 분석 전문가입니다.
          사용자가 제공한 검색 광고 결과 텍스트에서 광고를 식별하고, 특정 업체('${companyName}')의 광고를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

          {
            "ourAd": {
              "rank": 숫자 (해당 업체의 광고 순위, 없으면 0),
              "evaluation": {
                "title": "광고 제목에 대한 평가",
                "description": "광고 설명에 대한 평가"
              }
            },
            "competitorAnalysis": "경쟁사 광고에 대한 넘버링된 분석. '1. [경쟁사명] - 분석내용\\n2. [경쟁사명] - 분석내용\\n3. [경쟁사명] - 분석내용' 형식으로 최소 3개 이상의 경쟁사 광고를 포함해 분석해주세요.",
            "adSuggestions": [
              {
                "title": "제안 광고 제목 1",
                "description": "제안 광고 설명 1",
                "improvementPoints": "개선 포인트 설명 1"
              },
              {
                "title": "제안 광고 제목 2",
                "description": "제안 광고 설명 2",
                "improvementPoints": "개선 포인트 설명 2"
              },
              {
                "title": "제안 광고 제목 3",
                "description": "제안 광고 설명 3",
                "improvementPoints": "개선 포인트 설명 3"
              }
            ]
          }

          텍스트 형식 설명:
          - 각 광고는 보통 favicon, 업체명, 도메인, 광고 제목, 광고 설명, 확장 링크, 광고집행기간 순으로 나열됩니다.
          - "광고집행기간" 다음에 새로운 favicon이 나오면 다음 광고의 시작입니다.
          - 광고 순위는 텍스트에서 나타나는 순서대로 1위, 2위, 3위... 입니다.

          분석 시 다음 요소들을 고려하세요:
          - 광고 카피의 강점과 약점
          - 키워드 관련성
          - 호소력과 차별화 요소
          - 타겟팅 전략
          - 클릭 유도 요소
          - 가독성과 간결성
          - 광고집행기간 (61개월 이상은 오래된 광고, 0~3개월은 신규 광고)`
        },
        {
          role: "user",
          content: `다음은 '${keyword}' 키워드에 대한 검색 광고 결과입니다. '${companyName}'이라는 업체 광고를 분석하고 순위, 평가, 개선점을 알려주세요.\n\n${adText}`
        }
      ],
      max_tokens: 1500
    });

    // 응답 텍스트에서 JSON 형식 추출
    const responseText = response.choices[0].message.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('AI 응답에서 JSON 형식을 찾을 수 없습니다:', responseText);
      return getDefaultResponse();
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      return formatAnalysisResult(result);
    } catch (error) {
      console.error('JSON 파싱 오류:', error, jsonMatch[0]);
      throw new Error('AI 응답을 파싱할 수 없습니다.');
    }
  } catch (error) {
    console.error('텍스트 분석 API 호출 중 오류:', error);
    throw error;
  }
}

// 기본 응답 생성 함수
function getDefaultResponse(): AdAnalysisResult {
  return {
    ourAd: {
      rank: 0,
      evaluation: {
        title: "텍스트에서 해당 업체의 광고를 식별할 수 없습니다.",
        description: "텍스트 내용을 확인하거나 다른 검색 결과를 입력해주세요."
      }
    },
    competitorAnalysis: "1. [경쟁사 광고 없음] - 텍스트에서 경쟁사 광고를 식별할 수 없습니다.\n2. [경쟁사 광고 없음] - 더 많은 광고 정보를 포함해 주세요.\n3. [경쟁사 광고 없음] - 전체 검색 결과 텍스트로 다시 시도해 주세요.",
    adSuggestions: [
      {
        title: "키워드 중심 제목",
        description: "USP를 강조한 설명",
        improvementPoints: "키워드와 관련된 명확한 USP(고유 판매 제안)를 광고 제목에 포함하세요."
      },
      {
        title: "타겟 고객 중심 제목",
        description: "문제 해결을 강조한 설명",
        improvementPoints: "타겟 고객층에게 직접적으로 호소하는 문구를 사용하세요."
      },
      {
        title: "행동 유도 중심 제목",
        description: "혜택을 강조한 설명",
        improvementPoints: "명확한 행동 유도(Call to Action)를 포함하세요."
      }
    ]
  };
}

// 분석 결과 형식화 함수
function formatAnalysisResult(result: any): AdAnalysisResult {
  return {
    ourAd: {
      rank: typeof result.ourAd?.rank === 'number' ? result.ourAd.rank : 0,
      evaluation: {
        title: typeof result.ourAd?.evaluation?.title === 'string' ? result.ourAd.evaluation.title : '평가할 수 없습니다',
        description: typeof result.ourAd?.evaluation?.description === 'string' ? result.ourAd.evaluation.description : '평가할 수 없습니다'
      }
    },
    competitorAnalysis: typeof result.competitorAnalysis === 'string' ? result.competitorAnalysis : '분석 결과를 가져올 수 없습니다.',
    adSuggestions: Array.isArray(result.adSuggestions)
      ? result.adSuggestions.slice(0, 3).map((suggestion: any) => ({
          title: suggestion.title || '제목 제안 없음',
          description: suggestion.description || '설명 제안 없음',
          improvementPoints: suggestion.improvementPoints || '개선 포인트 없음'
        }))
      : [
          {
            title: "키워드 중심 제목",
            description: "USP를 강조한 설명",
            improvementPoints: "키워드와 관련된 명확한 USP(고유 판매 제안)를 광고 제목에 포함하세요."
          },
          {
            title: "타겟 고객 중심 제목",
            description: "문제 해결을 강조한 설명",
            improvementPoints: "타겟 고객층에게 직접적으로 호소하는 문구를 사용하세요."
          },
          {
            title: "행동 유도 중심 제목",
            description: "혜택을 강조한 설명",
            improvementPoints: "명확한 행동 유도(Call to Action)를 포함하세요."
          }
        ]
  };
}

// 이미지 분석 및 광고 순위 확인 함수
async function analyzeAdImage(base64Image: string, keyword: string, companyName: string): Promise<AdAnalysisResult> {
  try {
    // OpenAI Vision API를 사용하여 이미지 분석
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `당신은 검색 광고 이미지 분석 전문가입니다.
          업로드된 검색 결과 이미지에서 광고를 식별하고, 특정 업체('${companyName}')의 광고를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

          {
            "ourAd": {
              "rank": 숫자 (해당 업체의 광고 순위, 없으면 0),
              "evaluation": {
                "title": "광고 제목에 대한 평가",
                "description": "광고 설명에 대한 평가"
              }
            },
            "competitorAnalysis": "경쟁사 광고에 대한 넘버링된 분석. '1. [경쟁사명] - 분석내용\\n2. [경쟁사명] - 분석내용\\n3. [경쟁사명] - 분석내용' 형식으로 최소 3개 이상의 경쟁사 광고를 포함해 분석해주세요.",
            "adSuggestions": [
              {
                "title": "제안 광고 제목 1",
                "description": "제안 광고 설명 1",
                "improvementPoints": "개선 포인트 설명 1"
              },
              {
                "title": "제안 광고 제목 2",
                "description": "제안 광고 설명 2",
                "improvementPoints": "개선 포인트 설명 2"
              },
              {
                "title": "제안 광고 제목 3",
                "description": "제안 광고 설명 3",
                "improvementPoints": "개선 포인트 설명 3"
              }
            ]
          }

          분석 시 다음 요소들을 고려하세요:
          - 광고 카피의 강점과 약점
          - 키워드 관련성
          - 호소력과 차별화 요소
          - 타겟팅 전략
          - 클릭 유도 요소
          - 가독성과 간결성`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 이미지는 '${keyword}' 키워드에 대한 검색 결과입니다. '${companyName}'이라는 업체 광고를 분석하고 순위, 평가, 개선점을 알려주세요.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1500
    });

    // 응답 텍스트에서 JSON 형식 추출
    const responseText = response.choices[0].message.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('AI 응답에서 JSON 형식을 찾을 수 없습니다:', responseText);
      return getDefaultResponse();
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      return formatAnalysisResult(result);
    } catch (error) {
      console.error('JSON 파싱 오류:', error, jsonMatch[0]);
      throw new Error('AI 응답을 파싱할 수 없습니다.');
    }
  } catch (error) {
    console.error('Vision API 호출 중 오류:', error);
    throw error;
  }
} 