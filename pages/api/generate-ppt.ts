import type { NextApiRequest, NextApiResponse } from 'next';
import PptxGenJS from 'pptxgenjs';
import { IntegratedReportData, KeywordType, ShoppingSearchAnalysisResult, ShoppingPlatformData, AdAnalysisResult } from '../../types/integrated-analysis';

type BrandAdAnalysisPptItem = {
  brandKeyword: string;
  isOwnBrand: boolean;
  result: AdAnalysisResult;
};

// 색상 테마
const COLORS = {
  primary: '4F46E5',      // indigo-600
  secondary: '7C3AED',    // violet-600
  accent: '059669',       // emerald-600
  warning: 'D97706',      // amber-600
  danger: 'DC2626',       // red-600
  success: '16A34A',      // green-600
  dark: '1F2937',         // gray-800
  light: 'F3F4F6',        // gray-100
  white: 'FFFFFF',
  teal: '0D9488',
  cyan: '0891B2',
  orange: 'EA580C',
  pink: 'DB2777',
  slate: '475569',
};

// 유형별 PPT 라벨
function getPptLabels(keywordType: KeywordType) {
  const labels = {
    general: {
      coverTitle: 'MARKETING INTELLIGENCE REPORT',
      coverSubtitle: '시장 분석 리포트',
      tocPerception: '2. 3단계 소비자 인식 구조',
      tocMarket: '5. 시장 환경 분석',
      tocStrategy: '7. 실행 전략 (5대 전략)',
      slidePerceptionTitle: '3단계 소비자 인식 구조',
      slidePerceptionSub: 'Consumer Perception Journey',
      slideMarketTitle: '시장 환경 분석',
      slideMarketSub: 'Market Environment',
    },
    shopping: {
      coverTitle: 'E-COMMERCE INTELLIGENCE REPORT',
      coverSubtitle: '이커머스 시장 분석 리포트',
      tocPerception: '2. 3단계 구매 여정',
      tocMarket: '5. 쇼핑 검색 분석',
      tocStrategy: '7. 실행 전략 (이커머스 5대 전략)',
      slidePerceptionTitle: '3단계 구매 여정',
      slidePerceptionSub: 'Shopping Decision Journey',
      slideMarketTitle: '쇼핑 검색 분석',
      slideMarketSub: 'Shopping Search Analysis',
    },
    brand: {
      coverTitle: 'BRAND INTELLIGENCE REPORT',
      coverSubtitle: '브랜드 경쟁력 분석 리포트',
      tocPerception: '2. 3단계 브랜드 인식 구조',
      tocMarket: '5. 브랜드 경쟁 환경 분석',
      tocStrategy: '7. 실행 전략 (브랜드 5대 전략)',
      slidePerceptionTitle: '3단계 브랜드 인식 구조',
      slidePerceptionSub: 'Brand Perception Journey',
      slideMarketTitle: '브랜드 경쟁 환경 분석',
      slideMarketSub: 'Brand Competitive Environment',
    },
  };
  return labels[keywordType] || labels.general;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { report, shoppingAnalysis, brandAdAnalysis } = req.body as {
      report: IntegratedReportData;
      shoppingAnalysis?: ShoppingSearchAnalysisResult;
      brandAdAnalysis?: BrandAdAnalysisPptItem[];
    };

    if (!report) {
      return res.status(400).json({ error: 'Report data is required' });
    }

    const keywordType: KeywordType = report.keywordType || 'general';
    const pptLabels = getPptLabels(keywordType);
    const pptx = new PptxGenJS();

    // PPT 기본 설정
    pptx.author = 'GPTKOREA';
    pptx.title = `${report.keyword} 마케팅 분석 리포트`;
    pptx.subject = '키워드 마케팅 인텔리전스 리포트';
    pptx.company = 'GPTKOREA';

    // 슬라이드 마스터 정의
    pptx.defineSlideMaster({
      title: 'TITLE_SLIDE',
      background: { color: COLORS.primary },
    });

    pptx.defineSlideMaster({
      title: 'CONTENT_SLIDE',
      background: { color: COLORS.white },
    });

    // ========== Slide 1: 표지 ==========
    const slide1 = pptx.addSlide();
    slide1.background = { color: COLORS.primary };

    slide1.addText(pptLabels.coverTitle, {
      x: 0.5, y: 1.5, w: 9, h: 0.5,
      fontSize: 14, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center', bold: false, italic: false,
    });

    slide1.addText(`"${report.keyword}"`, {
      x: 0.5, y: 2.2, w: 9, h: 1,
      fontSize: 44, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center', bold: true,
    });

    slide1.addText(pptLabels.coverSubtitle, {
      x: 0.5, y: 3.2, w: 9, h: 0.6,
      fontSize: 24, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center',
    });

    slide1.addText(`${new Date(report.generatedAt).toLocaleDateString('ko-KR')}`, {
      x: 0.5, y: 4.5, w: 9, h: 0.4,
      fontSize: 14, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center',
    });

    if (report.companyName) {
      slide1.addText(report.companyName, {
        x: 0.5, y: 4.9, w: 9, h: 0.4,
        fontSize: 16, color: 'FFFFFF', fontFace: 'Arial',
        align: 'center', bold: true,
      });
    }

    slide1.addText('CONFIDENTIAL', {
      x: 8, y: 5.2, w: 1.5, h: 0.3,
      fontSize: 8, color: 'FFFFFF', fontFace: 'Arial',
      align: 'right',
    });

    // ========== Slide 2: 목차 ==========
    const slide2 = pptx.addSlide();
    addSlideHeader(slide2, '목차', 'Table of Contents');

    const tocItems = [
      '1. Executive Summary',
      pptLabels.tocPerception,
      '3. 핵심 키워드 맵',
      '4. 채널별 콘텐츠 분석',
      pptLabels.tocMarket,
      ...(keywordType === 'brand' && report.brandComparison ? ['자사 vs 경쟁사 종합 비교'] : []),
      ...(keywordType === 'brand' && brandAdAnalysis && brandAdAnalysis.length > 0 ? ['브랜드별 광고 분석 비교'] : []),
      '6. 핵심 마케팅 인사이트',
      pptLabels.tocStrategy,
      '8. 90일 액션플랜',
      '9. 종합 결론',
    ];

    tocItems.forEach((item, idx) => {
      slide2.addText(item, {
        x: 1, y: 1.5 + idx * 0.45, w: 8, h: 0.4,
        fontSize: 16, color: COLORS.dark, fontFace: 'Arial',
      });
    });

    addPageNumber(slide2, 2);

    // ========== Slide 3: Executive Summary ==========
    const slide3 = pptx.addSlide();
    addSlideHeader(slide3, 'Executive Summary', '핵심 요약');

    // Key Metrics
    if (report.executiveSummary?.keyMetrics) {
      const metrics = report.executiveSummary.keyMetrics.slice(0, 5);
      const metricWidth = 1.7;
      const startX = (10 - metrics.length * metricWidth) / 2;

      metrics.forEach((metric, idx) => {
        slide3.addShape('rect', {
          x: startX + idx * metricWidth, y: 1.1, w: 1.5, h: 1.3,
          fill: { color: COLORS.light },
          line: { color: COLORS.primary, width: 1 },
        });
        slide3.addText(metric.label, {
          x: startX + idx * metricWidth, y: 1.15, w: 1.5, h: 0.35,
          fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
          align: 'center', bold: true,
        });
        slide3.addText(metric.value, {
          x: startX + idx * metricWidth, y: 1.5, w: 1.5, h: 0.45,
          fontSize: 16, color: COLORS.primary, fontFace: 'Arial',
          align: 'center', bold: true,
        });
        slide3.addText(metric.description, {
          x: startX + idx * metricWidth, y: 1.95, w: 1.5, h: 0.4,
          fontSize: 7, color: COLORS.slate, fontFace: 'Arial',
          align: 'center',
        });
      });
    }

    // Winning Formula & Market Opportunity
    slide3.addShape('rect', {
      x: 0.5, y: 2.6, w: 4.3, h: 2.0,
      fill: { color: 'E8F5E9' },
      line: { color: COLORS.success, width: 1 },
    });
    slide3.addText('Winning Formula', {
      x: 0.6, y: 2.7, w: 4.1, h: 0.35,
      fontSize: 12, color: COLORS.success, fontFace: 'Arial', bold: true,
    });
    slide3.addText(report.executiveSummary?.winningFormula || '', {
      x: 0.6, y: 3.05, w: 4.1, h: 1.45,
      fontSize: 10, color: COLORS.dark, fontFace: 'Arial',
      valign: 'top',
    });

    slide3.addShape('rect', {
      x: 5.2, y: 2.6, w: 4.3, h: 2.0,
      fill: { color: 'E3F2FD' },
      line: { color: COLORS.primary, width: 1 },
    });
    slide3.addText('Market Opportunity', {
      x: 5.3, y: 2.7, w: 4.1, h: 0.35,
      fontSize: 12, color: COLORS.primary, fontFace: 'Arial', bold: true,
    });
    slide3.addText(report.executiveSummary?.marketOpportunity || '', {
      x: 5.3, y: 3.05, w: 4.1, h: 1.45,
      fontSize: 10, color: COLORS.dark, fontFace: 'Arial',
      valign: 'top',
    });

    addPageNumber(slide3, 3);

    // ========== Slide 4: 3단계 소비자 인식 구조 ==========
    const slide4 = pptx.addSlide();
    addSlideHeader(slide4, pptLabels.slidePerceptionTitle, pptLabels.slidePerceptionSub);

    const stages = [
      { stage: report.perceptionStages?.stage1_awareness, color: COLORS.teal, label: 'AWARENESS' },
      { stage: report.perceptionStages?.stage2_comparison, color: COLORS.cyan, label: 'COMPARISON' },
      { stage: report.perceptionStages?.stage3_conversion, color: COLORS.primary, label: 'CONVERSION' },
    ];

    stages.forEach((s, idx) => {
      const xPos = 0.5 + idx * 3.2;

      // Circle with number
      slide4.addShape('ellipse', {
        x: xPos + 1.2, y: 1.0, w: 0.5, h: 0.5,
        fill: { color: s.color },
      });
      slide4.addText(`${idx + 1}`, {
        x: xPos + 1.2, y: 1.05, w: 0.5, h: 0.4,
        fontSize: 16, color: 'FFFFFF', fontFace: 'Arial',
        align: 'center', bold: true,
      });

      // Stage box
      slide4.addShape('rect', {
        x: xPos, y: 1.6, w: 3, h: 3.0,
        fill: { color: COLORS.light },
        line: { color: s.color, width: 2 },
      });

      slide4.addText(s.stage?.title || '', {
        x: xPos + 0.1, y: 1.7, w: 2.8, h: 0.35,
        fontSize: 12, color: s.color, fontFace: 'Arial', bold: true,
      });
      slide4.addText(s.label, {
        x: xPos + 0.1, y: 2.0, w: 2.8, h: 0.2,
        fontSize: 8, color: s.color, fontFace: 'Arial',
      });
      slide4.addText(s.stage?.insight || '', {
        x: xPos + 0.1, y: 2.25, w: 2.8, h: 1.1,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
        valign: 'top',
      });

      // Keywords/PainPoints
      const keywords = idx === 2
        ? s.stage?.painPoints?.slice(0, 4) || []
        : s.stage?.keywords?.slice(0, 4) || [];

      keywords.forEach((kw, kIdx) => {
        slide4.addText(`• ${kw}`, {
          x: xPos + 0.1, y: 3.4 + kIdx * 0.28, w: 2.8, h: 0.25,
          fontSize: 8, color: COLORS.slate, fontFace: 'Arial',
        });
      });
    });

    // Arrows between stages
    slide4.addText('→', {
      x: 3.3, y: 2.5, w: 0.5, h: 0.5,
      fontSize: 24, color: COLORS.dark, align: 'center',
    });
    slide4.addText('→', {
      x: 6.5, y: 2.5, w: 0.5, h: 0.5,
      fontSize: 24, color: COLORS.dark, align: 'center',
    });

    addPageNumber(slide4, 4);

    // ========== Slide 5: 핵심 키워드 맵 ==========
    const slide5 = pptx.addSlide();
    addSlideHeader(slide5, '핵심 키워드 맵', 'Keyword Intelligence');

    // Total Search Volume
    slide5.addText(report.keywordMap?.totalSearchVolume || '0', {
      x: 3.5, y: 1.0, w: 3, h: 0.5,
      fontSize: 24, color: COLORS.orange, fontFace: 'Arial',
      align: 'center', bold: true,
    });
    slide5.addText('총 월간 검색량', {
      x: 3.5, y: 1.45, w: 3, h: 0.25,
      fontSize: 11, color: COLORS.dark, fontFace: 'Arial',
      align: 'center',
    });

    // Top Keywords Table
    slide5.addText('상위 키워드 (빈도순)', {
      x: 0.5, y: 1.85, w: 4.5, h: 0.3,
      fontSize: 11, color: COLORS.dark, fontFace: 'Arial', bold: true,
    });

    const topKeywords = report.keywordMap?.topKeywords?.slice(0, 10) || [];
    const maxFreq = topKeywords[0]?.frequency || 1;

    topKeywords.forEach((kw, idx) => {
      const yPos = 2.15 + idx * 0.32;
      slide5.addText(`${kw.rank}. ${kw.keyword}`, {
        x: 0.5, y: yPos, w: 2.5, h: 0.28,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
      });
      // Bar
      const barWidth = (kw.frequency / maxFreq) * 1.5;
      slide5.addShape('rect', {
        x: 3.0, y: yPos + 0.05, w: barWidth, h: 0.18,
        fill: { color: COLORS.orange },
      });
      slide5.addText(`${kw.frequency}`, {
        x: 4.6, y: yPos, w: 0.4, h: 0.28,
        fontSize: 8, color: COLORS.slate, fontFace: 'Arial',
        align: 'right',
      });
    });

    // Pain Point Keywords
    slide5.addText('Pain Point 키워드', {
      x: 5.2, y: 1.85, w: 4.3, h: 0.3,
      fontSize: 11, color: COLORS.danger, fontFace: 'Arial', bold: true,
    });

    slide5.addShape('rect', {
      x: 5.2, y: 2.15, w: 4.3, h: 1.4,
      fill: { color: 'FFEBEE' },
    });

    const painKeywords = report.keywordMap?.painPointKeywords?.slice(0, 6) || [];
    painKeywords.forEach((kw, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;
      slide5.addText(`• ${kw.keyword} (${kw.frequency})`, {
        x: 5.3 + col * 2.1, y: 2.25 + row * 0.4, w: 2, h: 0.35,
        fontSize: 9, color: COLORS.danger, fontFace: 'Arial',
      });
    });

    // Data Insights
    slide5.addText('데이터 인사이트', {
      x: 5.2, y: 3.65, w: 4.3, h: 0.3,
      fontSize: 11, color: COLORS.dark, fontFace: 'Arial', bold: true,
    });

    report.keywordMap?.dataInsights?.slice(0, 4).forEach((insight, idx) => {
      slide5.addText(`• ${insight}`, {
        x: 5.2, y: 3.95 + idx * 0.38, w: 4.3, h: 0.35,
        fontSize: 9, color: COLORS.slate, fontFace: 'Arial',
      });
    });

    addPageNumber(slide5, 5);

    // ========== Slide 6-7: 채널별 콘텐츠 분석 (채널별 통합, 2채널씩) ==========
    const channels = report.channelBreakdown?.slice(0, 4) || [];
    const slide6Channels = channels.slice(0, 2);  // 블로그, 카페
    const slide7Channels = channels.slice(2, 4);  // 유튜브, 뉴스

    // 채널 카드 렌더 헬퍼
    const renderChannelCard = (slide: PptxGenJS.Slide, channel: any, xPos: number, yPos: number) => {
      // 배경 박스
      slide.addShape('rect', {
        x: xPos, y: yPos, w: 4.5, h: 4.0,
        fill: { color: COLORS.light },
        line: { color: COLORS.secondary, width: 1 },
      });

      // 채널명
      const totalCount = channel.contentSentimentCounts?.total;
      const channelTitle = totalCount ? `${channel.channelName} (총 ${totalCount}건)` : channel.channelName;
      slide.addText(channelTitle, {
        x: xPos + 0.1, y: yPos + 0.05, w: 3, h: 0.3,
        fontSize: 12, color: COLORS.secondary, fontFace: 'Arial', bold: true,
      });

      // 역할
      slide.addText([
        { text: '역할: ', options: { bold: true, color: COLORS.secondary, fontSize: 8 } },
        { text: channel.role, options: { color: COLORS.dark, fontSize: 8 } },
      ], {
        x: xPos + 0.1, y: yPos + 0.30, w: 4.3, h: 0.25,
        fontFace: 'Arial',
      });

      // 감성 분석 소제목 + 바
      slide.addText('감성 분석:', {
        x: xPos + 0.1, y: yPos + 0.55, w: 4.3, h: 0.15,
        fontSize: 8, color: COLORS.secondary, fontFace: 'Arial', bold: true,
      });
      if (channel.sentimentBreakdown) {
        const barY = yPos + 0.70;
        const totalWidth = 4.3;
        const posWidth = (channel.sentimentBreakdown.positive / 100) * totalWidth;
        const neuWidth = (channel.sentimentBreakdown.neutral / 100) * totalWidth;
        const negWidth = (channel.sentimentBreakdown.negative / 100) * totalWidth;

        slide.addShape('rect', { x: xPos + 0.1, y: barY, w: posWidth, h: 0.15, fill: { color: COLORS.success } });
        slide.addShape('rect', { x: xPos + 0.1 + posWidth, y: barY, w: neuWidth, h: 0.15, fill: { color: '9CA3AF' } });
        slide.addShape('rect', { x: xPos + 0.1 + posWidth + neuWidth, y: barY, w: negWidth, h: 0.15, fill: { color: COLORS.danger } });

        slide.addText(`긍정 ${channel.sentimentBreakdown.positive}% / 중립 ${channel.sentimentBreakdown.neutral}% / 부정 ${channel.sentimentBreakdown.negative}%`, {
          x: xPos + 0.1, y: yPos + 0.87, w: 4.3, h: 0.15,
          fontSize: 7, color: COLORS.slate, fontFace: 'Arial',
        });
      }

      // 긍부정 평가 소제목 + 개수 박스
      slide.addText('긍부정 평가:', {
        x: xPos + 0.1, y: yPos + 1.05, w: 4.3, h: 0.15,
        fontSize: 8, color: COLORS.secondary, fontFace: 'Arial', bold: true,
      });
      const counts = channel.contentSentimentCounts;
      if (counts && counts.total > 0) {
        const countY = yPos + 1.20;
        const boxW = 1.35;
        const countBoxes = [
          { label: `긍정 ${counts.positive}개`, color: COLORS.success, bg: 'E8F5E9' },
          { label: `중립 ${counts.neutral}개`, color: COLORS.slate, bg: 'F3F4F6' },
          { label: `부정 ${counts.negative}개`, color: COLORS.danger, bg: 'FFEBEE' },
        ];
        countBoxes.forEach((box, bIdx) => {
          slide.addShape('rect', {
            x: xPos + 0.1 + bIdx * (boxW + 0.1), y: countY, w: boxW, h: 0.28,
            fill: { color: box.bg },
          });
          slide.addText(box.label, {
            x: xPos + 0.1 + bIdx * (boxW + 0.1), y: countY + 0.02, w: boxW, h: 0.24,
            fontSize: 8, color: box.color, fontFace: 'Arial', align: 'center', bold: true,
          });
        });
      }

      // 작성일 분포 소제목 + 바
      slide.addText('작성일 분포:', {
        x: xPos + 0.1, y: yPos + 1.55, w: 4.3, h: 0.15,
        fontSize: 8, color: COLORS.secondary, fontFace: 'Arial', bold: true,
      });
      const dateData = channel.dateAnalysis;
      if (dateData && dateData.total > 0) {
        const total = dateData.threeMonths + dateData.oneYear + dateData.twoYears + dateData.older + (dateData.noDate || 0);
        if (total > 0) {
          const barY = yPos + 1.70;
          const barW = 4.3;
          const pct3m = dateData.threeMonths / total;
          const pct1y = dateData.oneYear / total;
          const pct2y = dateData.twoYears / total;
          const pctOld = dateData.older / total;
          const pctNoDate = (dateData.noDate || 0) / total;

          let bx = xPos + 0.1;
          if (pct3m > 0) { slide.addShape('rect', { x: bx, y: barY, w: pct3m * barW, h: 0.2, fill: { color: COLORS.success } }); bx += pct3m * barW; }
          if (pct1y > 0) { slide.addShape('rect', { x: bx, y: barY, w: pct1y * barW, h: 0.2, fill: { color: COLORS.warning } }); bx += pct1y * barW; }
          if (pct2y > 0) { slide.addShape('rect', { x: bx, y: barY, w: pct2y * barW, h: 0.2, fill: { color: COLORS.orange } }); bx += pct2y * barW; }
          if (pctOld > 0) { slide.addShape('rect', { x: bx, y: barY, w: pctOld * barW, h: 0.2, fill: { color: COLORS.slate } }); bx += pctOld * barW; }
          if (pctNoDate > 0) { slide.addShape('rect', { x: bx, y: barY, w: pctNoDate * barW, h: 0.2, fill: { color: 'D1D5DB' } }); }

          // 범례 2×2
          const legendItems = [
            { label: `3개월: ${dateData.threeMonths}건(${Math.round(pct3m * 100)}%)`, color: COLORS.success },
            { label: `~1년: ${dateData.oneYear}건(${Math.round(pct1y * 100)}%)`, color: COLORS.warning },
            { label: `~2년: ${dateData.twoYears}건(${Math.round(pct2y * 100)}%)`, color: COLORS.orange },
            { label: `2년+: ${dateData.older}건(${Math.round(pctOld * 100)}%)`, color: COLORS.slate },
          ];
          legendItems.forEach((item, lIdx) => {
            const lCol = lIdx % 2;
            const lRow = Math.floor(lIdx / 2);
            const lx = xPos + 0.1 + lCol * 2.15;
            const ly = yPos + 1.95 + lRow * 0.22;
            slide.addShape('rect', { x: lx, y: ly + 0.03, w: 0.15, h: 0.12, fill: { color: item.color } });
            slide.addText(item.label, {
              x: lx + 0.2, y: ly, w: 1.9, h: 0.2,
              fontSize: 7, color: COLORS.dark, fontFace: 'Arial',
            });
          });

          if (dateData.noDate > 0) {
            slide.addText(`날짜없음: ${dateData.noDate}건`, {
              x: xPos + 0.1, y: yPos + 2.39, w: 4.3, h: 0.15,
              fontSize: 7, color: '9CA3AF', fontFace: 'Arial',
            });
          }
        }
      } else {
        slide.addText('작성일 데이터 없음', {
          x: xPos + 0.1, y: yPos + 1.70, w: 4.3, h: 0.25,
          fontSize: 8, color: '9CA3AF', fontFace: 'Arial',
        });
      }

      // 주요 관심사
      const interests = channel.keyInterests?.slice(0, 4) || [];
      if (interests.length > 0) {
        slide.addText('주요 관심사:', {
          x: xPos + 0.1, y: yPos + 2.55, w: 4.3, h: 0.18,
          fontSize: 8, color: COLORS.secondary, fontFace: 'Arial', bold: true,
        });
        const kwText = interests.map((k: string) => `#${k}`).join('  ');
        slide.addText(kwText, {
          x: xPos + 0.1, y: yPos + 2.73, w: 4.3, h: 0.30,
          fontSize: 8, color: COLORS.primary, fontFace: 'Arial',
          valign: 'top',
        });
      }

      // 전략
      slide.addText([
        { text: '전략: ', options: { bold: true, color: COLORS.secondary, fontSize: 8 } },
        { text: channel.strategy, options: { color: COLORS.dark, fontSize: 8 } },
      ], {
        x: xPos + 0.1, y: yPos + 3.05, w: 4.3, h: 0.55,
        fontFace: 'Arial',
        valign: 'top',
      });
    };

    // Slide 6: 블로그 + 카페
    const slide6 = pptx.addSlide();
    addSlideHeader(slide6, '채널별 콘텐츠 분석 (1/2)', 'Channel Content Analysis');

    slide6Channels.forEach((channel, idx) => {
      const xPos = idx === 0 ? 0.3 : 5.1;
      renderChannelCard(slide6, channel, xPos, 1.05);
    });

    addPageNumber(slide6, 6);

    // Slide 7: 유튜브 + 뉴스
    const slide7date = pptx.addSlide();
    addSlideHeader(slide7date, '채널별 콘텐츠 분석 (2/2)', 'Channel Content Analysis');

    slide7Channels.forEach((channel, idx) => {
      const xPos = idx === 0 ? 0.3 : 5.1;
      renderChannelCard(slide7date, channel, xPos, 1.05);
    });

    addPageNumber(slide7date, 7);

    // ========== Slide 8 (+ optional 9): 시장 환경 분석 or 쇼핑 검색 분석 ==========
    let marketSectionEndSlide = 8; // 시장 섹션이 끝나는 슬라이드 번호

    const formatCurrency = (v: number) => {
      if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억원`;
      if (v >= 10000) return `${Math.round(v / 10000).toLocaleString()}만원`;
      return `${v.toLocaleString()}원`;
    };

    if (keywordType === 'shopping' && shoppingAnalysis) {
      // ===== 쇼핑 검색 분석: 2개 슬라이드 =====
      const gptAnalysis = shoppingAnalysis.gptAnalysis;
      const isDual = shoppingAnalysis.sources.length === 2;
      const sourceLabel = shoppingAnalysis.sources.includes('coupang') ? '쿠팡' : '네이버 쇼핑';
      const platforms: { key: string; data: ShoppingPlatformData | undefined; label: string }[] = isDual
        ? [
            { key: 'naver', data: gptAnalysis.naver, label: '네이버 쇼핑' },
            { key: 'coupang', data: gptAnalysis.coupang, label: '쿠팡' },
          ]
        : [{ key: 'combined', data: gptAnalysis.combined, label: sourceLabel }];

      // ----- 슬라이드 8: 전체 분석 메트릭 + 판매자 TOP 5 -----
      const shopSlide1 = pptx.addSlide();
      addSlideHeader(shopSlide1, pptLabels.slideMarketTitle + ' (1/2)', pptLabels.slideMarketSub);

      let yPos = 1.1;

      // 전체 분석 메트릭
      shopSlide1.addText('전체 분석', {
        x: 0.5, y: yPos, w: 9, h: 0.3,
        fontSize: 13, color: COLORS.accent, fontFace: 'Arial', bold: true,
      });
      yPos += 0.35;

      platforms.forEach((p) => {
        if (!p.data) return;
        if (isDual) {
          shopSlide1.addText(`${p.label}`, {
            x: 0.5, y: yPos, w: 9, h: 0.25,
            fontSize: 10, color: COLORS.dark, fontFace: 'Arial', bold: true,
          });
          yPos += 0.28;
        }

        const metrics = [
          { label: '총 상품수', value: `${p.data.overall.totalProducts.toLocaleString()}개` },
          { label: '평균 가격', value: formatCurrency(p.data.overall.averagePrice) },
          { label: '총 리뷰수', value: `${p.data.overall.totalReviews.toLocaleString()}개` },
          { label: '평균 평점', value: p.data.overall.averageRating.toFixed(1) },
          { label: '총 매출액(추정)', value: formatCurrency(p.data.overall.estimatedRevenue) },
        ];

        metrics.forEach((m, mIdx) => {
          const col = mIdx % 5;
          shopSlide1.addShape('rect', {
            x: 0.5 + col * 1.8, y: yPos, w: 1.65, h: 0.7,
            fill: { color: COLORS.light },
            line: { color: COLORS.accent, width: 1 },
          });
          shopSlide1.addText(m.label, {
            x: 0.5 + col * 1.8, y: yPos + 0.05, w: 1.65, h: 0.2,
            fontSize: 7, color: COLORS.slate, fontFace: 'Arial', align: 'center',
          });
          shopSlide1.addText(m.value, {
            x: 0.5 + col * 1.8, y: yPos + 0.28, w: 1.65, h: 0.35,
            fontSize: 11, color: COLORS.dark, fontFace: 'Arial', align: 'center', bold: true,
          });
        });
        yPos += 0.8;

        if (p.data.overall.insight) {
          shopSlide1.addText(p.data.overall.insight, {
            x: 0.5, y: yPos, w: 9, h: 0.3,
            fontSize: 8, color: COLORS.slate, fontFace: 'Arial',
          });
          yPos += 0.3;
        }
      });

      // 판매자 TOP 5
      yPos += 0.1;
      shopSlide1.addText('판매자/브랜드 TOP 5', {
        x: 0.5, y: yPos, w: 9, h: 0.3,
        fontSize: 13, color: COLORS.primary, fontFace: 'Arial', bold: true,
      });
      yPos += 0.35;

      platforms.forEach((p) => {
        if (!p.data) return;
        if (isDual) {
          shopSlide1.addText(`${p.label}`, {
            x: 0.5, y: yPos, w: 9, h: 0.25,
            fontSize: 10, color: COLORS.dark, fontFace: 'Arial', bold: true,
          });
          yPos += 0.28;
        }

        const headerRow = ['순위', '판매자', '상품명', '가격', '리뷰', '평점', '매출액'].map(
          (text) => ({ text, options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary } } })
        );
        const dataRows = p.data.sellers.topSellers.map((s) => [
          { text: `${s.rank}`, options: { align: 'center' as const } },
          { text: s.seller },
          { text: s.productName.length > 20 ? s.productName.substring(0, 20) + '...' : s.productName },
          { text: formatCurrency(s.price), options: { align: 'right' as const } },
          { text: s.reviews.toLocaleString(), options: { align: 'right' as const } },
          { text: s.rating.toFixed(1), options: { align: 'center' as const } },
          { text: formatCurrency(s.estimatedRevenue), options: { align: 'right' as const } },
        ]);

        const tableRows = [headerRow, ...dataRows];
        shopSlide1.addTable(tableRows, {
          x: 0.5, y: yPos, w: 9,
          fontSize: 8,
          fontFace: 'Arial',
          border: { type: 'solid', pt: 0.5, color: '9CA3AF' },
          colW: [0.6, 1.3, 2.5, 1.0, 0.8, 0.6, 1.2],
          rowH: 0.25,
          autoPage: false,
        });
        yPos += 0.25 * (dataRows.length + 1) + 0.1;
      });

      addPageNumber(shopSlide1, 8);

      // ----- 슬라이드 9: 가격대 분석 + 전략 -----
      const shopSlide2 = pptx.addSlide();
      addSlideHeader(shopSlide2, pptLabels.slideMarketTitle + ' (2/2)', pptLabels.slideMarketSub);

      yPos = 1.1;

      // 가격대 분석
      shopSlide2.addText('가격대 분석', {
        x: 0.5, y: yPos, w: 9, h: 0.3,
        fontSize: 13, color: COLORS.warning, fontFace: 'Arial', bold: true,
      });
      yPos += 0.35;

      platforms.forEach((p) => {
        if (!p.data) return;
        if (isDual) {
          shopSlide2.addText(`${p.label}`, {
            x: 0.5, y: yPos, w: 9, h: 0.25,
            fontSize: 10, color: COLORS.dark, fontFace: 'Arial', bold: true,
          });
          yPos += 0.28;
        }

        const priceHeaderRow = ['가격대 구간', '상품수', '평균 가격', '리뷰', '평점', '매출액'].map(
          (text) => ({ text, options: { bold: true, color: COLORS.white, fill: { color: COLORS.warning } } })
        );
        const dataRows = p.data.priceRanges.priceRanges.map((pr) => [
          { text: pr.range },
          { text: `${pr.productCount.toLocaleString()}개`, options: { align: 'right' as const } },
          { text: formatCurrency(pr.averagePrice), options: { align: 'right' as const } },
          { text: pr.totalReviews.toLocaleString(), options: { align: 'right' as const } },
          { text: pr.averageRating.toFixed(1), options: { align: 'center' as const } },
          { text: formatCurrency(pr.estimatedRevenue), options: { align: 'right' as const } },
        ]);

        const tableRows = [priceHeaderRow, ...dataRows];
        shopSlide2.addTable(tableRows, {
          x: 0.5, y: yPos, w: 9,
          fontSize: 8,
          fontFace: 'Arial',
          border: { type: 'solid', pt: 0.5, color: '9CA3AF' },
          colW: [1.8, 1.0, 1.3, 1.0, 0.7, 1.5],
          rowH: 0.25,
          autoPage: false,
        });
        yPos += 0.25 * (dataRows.length + 1) + 0.15;

        if (p.data.priceRanges.insight) {
          shopSlide2.addText(p.data.priceRanges.insight, {
            x: 0.5, y: yPos, w: 9, h: 0.3,
            fontSize: 8, color: COLORS.slate, fontFace: 'Arial',
          });
          yPos += 0.3;
        }
      });

      // 전략
      yPos += 0.1;
      shopSlide2.addText('전략', {
        x: 0.5, y: yPos, w: 9, h: 0.3,
        fontSize: 13, color: COLORS.secondary, fontFace: 'Arial', bold: true,
      });
      yPos += 0.35;

      if (gptAnalysis.strategy.marketPositioning) {
        shopSlide2.addShape('rect', {
          x: 0.5, y: yPos, w: 4.3, h: 1.5,
          fill: { color: 'F3E8FF' },
          line: { color: COLORS.secondary, width: 1 },
        });
        shopSlide2.addText('📈 매체별 시장 포지셔닝', {
          x: 0.6, y: yPos + 0.05, w: 4.1, h: 0.25,
          fontSize: 9, color: COLORS.secondary, fontFace: 'Arial', bold: true,
        });
        shopSlide2.addText(gptAnalysis.strategy.marketPositioning, {
          x: 0.6, y: yPos + 0.3, w: 4.1, h: 1.1,
          fontSize: 8, color: COLORS.dark, fontFace: 'Arial', valign: 'top',
        });
      }

      if (gptAnalysis.strategy.marketingStrategy) {
        shopSlide2.addShape('rect', {
          x: 5.2, y: yPos, w: 4.3, h: 1.5,
          fill: { color: 'EDE9FE' },
          line: { color: COLORS.secondary, width: 1 },
        });
        shopSlide2.addText('🚀 마케팅 전략', {
          x: 5.3, y: yPos + 0.05, w: 4.1, h: 0.25,
          fontSize: 9, color: COLORS.secondary, fontFace: 'Arial', bold: true,
        });
        shopSlide2.addText(gptAnalysis.strategy.marketingStrategy, {
          x: 5.3, y: yPos + 0.3, w: 4.1, h: 1.1,
          fontSize: 8, color: COLORS.dark, fontFace: 'Arial', valign: 'top',
        });
      }

      addPageNumber(shopSlide2, 9);
      marketSectionEndSlide = 9; // 쇼핑은 2개 슬라이드 사용

    } else {
      // ===== 기존 시장 환경 분석: 1개 슬라이드 =====
      const slide7 = pptx.addSlide();
      addSlideHeader(slide7, pptLabels.slideMarketTitle, pptLabels.slideMarketSub);

      // 경쟁 분석
      slide7.addShape('rect', {
        x: 0.5, y: 1.05, w: 4.5, h: 3.6,
        fill: { color: COLORS.light },
        line: { color: COLORS.slate, width: 1 },
      });

      slide7.addText('경쟁 구도 분석', {
        x: 0.6, y: 1.15, w: 4.3, h: 0.35,
        fontSize: 13, color: COLORS.slate, fontFace: 'Arial', bold: true,
      });

      const compLevel = report.marketEnvironment?.competitionAnalysis?.level || '중간';
      const levelColor = compLevel === '높음' ? COLORS.danger : compLevel === '중간' ? COLORS.warning : COLORS.success;
      slide7.addText(`경쟁 강도: ${compLevel}`, {
        x: 0.6, y: 1.55, w: 4.3, h: 0.3,
        fontSize: 11, color: levelColor, fontFace: 'Arial', bold: true,
      });

      slide7.addText(report.marketEnvironment?.competitionAnalysis?.insight || '', {
        x: 0.6, y: 1.9, w: 4.3, h: 1.2,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
        valign: 'top',
      });

      slide7.addText('주요 플레이어:', {
        x: 0.6, y: 3.15, w: 4.3, h: 0.25,
        fontSize: 9, color: COLORS.slate, fontFace: 'Arial', bold: true,
      });

      // 브랜드 유형이고 brandSnapshots가 있으면 카드 형태로 표시
      const brandSnapshots = (report.marketEnvironment?.competitionAnalysis as any)?.brandSnapshots;
      if (keywordType === 'brand' && Array.isArray(brandSnapshots) && brandSnapshots.length > 0) {
        brandSnapshots.slice(0, 4).forEach((b: any, idx: number) => {
          slide7.addText(`• ${b.brand} (SOV ${b.sov}% | 긍정 ${b.sentiment?.positive ?? '-'}%)`, {
            x: 0.6, y: 3.4 + idx * 0.3, w: 4.3, h: 0.28,
            fontSize: 8, color: COLORS.dark, fontFace: 'Arial', bold: true,
          });
        });
      } else {
        const players = report.marketEnvironment?.competitionAnalysis?.keyPlayers?.slice(0, 5) || [];
        players.forEach((player, idx) => {
          slide7.addText(`• ${player}`, {
            x: 0.6, y: 3.4 + idx * 0.28, w: 4.3, h: 0.25,
            fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
          });
        });
      }

      // 디지털 트렌드
      slide7.addShape('rect', {
        x: 5.2, y: 1.05, w: 4.3, h: 3.6,
        fill: { color: 'E3F2FD' },
        line: { color: COLORS.primary, width: 1 },
      });

      slide7.addText('디지털 트렌드', {
        x: 5.3, y: 1.15, w: 4.1, h: 0.35,
        fontSize: 13, color: COLORS.primary, fontFace: 'Arial', bold: true,
      });

      slide7.addText(`모바일 비중: ${report.marketEnvironment?.digitalTrends?.mobileShare || '-'}`, {
        x: 5.3, y: 1.6, w: 4.1, h: 0.3,
        fontSize: 11, color: COLORS.dark, fontFace: 'Arial',
      });

      slide7.addText(`콘텐츠 신선도: ${report.marketEnvironment?.digitalTrends?.contentFreshness || '-'}`, {
        x: 5.3, y: 1.95, w: 4.1, h: 0.3,
        fontSize: 11, color: COLORS.dark, fontFace: 'Arial',
      });

      slide7.addText('주요 변화:', {
        x: 5.3, y: 2.4, w: 4.1, h: 0.25,
        fontSize: 9, color: COLORS.primary, fontFace: 'Arial', bold: true,
      });

      report.marketEnvironment?.digitalTrends?.orgChanges?.slice(0, 6).forEach((change, idx) => {
        slide7.addText(`→ ${change}`, {
          x: 5.3, y: 2.7 + idx * 0.35, w: 4.1, h: 0.32,
          fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
        });
      });

      addPageNumber(slide7, 8);
      marketSectionEndSlide = 8; // 일반/브랜드는 1개 슬라이드
    }

    // ========== 브랜드 비교 슬라이드 (브랜드 유형 전용) ==========
    if (keywordType === 'brand' && report.brandComparison) {
      const bc = report.brandComparison;

      // ---------- Slide 8a: SOV + 비교 매트릭스 ----------
      const brandSlide1 = pptx.addSlide();
      addSlideHeader(brandSlide1, '자사 vs 경쟁사 비교 (1/3)', 'SOV & Comparison Matrix');

      // 좌측: SOV
      brandSlide1.addText('SOV (검색 점유율)', {
        x: 0.5, y: 1.1, w: 4.5, h: 0.3,
        fontSize: 12, color: COLORS.primary, fontFace: 'Arial', bold: true,
      });

      if (bc.sov) {
        brandSlide1.addText(`자사: ${bc.sov.ownShare}%`, {
          x: 0.5, y: 1.5, w: 4.5, h: 0.3,
          fontSize: 14, color: COLORS.primary, fontFace: 'Arial', bold: true,
        });
        // 자사 SOV 막대
        brandSlide1.addShape('rect', {
          x: 0.5, y: 1.9, w: Math.max(0.05, Math.min(bc.sov.ownShare / 100, 1) * 4.5), h: 0.25,
          fill: { color: COLORS.primary },
        });

        let yPos = 2.3;
        (bc.sov.competitorShares || []).slice(0, 4).forEach((c) => {
          brandSlide1.addText(`${c.brandKeyword}: ${c.share}%`, {
            x: 0.5, y: yPos, w: 4.5, h: 0.25,
            fontSize: 10, color: COLORS.dark, fontFace: 'Arial',
          });
          brandSlide1.addShape('rect', {
            x: 0.5, y: yPos + 0.27, w: Math.max(0.05, Math.min(c.share / 100, 1) * 4.5), h: 0.2,
            fill: { color: COLORS.slate },
          });
          yPos += 0.55;
        });

        if (bc.sov.interpretation) {
          brandSlide1.addText(bc.sov.interpretation, {
            x: 0.5, y: yPos + 0.1, w: 4.5, h: 1.2,
            fontSize: 8, color: COLORS.dark, fontFace: 'Arial', valign: 'top',
          });
        }
      }

      // 우측: 비교 매트릭스
      brandSlide1.addText('비교 매트릭스', {
        x: 5.2, y: 1.1, w: 4.5, h: 0.3,
        fontSize: 12, color: COLORS.primary, fontFace: 'Arial', bold: true,
      });

      const matrixRows = (bc.comparisonMatrix || []).slice(0, 5);
      if (matrixRows.length > 0) {
        const matrixTableRows: any[] = [
          [
            { text: '차원', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 9 } },
            { text: '자사', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 9 } },
            { text: '경쟁사', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 9 } },
            { text: '우위', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 9 } },
          ],
          ...matrixRows.map(r => [
            { text: r.metric, options: { fontSize: 8, bold: true } },
            { text: r.ownValue, options: { fontSize: 8, color: COLORS.primary } },
            { text: (r.competitors || []).map((c: any) => `${c.brandKeyword}: ${c.value}`).join('\n'), options: { fontSize: 7 } },
            { text: r.winner === 'own' ? '자사' : (r.winner === 'competitor' ? '경쟁' : '비등'), options: { fontSize: 8, bold: true, color: r.winner === 'own' ? COLORS.success : (r.winner === 'competitor' ? COLORS.danger : COLORS.slate) } },
          ]),
        ];

        brandSlide1.addTable(matrixTableRows, {
          x: 5.2, y: 1.5, w: 4.5, h: 3.8,
          fontFace: 'Arial',
          border: { type: 'solid', color: 'DDDDDD', pt: 0.5 },
          colW: [1.0, 1.0, 1.8, 0.7],
        });
      }

      addPageNumber(brandSlide1, marketSectionEndSlide + 1);

      // ---------- Slide 8b: 자사 강·약점 + 경쟁사 프로필 ----------
      const brandSlide2 = pptx.addSlide();
      addSlideHeader(brandSlide2, '자사 vs 경쟁사 비교 (2/3)', 'Strengths/Weaknesses & Competitor Profiles');

      // 상단: 자사 강·약점
      brandSlide2.addShape('rect', {
        x: 0.5, y: 1.0, w: 4.4, h: 1.6,
        fill: { color: 'E8F5E9' },
      });
      brandSlide2.addText('★ 자사 강점', {
        x: 0.6, y: 1.05, w: 4.2, h: 0.3,
        fontSize: 11, color: COLORS.success, fontFace: 'Arial', bold: true,
      });
      (bc.ownStrengths || []).slice(0, 4).forEach((s, i) => {
        brandSlide2.addText(`• ${s}`, {
          x: 0.7, y: 1.4 + i * 0.28, w: 4.1, h: 0.25,
          fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
        });
      });

      brandSlide2.addShape('rect', {
        x: 5.1, y: 1.0, w: 4.4, h: 1.6,
        fill: { color: 'FFEBEE' },
      });
      brandSlide2.addText('⚠ 자사 약점', {
        x: 5.2, y: 1.05, w: 4.2, h: 0.3,
        fontSize: 11, color: COLORS.danger, fontFace: 'Arial', bold: true,
      });
      (bc.ownWeaknesses || []).slice(0, 4).forEach((w, i) => {
        brandSlide2.addText(`• ${w}`, {
          x: 5.3, y: 1.4 + i * 0.28, w: 4.1, h: 0.25,
          fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
        });
      });

      // 하단: 경쟁사 프로필 카드 (최대 3개)
      const competitorProfiles = (bc.competitorProfiles || []).slice(0, 3);
      brandSlide2.addText('경쟁사 프로필', {
        x: 0.5, y: 2.75, w: 9, h: 0.3,
        fontSize: 11, color: COLORS.primary, fontFace: 'Arial', bold: true,
      });

      const cardWidth = competitorProfiles.length > 0 ? 9.0 / competitorProfiles.length - 0.15 : 3;
      competitorProfiles.forEach((p, idx) => {
        const cardX = 0.5 + idx * (cardWidth + 0.15);
        brandSlide2.addShape('rect', {
          x: cardX, y: 3.1, w: cardWidth, h: 2.3,
          fill: { color: 'F5F5F5' },
          line: { color: COLORS.slate, width: 1 },
        });
        brandSlide2.addText(p.brandKeyword, {
          x: cardX + 0.1, y: 3.15, w: cardWidth - 0.2, h: 0.3,
          fontSize: 11, color: COLORS.dark, fontFace: 'Arial', bold: true,
        });
        const threatColor = p.threatLevel === 'high' ? COLORS.danger : (p.threatLevel === 'medium' ? COLORS.warning : COLORS.slate);
        const threatLabel = p.threatLevel === 'high' ? '위협 높음' : (p.threatLevel === 'medium' ? '위협 중간' : '위협 낮음');
        brandSlide2.addText(threatLabel, {
          x: cardX + 0.1, y: 3.45, w: cardWidth - 0.2, h: 0.25,
          fontSize: 8, color: threatColor, fontFace: 'Arial', bold: true,
        });
        if (p.positioning) {
          brandSlide2.addText(p.positioning, {
            x: cardX + 0.1, y: 3.7, w: cardWidth - 0.2, h: 0.5,
            fontSize: 8, color: COLORS.dark, fontFace: 'Arial', valign: 'top',
          });
        }
        // 강점
        brandSlide2.addText('강점', {
          x: cardX + 0.1, y: 4.25, w: cardWidth - 0.2, h: 0.2,
          fontSize: 7, color: COLORS.success, fontFace: 'Arial', bold: true,
        });
        const strJoined = (p.strengths || []).slice(0, 2).map(s => `• ${s}`).join('\n');
        brandSlide2.addText(strJoined, {
          x: cardX + 0.1, y: 4.45, w: cardWidth - 0.2, h: 0.4,
          fontSize: 7, color: COLORS.dark, fontFace: 'Arial', valign: 'top',
        });
        // 대응
        brandSlide2.addText('대응 전략', {
          x: cardX + 0.1, y: 4.9, w: cardWidth - 0.2, h: 0.2,
          fontSize: 7, color: COLORS.primary, fontFace: 'Arial', bold: true,
        });
        if (p.counterStrategy) {
          brandSlide2.addText(p.counterStrategy, {
            x: cardX + 0.1, y: 5.1, w: cardWidth - 0.2, h: 0.3,
            fontSize: 7, color: COLORS.dark, fontFace: 'Arial', valign: 'top',
          });
        }
      });

      addPageNumber(brandSlide2, marketSectionEndSlide + 2);

      // ---------- Slide 8c: 차별화 축 + 감성 비교 ----------
      const brandSlide3 = pptx.addSlide();
      addSlideHeader(brandSlide3, '자사 vs 경쟁사 비교 (3/3)', 'Differentiation & Sentiment');

      // 좌측: 차별화 축 표
      brandSlide3.addText('차별화 축', {
        x: 0.5, y: 1.05, w: 4.5, h: 0.3,
        fontSize: 12, color: COLORS.secondary, fontFace: 'Arial', bold: true,
      });

      const diffAxes = (bc.differentiationAxes || []).slice(0, 5);
      if (diffAxes.length > 0) {
        const diffRows: any[] = [
          [
            { text: '차원', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.secondary }, fontSize: 9 } },
            { text: '자사', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.secondary }, fontSize: 9 } },
            { text: '경쟁사', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.secondary }, fontSize: 9 } },
          ],
          ...diffAxes.map(d => [
            { text: d.axis, options: { fontSize: 8, bold: true } },
            { text: d.ownPosition, options: { fontSize: 8, color: COLORS.primary } },
            { text: d.competitorPosition, options: { fontSize: 8 } },
          ]),
        ];

        brandSlide3.addTable(diffRows, {
          x: 0.5, y: 1.4, w: 4.5, h: 3.0,
          fontFace: 'Arial',
          border: { type: 'solid', color: 'DDDDDD', pt: 0.5 },
          colW: [1.2, 1.6, 1.7],
        });
      }

      // 공략 키워드
      brandSlide3.addText('공략 가능 키워드', {
        x: 0.5, y: 4.55, w: 4.5, h: 0.25,
        fontSize: 10, color: COLORS.success, fontFace: 'Arial', bold: true,
      });
      const conquestText = (bc.conquestKeywords || []).slice(0, 5).map(c => `• ${c.keyword} (현재 리더: ${c.currentLeader})`).join('\n');
      brandSlide3.addText(conquestText || '데이터 없음', {
        x: 0.5, y: 4.8, w: 4.5, h: 1.2,
        fontSize: 8, color: COLORS.dark, fontFace: 'Arial', valign: 'top',
      });

      // 우측: 감성 비교
      brandSlide3.addText('브랜드별 감성 비교', {
        x: 5.2, y: 1.05, w: 4.5, h: 0.3,
        fontSize: 12, color: COLORS.primary, fontFace: 'Arial', bold: true,
      });

      const sentRows = (bc.sentimentComparison || []).slice(0, 4);
      let sentY = 1.4;
      sentRows.forEach((s) => {
        brandSlide3.addText(`${s.brandKeyword}  (긍 ${s.positive}% · 부 ${s.negative}%)`, {
          x: 5.2, y: sentY, w: 4.5, h: 0.22,
          fontSize: 9, color: COLORS.dark, fontFace: 'Arial', bold: true,
        });
        // Stacked bar
        const totalW = 4.5;
        const posW = totalW * (s.positive / 100);
        const neuW = totalW * (s.neutral / 100);
        const negW = totalW * (s.negative / 100);
        brandSlide3.addShape('rect', { x: 5.2, y: sentY + 0.23, w: Math.max(0.01, posW), h: 0.18, fill: { color: COLORS.success } });
        brandSlide3.addShape('rect', { x: 5.2 + posW, y: sentY + 0.23, w: Math.max(0.01, neuW), h: 0.18, fill: { color: COLORS.slate } });
        brandSlide3.addShape('rect', { x: 5.2 + posW + neuW, y: sentY + 0.23, w: Math.max(0.01, negW), h: 0.18, fill: { color: COLORS.danger } });

        // 상위 키워드
        const posKw = (s.topPositiveKeywords || []).slice(0, 3).join(', ');
        const negKw = (s.topNegativeKeywords || []).slice(0, 3).join(', ');
        if (posKw) {
          brandSlide3.addText(`긍정: ${posKw}`, {
            x: 5.2, y: sentY + 0.45, w: 4.5, h: 0.22,
            fontSize: 7, color: COLORS.success, fontFace: 'Arial',
          });
        }
        if (negKw) {
          brandSlide3.addText(`부정: ${negKw}`, {
            x: 5.2, y: sentY + 0.65, w: 4.5, h: 0.22,
            fontSize: 7, color: COLORS.danger, fontFace: 'Arial',
          });
        }
        sentY += 1.05;
      });

      addPageNumber(brandSlide3, marketSectionEndSlide + 3);

      marketSectionEndSlide += 3;
    }

    // ========== 브랜드별 광고 비교 슬라이드 (브랜드 유형 + brandAdAnalysis 존재 시) ==========
    if (keywordType === 'brand' && brandAdAnalysis && brandAdAnalysis.length > 0) {
      const adSlide = pptx.addSlide();
      addSlideHeader(adSlide, '브랜드별 광고 분석 비교', 'Brand Ad Performance Comparison');

      // 헤더 행 + 데이터 행
      const headerRow = [
        { text: '브랜드', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 10, valign: 'middle' as const, align: 'center' as const } },
        { text: '구분', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 10, valign: 'middle' as const, align: 'center' as const } },
        { text: '광고 순위', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 10, valign: 'middle' as const, align: 'center' as const } },
        { text: '핵심 평가', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 10, valign: 'middle' as const, align: 'center' as const } },
        { text: 'TOP 개선 제안', options: { bold: true, color: 'FFFFFF', fill: { color: COLORS.primary }, fontSize: 10, valign: 'middle' as const, align: 'center' as const } },
      ];

      const dataRows = brandAdAnalysis.map((item) => {
        const rankStr = item.result.ourAd.rank > 0 ? `${item.result.ourAd.rank}위` : '미노출';
        const rankColor = item.result.ourAd.rank > 0
          ? (item.result.ourAd.rank <= 3 ? COLORS.success : COLORS.warning)
          : COLORS.slate;
        const titleEval = (item.result.ourAd.evaluation?.title || '').slice(0, 60);
        const topSuggestion = item.result.adSuggestions?.[0];
        const suggestionText = topSuggestion
          ? `${topSuggestion.title}: ${topSuggestion.description.slice(0, 50)}`
          : '제안 없음';
        const rowFill = item.isOwnBrand ? 'E3F2FD' : 'FFFFFF';
        return [
          { text: item.brandKeyword, options: { bold: item.isOwnBrand, color: item.isOwnBrand ? COLORS.primary : COLORS.dark, fontSize: 10, fill: { color: rowFill }, valign: 'middle' as const } },
          { text: item.isOwnBrand ? '자사' : '경쟁사', options: { bold: true, color: item.isOwnBrand ? COLORS.primary : COLORS.slate, fontSize: 9, fill: { color: rowFill }, valign: 'middle' as const, align: 'center' as const } },
          { text: rankStr, options: { bold: true, color: rankColor, fontSize: 11, fill: { color: rowFill }, valign: 'middle' as const, align: 'center' as const } },
          { text: titleEval || '데이터 없음', options: { fontSize: 8, color: COLORS.dark, fill: { color: rowFill }, valign: 'middle' as const } },
          { text: suggestionText, options: { fontSize: 8, color: COLORS.dark, fill: { color: rowFill }, valign: 'middle' as const } },
        ];
      });

      adSlide.addTable([headerRow, ...dataRows], {
        x: 0.4, y: 1.1, w: 9.2, h: Math.min(4.5, 0.5 + dataRows.length * 0.7),
        fontFace: 'Arial',
        border: { type: 'solid', color: 'DDDDDD', pt: 0.5 },
        colW: [1.5, 0.9, 1.1, 2.7, 3.0],
        rowH: 0.6,
      });

      // 하단 인사이트 박스
      const rankedBrands = brandAdAnalysis
        .filter(b => b.result.ourAd.rank > 0)
        .sort((a, b) => a.result.ourAd.rank - b.result.ourAd.rank);
      const insightY = Math.min(5.6, 1.1 + 0.5 + dataRows.length * 0.7 + 0.3);
      adSlide.addShape('rect', {
        x: 0.4, y: insightY, w: 9.2, h: 0.6,
        fill: { color: 'FFF8E1' },
        line: { color: COLORS.warning, width: 1 },
      });
      const ownInAd = brandAdAnalysis.find(b => b.isOwnBrand);
      const ownRank = ownInAd?.result.ourAd.rank || 0;
      const competitorTopRank = rankedBrands.find(b => !b.isOwnBrand)?.result.ourAd.rank;
      const insight = ownRank === 0
        ? `자사 광고 미노출 — 경쟁사 광고 노출 ${rankedBrands.filter(b => !b.isOwnBrand).length}개 대비 시급한 광고 집행 필요`
        : competitorTopRank && competitorTopRank < ownRank
          ? `자사 광고 ${ownRank}위 vs 최상위 경쟁사 ${competitorTopRank}위 — 광고 카피·입찰 최적화로 상위 노출 확보 필요`
          : `자사 광고 ${ownRank}위로 경쟁 우위. 현재 광고 전략 유지 + 경쟁사 진입 대비 방어 전략 필요`;
      adSlide.addText(`📊 인사이트: ${insight}`, {
        x: 0.5, y: insightY + 0.08, w: 9.0, h: 0.45,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial', valign: 'middle',
      });

      addPageNumber(adSlide, marketSectionEndSlide + 1);
      marketSectionEndSlide += 1;
    }

    // ========== Slides: 마케팅 인사이트 (각 인사이트별 1 슬라이드) ==========
    const insights = report.marketingInsights || [];
    const insightSlides = insights.length;

    insights.forEach((insight, insightIdx) => {
      const slideNum = marketSectionEndSlide + 1 + insightIdx;
      const slide = pptx.addSlide();
      addSlideHeader(slide, `핵심 마케팅 인사이트 #${insight.id}`, insight.title);

      const yOffset = 1.1;

      // Pain Point
      slide.addShape('rect', {
        x: 0.5, y: yOffset, w: 4.3, h: 2.2,
        fill: { color: 'FFEBEE' },
      });
      slide.addText(`Pain Point: ${insight.painPoint?.label || ''}`, {
        x: 0.6, y: yOffset + 0.1, w: 4.1, h: 0.35,
        fontSize: 11, color: COLORS.danger, fontFace: 'Arial', bold: true,
      });
      insight.painPoint?.details?.slice(0, 5).forEach((detail, dIdx) => {
        slide.addText(`• ${detail}`, {
          x: 0.6, y: yOffset + 0.5 + dIdx * 0.32, w: 4.1, h: 0.3,
          fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
        });
      });

      // Opportunity
      slide.addShape('rect', {
        x: 5.2, y: yOffset, w: 4.3, h: 2.2,
        fill: { color: 'E8F5E9' },
      });
      slide.addText(`Opportunity: ${insight.opportunity?.label || ''}`, {
        x: 5.3, y: yOffset + 0.1, w: 4.1, h: 0.35,
        fontSize: 11, color: COLORS.success, fontFace: 'Arial', bold: true,
      });
      insight.opportunity?.details?.slice(0, 5).forEach((detail, dIdx) => {
        slide.addText(`• ${detail}`, {
          x: 5.3, y: yOffset + 0.5 + dIdx * 0.32, w: 4.1, h: 0.3,
          fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
        });
      });

      // Action
      slide.addShape('rect', {
        x: 0.5, y: yOffset + 2.35, w: 9, h: 0.5,
        fill: { color: 'E3F2FD' },
      });
      slide.addText(`ACTION → ${insight.action}`, {
        x: 0.6, y: yOffset + 2.45, w: 8.8, h: 0.35,
        fontSize: 10, color: COLORS.primary, fontFace: 'Arial', bold: true,
      });

      addPageNumber(slide, slideNum);
    });

    // ========== Slides: 실행 전략 ==========
    const strategies = report.actionStrategies || [];
    strategies.forEach((strategy, stratIdx) => {
      const slideNum = marketSectionEndSlide + 1 + insightSlides + stratIdx;
      const slide = pptx.addSlide();
      addSlideHeader(slide, `실행 전략 #${strategy.id}`, strategy.subtitle);

      slide.addText(strategy.title, {
        x: 0.5, y: 1.05, w: 9, h: 0.35,
        fontSize: 14, color: COLORS.accent, fontFace: 'Arial', bold: true,
      });

      const sections = strategy.sections || [];
      sections.slice(0, 4).forEach((section, sIdx) => {
        const col = sIdx % 2;
        const row = Math.floor(sIdx / 2);
        const xPos = 0.5 + col * 4.7;
        const yPos = 1.5 + row * 1.6;

        slide.addShape('rect', {
          x: xPos, y: yPos, w: 4.5, h: 1.45,
          fill: { color: COLORS.light },
        });

        slide.addText(section.heading, {
          x: xPos + 0.1, y: yPos + 0.05, w: 4.3, h: 0.3,
          fontSize: 10, color: COLORS.accent, fontFace: 'Arial', bold: true,
        });

        section.items?.slice(0, 4).forEach((item, iIdx) => {
          slide.addText(`✓ ${item}`, {
            x: xPos + 0.1, y: yPos + 0.38 + iIdx * 0.26, w: 4.3, h: 0.24,
            fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
          });
        });
      });

      // Expected Metrics
      if (strategy.expectedMetrics && strategy.expectedMetrics.length > 0) {
        slide.addText('예상 성과 지표', {
          x: 0.5, y: 4.75, w: 9, h: 0.25,
          fontSize: 10, color: COLORS.accent, fontFace: 'Arial', bold: true,
        });

        strategy.expectedMetrics.slice(0, 4).forEach((metric, mIdx) => {
          slide.addShape('rect', {
            x: 0.5 + mIdx * 2.3, y: 5.0, w: 2.1, h: 0.55,
            fill: { color: 'E8F5E9' },
          });
          slide.addText(metric.value, {
            x: 0.5 + mIdx * 2.3, y: 5.03, w: 2.1, h: 0.28,
            fontSize: 12, color: COLORS.accent, fontFace: 'Arial', align: 'center', bold: true,
          });
          slide.addText(metric.label, {
            x: 0.5 + mIdx * 2.3, y: 5.3, w: 2.1, h: 0.22,
            fontSize: 8, color: COLORS.slate, fontFace: 'Arial', align: 'center',
          });
        });
      }

      addPageNumber(slide, slideNum);
    });

    // ========== Slide: 90일 액션플랜 ==========
    const actionPlanSlideNum = marketSectionEndSlide + 1 + insightSlides + strategies.length;
    const actionPlanSlide = pptx.addSlide();
    addSlideHeader(actionPlanSlide, '90일 액션플랜', 'Action Timeline');

    // Key Findings
    actionPlanSlide.addText('Key Findings', {
      x: 0.5, y: 1.0, w: 9, h: 0.28,
      fontSize: 11, color: COLORS.warning, fontFace: 'Arial', bold: true,
    });

    report.actionPlan?.keyFindings?.slice(0, 4).forEach((finding, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      actionPlanSlide.addText(`${idx + 1}. ${finding}`, {
        x: 0.5 + col * 4.7, y: 1.3 + row * 0.35, w: 4.5, h: 0.32,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
      });
    });

    // Timeline
    actionPlanSlide.addText('실행 타임라인', {
      x: 0.5, y: 2.1, w: 9, h: 0.28,
      fontSize: 11, color: COLORS.dark, fontFace: 'Arial', bold: true,
    });

    const phaseColors: Record<string, string> = {
      'NOW': COLORS.danger,
      '30d': COLORS.orange,
      '60d': COLORS.warning,
      '90d': COLORS.success,
    };

    report.actionPlan?.timeline?.slice(0, 8).forEach((item, idx) => {
      const yPos = 2.45 + idx * 0.4;
      const color = phaseColors[item.phase] || COLORS.slate;

      // Phase badge
      actionPlanSlide.addShape('rect', {
        x: 0.5, y: yPos, w: 0.7, h: 0.32,
        fill: { color: color },
      });
      actionPlanSlide.addText(item.phase === 'NOW' ? '즉시' : item.phase, {
        x: 0.5, y: yPos + 0.04, w: 0.7, h: 0.24,
        fontSize: 8, color: 'FFFFFF', fontFace: 'Arial', align: 'center', bold: true,
      });

      // Category
      actionPlanSlide.addText(item.category, {
        x: 1.3, y: yPos, w: 1.5, h: 0.32,
        fontSize: 8, color: COLORS.slate, fontFace: 'Arial',
      });

      // Label & Action
      actionPlanSlide.addText(`${item.label}: ${item.action}`, {
        x: 2.8, y: yPos, w: 6.7, h: 0.32,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
      });
    });

    addPageNumber(actionPlanSlide, actionPlanSlideNum);

    // ========== Slide: 종합 결론 ==========
    const conclusionSlideNum = actionPlanSlideNum + 1;
    const conclusionSlide = pptx.addSlide();
    addSlideHeader(conclusionSlide, '종합 결론', 'Conclusion');

    conclusionSlide.addShape('rect', {
      x: 0.5, y: 1.4, w: 9, h: 1.5,
      fill: { color: COLORS.light },
    });
    conclusionSlide.addText(report.conclusion?.summary || '', {
      x: 0.6, y: 1.5, w: 8.8, h: 1.35,
      fontSize: 11, color: COLORS.dark, fontFace: 'Arial',
      valign: 'top',
    });

    conclusionSlide.addText('핵심 추천 사항', {
      x: 0.5, y: 3.1, w: 9, h: 0.35,
      fontSize: 14, color: COLORS.primary, fontFace: 'Arial', bold: true,
    });

    report.conclusion?.recommendations?.slice(0, 5).forEach((rec, idx) => {
      conclusionSlide.addShape('ellipse', {
        x: 0.5, y: 3.55 + idx * 0.5, w: 0.4, h: 0.4,
        fill: { color: COLORS.primary },
      });
      conclusionSlide.addText(`${idx + 1}`, {
        x: 0.5, y: 3.6 + idx * 0.5, w: 0.4, h: 0.3,
        fontSize: 12, color: 'FFFFFF', fontFace: 'Arial', align: 'center', bold: true,
      });
      conclusionSlide.addText(rec, {
        x: 1.0, y: 3.55 + idx * 0.5, w: 8.5, h: 0.45,
        fontSize: 10, color: COLORS.dark, fontFace: 'Arial',
      });
    });

    addPageNumber(conclusionSlide, conclusionSlideNum);

    // ========== Slide: Thank You ==========
    const thankYouSlide = pptx.addSlide();
    thankYouSlide.background = { color: COLORS.primary };

    thankYouSlide.addText('감사합니다', {
      x: 0.5, y: 2, w: 9, h: 0.8,
      fontSize: 40, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center', bold: true,
    });

    thankYouSlide.addText('Thank You', {
      x: 0.5, y: 2.8, w: 9, h: 0.5,
      fontSize: 20, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center',
    });

    thankYouSlide.addText('GPTKOREA 키워드 분석 서비스', {
      x: 0.5, y: 4, w: 9, h: 0.4,
      fontSize: 14, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center',
    });

    thankYouSlide.addText(`Generated: ${new Date().toLocaleDateString('ko-KR')}`, {
      x: 0.5, y: 4.5, w: 9, h: 0.3,
      fontSize: 10, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center',
    });

    addPageNumber(thankYouSlide, conclusionSlideNum + 1);

    // PPT 생성 및 반환
    const pptBuffer = await pptx.write({ outputType: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(report.keyword)}_marketing_report.pptx"`);
    res.send(pptBuffer);

  } catch (error) {
    console.error('PPT 생성 오류:', error);
    res.status(500).json({ error: 'PPT 생성 중 오류가 발생했습니다.' });
  }
}

// 헬퍼 함수: 슬라이드 헤더 추가
function addSlideHeader(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  slide.addShape('rect', {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.light },
  });

  slide.addText(title, {
    x: 0.5, y: 0.15, w: 9, h: 0.4,
    fontSize: 20, color: COLORS.dark, fontFace: 'Arial', bold: true,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.55, w: 9, h: 0.25,
      fontSize: 10, color: COLORS.slate, fontFace: 'Arial',
    });
  }
}

// 헬퍼 함수: 페이지 번호 추가
function addPageNumber(slide: PptxGenJS.Slide, num: number) {
  slide.addText(`${num}`, {
    x: 9.3, y: 5.3, w: 0.4, h: 0.3,
    fontSize: 10, color: COLORS.slate, fontFace: 'Arial',
    align: 'right',
  });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
