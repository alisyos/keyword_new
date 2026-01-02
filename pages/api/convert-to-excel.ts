import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface KeywordData {
  relKeyword: string;
  monthlyPcQcCnt: string;
  monthlyMobileQcCnt: string;
  monthlyAvePcClkCnt: string;
  monthlyAveMobileClkCnt: string;
  monthlyAvePcCtr: string;
  monthlyAveMobileCtr: string;
  plAvgDepth: string;
  compIdx: string;
}

interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

interface ExcelStructure {
  sheets: SheetData[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keywordData, analysis, searchKeyword } = req.body as {
      keywordData: KeywordData[];
      analysis: string;
      searchKeyword: string;
    };

    if (!keywordData || !analysis) {
      return res.status(400).json({ error: '키워드 데이터와 분석 결과가 필요합니다.' });
    }

    // GPT에게 마크다운 분석 결과를 엑셀 구조로 변환 요청
    const prompt = `다음 AI 분석 결과를 엑셀 시트로 변환할 수 있는 JSON 형식으로 재구성해주세요.
분석 내용의 핵심 정보를 표 형태로 정리하되, 내용에 맞게 적절한 시트명과 열 구성을 사용해주세요.

[분석 결과]
${analysis}

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "sheets": [
    {
      "name": "시트명 (15자 이내)",
      "headers": ["열1", "열2", "열3"],
      "rows": [
        ["값1", "값2", "값3"],
        ["값1", "값2", "값3"]
      ]
    }
  ]
}

주의사항:
- 시트명은 15자를 넘지 않도록 해주세요
- 분석 내용이 표로 표현하기 어려운 경우, "분석요약" 시트에 "항목"과 "내용" 두 열로 정리해주세요
- 숫자 데이터는 숫자 타입으로, 텍스트는 문자열로 표현해주세요
- 최대 5개 시트까지만 생성해주세요`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "당신은 마크다운 텍스트를 엑셀 스프레드시트 구조로 변환하는 전문가입니다. 반드시 유효한 JSON 형식으로만 응답합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('GPT 응답이 비어있습니다.');
    }

    let excelStructure: ExcelStructure;
    try {
      excelStructure = JSON.parse(responseText);
    } catch {
      // JSON 파싱 실패 시 기본 구조 사용
      excelStructure = {
        sheets: [
          {
            name: "분석결과",
            headers: ["항목", "내용"],
            rows: [["분석 결과", analysis.substring(0, 32000)]]
          }
        ]
      };
    }

    // 엑셀 워크북 생성
    const workbook = XLSX.utils.book_new();

    // Sheet 1: 키워드 데이터
    const keywordHeaders = [
      '키워드',
      'PC 검색량',
      '모바일 검색량',
      'PC 클릭수',
      '모바일 클릭수',
      'PC 클릭율',
      '모바일 클릭율',
      '노출광고수',
      '경쟁정도'
    ];

    const keywordRows = keywordData.map(item => [
      item.relKeyword,
      item.monthlyPcQcCnt === '<10' ? item.monthlyPcQcCnt : Number(item.monthlyPcQcCnt),
      item.monthlyMobileQcCnt === '<10' ? item.monthlyMobileQcCnt : Number(item.monthlyMobileQcCnt),
      Number(item.monthlyAvePcClkCnt),
      Number(item.monthlyAveMobileClkCnt),
      `${Number(item.monthlyAvePcCtr).toFixed(2)}%`,
      `${Number(item.monthlyAveMobileCtr).toFixed(2)}%`,
      Number(item.plAvgDepth),
      item.compIdx === 'HIGH' ? '높음' : item.compIdx === 'MID' ? '보통' : '낮음'
    ]);

    const keywordSheet = XLSX.utils.aoa_to_sheet([keywordHeaders, ...keywordRows]);

    // 열 너비 설정
    keywordSheet['!cols'] = [
      { wch: 30 }, // 키워드
      { wch: 12 }, // PC 검색량
      { wch: 14 }, // 모바일 검색량
      { wch: 10 }, // PC 클릭수
      { wch: 12 }, // 모바일 클릭수
      { wch: 10 }, // PC 클릭율
      { wch: 12 }, // 모바일 클릭율
      { wch: 10 }, // 노출광고수
      { wch: 10 }  // 경쟁정도
    ];

    XLSX.utils.book_append_sheet(workbook, keywordSheet, '키워드데이터');

    // Sheet 2+: AI 분석 결과 시트들
    if (excelStructure.sheets && Array.isArray(excelStructure.sheets)) {
      excelStructure.sheets.slice(0, 5).forEach((sheet, index) => {
        try {
          const sheetName = (sheet.name || `분석${index + 1}`).substring(0, 31);
          const sheetData = [sheet.headers || [], ...(sheet.rows || [])];
          const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

          // 열 너비 자동 조정
          const maxCols = Math.max(...sheetData.map(row => row.length));
          worksheet['!cols'] = Array(maxCols).fill({ wch: 20 });

          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        } catch (sheetError) {
          console.error(`시트 생성 오류 (${sheet.name}):`, sheetError);
        }
      });
    }

    // 엑셀 파일을 Buffer로 변환
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const base64 = Buffer.from(excelBuffer).toString('base64');

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `키워드분석_${searchKeyword || 'AI분석'}_${dateStr}.xlsx`;

    res.status(200).json({
      success: true,
      data: base64,
      fileName: fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

  } catch (error) {
    console.error('엑셀 변환 오류:', error);
    res.status(500).json({
      error: '엑셀 파일 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}
