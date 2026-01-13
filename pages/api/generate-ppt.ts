import type { NextApiRequest, NextApiResponse } from 'next';
import PptxGenJS from 'pptxgenjs';
import { IntegratedReportData } from '../../types/integrated-analysis';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { report } = req.body as { report: IntegratedReportData };

    if (!report) {
      return res.status(400).json({ error: 'Report data is required' });
    }

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

    slide1.addText('MARKETING INTELLIGENCE REPORT', {
      x: 0.5, y: 1.5, w: 9, h: 0.5,
      fontSize: 14, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center', bold: false, italic: false,
    });

    slide1.addText(`"${report.keyword}"`, {
      x: 0.5, y: 2.2, w: 9, h: 1,
      fontSize: 44, color: 'FFFFFF', fontFace: 'Arial',
      align: 'center', bold: true,
    });

    slide1.addText('시장 분석 리포트', {
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
      '2. 3단계 소비자 인식 구조',
      '3. 핵심 키워드 맵',
      '4. 채널별 소비자 반응',
      '5. 시장 환경 분석',
      '6. 핵심 마케팅 인사이트',
      '7. 실행 전략 (5대 전략)',
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
          x: startX + idx * metricWidth, y: 1.4, w: 1.5, h: 1.2,
          fill: { color: COLORS.light },
          line: { color: COLORS.primary, width: 1 },
        });
        slide3.addText(metric.value, {
          x: startX + idx * metricWidth, y: 1.5, w: 1.5, h: 0.5,
          fontSize: 18, color: COLORS.primary, fontFace: 'Arial',
          align: 'center', bold: true,
        });
        slide3.addText(metric.label, {
          x: startX + idx * metricWidth, y: 2.0, w: 1.5, h: 0.3,
          fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
          align: 'center',
        });
        slide3.addText(metric.description, {
          x: startX + idx * metricWidth, y: 2.3, w: 1.5, h: 0.25,
          fontSize: 7, color: COLORS.slate, fontFace: 'Arial',
          align: 'center',
        });
      });
    }

    // Winning Formula & Market Opportunity
    slide3.addShape('rect', {
      x: 0.5, y: 2.9, w: 4.3, h: 1.8,
      fill: { color: 'E8F5E9' },
      line: { color: COLORS.success, width: 1 },
    });
    slide3.addText('Winning Formula', {
      x: 0.6, y: 3.0, w: 4.1, h: 0.35,
      fontSize: 12, color: COLORS.success, fontFace: 'Arial', bold: true,
    });
    slide3.addText(report.executiveSummary?.winningFormula || '', {
      x: 0.6, y: 3.4, w: 4.1, h: 1.2,
      fontSize: 10, color: COLORS.dark, fontFace: 'Arial',
      valign: 'top',
    });

    slide3.addShape('rect', {
      x: 5.2, y: 2.9, w: 4.3, h: 1.8,
      fill: { color: 'E3F2FD' },
      line: { color: COLORS.primary, width: 1 },
    });
    slide3.addText('Market Opportunity', {
      x: 5.3, y: 3.0, w: 4.1, h: 0.35,
      fontSize: 12, color: COLORS.primary, fontFace: 'Arial', bold: true,
    });
    slide3.addText(report.executiveSummary?.marketOpportunity || '', {
      x: 5.3, y: 3.4, w: 4.1, h: 1.2,
      fontSize: 10, color: COLORS.dark, fontFace: 'Arial',
      valign: 'top',
    });

    addPageNumber(slide3, 3);

    // ========== Slide 4: 3단계 소비자 인식 구조 ==========
    const slide4 = pptx.addSlide();
    addSlideHeader(slide4, '3단계 소비자 인식 구조', 'Consumer Perception Journey');

    const stages = [
      { stage: report.perceptionStages?.stage1_awareness, color: COLORS.teal, label: 'AWARENESS' },
      { stage: report.perceptionStages?.stage2_comparison, color: COLORS.cyan, label: 'COMPARISON' },
      { stage: report.perceptionStages?.stage3_conversion, color: COLORS.primary, label: 'CONVERSION' },
    ];

    stages.forEach((s, idx) => {
      const xPos = 0.5 + idx * 3.2;

      // Circle with number
      slide4.addShape('ellipse', {
        x: xPos + 1.2, y: 1.4, w: 0.6, h: 0.6,
        fill: { color: s.color },
      });
      slide4.addText(`${idx + 1}`, {
        x: xPos + 1.2, y: 1.48, w: 0.6, h: 0.45,
        fontSize: 18, color: 'FFFFFF', fontFace: 'Arial',
        align: 'center', bold: true,
      });

      // Stage box
      slide4.addShape('rect', {
        x: xPos, y: 2.1, w: 3, h: 2.6,
        fill: { color: COLORS.light },
        line: { color: s.color, width: 2 },
      });

      slide4.addText(s.stage?.title || '', {
        x: xPos + 0.1, y: 2.2, w: 2.8, h: 0.35,
        fontSize: 12, color: s.color, fontFace: 'Arial', bold: true,
      });
      slide4.addText(s.label, {
        x: xPos + 0.1, y: 2.5, w: 2.8, h: 0.2,
        fontSize: 8, color: s.color, fontFace: 'Arial',
      });
      slide4.addText(s.stage?.insight || '', {
        x: xPos + 0.1, y: 2.75, w: 2.8, h: 0.9,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
        valign: 'top',
      });

      // Keywords/PainPoints
      const keywords = idx === 2
        ? s.stage?.painPoints?.slice(0, 3) || []
        : s.stage?.keywords?.slice(0, 3) || [];

      keywords.forEach((kw, kIdx) => {
        slide4.addText(`• ${kw}`, {
          x: xPos + 0.1, y: 3.7 + kIdx * 0.3, w: 2.8, h: 0.25,
          fontSize: 8, color: COLORS.slate, fontFace: 'Arial',
        });
      });
    });

    // Arrows between stages
    slide4.addText('→', {
      x: 3.3, y: 2.8, w: 0.5, h: 0.5,
      fontSize: 24, color: COLORS.dark, align: 'center',
    });
    slide4.addText('→', {
      x: 6.5, y: 2.8, w: 0.5, h: 0.5,
      fontSize: 24, color: COLORS.dark, align: 'center',
    });

    addPageNumber(slide4, 4);

    // ========== Slide 5: 핵심 키워드 맵 ==========
    const slide5 = pptx.addSlide();
    addSlideHeader(slide5, '핵심 키워드 맵', 'Keyword Intelligence');

    // Total Search Volume
    slide5.addText(report.keywordMap?.totalSearchVolume || '0', {
      x: 3.5, y: 1.3, w: 3, h: 0.6,
      fontSize: 28, color: COLORS.orange, fontFace: 'Arial',
      align: 'center', bold: true,
    });
    slide5.addText('총 월간 검색량', {
      x: 3.5, y: 1.85, w: 3, h: 0.3,
      fontSize: 12, color: COLORS.dark, fontFace: 'Arial',
      align: 'center',
    });

    // Top Keywords Table
    slide5.addText('상위 키워드 (빈도순)', {
      x: 0.5, y: 2.3, w: 4.5, h: 0.35,
      fontSize: 12, color: COLORS.dark, fontFace: 'Arial', bold: true,
    });

    const topKeywords = report.keywordMap?.topKeywords?.slice(0, 8) || [];
    const maxFreq = topKeywords[0]?.frequency || 1;

    topKeywords.forEach((kw, idx) => {
      const yPos = 2.7 + idx * 0.35;
      slide5.addText(`${kw.rank}. ${kw.keyword}`, {
        x: 0.5, y: yPos, w: 2.5, h: 0.3,
        fontSize: 10, color: COLORS.dark, fontFace: 'Arial',
      });
      // Bar
      const barWidth = (kw.frequency / maxFreq) * 1.5;
      slide5.addShape('rect', {
        x: 3.0, y: yPos + 0.05, w: barWidth, h: 0.2,
        fill: { color: COLORS.orange },
      });
      slide5.addText(`${kw.frequency}`, {
        x: 4.6, y: yPos, w: 0.4, h: 0.3,
        fontSize: 9, color: COLORS.slate, fontFace: 'Arial',
        align: 'right',
      });
    });

    // Pain Point Keywords
    slide5.addText('Pain Point 키워드', {
      x: 5.2, y: 2.3, w: 4.3, h: 0.35,
      fontSize: 12, color: COLORS.danger, fontFace: 'Arial', bold: true,
    });

    slide5.addShape('rect', {
      x: 5.2, y: 2.7, w: 4.3, h: 1.5,
      fill: { color: 'FFEBEE' },
    });

    const painKeywords = report.keywordMap?.painPointKeywords?.slice(0, 6) || [];
    painKeywords.forEach((kw, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;
      slide5.addText(`• ${kw.keyword} (${kw.frequency})`, {
        x: 5.3 + col * 2.1, y: 2.8 + row * 0.4, w: 2, h: 0.35,
        fontSize: 9, color: COLORS.danger, fontFace: 'Arial',
      });
    });

    // Data Insights
    slide5.addText('데이터 인사이트', {
      x: 5.2, y: 4.3, w: 4.3, h: 0.35,
      fontSize: 12, color: COLORS.dark, fontFace: 'Arial', bold: true,
    });

    report.keywordMap?.dataInsights?.slice(0, 3).forEach((insight, idx) => {
      slide5.addText(`• ${insight}`, {
        x: 5.2, y: 4.7 + idx * 0.35, w: 4.3, h: 0.3,
        fontSize: 9, color: COLORS.slate, fontFace: 'Arial',
      });
    });

    addPageNumber(slide5, 5);

    // ========== Slide 6: 채널별 소비자 반응 ==========
    const slide6 = pptx.addSlide();
    addSlideHeader(slide6, '채널별 소비자 반응', 'Channel Analysis');

    const channels = report.channelBreakdown?.slice(0, 4) || [];
    channels.forEach((channel, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;
      const xPos = 0.5 + col * 4.7;
      const yPos = 1.4 + row * 2.2;

      slide6.addShape('rect', {
        x: xPos, y: yPos, w: 4.5, h: 2,
        fill: { color: COLORS.light },
        line: { color: COLORS.secondary, width: 1 },
      });

      slide6.addText(channel.channelName, {
        x: xPos + 0.1, y: yPos + 0.1, w: 3, h: 0.35,
        fontSize: 12, color: COLORS.secondary, fontFace: 'Arial', bold: true,
      });

      slide6.addText(channel.role, {
        x: xPos + 0.1, y: yPos + 0.45, w: 4.3, h: 0.3,
        fontSize: 9, color: COLORS.primary, fontFace: 'Arial',
      });

      // Sentiment bar
      if (channel.sentimentBreakdown) {
        const barY = yPos + 0.8;
        const totalWidth = 4.3;
        const posWidth = (channel.sentimentBreakdown.positive / 100) * totalWidth;
        const neuWidth = (channel.sentimentBreakdown.neutral / 100) * totalWidth;
        const negWidth = (channel.sentimentBreakdown.negative / 100) * totalWidth;

        slide6.addShape('rect', { x: xPos + 0.1, y: barY, w: posWidth, h: 0.15, fill: { color: COLORS.success } });
        slide6.addShape('rect', { x: xPos + 0.1 + posWidth, y: barY, w: neuWidth, h: 0.15, fill: { color: '9CA3AF' } });
        slide6.addShape('rect', { x: xPos + 0.1 + posWidth + neuWidth, y: barY, w: negWidth, h: 0.15, fill: { color: COLORS.danger } });

        slide6.addText(`긍정 ${channel.sentimentBreakdown.positive}% / 중립 ${channel.sentimentBreakdown.neutral}% / 부정 ${channel.sentimentBreakdown.negative}%`, {
          x: xPos + 0.1, y: barY + 0.15, w: 4.3, h: 0.2,
          fontSize: 7, color: COLORS.slate, fontFace: 'Arial',
        });
      }

      // Key interests
      const interests = channel.keyInterests?.slice(0, 3).join(', ') || '';
      slide6.addText(`관심사: ${interests}`, {
        x: xPos + 0.1, y: yPos + 1.2, w: 4.3, h: 0.25,
        fontSize: 8, color: COLORS.slate, fontFace: 'Arial',
      });

      // Strategy
      slide6.addText(`전략: ${channel.strategy}`, {
        x: xPos + 0.1, y: yPos + 1.5, w: 4.3, h: 0.45,
        fontSize: 8, color: COLORS.dark, fontFace: 'Arial',
        valign: 'top',
      });
    });

    addPageNumber(slide6, 6);

    // ========== Slide 7: 시장 환경 분석 ==========
    const slide7 = pptx.addSlide();
    addSlideHeader(slide7, '시장 환경 분석', 'Market Environment');

    // 경쟁 분석
    slide7.addShape('rect', {
      x: 0.5, y: 1.4, w: 4.5, h: 3.3,
      fill: { color: COLORS.light },
      line: { color: COLORS.slate, width: 1 },
    });

    slide7.addText('경쟁 구도 분석', {
      x: 0.6, y: 1.5, w: 4.3, h: 0.4,
      fontSize: 14, color: COLORS.slate, fontFace: 'Arial', bold: true,
    });

    const compLevel = report.marketEnvironment?.competitionAnalysis?.level || '중간';
    const levelColor = compLevel === '높음' ? COLORS.danger : compLevel === '중간' ? COLORS.warning : COLORS.success;
    slide7.addText(`경쟁 강도: ${compLevel}`, {
      x: 0.6, y: 1.95, w: 4.3, h: 0.35,
      fontSize: 11, color: levelColor, fontFace: 'Arial', bold: true,
    });

    slide7.addText(report.marketEnvironment?.competitionAnalysis?.insight || '', {
      x: 0.6, y: 2.35, w: 4.3, h: 1,
      fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
      valign: 'top',
    });

    slide7.addText('주요 플레이어:', {
      x: 0.6, y: 3.4, w: 4.3, h: 0.25,
      fontSize: 9, color: COLORS.slate, fontFace: 'Arial', bold: true,
    });

    const players = report.marketEnvironment?.competitionAnalysis?.keyPlayers?.slice(0, 4) || [];
    players.forEach((player, idx) => {
      slide7.addText(`• ${player}`, {
        x: 0.6, y: 3.7 + idx * 0.25, w: 4.3, h: 0.25,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
      });
    });

    // 디지털 트렌드
    slide7.addShape('rect', {
      x: 5.2, y: 1.4, w: 4.3, h: 3.3,
      fill: { color: 'E3F2FD' },
      line: { color: COLORS.primary, width: 1 },
    });

    slide7.addText('디지털 트렌드', {
      x: 5.3, y: 1.5, w: 4.1, h: 0.4,
      fontSize: 14, color: COLORS.primary, fontFace: 'Arial', bold: true,
    });

    slide7.addText(`모바일 비중: ${report.marketEnvironment?.digitalTrends?.mobileShare || '-'}`, {
      x: 5.3, y: 2.0, w: 4.1, h: 0.3,
      fontSize: 11, color: COLORS.dark, fontFace: 'Arial',
    });

    slide7.addText(`콘텐츠 신선도: ${report.marketEnvironment?.digitalTrends?.contentFreshness || '-'}`, {
      x: 5.3, y: 2.35, w: 4.1, h: 0.3,
      fontSize: 11, color: COLORS.dark, fontFace: 'Arial',
    });

    slide7.addText('주요 변화:', {
      x: 5.3, y: 2.8, w: 4.1, h: 0.25,
      fontSize: 9, color: COLORS.primary, fontFace: 'Arial', bold: true,
    });

    report.marketEnvironment?.digitalTrends?.orgChanges?.slice(0, 5).forEach((change, idx) => {
      slide7.addText(`→ ${change}`, {
        x: 5.3, y: 3.1 + idx * 0.35, w: 4.1, h: 0.3,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
      });
    });

    addPageNumber(slide7, 7);

    // ========== Slides 8-9: 마케팅 인사이트 ==========
    const insights = report.marketingInsights || [];
    const insightSlides = Math.ceil(insights.length / 2);

    for (let slideIdx = 0; slideIdx < insightSlides; slideIdx++) {
      const slideNum = 8 + slideIdx;
      const slide = pptx.addSlide();
      addSlideHeader(slide, `핵심 마케팅 인사이트 ${slideIdx > 0 ? '(계속)' : ''}`, 'Marketing Insights');

      const slideInsights = insights.slice(slideIdx * 2, slideIdx * 2 + 2);

      slideInsights.forEach((insight, idx) => {
        const yOffset = 1.4 + idx * 2.3;

        // Title bar
        slide.addShape('rect', {
          x: 0.5, y: yOffset, w: 9, h: 0.5,
          fill: { color: COLORS.pink },
        });
        slide.addText(`Insight #${insight.id}: ${insight.title}`, {
          x: 0.6, y: yOffset + 0.1, w: 8.8, h: 0.35,
          fontSize: 12, color: 'FFFFFF', fontFace: 'Arial', bold: true,
        });

        // Pain Point
        slide.addShape('rect', {
          x: 0.5, y: yOffset + 0.55, w: 4.3, h: 1.5,
          fill: { color: 'FFEBEE' },
        });
        slide.addText(`Pain Point: ${insight.painPoint?.label || ''}`, {
          x: 0.6, y: yOffset + 0.6, w: 4.1, h: 0.3,
          fontSize: 10, color: COLORS.danger, fontFace: 'Arial', bold: true,
        });
        insight.painPoint?.details?.slice(0, 3).forEach((detail, dIdx) => {
          slide.addText(`• ${detail}`, {
            x: 0.6, y: yOffset + 0.95 + dIdx * 0.3, w: 4.1, h: 0.28,
            fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
          });
        });

        // Opportunity
        slide.addShape('rect', {
          x: 5.2, y: yOffset + 0.55, w: 4.3, h: 1.5,
          fill: { color: 'E8F5E9' },
        });
        slide.addText(`Opportunity: ${insight.opportunity?.label || ''}`, {
          x: 5.3, y: yOffset + 0.6, w: 4.1, h: 0.3,
          fontSize: 10, color: COLORS.success, fontFace: 'Arial', bold: true,
        });
        insight.opportunity?.details?.slice(0, 3).forEach((detail, dIdx) => {
          slide.addText(`• ${detail}`, {
            x: 5.3, y: yOffset + 0.95 + dIdx * 0.3, w: 4.1, h: 0.28,
            fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
          });
        });

        // Action
        slide.addText(`ACTION → ${insight.action}`, {
          x: 0.5, y: yOffset + 2.1, w: 9, h: 0.25,
          fontSize: 9, color: COLORS.primary, fontFace: 'Arial', bold: true,
        });
      });

      addPageNumber(slide, slideNum);
    }

    // ========== Slides: 실행 전략 ==========
    const strategies = report.actionStrategies || [];
    strategies.forEach((strategy, stratIdx) => {
      const slideNum = 8 + insightSlides + stratIdx;
      const slide = pptx.addSlide();
      addSlideHeader(slide, `실행 전략 #${strategy.id}`, strategy.subtitle);

      slide.addText(strategy.title, {
        x: 0.5, y: 1.4, w: 9, h: 0.4,
        fontSize: 16, color: COLORS.accent, fontFace: 'Arial', bold: true,
      });

      const sections = strategy.sections || [];
      sections.slice(0, 4).forEach((section, sIdx) => {
        const col = sIdx % 2;
        const row = Math.floor(sIdx / 2);
        const xPos = 0.5 + col * 4.7;
        const yPos = 1.9 + row * 1.5;

        slide.addShape('rect', {
          x: xPos, y: yPos, w: 4.5, h: 1.3,
          fill: { color: COLORS.light },
        });

        slide.addText(section.heading, {
          x: xPos + 0.1, y: yPos + 0.05, w: 4.3, h: 0.3,
          fontSize: 10, color: COLORS.accent, fontFace: 'Arial', bold: true,
        });

        section.items?.slice(0, 3).forEach((item, iIdx) => {
          slide.addText(`✓ ${item}`, {
            x: xPos + 0.1, y: yPos + 0.4 + iIdx * 0.28, w: 4.3, h: 0.26,
            fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
          });
        });
      });

      // Expected Metrics
      if (strategy.expectedMetrics && strategy.expectedMetrics.length > 0) {
        slide.addText('예상 성과 지표', {
          x: 0.5, y: 4.95, w: 9, h: 0.25,
          fontSize: 10, color: COLORS.accent, fontFace: 'Arial', bold: true,
        });

        strategy.expectedMetrics.slice(0, 4).forEach((metric, mIdx) => {
          slide.addShape('rect', {
            x: 0.5 + mIdx * 2.3, y: 5.25, w: 2.1, h: 0.5,
            fill: { color: 'E8F5E9' },
          });
          slide.addText(metric.value, {
            x: 0.5 + mIdx * 2.3, y: 5.28, w: 2.1, h: 0.25,
            fontSize: 12, color: COLORS.accent, fontFace: 'Arial', align: 'center', bold: true,
          });
          slide.addText(metric.label, {
            x: 0.5 + mIdx * 2.3, y: 5.52, w: 2.1, h: 0.2,
            fontSize: 8, color: COLORS.slate, fontFace: 'Arial', align: 'center',
          });
        });
      }

      addPageNumber(slide, slideNum);
    });

    // ========== Slide: 90일 액션플랜 ==========
    const actionPlanSlideNum = 8 + insightSlides + strategies.length;
    const actionPlanSlide = pptx.addSlide();
    addSlideHeader(actionPlanSlide, '90일 액션플랜', 'Action Timeline');

    // Key Findings
    actionPlanSlide.addText('Key Findings', {
      x: 0.5, y: 1.3, w: 9, h: 0.3,
      fontSize: 12, color: COLORS.warning, fontFace: 'Arial', bold: true,
    });

    report.actionPlan?.keyFindings?.slice(0, 4).forEach((finding, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      actionPlanSlide.addText(`${idx + 1}. ${finding}`, {
        x: 0.5 + col * 4.7, y: 1.65 + row * 0.35, w: 4.5, h: 0.32,
        fontSize: 9, color: COLORS.dark, fontFace: 'Arial',
      });
    });

    // Timeline
    actionPlanSlide.addText('실행 타임라인', {
      x: 0.5, y: 2.5, w: 9, h: 0.3,
      fontSize: 12, color: COLORS.dark, fontFace: 'Arial', bold: true,
    });

    const phaseColors: Record<string, string> = {
      'NOW': COLORS.danger,
      '30d': COLORS.orange,
      '60d': COLORS.warning,
      '90d': COLORS.success,
    };

    report.actionPlan?.timeline?.slice(0, 6).forEach((item, idx) => {
      const yPos = 2.9 + idx * 0.45;
      const color = phaseColors[item.phase] || COLORS.slate;

      // Phase badge
      actionPlanSlide.addShape('rect', {
        x: 0.5, y: yPos, w: 0.7, h: 0.35,
        fill: { color: color },
      });
      actionPlanSlide.addText(item.phase === 'NOW' ? '즉시' : item.phase, {
        x: 0.5, y: yPos + 0.05, w: 0.7, h: 0.25,
        fontSize: 8, color: 'FFFFFF', fontFace: 'Arial', align: 'center', bold: true,
      });

      // Category
      actionPlanSlide.addText(item.category, {
        x: 1.3, y: yPos, w: 1.5, h: 0.35,
        fontSize: 8, color: COLORS.slate, fontFace: 'Arial',
      });

      // Label & Action
      actionPlanSlide.addText(`${item.label}: ${item.action}`, {
        x: 2.8, y: yPos, w: 6.7, h: 0.35,
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
    x: 0, y: 0, w: 10, h: 1.2,
    fill: { color: COLORS.light },
  });

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 24, color: COLORS.dark, fontFace: 'Arial', bold: true,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.8, w: 9, h: 0.3,
      fontSize: 12, color: COLORS.slate, fontFace: 'Arial',
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
