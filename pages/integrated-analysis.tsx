import React, { useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import {
  IntegratedAnalysisState,
  IntegratedReportData,
  KeywordExpansionResult,
  KeywordExpansionData,
  KeywordExpansionGPTAnalysis,
  KeywordAnalysisResult,
  AdAnalysisResult,
  ContentType,
  WizardStep,
  initialAnalysisState,
  channelNames,
  stepInfo,
} from '../types/integrated-analysis';

// ===== 로딩 모달 컴포넌트 =====
interface LoadingModalProps {
  isOpen: boolean;
  message: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

// ===== 단계 표시기 컴포넌트 =====
interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  onStepClick: (step: WizardStep) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, completedSteps, onStepClick }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {stepInfo.map((info, index) => {
        const isCompleted = completedSteps.includes(info.step);
        const isCurrent = currentStep === info.step;
        const isLast = index === stepInfo.length - 1;
        // 클릭 가능 조건: 완료된 단계 또는 현재 단계
        const isClickable = isCompleted || isCurrent;

        return (
          <React.Fragment key={info.step}>
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(info.step)}
                disabled={!isClickable}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-500'
                } ${
                  isClickable
                    ? 'cursor-pointer hover:scale-110 hover:shadow-md'
                    : 'cursor-not-allowed opacity-60'
                }`}
                title={isClickable ? `${info.title}(으)로 이동` : '이전 단계를 먼저 완료해주세요'}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  info.step
                )}
              </button>
              <span
                className={`mt-2 text-xs font-medium hidden sm:block transition-colors ${
                  isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                } ${isClickable ? 'cursor-pointer' : ''}`}
                onClick={() => isClickable && onStepClick(info.step)}
              >
                {info.title}
              </span>
            </div>
            {!isLast && (
              <div
                className={`w-8 sm:w-12 h-1 mx-1 sm:mx-2 rounded ${
                  completedSteps.includes((info.step + 1) as WizardStep) || completedSteps.includes(info.step)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ===== Step 1: 키워드 입력 =====
interface Step1Props {
  keyword: string;
  companyName: string;
  onKeywordChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onNext: () => void;
}

const Step1KeywordInput: React.FC<Step1Props> = ({
  keyword,
  companyName,
  onKeywordChange,
  onCompanyNameChange,
  onNext,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (!keyword.trim()) {
      setError('분석할 키워드를 입력해주세요.');
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">분석할 키워드를 입력하세요</h2>
        <p className="text-gray-600">키워드를 기반으로 시장 분석과 마케팅 인사이트를 제공합니다.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
            분석 키워드 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="예: 자동차보험, 다이어트 도시락"
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
          />
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
            귀사 업체명 <span className="text-gray-400">(선택)</span>
          </label>
          <input
            type="text"
            id="companyName"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="예: 건강한끼, ABC보험"
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">광고 분석 시 귀사의 광고 순위를 확인하는 데 사용됩니다.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            다음 단계로
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== Step 2: 키워드 확장 =====
interface Step2Props {
  keyword: string;
  keywordExpansion: KeywordExpansionResult | null;
  keywordExpansionGPTAnalysis: KeywordExpansionGPTAnalysis | null;
  loading: boolean;
  gptLoading: boolean;
  onAnalyze: () => void;
  onReanalyze: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const Step2KeywordExpansion: React.FC<Step2Props> = ({
  keyword,
  keywordExpansion,
  keywordExpansionGPTAnalysis,
  loading,
  gptLoading,
  onAnalyze,
  onReanalyze,
  onPrev,
  onNext,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: '',
    direction: null,
  });
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortedList = () => {
    if (!keywordExpansion?.keywordList) return [];
    if (!sortConfig.direction) return keywordExpansion.keywordList;

    return [...keywordExpansion.keywordList].sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof KeywordExpansionData];
      let bVal: any = b[sortConfig.key as keyof KeywordExpansionData];

      if (sortConfig.key === 'compIdx') {
        const compMap: Record<string, number> = { 높음: 3, 중간: 2, 낮음: 1 };
        aVal = compMap[aVal] || 0;
        bVal = compMap[bVal] || 0;
      } else {
        aVal = aVal === '< 10' ? 5 : parseFloat(aVal) || 0;
        bVal = bVal === '< 10' ? 5 : parseFloat(bVal) || 0;
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return '↕';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '↕';
  };

  const formatNumber = (val: string) => {
    if (val === '< 10') return val;
    const num = parseFloat(val);
    return isNaN(num) ? val : num.toLocaleString();
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">키워드 확장 분석</h2>
        <p className="text-gray-600">
          "<span className="font-semibold text-blue-600">{keyword}</span>" 관련 키워드의 검색량과 경쟁도를 분석합니다.
        </p>
      </div>

      {!keywordExpansion && !loading && (
        <div className="text-center py-12">
          <button
            onClick={onAnalyze}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-lg"
          >
            키워드 확장 분석 시작
          </button>
        </div>
      )}

      {keywordExpansion && !loading && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={onReanalyze}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              다시 분석
            </button>
          </div>

          {/* GPT 분석 결과 - 테이블 위 (간소화) */}
          {keywordExpansionGPTAnalysis && !gptLoading && (
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-4">
              <h3 className="text-sm font-bold text-indigo-800 flex items-center mb-3">
                <span className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs mr-2">
                  AI
                </span>
                키워드 확장 AI 분석
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 border-l-4 border-blue-500">
                  <div className="text-xs font-semibold text-blue-700 mb-1">1. 검색량(수요) 분석</div>
                  <p className="text-sm text-gray-700">{keywordExpansionGPTAnalysis.searchVolumeAnalysis}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border-l-4 border-green-500">
                  <div className="text-xs font-semibold text-green-700 mb-1">2. 클릭수 및 클릭율 분석</div>
                  <p className="text-sm text-gray-700">{keywordExpansionGPTAnalysis.engagementAnalysis}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border-l-4 border-orange-500">
                  <div className="text-xs font-semibold text-orange-700 mb-1">3. 경쟁강도 분석</div>
                  <p className="text-sm text-gray-700">{keywordExpansionGPTAnalysis.competitionAnalysis}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border-l-4 border-violet-500">
                  <div className="text-xs font-semibold text-violet-700 mb-1">4. 소비자 인식 및 행동 트렌드</div>
                  <p className="text-sm text-gray-700">{keywordExpansionGPTAnalysis.consumerTrendAnalysis}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border-l-4 border-gray-700">
                  <div className="text-xs font-semibold text-gray-700 mb-1">5. 결론 및 마케팅 시사점</div>
                  <p className="text-sm text-gray-700">{keywordExpansionGPTAnalysis.conclusion}</p>
                </div>
              </div>
            </div>
          )}

          {/* 키워드 테이블 */}
          <div className="mb-3 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">
              확장 키워드 리스트 ({Math.min(20, keywordExpansion.keywordList.length)} / {keywordExpansion.keywordList.length}개)
            </h3>
            {keywordExpansion.keywordList.length > 20 && (
              <button
                onClick={() => setShowAllKeywords(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                전체보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">키워드</th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('monthlyPcQcCnt')}
                >
                  PC검색량 {getSortIcon('monthlyPcQcCnt')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('monthlyMobileQcCnt')}
                >
                  모바일검색량 {getSortIcon('monthlyMobileQcCnt')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('monthlyAvePcCtr')}
                >
                  PC CTR {getSortIcon('monthlyAvePcCtr')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('monthlyAveMobileCtr')}
                >
                  모바일 CTR {getSortIcon('monthlyAveMobileCtr')}
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('compIdx')}
                >
                  경쟁도 {getSortIcon('compIdx')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getSortedList().slice(0, 20).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.relKeyword}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{formatNumber(item.monthlyPcQcCnt)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{formatNumber(item.monthlyMobileQcCnt)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {item.monthlyAvePcCtr === '< 10' ? '-' : `${parseFloat(item.monthlyAvePcCtr).toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {item.monthlyAveMobileCtr === '< 10' ? '-' : `${parseFloat(item.monthlyAveMobileCtr).toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.compIdx === '높음'
                          ? 'bg-red-100 text-red-700'
                          : item.compIdx === '중간'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {item.compIdx}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          {/* 전체 키워드 팝업 */}
          {showAllKeywords && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col m-4">
                <div className="flex justify-between items-center px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">
                    확장 키워드 전체 리스트 ({keywordExpansion.keywordList.length}개)
                  </h3>
                  <button
                    onClick={() => setShowAllKeywords(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-auto flex-1 p-4">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">키워드</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">PC검색량</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">모바일검색량</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">PC CTR</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">모바일 CTR</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">경쟁도</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedList().map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.relKeyword}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-600">{formatNumber(item.monthlyPcQcCnt)}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-600">{formatNumber(item.monthlyMobileQcCnt)}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-600">
                            {item.monthlyAvePcCtr === '< 10' ? '-' : `${parseFloat(item.monthlyAvePcCtr).toFixed(2)}%`}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-600">
                            {item.monthlyAveMobileCtr === '< 10' ? '-' : `${parseFloat(item.monthlyAveMobileCtr).toFixed(2)}%`}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                item.compIdx === '높음'
                                  ? 'bg-red-100 text-red-700'
                                  : item.compIdx === '중간'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {item.compIdx}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t text-right">
                  <button
                    onClick={() => setShowAllKeywords(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex justify-between pt-6">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
        >
          ← 이전
        </button>
        <button
          onClick={onNext}
          disabled={!keywordExpansion}
          className={`px-8 py-3 font-semibold rounded-lg shadow-md transition-all ${
            keywordExpansion
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
};

// ===== Step 3: 콘텐츠 분석 =====
interface Step3Props {
  keyword: string;
  selectedChannels: ContentType[];
  contentAnalysis: IntegratedAnalysisState['contentAnalysis'];
  contentAnalysisLoading: IntegratedAnalysisState['contentAnalysisLoading'];
  onChannelToggle: (channel: ContentType) => void;
  onAnalyze: () => void;
  onReanalyze: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const Step3ContentAnalysis: React.FC<Step3Props> = ({
  keyword,
  selectedChannels,
  contentAnalysis,
  contentAnalysisLoading,
  onChannelToggle,
  onAnalyze,
  onReanalyze,
  onPrev,
  onNext,
}) => {
  const [activeTab, setActiveTab] = useState<ContentType>('blog');
  const isAnyLoading = Object.values(contentAnalysisLoading).some(Boolean);
  const hasAnyResult = Object.values(contentAnalysis).some(Boolean);

  const getChannelResult = (channel: ContentType) => contentAnalysis[channel];

  const renderSentimentBar = (sentiment: { positive: number; negative: number; neutral: number }) => (
    <div className="flex h-4 rounded-full overflow-hidden bg-gray-200">
      <div className="bg-green-500" style={{ width: `${sentiment.positive}%` }} />
      <div className="bg-gray-400" style={{ width: `${sentiment.neutral}%` }} />
      <div className="bg-red-500" style={{ width: `${sentiment.negative}%` }} />
    </div>
  );

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">콘텐츠 분석</h2>
        <p className="text-gray-600">채널별 콘텐츠를 분석하여 소비자 인식과 트렌드를 파악합니다.</p>
      </div>

      {/* 채널 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">분석할 채널 선택</label>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(channelNames) as ContentType[]).map((channel) => (
            <button
              key={channel}
              onClick={() => onChannelToggle(channel)}
              disabled={isAnyLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedChannels.includes(channel)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isAnyLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {channelNames[channel]}
              {contentAnalysisLoading[channel] && (
                <span className="ml-2 inline-block animate-spin">⏳</span>
              )}
              {contentAnalysis[channel] && !contentAnalysisLoading[channel] && (
                <span className="ml-2 text-green-300">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 분석 시작 버튼 */}
      {!hasAnyResult && !isAnyLoading && selectedChannels.length > 0 && (
        <div className="text-center py-8">
          <button
            onClick={onAnalyze}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-lg"
          >
            선택한 채널 분석 시작 ({selectedChannels.length}개)
          </button>
        </div>
      )}

      {/* 결과 표시 */}
      {hasAnyResult && !isAnyLoading && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={onReanalyze}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              다시 분석
            </button>
          </div>
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px overflow-x-auto">
              {selectedChannels.map((channel) => (
                <button
                  key={channel}
                  onClick={() => setActiveTab(channel)}
                  className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === channel
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {channelNames[channel]}
                  {contentAnalysis[channel] && (
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {contentAnalysis[channel]?.contentItems?.length || 0}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* 탭 콘텐츠 */}
          {getChannelResult(activeTab) ? (
            <div className="space-y-6">
              {/* 감성 분석 */}
              {getChannelResult(activeTab)?.sentiment && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">감성 분석</h3>
                  {renderSentimentBar(getChannelResult(activeTab)!.sentiment!)}
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-green-600">긍정 {getChannelResult(activeTab)!.sentiment!.positive}%</span>
                    <span className="text-gray-500">중립 {getChannelResult(activeTab)!.sentiment!.neutral}%</span>
                    <span className="text-red-600">부정 {getChannelResult(activeTab)!.sentiment!.negative}%</span>
                  </div>
                </div>
              )}

              {/* 주요 키워드 */}
              {getChannelResult(activeTab)?.keywords && getChannelResult(activeTab)!.keywords.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">주요 키워드 (상위 10개)</h3>
                  <div className="space-y-2">
                    {getChannelResult(activeTab)!.keywords.slice(0, 10).map((kw, idx) => (
                      <div key={idx} className="flex items-center">
                        <span className="w-24 text-sm text-gray-700 truncate">{kw.keyword}</span>
                        <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(kw.frequency / getChannelResult(activeTab)!.keywords[0].frequency) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-10 text-right">{kw.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 콘텐츠 목록 */}
              {getChannelResult(activeTab)?.contentItems && getChannelResult(activeTab)!.contentItems!.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    분석된 콘텐츠 ({getChannelResult(activeTab)!.contentItems!.length}개)
                  </h3>
                  <div className="space-y-3 max-h-[480px] overflow-y-auto">
                    {getChannelResult(activeTab)!.contentItems!.map((item, idx) => (
                      <div key={idx} className="flex items-start p-3 bg-gray-50 rounded-lg">
                        <span
                          className={`w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0 ${
                            item.sentiment === 'positive'
                              ? 'bg-green-500'
                              : item.sentiment === 'negative'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-1"
                          >
                            {item.title.replace(/<[^>]*>/g, '')}
                          </a>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {item.description.replace(/<[^>]*>/g, '')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              이 채널의 분석 결과가 없습니다.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-6">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
        >
          ← 이전
        </button>
        <button
          onClick={onNext}
          disabled={!hasAnyResult}
          className={`px-8 py-3 font-semibold rounded-lg shadow-md transition-all ${
            hasAnyResult
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
};

// ===== Step 4: 광고 분석 =====
interface Step4Props {
  keyword: string;
  companyName: string;
  adAnalysis: AdAnalysisResult | null;
  loading: boolean;
  adInputMode: 'image' | 'text';
  adText: string;
  onInputModeChange: (mode: 'image' | 'text') => void;
  onAdTextChange: (text: string) => void;
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
  onReanalyze: () => void;
  onSkip: () => void;
  onPrev: () => void;
}

const Step4AdAnalysis: React.FC<Step4Props> = ({
  keyword,
  companyName,
  adAnalysis,
  loading,
  adInputMode,
  adText,
  onInputModeChange,
  onAdTextChange,
  onFileChange,
  onAnalyze,
  onReanalyze,
  onSkip,
  onPrev,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.includes('image')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }
      setSelectedFile(file);
      onFileChange(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">광고 분석 (선택)</h2>
        <p className="text-gray-600">경쟁사 광고를 분석하여 마케팅 전략에 반영합니다.</p>
        <p className="text-sm text-gray-500 mt-1">이 단계는 건너뛸 수 있습니다.</p>
      </div>

      {!adAnalysis && !loading && (
        <>
          {/* 입력 모드 선택 */}
          <div className="flex mb-4 border-b border-gray-200">
            <button
              type="button"
              onClick={() => onInputModeChange('text')}
              className={`px-4 py-2 font-medium transition-colors ${
                adInputMode === 'text'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              텍스트 붙여넣기
            </button>
            <button
              type="button"
              onClick={() => onInputModeChange('image')}
              className={`px-4 py-2 font-medium transition-colors ${
                adInputMode === 'image'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              이미지 업로드
            </button>
          </div>

          {/* 텍스트 입력 */}
          {adInputMode === 'text' && (
            <div>
              <textarea
                value={adText}
                onChange={(e) => onAdTextChange(e.target.value)}
                placeholder="네이버 광고 검색결과를 복사하여 붙여넣으세요."
                className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono resize-y"
              />
              <p className="mt-2 text-xs text-gray-500">
                검색 결과 페이지에서 광고 영역을 드래그하여 복사(Ctrl+C)한 후 붙여넣기(Ctrl+V) 하세요.
              </p>
            </div>
          )}

          {/* 이미지 업로드 */}
          {adInputMode === 'image' && (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                {imagePreview ? (
                  <div className="mb-4">
                    <img src={imagePreview} alt="미리보기" className="mx-auto h-48 object-contain rounded" />
                  </div>
                ) : (
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <div className="flex text-sm text-gray-600 justify-center">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>이미지 파일 선택</span>
                    <input type="file" className="sr-only" accept="image/*" onChange={handleFileSelect} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG 최대 10MB</p>
              </div>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={onAnalyze}
              disabled={adInputMode === 'text' ? !adText.trim() : !selectedFile}
              className={`px-6 py-3 font-semibold rounded-lg transition-all ${
                (adInputMode === 'text' && adText.trim()) || (adInputMode === 'image' && selectedFile)
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              광고 분석하기
            </button>
            <button
              onClick={onSkip}
              className="px-6 py-3 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-all"
            >
              건너뛰기
            </button>
          </div>
        </>
      )}

      {adAnalysis && !loading && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={onReanalyze}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              다시 분석
            </button>
          </div>

          {/* 광고 분석 결과 */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4">
            <h3 className="text-sm font-bold text-orange-800 flex items-center mb-4">
              <span className="w-6 h-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white text-xs mr-2">AI</span>
              광고 분석 결과
            </h3>

            <div className="space-y-3">
              {/* 자사 광고 순위 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-blue-700">1. 자사 광고 현황</div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    adAnalysis.ourAd.rank > 0
                      ? adAnalysis.ourAd.rank <= 3
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {adAnalysis.ourAd.rank > 0 ? `${adAnalysis.ourAd.rank}위` : '미노출'}
                  </div>
                </div>
                {adAnalysis.ourAd.rank > 0 && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-600 mb-1">제목 평가</div>
                      <p className="text-sm text-gray-700">{adAnalysis.ourAd.evaluation.title}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-600 mb-1">설명 평가</div>
                      <p className="text-sm text-gray-700">{adAnalysis.ourAd.evaluation.description}</p>
                    </div>
                  </div>
                )}
                {adAnalysis.ourAd.rank === 0 && (
                  <p className="text-sm text-gray-500">현재 광고가 검색 결과에 노출되지 않고 있습니다.</p>
                )}
              </div>

              {/* 경쟁사 분석 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-violet-500">
                <div className="text-sm font-bold text-violet-700 mb-3">2. 경쟁사 광고 분석</div>
                <div className="space-y-2">
                  {adAnalysis.competitorAnalysis.split('\n').filter(line => line.trim()).map((line, idx) => (
                    <div key={idx} className="bg-violet-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{line.trim()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 광고 개선 제안 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                <div className="text-sm font-bold text-green-700 mb-3">3. 광고 개선 제안</div>
                <div className="space-y-3">
                  {adAnalysis.adSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-green-800 text-sm">{suggestion.title}</div>
                          <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span>{suggestion.improvementPoints}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-start pt-6">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
        >
          ← 이전
        </button>
      </div>
    </div>
  );
};

// ===== 종합 리포트 컴포넌트 (PPT 수준 확장 버전) =====
interface ReportProps {
  report: IntegratedReportData;
  onBack: () => void;
  onRegenerate: () => void;
  pptLoading: boolean;
  onPptDownload: () => void;
}

const IntegratedReport: React.FC<ReportProps> = ({ report, onBack, onRegenerate, pptLoading, onPptDownload }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'executiveSummary',
    'perceptionStages',
    'keywordMap',
    'channelBreakdown',
    'marketEnvironment',
    'marketingInsights',
    'actionStrategies',
    'actionPlan',
    'conclusion',
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const SectionCard = ({
    id,
    title,
    children,
    bgColor = 'from-blue-600 to-indigo-600',
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
    bgColor?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
      <button
        onClick={() => toggleSection(id)}
        className={`w-full px-6 py-4 bg-gradient-to-r ${bgColor} text-white text-left font-semibold flex justify-between items-center`}
      >
        {title}
        <span className="text-xl">{expandedSections.includes(id) ? '−' : '+'}</span>
      </button>
      {expandedSections.includes(id) && <div className="p-6">{children}</div>}
    </div>
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mb-2">
          MARKETING INTELLIGENCE REPORT
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          "{report.keyword}" 시장 분석 리포트
        </h2>
        <p className="text-gray-600">
          {report.companyName && (
            <span className="font-semibold">{report.companyName} | </span>
          )}
          생성일시: {new Date(report.generatedAt).toLocaleString('ko-KR')}
        </p>
      </div>

      {/* 1. Executive Summary */}
      <SectionCard id="executiveSummary" title="1. Executive Summary" bgColor="from-indigo-600 to-purple-600">
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-4 text-lg">핵심 지표 (Key Metrics)</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {report.executiveSummary?.keyMetrics?.map((metric, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
                <div className="text-sm font-bold text-gray-800">{metric.label}</div>
                <div className="text-lg font-semibold text-indigo-600 mt-1">{metric.value}</div>
                <div className="text-xs text-gray-500 mt-1">{metric.description}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <h5 className="font-semibold text-green-800 mb-2">Winning Formula</h5>
            <p className="text-gray-700 text-sm">{report.executiveSummary?.winningFormula}</p>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <h5 className="font-semibold text-blue-800 mb-2">Market Opportunity</h5>
            <p className="text-gray-700 text-sm">{report.executiveSummary?.marketOpportunity}</p>
          </div>
        </div>
      </SectionCard>

      {/* 2. 3단계 소비자 인식 구조 */}
      <SectionCard id="perceptionStages" title="2. 3단계 소비자 인식 구조" bgColor="from-teal-600 to-cyan-600">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Stage 1: 인지 */}
          <div className="bg-gradient-to-b from-teal-50 to-white rounded-xl p-5 border border-teal-200">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold mr-3">1</div>
              <div>
                <h5 className="font-bold text-teal-800">{report.perceptionStages?.stage1_awareness?.title || '인지 단계'}</h5>
                <span className="text-xs text-teal-600">AWARENESS</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-3">{report.perceptionStages?.stage1_awareness?.insight}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {report.perceptionStages?.stage1_awareness?.keywords?.slice(0, 5).map((kw, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">{kw}</span>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">{report.perceptionStages?.stage1_awareness?.metrics}</div>
          </div>

          {/* Stage 2: 비교 */}
          <div className="bg-gradient-to-b from-cyan-50 to-white rounded-xl p-5 border border-cyan-200">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold mr-3">2</div>
              <div>
                <h5 className="font-bold text-cyan-800">{report.perceptionStages?.stage2_comparison?.title || '비교 단계'}</h5>
                <span className="text-xs text-cyan-600">COMPARISON</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-3">{report.perceptionStages?.stage2_comparison?.insight}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {report.perceptionStages?.stage2_comparison?.keywords?.slice(0, 5).map((kw, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs">{kw}</span>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">{report.perceptionStages?.stage2_comparison?.metrics}</div>
          </div>

          {/* Stage 3: 전환 */}
          <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl p-5 border border-blue-200">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">3</div>
              <div>
                <h5 className="font-bold text-blue-800">{report.perceptionStages?.stage3_conversion?.title || '전환 단계'}</h5>
                <span className="text-xs text-blue-600">CONVERSION</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-3">{report.perceptionStages?.stage3_conversion?.insight}</p>
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-600">Pain Points:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {report.perceptionStages?.stage3_conversion?.painPoints?.slice(0, 4).map((pp, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{pp}</span>
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">{report.perceptionStages?.stage3_conversion?.sentiment}</div>
          </div>
        </div>
      </SectionCard>

      {/* 3. 핵심 키워드 맵 */}
      <SectionCard id="keywordMap" title="3. 핵심 키워드 맵" bgColor="from-orange-500 to-amber-500">
        <div className="mb-4 text-center">
          <span className="text-3xl font-bold text-orange-600">{report.keywordMap?.totalSearchVolume}</span>
          <span className="text-gray-600 ml-2">총 월간 검색량</span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Keywords */}
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">상위 키워드 (빈도순)</h5>
            <div className="space-y-2">
              {report.keywordMap?.topKeywords?.slice(0, 10).map((kw, idx) => (
                <div key={idx} className="flex items-center">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                    idx < 3 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {kw.rank}
                  </span>
                  <span className="flex-1 text-sm text-gray-700">{kw.keyword}</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mx-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${(kw.frequency / (report.keywordMap?.topKeywords?.[0]?.frequency || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{kw.frequency}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pain Point Keywords */}
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">Pain Point 키워드</h5>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                {report.keywordMap?.painPointKeywords?.map((kw, idx) => (
                  <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    {kw.keyword} <span className="text-red-500 text-xs">({kw.frequency})</span>
                  </span>
                ))}
              </div>
            </div>

            <h5 className="font-semibold text-gray-800 mt-4 mb-3">데이터 인사이트</h5>
            <ul className="space-y-2">
              {report.keywordMap?.dataInsights?.map((insight, idx) => (
                <li key={idx} className="flex items-start text-sm text-gray-700">
                  <span className="text-orange-500 mr-2">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* 4. 채널별 소비자 반응 */}
      <SectionCard id="channelBreakdown" title="4. 채널별 소비자 반응" bgColor="from-violet-600 to-purple-600">
        <div className="grid md:grid-cols-2 gap-4">
          {report.channelBreakdown?.map((channel, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-bold text-gray-800">{channel.channelName}</h5>
                <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full">{channel.channel}</span>
              </div>
              <p className="text-sm text-violet-600 font-medium mb-3">{channel.role}</p>

              {channel.sentimentBreakdown && (
                <div className="mb-3">
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                    <div className="bg-green-500" style={{ width: `${channel.sentimentBreakdown.positive}%` }} />
                    <div className="bg-gray-400" style={{ width: `${channel.sentimentBreakdown.neutral}%` }} />
                    <div className="bg-red-500" style={{ width: `${channel.sentimentBreakdown.negative}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    긍정 {channel.sentimentBreakdown.positive}% / 중립 {channel.sentimentBreakdown.neutral}% / 부정 {channel.sentimentBreakdown.negative}%
                  </div>
                </div>
              )}

              <div className="mb-3">
                <span className="text-xs font-medium text-gray-600">주요 관심사:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {channel.keyInterests?.map((interest, iIdx) => (
                    <span key={iIdx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{interest}</span>
                  ))}
                </div>
              </div>

              <div className="bg-violet-50 rounded p-3">
                <span className="text-xs font-medium text-violet-700">전략:</span>
                <p className="text-sm text-gray-700 mt-1">{channel.strategy}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 5. 시장 환경 분석 */}
      <SectionCard id="marketEnvironment" title="5. 시장 환경 분석" bgColor="from-slate-600 to-gray-700">
        <div className="grid md:grid-cols-2 gap-6">
          {/* 경쟁 분석 */}
          <div className="bg-slate-50 rounded-lg p-5">
            <h5 className="font-semibold text-slate-800 mb-3">경쟁 구도 분석</h5>
            <div className="flex items-center mb-3">
              <span className="text-sm text-gray-600 mr-2">경쟁 강도:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                report.marketEnvironment?.competitionAnalysis?.level === '높음'
                  ? 'bg-red-100 text-red-700'
                  : report.marketEnvironment?.competitionAnalysis?.level === '중간'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {report.marketEnvironment?.competitionAnalysis?.level}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{report.marketEnvironment?.competitionAnalysis?.insight}</p>
            <div>
              <span className="text-xs font-medium text-gray-600">주요 플레이어:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {report.marketEnvironment?.competitionAnalysis?.keyPlayers?.map((player, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs">{player}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 디지털 트렌드 */}
          <div className="bg-blue-50 rounded-lg p-5">
            <h5 className="font-semibold text-blue-800 mb-3">디지털 트렌드</h5>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">모바일 비중</span>
                <span className="font-bold text-blue-600">{report.marketEnvironment?.digitalTrends?.mobileShare}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">콘텐츠 신선도</span>
                <span className="font-medium text-gray-800">{report.marketEnvironment?.digitalTrends?.contentFreshness}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">주요 변화:</span>
                <ul className="mt-1 space-y-1">
                  {report.marketEnvironment?.digitalTrends?.orgChanges?.map((change, idx) => (
                    <li key={idx} className="text-xs text-gray-700 flex items-start">
                      <span className="text-blue-500 mr-1">→</span>{change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 6-7. 마케팅 인사이트 (Pain Point → Opportunity) */}
      <SectionCard id="marketingInsights" title="6. 핵심 마케팅 인사이트" bgColor="from-rose-600 to-pink-600">
        <div className="space-y-6">
          {report.marketingInsights?.map((insight, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-5 py-3">
                <span className="text-sm opacity-80">Insight #{insight.id}</span>
                <h5 className="font-bold text-lg">{insight.title}</h5>
              </div>
              <div className="p-5">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Pain Point */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs mr-2">!</span>
                      <span className="font-semibold text-red-800">{insight.painPoint?.label}</span>
                    </div>
                    <ul className="space-y-1">
                      {insight.painPoint?.details?.map((detail, dIdx) => (
                        <li key={dIdx} className="text-sm text-gray-700 flex items-start">
                          <span className="text-red-400 mr-2">•</span>{detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Opportunity */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs mr-2">★</span>
                      <span className="font-semibold text-green-800">{insight.opportunity?.label}</span>
                    </div>
                    <ul className="space-y-1">
                      {insight.opportunity?.details?.map((detail, dIdx) => (
                        <li key={dIdx} className="text-sm text-gray-700 flex items-start">
                          <span className="text-green-400 mr-2">•</span>{detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 flex items-center">
                  <span className="text-blue-600 font-bold mr-2">ACTION →</span>
                  <span className="text-sm text-gray-700">{insight.action}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 8-12. 실행 전략 (5개 상세) */}
      <SectionCard id="actionStrategies" title="7. 실행 전략 (5대 전략)" bgColor="from-emerald-600 to-teal-600">
        <div className="space-y-4">
          {report.actionStrategies?.map((strategy, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm opacity-80">Strategy #{strategy.id}</span>
                  <h5 className="font-bold">{strategy.title}</h5>
                </div>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{strategy.subtitle}</span>
              </div>
              <div className="p-5">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {strategy.sections?.map((section, sIdx) => (
                    <div key={sIdx} className="bg-gray-50 rounded-lg p-4">
                      <h6 className="font-semibold text-gray-800 mb-2">{section.heading}</h6>
                      <ul className="space-y-1">
                        {section.items?.map((item, iIdx) => (
                          <li key={iIdx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-emerald-500 mr-2">✓</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {strategy.expectedMetrics && strategy.expectedMetrics.length > 0 && (
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <span className="text-xs font-medium text-emerald-700 mb-2 block">예상 성과 지표</span>
                    <div className="flex flex-wrap gap-3">
                      {strategy.expectedMetrics.map((metric, mIdx) => (
                        <div key={mIdx} className="bg-white px-3 py-2 rounded-lg shadow-sm">
                          <div className="text-lg font-bold text-emerald-600">{metric.value}</div>
                          <div className="text-xs text-gray-600">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 13. 90일 액션플랜 */}
      <SectionCard id="actionPlan" title="8. 90일 액션플랜" bgColor="from-amber-600 to-orange-600">
        {/* Key Findings */}
        <div className="bg-amber-50 rounded-lg p-5 mb-6">
          <h5 className="font-semibold text-amber-800 mb-3">Key Findings</h5>
          <div className="grid md:grid-cols-2 gap-2">
            {report.actionPlan?.keyFindings?.map((finding, idx) => (
              <div key={idx} className="flex items-start">
                <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-700">{finding}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <h5 className="font-semibold text-gray-800 mb-4">실행 타임라인</h5>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {report.actionPlan?.timeline?.map((item, idx) => {
              const phaseColors: Record<string, string> = {
                'NOW': 'bg-red-500',
                '30d': 'bg-orange-500',
                '60d': 'bg-yellow-500',
                '90d': 'bg-green-500',
              };
              const phaseBgColors: Record<string, string> = {
                'NOW': 'bg-red-50 border-red-200',
                '30d': 'bg-orange-50 border-orange-200',
                '60d': 'bg-yellow-50 border-yellow-200',
                '90d': 'bg-green-50 border-green-200',
              };
              return (
                <div key={idx} className="flex items-start pl-10 relative">
                  <div className={`absolute left-2 w-5 h-5 rounded-full ${phaseColors[item.phase]} flex items-center justify-center`}>
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div className={`flex-1 rounded-lg p-4 border ${phaseBgColors[item.phase]}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${phaseColors[item.phase]} text-white`}>
                        {item.phase === 'NOW' ? '즉시' : item.phase}
                      </span>
                      <span className="text-xs text-gray-500">{item.category}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* 14. 종합 결론 */}
      <SectionCard id="conclusion" title="9. 종합 결론" bgColor="from-gray-800 to-gray-900">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 mb-4">
          <p className="text-gray-800 text-lg leading-relaxed">{report.conclusion?.summary}</p>
        </div>

        <h5 className="font-semibold text-gray-800 mb-3">핵심 추천 사항</h5>
        <div className="grid md:grid-cols-2 gap-3">
          {report.conclusion?.recommendations?.map((rec, idx) => (
            <div key={idx} className="flex items-start bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
              <span className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-gray-700">{rec}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 버튼 영역 */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
        >
          ← 분석 단계로 돌아가기
        </button>
        <button
          onClick={onRegenerate}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          리포트 재생성
        </button>
        <button
          onClick={onPptDownload}
          disabled={pptLoading}
          className={`px-6 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            pptLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          PPT 다운로드
        </button>
      </div>
    </div>
  );
};

// ===== 메인 페이지 컴포넌트 =====
export default function IntegratedAnalysisPage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);
  const [analysisState, setAnalysisState] = useState<IntegratedAnalysisState>(initialAnalysisState);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pptLoading, setPptLoading] = useState(false);

  // 상태 업데이트 헬퍼
  const updateState = (updates: Partial<IntegratedAnalysisState>) => {
    setAnalysisState((prev) => ({ ...prev, ...updates }));
  };

  // 특정 단계 이후의 모든 데이터를 리셋하는 함수
  const resetFromStep = (fromStep: WizardStep) => {
    setCompletedSteps((prev) => prev.filter((s) => s < fromStep));

    // 각 단계별 데이터 리셋
    if (fromStep <= 2) {
      updateState({ keywordExpansion: null, keywordExpansionGPTAnalysis: null });
    }
    if (fromStep <= 3) {
      updateState({
        contentAnalysis: { blog: null, cafe: null, youtube: null, news: null },
      });
    }
    if (fromStep <= 4) {
      updateState({ adAnalysis: null, adText: '', skipAdAnalysis: false });
      setSelectedFile(null);
    }
    if (fromStep <= 5) {
      updateState({ integratedReport: null });
    }
  };

  // 키워드 변경 핸들러 (변경 시 하위 단계 리셋)
  const handleKeywordChange = (newKeyword: string) => {
    // 기존 키워드가 있고 새 키워드와 다르면 하위 단계 리셋
    if (analysisState.keyword !== '' && newKeyword !== analysisState.keyword) {
      resetFromStep(2);
    }
    updateState({ keyword: newKeyword });
  };

  // 단계 표시기 클릭 핸들러
  const handleStepClick = (step: WizardStep) => {
    // 클릭 가능 조건: 완료된 단계 또는 현재 단계
    const canNavigate = completedSteps.includes(step) || step === currentStep;
    if (canNavigate) {
      setCurrentStep(step);
    }
  };

  // Step 2: 키워드 확장 분석
  const handleKeywordExpansion = async () => {
    updateState({ keywordExpansionLoading: true });
    try {
      const response = await axios.post('/api/keyword-expansion', {
        keyword: analysisState.keyword,
      });
      const keywordExpansionData = response.data.data;
      updateState({
        keywordExpansion: keywordExpansionData,
        keywordExpansionLoading: false,
      });
      // GPT 분석 자동 호출
      await handleKeywordExpansionGPTAnalysis(keywordExpansionData);
    } catch (err) {
      console.error('키워드 확장 오류:', err);
      setError('키워드 확장 분석 중 오류가 발생했습니다.');
      updateState({ keywordExpansionLoading: false });
    }
  };

  // Step 2: 키워드 확장 GPT 분석
  const handleKeywordExpansionGPTAnalysis = async (keywordExpansion: KeywordExpansionResult) => {
    updateState({ keywordExpansionGPTLoading: true });
    try {
      const response = await axios.post('/api/keyword-expansion-analysis', {
        keyword: analysisState.keyword,
        keywordExpansion,
      });
      updateState({
        keywordExpansionGPTAnalysis: response.data.analysis,
        keywordExpansionGPTLoading: false,
      });
    } catch (err) {
      console.error('키워드 확장 GPT 분석 오류:', err);
      // GPT 분석 실패해도 진행 가능하도록 에러만 로그
      updateState({ keywordExpansionGPTLoading: false });
    }
  };

  // Step 3: 콘텐츠 분석
  const handleContentAnalysis = async () => {
    const loadingState = { blog: false, cafe: false, youtube: false, news: false };
    analysisState.selectedChannels.forEach((ch) => {
      loadingState[ch] = true;
    });
    updateState({ contentAnalysisLoading: loadingState });

    // 선택된 채널별로 병렬 분석
    const promises = analysisState.selectedChannels.map(async (channel) => {
      try {
        const response = await axios.post('/api/keyword-analysis', {
          keyword: analysisState.keyword,
          contentType: channel,
        });
        return { channel, data: response.data as KeywordAnalysisResult };
      } catch (err) {
        console.error(`${channel} 분석 오류:`, err);
        return { channel, data: null };
      }
    });

    const results = await Promise.all(promises);

    const newContentAnalysis = { ...analysisState.contentAnalysis };
    const newLoading = { blog: false, cafe: false, youtube: false, news: false };

    results.forEach(({ channel, data }) => {
      newContentAnalysis[channel] = data;
      newLoading[channel] = false;
    });

    updateState({
      contentAnalysis: newContentAnalysis,
      contentAnalysisLoading: newLoading,
    });
  };

  // Step 4: 광고 분석
  const handleAdAnalysis = async () => {
    if (!analysisState.companyName) {
      setError('광고 분석을 위해 업체명을 입력해주세요.');
      return;
    }

    updateState({ adAnalysisLoading: true });

    try {
      const formData = new FormData();
      formData.append('keyword', analysisState.keyword);
      formData.append('companyName', analysisState.companyName);
      formData.append('inputMode', analysisState.adInputMode);

      if (analysisState.adInputMode === 'text') {
        formData.append('adText', analysisState.adText);
      } else if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const response = await axios.post('/api/ad-analysis', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateState({
        adAnalysis: response.data,
        adAnalysisLoading: false,
      });
    } catch (err) {
      console.error('광고 분석 오류:', err);
      setError('광고 분석 중 오류가 발생했습니다.');
      updateState({ adAnalysisLoading: false });
    }
  };

  // 종합 리포트 생성
  const handleGenerateReport = async () => {
    updateState({ reportLoading: true });
    setError(null);

    // Step 4 완료 처리 (광고 분석 완료 또는 건너뛰기한 경우)
    if (!completedSteps.includes(4)) {
      setCompletedSteps((prev) => [...prev, 4]);
    }

    try {
      const requestData = {
        keyword: analysisState.keyword,
        companyName: analysisState.companyName || undefined,
        keywordExpansion: analysisState.keywordExpansion,
        contentAnalysis: {
          blog: analysisState.contentAnalysis.blog || undefined,
          cafe: analysisState.contentAnalysis.cafe || undefined,
          youtube: analysisState.contentAnalysis.youtube || undefined,
          news: analysisState.contentAnalysis.news || undefined,
        },
        adAnalysis: analysisState.adAnalysis || undefined,
      };

      const response = await axios.post('/api/integrated-report', requestData);

      updateState({
        integratedReport: response.data.report,
        reportLoading: false,
      });
      // Step 5 완료 처리 및 이동
      if (!completedSteps.includes(5)) {
        setCompletedSteps((prev) => [...prev, 5]);
      }
      setCurrentStep(5);
    } catch (err) {
      console.error('리포트 생성 오류:', err);
      setError('종합 리포트 생성 중 오류가 발생했습니다.');
      updateState({ reportLoading: false });
    }
  };

  // 단계 이동
  const goToStep = (step: WizardStep) => {
    if (!completedSteps.includes(currentStep) && step > currentStep) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }
    setCurrentStep(step);
  };

  // 채널 토글
  const handleChannelToggle = (channel: ContentType) => {
    const newChannels = analysisState.selectedChannels.includes(channel)
      ? analysisState.selectedChannels.filter((c) => c !== channel)
      : [...analysisState.selectedChannels, channel];
    updateState({ selectedChannels: newChannels });
  };

  // 단계별 재분석 핸들러
  const handleReanalyzeStep2 = () => {
    resetFromStep(2);
    handleKeywordExpansion();
  };

  const handleReanalyzeStep3 = () => {
    resetFromStep(3);
    handleContentAnalysis();
  };

  const handleReanalyzeStep4 = () => {
    resetFromStep(4);
    // 광고 입력 UI로 돌아감 (사용자가 다시 입력 후 분석)
  };

  const handleRegenerateReport = () => {
    updateState({ integratedReport: null });
    handleGenerateReport();
  };

  // PPT 다운로드 핸들러
  const handlePptDownload = async () => {
    if (!analysisState.integratedReport) return;
    setPptLoading(true);
    try {
      const response = await fetch('/api/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: analysisState.integratedReport }),
      });

      if (!response.ok) throw new Error('PPT 생성 실패');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${analysisState.integratedReport.keyword}_마케팅분석리포트.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('PPT 다운로드 오류:', err);
      alert('PPT 다운로드 중 오류가 발생했습니다.');
    } finally {
      setPptLoading(false);
    }
  };

  // 로딩 모달 메시지 결정
  const isAnyContentLoading = Object.values(analysisState.contentAnalysisLoading).some(Boolean);
  const currentLoadingMessage =
    analysisState.keywordExpansionLoading ? '연관 키워드를 분석 중입니다...' :
    analysisState.keywordExpansionGPTLoading ? 'AI가 키워드 데이터를 분석 중입니다...' :
    isAnyContentLoading ? '채널별 콘텐츠를 분석 중입니다...' :
    analysisState.adAnalysisLoading ? '광고를 분석 중입니다...' :
    analysisState.reportLoading ? '종합 리포트를 생성 중입니다...' :
    pptLoading ? 'PPT를 생성 중입니다...' : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>키워드 통합 분석 | GPTKOREA 키워드 분석 서비스</title>
        <meta name="description" content="키워드 분석, 콘텐츠 분석, 광고 분석을 통합하여 종합 마케팅 리포트를 제공합니다." />
      </Head>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 pt-20">
        {/* 헤더 */}
        <div className="text-left mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">키워드 통합 분석</h1>
          <p className="text-sm text-gray-500">키워드 분석 및 마케팅 전략을 포함한 종합 리포트 생성</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="text-sm text-red-500 underline mt-1">
              닫기
            </button>
          </div>
        )}

        {/* 메인 컨텐츠 */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {/* 단계 표시기 */}
          <StepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />

          {/* Step 5: 종합 리포트 */}
          {currentStep === 5 && analysisState.integratedReport ? (
            <IntegratedReport
              report={analysisState.integratedReport}
              onBack={() => setCurrentStep(4)}
              onRegenerate={handleRegenerateReport}
              pptLoading={pptLoading}
              onPptDownload={handlePptDownload}
            />
          ) : currentStep === 5 && !analysisState.integratedReport ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">리포트가 아직 생성되지 않았습니다.</p>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                이전 단계로 돌아가기
              </button>
            </div>
          ) : (
            <>

            {/* 단계별 컨텐츠 */}
            {currentStep === 1 && (
              <Step1KeywordInput
                keyword={analysisState.keyword}
                companyName={analysisState.companyName}
                onKeywordChange={handleKeywordChange}
                onCompanyNameChange={(v) => updateState({ companyName: v })}
                onNext={() => goToStep(2)}
              />
            )}

            {currentStep === 2 && (
              <Step2KeywordExpansion
                keyword={analysisState.keyword}
                keywordExpansion={analysisState.keywordExpansion}
                keywordExpansionGPTAnalysis={analysisState.keywordExpansionGPTAnalysis}
                loading={analysisState.keywordExpansionLoading}
                gptLoading={analysisState.keywordExpansionGPTLoading}
                onAnalyze={handleKeywordExpansion}
                onReanalyze={handleReanalyzeStep2}
                onPrev={() => goToStep(1)}
                onNext={() => goToStep(3)}
              />
            )}

            {currentStep === 3 && (
              <Step3ContentAnalysis
                keyword={analysisState.keyword}
                selectedChannels={analysisState.selectedChannels}
                contentAnalysis={analysisState.contentAnalysis}
                contentAnalysisLoading={analysisState.contentAnalysisLoading}
                onChannelToggle={handleChannelToggle}
                onAnalyze={handleContentAnalysis}
                onReanalyze={handleReanalyzeStep3}
                onPrev={() => goToStep(2)}
                onNext={() => goToStep(4)}
              />
            )}

            {currentStep === 4 && (
              <Step4AdAnalysis
                keyword={analysisState.keyword}
                companyName={analysisState.companyName}
                adAnalysis={analysisState.adAnalysis}
                loading={analysisState.adAnalysisLoading}
                adInputMode={analysisState.adInputMode}
                adText={analysisState.adText}
                onInputModeChange={(mode) => updateState({ adInputMode: mode })}
                onAdTextChange={(text) => updateState({ adText: text })}
                onFileChange={(file) => setSelectedFile(file)}
                onAnalyze={handleAdAnalysis}
                onReanalyze={handleReanalyzeStep4}
                onSkip={() => {
                  updateState({ skipAdAnalysis: true });
                  if (!completedSteps.includes(4)) {
                    setCompletedSteps((prev) => [...prev, 4]);
                  }
                }}
                onPrev={() => goToStep(3)}
              />
            )}

            {/* 종합 리포트 생성 버튼 */}
            {(completedSteps.includes(3) || (currentStep === 4 && (analysisState.adAnalysis || analysisState.skipAdAnalysis))) && (
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <button
                  onClick={handleGenerateReport}
                  disabled={analysisState.reportLoading}
                  className={`px-10 py-4 text-lg font-bold rounded-xl shadow-lg transition-all ${
                    analysisState.reportLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105'
                  }`}
                >
                  종합 리포트 생성
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  수집된 모든 데이터를 기반으로 종합 마케팅 리포트를 생성합니다.
                </p>
              </div>
            )}
            </>
          )}
        </div>
      </main>

      {/* 로딩 모달 */}
      <LoadingModal isOpen={!!currentLoadingMessage} message={currentLoadingMessage} />

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p>© 2025 GPTKOREA 키워드 분석 서비스. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
