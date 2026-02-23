import React, { useState, useMemo } from 'react';
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
  ShoppingSearchAnalysisResult,
  BrandComparisonResult,
  BrandKeywordFilter,
  ContentType,
  WizardStep,
  KeywordType,
  initialAnalysisState,
  channelNames,
  getStepInfo,
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
  keywordType: KeywordType;
  onStepClick: (step: WizardStep) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, completedSteps, keywordType, onStepClick }) => {
  const stepInfoList = useMemo(() => getStepInfo(keywordType), [keywordType]);

  return (
    <div className="flex items-center justify-center mb-8">
      {stepInfoList.map((info, index) => {
        const isCompleted = completedSteps.includes(info.step);
        const isCurrent = currentStep === info.step;
        const isLast = index === stepInfoList.length - 1;
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
  keywordType: KeywordType;
  companyName: string;
  competitorBrands: string[];
  onKeywordChange: (value: string) => void;
  onKeywordTypeChange: (type: KeywordType) => void;
  onCompanyNameChange: (value: string) => void;
  onCompetitorBrandsChange: (brands: string[]) => void;
  onNext: () => void;
}

const keywordTypeInfo: Record<KeywordType, { label: string; description: string; icon: string }> = {
  general: { label: '일반 키워드', description: '제품, 서비스, 일반 검색어', icon: '🔍' },
  shopping: { label: '쇼핑 키워드', description: '상품, 구매 관련 키워드', icon: '🛒' },
  brand: { label: '브랜드 키워드', description: '자사/경쟁사 브랜드 비교', icon: '🏢' },
};

const Step1KeywordInput: React.FC<Step1Props> = ({
  keyword,
  keywordType,
  companyName,
  competitorBrands,
  onKeywordChange,
  onKeywordTypeChange,
  onCompanyNameChange,
  onCompetitorBrandsChange,
  onNext,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleAddCompetitor = () => {
    if (competitorBrands.length < 3) {
      onCompetitorBrandsChange([...competitorBrands, '']);
    }
  };

  const handleRemoveCompetitor = (index: number) => {
    const newBrands = competitorBrands.filter((_, i) => i !== index);
    onCompetitorBrandsChange(newBrands);
  };

  const handleCompetitorChange = (index: number, value: string) => {
    const newBrands = [...competitorBrands];
    newBrands[index] = value;
    onCompetitorBrandsChange(newBrands);
  };

  const handleNext = () => {
    if (!keyword.trim()) {
      setError(keywordType === 'brand' ? '자사 브랜드 키워드를 입력해주세요.' : '분석할 키워드를 입력해주세요.');
      return;
    }
    if (keywordType === 'brand') {
      const validCompetitors = competitorBrands.filter(b => b.trim());
      if (validCompetitors.length === 0) {
        setError('최소 1개의 경쟁사 브랜드 키워드를 입력해주세요.');
        return;
      }
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
        {/* 키워드 유형 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            키워드 유형 선택 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(keywordTypeInfo) as KeywordType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onKeywordTypeChange(type)}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  keywordType === type
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-1">{keywordTypeInfo[type].icon}</div>
                <div className={`text-sm font-semibold ${keywordType === type ? 'text-blue-700' : 'text-gray-700'}`}>
                  {keywordTypeInfo[type].label}
                </div>
                <div className="text-xs text-gray-500 mt-1">{keywordTypeInfo[type].description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 키워드 입력 (일반/쇼핑) 또는 자사 브랜드 (브랜드) */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
            {keywordType === 'brand' ? '자사 브랜드 키워드' : '분석 키워드'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder={keywordType === 'brand' ? '예: 삼성전자, 현대자동차' : '예: 자동차보험, 다이어트 도시락'}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
          />
        </div>

        {/* 브랜드 유형: 경쟁사 브랜드 입력 */}
        {keywordType === 'brand' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                경쟁사 브랜드 키워드 <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(최소 1개, 최대 3개)</span>
              </label>
              {competitorBrands.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddCompetitor}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  경쟁사 추가
                </button>
              )}
            </div>
            {competitorBrands.length === 0 && (
              <button
                type="button"
                onClick={handleAddCompetitor}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                + 경쟁사 브랜드 추가
              </button>
            )}
            {competitorBrands.map((brand, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => handleCompetitorChange(index, e.target.value)}
                  placeholder={`경쟁사 ${index + 1} 브랜드 키워드`}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCompetitor(index)}
                  className="px-3 text-gray-400 hover:text-red-500 transition-colors"
                  title="삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 업체명 (일반/쇼핑 유형만 표시) */}
        {keywordType !== 'brand' && (
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
        )}

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

              {/* AI 분석에 사용된 상위 20개 키워드 */}
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <div className="text-xs font-semibold text-indigo-700 mb-2">📊 AI 분석에 사용된 상위 20개 키워드 (검색량 기준)</div>
                <div className="flex flex-wrap gap-1.5">
                  {[...keywordExpansion.keywordList]
                    .sort((a, b) => {
                      const volA = (a.monthlyPcQcCnt === '< 10' ? 5 : parseInt(a.monthlyPcQcCnt) || 0)
                                 + (a.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(a.monthlyMobileQcCnt) || 0);
                      const volB = (b.monthlyPcQcCnt === '< 10' ? 5 : parseInt(b.monthlyPcQcCnt) || 0)
                                 + (b.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(b.monthlyMobileQcCnt) || 0);
                      return volB - volA;
                    })
                    .slice(0, 20)
                    .map((kw, idx) => {
                      const vol = (kw.monthlyPcQcCnt === '< 10' ? 5 : parseInt(kw.monthlyPcQcCnt) || 0)
                                + (kw.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(kw.monthlyMobileQcCnt) || 0);
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 bg-white border border-indigo-200 rounded text-xs text-gray-700"
                        >
                          <span className="text-indigo-500 font-semibold mr-1">{idx + 1}.</span>
                          {kw.relKeyword}
                          <span className="ml-1 text-gray-400">({vol.toLocaleString()})</span>
                        </span>
                      );
                    })}
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

// ===== 브랜드 키워드 필터 유틸리티 =====
const applyBrandKeywordFilter = (
  keywordList: KeywordExpansionData[],
  filter: BrandKeywordFilter | undefined
): KeywordExpansionData[] => {
  if (!filter || !filter.isEnabled || !filter.filterText.trim()) return keywordList;
  const filterLower = filter.filterText.trim().toLowerCase();
  return keywordList.filter(kw => kw.relKeyword.toLowerCase().includes(filterLower));
};

// ===== Step 2: 브랜드별 키워드 확장 (브랜드 유형용) =====
interface Step2BrandProps {
  ownBrand: string;
  competitorBrands: string[];
  brandComparison: BrandComparisonResult | null;
  loading: boolean;
  brandKeywordFilters: BrandKeywordFilter[];
  onFilterChange: (brand: string, text: string) => void;
  onFilterToggle: (brand: string, enabled: boolean) => void;
  onAnalyze: () => void;
  onReanalyze: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const Step2BrandComparison: React.FC<Step2BrandProps> = ({
  ownBrand,
  competitorBrands,
  brandComparison,
  loading,
  brandKeywordFilters,
  onFilterChange,
  onFilterToggle,
  onAnalyze,
  onReanalyze,
  onPrev,
  onNext,
}) => {
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  const validCompetitors = competitorBrands.filter(b => b.trim());
  const allBrands = [ownBrand, ...validCompetitors];

  const getBrandData = (brandKeyword: string) => {
    if (!brandComparison) return null;
    if (brandComparison.ownBrand.brandKeyword === brandKeyword) {
      return brandComparison.ownBrand;
    }
    return brandComparison.competitors.find(c => c.brandKeyword === brandKeyword);
  };

  const getFilterForBrand = (brandKeyword: string) =>
    brandKeywordFilters.find(f => f.brandKeyword === brandKeyword);

  const getFilteredKeywordList = (brandKeyword: string) => {
    const data = getBrandData(brandKeyword);
    if (!data?.keywordExpansion?.keywordList) return [];
    return applyBrandKeywordFilter(data.keywordExpansion.keywordList, getFilterForBrand(brandKeyword));
  };

  const calculateTotalVolume = (keywordList: KeywordExpansionData[]) => {
    return keywordList.reduce((sum, kw) => {
      const pc = kw.monthlyPcQcCnt === '< 10' ? 5 : parseInt(kw.monthlyPcQcCnt) || 0;
      const mobile = kw.monthlyMobileQcCnt === '< 10' ? 5 : parseInt(kw.monthlyMobileQcCnt) || 0;
      return sum + pc + mobile;
    }, 0);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">브랜드별 키워드 확장 분석</h2>
        <p className="text-gray-600">자사 브랜드와 경쟁사 브랜드의 연관 키워드를 비교 분석합니다.</p>
      </div>

      {!brandComparison && !loading && (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg mb-4">
              <span className="text-blue-600 font-semibold">자사:</span>
              <span className="text-gray-800">{ownBrand}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {validCompetitors.map((brand, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-700">
                  경쟁사 {idx + 1}: {brand}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onAnalyze}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-lg"
          >
            브랜드별 키워드 확장 분석 시작
          </button>
        </div>
      )}

      {brandComparison && !loading && (
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

          {/* 브랜드 키워드 필터 컨트롤 */}
          {brandKeywordFilters.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-700">브랜드 키워드 필터</h3>
                <span className="text-xs text-gray-400 ml-1">브랜드명을 포함하는 키워드만 표시합니다</span>
              </div>
              <div className="space-y-2">
                {brandKeywordFilters.map((filter, idx) => {
                  const totalCount = getBrandData(filter.brandKeyword)?.keywordExpansion?.keywordList?.length || 0;
                  const filteredCount = getFilteredKeywordList(filter.brandKeyword).length;
                  const isOwn = idx === 0;
                  return (
                    <div key={filter.brandKeyword} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filter.isEnabled}
                          onChange={(e) => onFilterToggle(filter.brandKeyword, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className={`text-sm font-medium min-w-[60px] ${isOwn ? 'text-blue-600' : 'text-gray-700'}`}>
                          {isOwn ? '자사' : `경쟁${idx}`}:
                        </span>
                      </label>
                      <input
                        type="text"
                        value={filter.filterText}
                        onChange={(e) => onFilterChange(filter.brandKeyword, e.target.value)}
                        disabled={!filter.isEnabled}
                        className={`flex-1 max-w-[200px] px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          filter.isEnabled ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}
                        placeholder="필터 텍스트"
                      />
                      <span className="text-xs text-gray-500 min-w-[80px]">
                        {filter.isEnabled ? (
                          <><span className="font-semibold text-blue-600">{filteredCount}</span> / {totalCount}개</>
                        ) : (
                          <><span className="font-semibold">{totalCount}</span>개 (전체)</>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 브랜드 비교 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {allBrands.map((brand, idx) => {
              const isOwn = idx === 0;
              const filteredList = getFilteredKeywordList(brand);
              const totalVolume = calculateTotalVolume(filteredList);
              const keywordCount = filteredList.length;

              return (
                <div
                  key={brand}
                  className={`rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                    isOwn
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${expandedBrand === brand ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => setExpandedBrand(expandedBrand === brand ? null : brand)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isOwn && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded">자사</span>
                      )}
                      <span className={`font-semibold ${isOwn ? 'text-blue-800' : 'text-gray-800'}`}>
                        {brand}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedBrand === brand ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-white rounded-lg">
                      <div className="text-lg font-bold text-indigo-600">{keywordCount}</div>
                      <div className="text-xs text-gray-500">연관 키워드</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg">
                      <div className="text-lg font-bold text-emerald-600">{totalVolume.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">총 검색량</div>
                    </div>
                  </div>

                  {!getBrandData(brand)?.keywordExpansion && (
                    <div className="mt-3 text-center text-sm text-red-500">분석 실패</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 선택된 브랜드의 상세 키워드 목록 */}
          {expandedBrand && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                "{expandedBrand}" 연관 키워드
                {getFilterForBrand(expandedBrand)?.isEnabled && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (필터 적용: "{getFilterForBrand(expandedBrand)?.filterText}" 포함)
                  </span>
                )}
              </h3>
              {getFilteredKeywordList(expandedBrand).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">키워드</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">PC검색량</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">모바일검색량</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">경쟁도</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getFilteredKeywordList(expandedBrand).slice(0, 30).map((kw, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-800">{kw.relKeyword}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-600">
                            {kw.monthlyPcQcCnt === '< 10' ? '10 미만' : parseInt(kw.monthlyPcQcCnt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-600">
                            {kw.monthlyMobileQcCnt === '< 10' ? '10 미만' : parseInt(kw.monthlyMobileQcCnt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              kw.compIdx === '높음' ? 'bg-red-100 text-red-700' :
                              kw.compIdx === '중간' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {kw.compIdx}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {getFilterForBrand(expandedBrand)?.isEnabled
                    ? `"${getFilterForBrand(expandedBrand)?.filterText}" 포함 키워드가 없습니다. 필터를 해제하거나 텍스트를 수정해보세요.`
                    : '키워드 데이터가 없습니다.'}
                </p>
              )}
            </div>
          )}

          {/* 브랜드 검색량 비교 차트 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-4">
              브랜드별 총 검색량 비교
              {brandKeywordFilters.some(f => f.isEnabled) && (
                <span className="text-sm font-normal text-gray-500 ml-2">(필터 적용)</span>
              )}
            </h3>
            <div className="space-y-3">
              {allBrands.map((brand, idx) => {
                const filteredList = getFilteredKeywordList(brand);
                const totalVolume = calculateTotalVolume(filteredList);
                const maxVolume = Math.max(...allBrands.map(b => calculateTotalVolume(getFilteredKeywordList(b))));
                const percentage = maxVolume > 0 ? (totalVolume / maxVolume) * 100 : 0;
                const isOwn = idx === 0;

                return (
                  <div key={brand} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium text-gray-700 truncate" title={brand}>
                      {isOwn && <span className="text-blue-600">●</span>} {brand}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOwn ? 'bg-blue-500' : 'bg-gray-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-sm font-semibold text-gray-700">
                      {totalVolume.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
          disabled={!brandComparison}
          className={`px-8 py-3 font-semibold rounded-lg shadow-md transition-all ${
            brandComparison
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

// ===== 공유 헬퍼 함수 =====
const renderSentimentBar = (sentiment: { positive: number; negative: number; neutral: number }) => (
  <div className="flex h-4 rounded-full overflow-hidden bg-gray-200">
    <div className="bg-green-500" style={{ width: `${sentiment.positive}%` }} />
    <div className="bg-gray-400" style={{ width: `${sentiment.neutral}%` }} />
    <div className="bg-red-500" style={{ width: `${sentiment.negative}%` }} />
  </div>
);

const categorizeDateRanges = (contentItems: Array<{ title: string; link: string; description: string; sentiment?: 'positive' | 'negative' | 'neutral'; score?: number; publishedAt?: string }>) => {
  if (!contentItems || contentItems.length === 0) {
    return { threeMonths: [] as typeof contentItems, oneYear: [] as typeof contentItems, twoYears: [] as typeof contentItems, older: [] as typeof contentItems, noDate: [] as typeof contentItems };
  }

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

  const categorized = {
    threeMonths: [] as typeof contentItems,
    oneYear: [] as typeof contentItems,
    twoYears: [] as typeof contentItems,
    older: [] as typeof contentItems,
    noDate: [] as typeof contentItems,
  };

  contentItems.forEach(item => {
    if (!item.publishedAt) {
      categorized.noDate.push(item);
      return;
    }
    try {
      const publishDate = new Date(item.publishedAt);
      if (publishDate > threeMonthsAgo) {
        categorized.threeMonths.push(item);
      } else if (publishDate > oneYearAgo) {
        categorized.oneYear.push(item);
      } else if (publishDate > twoYearsAgo) {
        categorized.twoYears.push(item);
      } else {
        categorized.older.push(item);
      }
    } catch (e) {
      categorized.noDate.push(item);
    }
  });

  return categorized;
};

const getDateAnalysisChartData = (contentItems: Array<{ publishedAt?: string }>) => {
  const categorized = categorizeDateRanges(contentItems as any);
  return {
    threeMonths: categorized.threeMonths.length,
    oneYear: categorized.oneYear.length,
    twoYears: categorized.twoYears.length,
    older: categorized.older.length,
  };
};

// ===== 도넛 차트 컴포넌트 (긍부정평가용) =====
const DonutChart = ({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) => {
  const total = positive + negative + neutral;
  const positivePercent = Math.round((positive / total) * 100) || 0;
  const negativePercent = Math.round((negative / total) * 100) || 0;
  const neutralPercent = Math.round((neutral / total) * 100) || 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="15.91549430918954"
            fill="transparent" stroke="#4ade80" strokeWidth="3"
            strokeDasharray={`${positivePercent} ${100-positivePercent}`}
            strokeDashoffset={25}
            className="transition-all duration-1000 ease-out"
          />
          {negativePercent > 0 && (
            <circle
              cx="18" cy="18" r="15.91549430918954"
              fill="transparent" stroke="#f87171" strokeWidth="3"
              strokeDasharray={`${negativePercent} ${100-negativePercent}`}
              strokeDashoffset={25 - positivePercent}
              className="transition-all duration-1000 ease-out"
            />
          )}
          {neutralPercent > 0 && (
            <circle
              cx="18" cy="18" r="15.91549430918954"
              fill="transparent" stroke="#9ca3af" strokeWidth="3"
              strokeDasharray={`${neutralPercent} ${100-neutralPercent}`}
              strokeDashoffset={25 - (positivePercent + negativePercent)}
              className="transition-all duration-1000 ease-out"
            />
          )}
          <g className="chart-text">
            <text x="18" y="16" textAnchor="middle" alignmentBaseline="central" fontSize="5" fontWeight="bold">
              {positivePercent}%
            </text>
            <text x="18" y="21" textAnchor="middle" alignmentBaseline="central" fontSize="2.5">
              긍정적
            </text>
          </g>
        </svg>
      </div>
      <div className="flex flex-wrap justify-center mt-4 gap-4">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-400 rounded-full mr-2"></div>
          <span className="text-sm">긍정 {positivePercent}%</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-400 rounded-full mr-2"></div>
          <span className="text-sm">부정 {negativePercent}%</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-400 rounded-full mr-2"></div>
          <span className="text-sm">중립 {neutralPercent}%</span>
        </div>
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

  const getDateCategoryColor = (category: string) => {
    switch (category) {
      case 'threeMonths': return { bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-500' };
      case 'oneYear': return { bg: 'bg-green-100', text: 'text-green-600', bar: 'bg-green-500' };
      case 'twoYears': return { bg: 'bg-yellow-100', text: 'text-yellow-600', bar: 'bg-yellow-500' };
      case 'older': return { bg: 'bg-red-100', text: 'text-red-600', bar: 'bg-red-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', bar: 'bg-gray-500' };
    }
  };

  const getDateCategoryName = (category: string) => {
    switch (category) {
      case 'threeMonths': return '최근 3개월 이내';
      case 'oneYear': return '3개월~1년 이내';
      case 'twoYears': return '1년~2년 이내';
      case 'older': return '2년 이상 전';
      case 'noDate': return '날짜 정보 없음';
      default: return '';
    }
  };

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

              {/* 감성 키워드 분석 */}
              {getChannelResult(activeTab)?.sentiment && (
                getChannelResult(activeTab)!.sentiment!.positiveKeywords?.length > 0 ||
                getChannelResult(activeTab)!.sentiment!.negativeKeywords?.length > 0
              ) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">감성 키워드 분석</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 긍정 키워드 */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        긍정 키워드
                      </h4>
                      <div className="space-y-2">
                        {getChannelResult(activeTab)!.sentiment!.positiveKeywords?.slice(0, 5).map((kw, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{kw.keyword}</span>
                            <span className="text-green-600 font-medium">{kw.score}/10</span>
                          </div>
                        ))}
                        {(!getChannelResult(activeTab)!.sentiment!.positiveKeywords ||
                          getChannelResult(activeTab)!.sentiment!.positiveKeywords.length === 0) && (
                          <p className="text-sm text-gray-400">긍정 키워드 없음</p>
                        )}
                      </div>
                    </div>
                    {/* 부정 키워드 */}
                    <div className="bg-red-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        부정 키워드
                      </h4>
                      <div className="space-y-2">
                        {getChannelResult(activeTab)!.sentiment!.negativeKeywords?.slice(0, 5).map((kw, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{kw.keyword}</span>
                            <span className="text-red-600 font-medium">{kw.score}/10</span>
                          </div>
                        ))}
                        {(!getChannelResult(activeTab)!.sentiment!.negativeKeywords ||
                          getChannelResult(activeTab)!.sentiment!.negativeKeywords.length === 0) && (
                          <p className="text-sm text-gray-400">부정 키워드 없음</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 긍부정평가 */}
              {getChannelResult(activeTab)?.contentItems && getChannelResult(activeTab)!.contentItems!.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">긍부정평가</h3>

                  {/* DonutChart 요약 */}
                  <div className="bg-white border border-gray-100 rounded-lg p-6 mb-6 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-4 text-center">긍부정 분석 요약</h4>
                    {(() => {
                      const items = getChannelResult(activeTab)!.contentItems!;
                      const pos = items.filter(i => i.sentiment === 'positive').length;
                      const neg = items.filter(i => i.sentiment === 'negative').length;
                      const neu = items.filter(i => i.sentiment === 'neutral').length;
                      const total = items.length;
                      const posPercent = Math.round((pos / total) * 100);
                      const negPercent = Math.round((neg / total) * 100);
                      const neuPercent = 100 - posPercent - negPercent;

                      return (
                        <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                          <DonutChart positive={pos} negative={neg} neutral={neu} />
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{pos}</div>
                                <div className="text-xs text-gray-600">긍정 콘텐츠</div>
                                <div className="text-sm font-medium text-green-600">{posPercent}%</div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-2xl font-bold text-gray-600">{neu}</div>
                                <div className="text-xs text-gray-600">중립 콘텐츠</div>
                                <div className="text-sm font-medium text-gray-600">{neuPercent}%</div>
                              </div>
                              <div className="bg-red-50 p-3 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{neg}</div>
                                <div className="text-xs text-gray-600">부정 콘텐츠</div>
                                <div className="text-sm font-medium text-red-600">{negPercent}%</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 text-center md:text-left">
                              총 {total}개 콘텐츠 중 긍정적 콘텐츠가 {posPercent}%를 차지합니다.
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 범례 */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">총 {getChannelResult(activeTab)!.contentItems!.length}개 콘텐츠 분석 결과</span>
                    </div>
                    <div className="flex space-x-3">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-400 rounded-full mr-1"></div>
                        <span className="text-xs text-gray-600">긍정</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-400 rounded-full mr-1"></div>
                        <span className="text-xs text-gray-600">중립</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-400 rounded-full mr-1"></div>
                        <span className="text-xs text-gray-600">부정</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 작성일 기준 분석 */}
              {getChannelResult(activeTab)?.contentItems && getChannelResult(activeTab)!.contentItems!.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">작성일 기준 분석</h3>

                  {(() => {
                    const items = getChannelResult(activeTab)!.contentItems!;
                    const dateData = getDateAnalysisChartData(items);
                    const total = dateData.threeMonths + dateData.oneYear + dateData.twoYears + dateData.older;

                    if (total === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-gray-500">작성일 정보가 있는 콘텐츠가 없습니다.</p>
                        </div>
                      );
                    }

                    const threeMonthsPercent = Math.round((dateData.threeMonths / total) * 100);
                    const oneYearPercent = Math.round((dateData.oneYear / total) * 100);
                    const twoYearsPercent = Math.round((dateData.twoYears / total) * 100);
                    const olderPercent = Math.round((dateData.older / total) * 100);

                    return (
                      <div>
                        {/* 작성일 분포 요약 */}
                        <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
                          <h4 className="font-semibold text-gray-800 mb-4 text-center">작성일 분포</h4>
                          <div className="w-full bg-gray-200 rounded-full h-6 mb-6 overflow-hidden">
                            {dateData.threeMonths > 0 && (
                              <div
                                className="bg-blue-500 h-6 float-left text-xs font-medium text-blue-100 text-center p-1 leading-none"
                                style={{ width: `${threeMonthsPercent}%` }}
                              >
                                {threeMonthsPercent}%
                              </div>
                            )}
                            {dateData.oneYear > 0 && (
                              <div
                                className="bg-green-500 h-6 float-left text-xs font-medium text-green-100 text-center p-1 leading-none"
                                style={{ width: `${oneYearPercent}%` }}
                              >
                                {oneYearPercent}%
                              </div>
                            )}
                            {dateData.twoYears > 0 && (
                              <div
                                className="bg-yellow-500 h-6 float-left text-xs font-medium text-yellow-100 text-center p-1 leading-none"
                                style={{ width: `${twoYearsPercent}%` }}
                              >
                                {twoYearsPercent}%
                              </div>
                            )}
                            {dateData.older > 0 && (
                              <div
                                className="bg-red-500 h-6 float-left text-xs font-medium text-red-100 text-center p-1 leading-none"
                                style={{ width: `${olderPercent}%` }}
                              >
                                {olderPercent}%
                              </div>
                            )}
                          </div>

                          {/* 범례 */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                            {dateData.threeMonths > 0 && (
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-blue-500 rounded-md mr-2"></div>
                                <div className="text-sm">
                                  <div className="font-medium">최근 3개월</div>
                                  <div className="text-gray-600">{dateData.threeMonths}개 ({threeMonthsPercent}%)</div>
                                </div>
                              </div>
                            )}
                            {dateData.oneYear > 0 && (
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-green-500 rounded-md mr-2"></div>
                                <div className="text-sm">
                                  <div className="font-medium">3개월~1년</div>
                                  <div className="text-gray-600">{dateData.oneYear}개 ({oneYearPercent}%)</div>
                                </div>
                              </div>
                            )}
                            {dateData.twoYears > 0 && (
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-yellow-500 rounded-md mr-2"></div>
                                <div className="text-sm">
                                  <div className="font-medium">1년~2년</div>
                                  <div className="text-gray-600">{dateData.twoYears}개 ({twoYearsPercent}%)</div>
                                </div>
                              </div>
                            )}
                            {dateData.older > 0 && (
                              <div className="flex items-center">
                                <div className="w-4 h-4 bg-red-500 rounded-md mr-2"></div>
                                <div className="text-sm">
                                  <div className="font-medium">2년 이상 전</div>
                                  <div className="text-gray-600">{dateData.older}개 ({olderPercent}%)</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 개별 콘텐츠 분석 결과 */}
              {getChannelResult(activeTab)?.contentItems && getChannelResult(activeTab)!.contentItems!.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">개별 콘텐츠 분석 결과</h3>
                  <div className="space-y-4">
                    {getChannelResult(activeTab)!.contentItems!.map((item, idx) => {
                      let sentimentColor = 'bg-gray-400';
                      let sentimentLabel = '중립';
                      if (item.sentiment === 'positive') {
                        sentimentColor = 'bg-green-400';
                        sentimentLabel = '긍정';
                      } else if (item.sentiment === 'negative') {
                        sentimentColor = 'bg-red-400';
                        sentimentLabel = '부정';
                      }

                      let formattedDate = '';
                      if (item.publishedAt) {
                        try {
                          const date = new Date(item.publishedAt);
                          if (!isNaN(date.getTime())) {
                            formattedDate = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
                          }
                        } catch (e) { /* ignore */ }
                      }

                      return (
                        <div key={idx} className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">
                                {item.title.replace(/<[^>]*>/g, '')}
                              </a>
                              <span className={`${sentimentColor} text-white px-2 py-1 rounded-md text-xs font-medium flex-shrink-0 ml-2`}>
                                {sentimentLabel}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description.replace(/<[^>]*>/g, '')}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              {formattedDate && (
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{formattedDate}</span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>감정 점수: {(item.score ? item.score * 10 : 5).toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

// ===== Step 3: 브랜드별 콘텐츠 분석 (브랜드 유형용) =====
interface Step3BrandProps {
  brandComparison: BrandComparisonResult | null;
  selectedChannels: ContentType[];
  loading: boolean;
  onChannelToggle: (channel: ContentType) => void;
  onAnalyze: () => void;
  onReanalyze: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const Step3BrandComparison: React.FC<Step3BrandProps> = ({
  brandComparison,
  selectedChannels,
  loading,
  onChannelToggle,
  onAnalyze,
  onReanalyze,
  onPrev,
  onNext,
}) => {
  const [activeTab, setActiveTab] = useState<ContentType>('blog');

  const hasAnyResult = brandComparison?.ownBrand?.contentAnalysis &&
    Object.values(brandComparison.ownBrand.contentAnalysis).some(Boolean);

  const allBrands = brandComparison
    ? [brandComparison.ownBrand, ...brandComparison.competitors]
    : [];

  const getSentimentScore = (contentAnalysis: { blog: KeywordAnalysisResult | null; cafe: KeywordAnalysisResult | null; youtube: KeywordAnalysisResult | null; news: KeywordAnalysisResult | null } | null, channel: ContentType) => {
    if (!contentAnalysis || !contentAnalysis[channel]?.sentiment) return null;
    return contentAnalysis[channel]!.sentiment;
  };

  const getOverallSentiment = (contentAnalysis: { blog: KeywordAnalysisResult | null; cafe: KeywordAnalysisResult | null; youtube: KeywordAnalysisResult | null; news: KeywordAnalysisResult | null } | null) => {
    if (!contentAnalysis) return { positive: 0, negative: 0, neutral: 0 };
    let totalPos = 0, totalNeg = 0, totalNeu = 0, count = 0;
    selectedChannels.forEach(ch => {
      const sentiment = contentAnalysis[ch]?.sentiment;
      if (sentiment) {
        totalPos += sentiment.positive;
        totalNeg += sentiment.negative;
        totalNeu += sentiment.neutral;
        count++;
      }
    });
    if (count === 0) return { positive: 0, negative: 0, neutral: 0 };
    return {
      positive: Math.round(totalPos / count),
      negative: Math.round(totalNeg / count),
      neutral: Math.round(totalNeu / count),
    };
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">브랜드별 콘텐츠 분석</h2>
        <p className="text-gray-600">자사 브랜드와 경쟁사 브랜드의 채널별 콘텐츠를 비교 분석합니다.</p>
      </div>

      {/* 채널 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">분석할 채널 선택</label>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(channelNames) as ContentType[]).map((channel) => (
            <button
              key={channel}
              onClick={() => onChannelToggle(channel)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedChannels.includes(channel)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {channelNames[channel]}
            </button>
          ))}
        </div>
      </div>

      {/* 분석 시작 버튼 */}
      {!hasAnyResult && !loading && selectedChannels.length > 0 && (
        <div className="text-center py-8">
          <button
            onClick={onAnalyze}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-lg"
          >
            브랜드별 콘텐츠 분석 시작 ({allBrands.length}개 브랜드 × {selectedChannels.length}개 채널)
          </button>
        </div>
      )}

      {/* 결과 표시 */}
      {hasAnyResult && !loading && (
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

          {/* 브랜드별 전체 감성 비교 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">브랜드별 전체 감성 비교</h3>
            <div className="space-y-4">
              {allBrands.map((brand, idx) => {
                const overall = getOverallSentiment(brand.contentAnalysis);
                const isOwn = brand.isOwnBrand;

                return (
                  <div key={brand.brandKeyword} className="flex items-center gap-4">
                    <div className="w-28 flex items-center gap-2">
                      {isOwn && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                      <span className={`text-sm font-medium truncate ${isOwn ? 'text-blue-700' : 'text-gray-700'}`}>
                        {brand.brandKeyword}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
                        <div className="bg-green-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${overall.positive}%` }}>
                          {overall.positive > 10 && `${overall.positive}%`}
                        </div>
                        <div className="bg-gray-400 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${overall.neutral}%` }}>
                          {overall.neutral > 10 && `${overall.neutral}%`}
                        </div>
                        <div className="bg-red-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${overall.negative}%` }}>
                          {overall.negative > 10 && `${overall.negative}%`}
                        </div>
                      </div>
                    </div>
                    <div className="w-32 text-xs text-gray-500 text-right">
                      긍정 {overall.positive}% / 부정 {overall.negative}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> 긍정</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-400 rounded"></span> 중립</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> 부정</span>
            </div>
          </div>

          {/* 채널별 탭 */}
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
                </button>
              ))}
            </nav>
          </div>

          {/* 섹션 1: 주요 키워드 비교 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">주요 키워드 비교</h3>
            <div className={`grid grid-cols-1 ${allBrands.length === 2 ? 'md:grid-cols-2' : allBrands.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
              {allBrands.map((brand) => {
                const keywords = brand.contentAnalysis?.[activeTab]?.keywords?.slice(0, 10) || [];
                const maxFreq = keywords.length > 0 ? keywords[0].frequency : 1;

                return (
                  <div key={brand.brandKeyword} className={`rounded-lg p-4 ${brand.isOwnBrand ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {brand.isOwnBrand && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">자사</span>}
                      <span className={`text-sm font-semibold ${brand.isOwnBrand ? 'text-blue-700' : 'text-gray-700'}`}>{brand.brandKeyword}</span>
                    </div>
                    {keywords.length > 0 ? (
                      <div className="space-y-1.5">
                        {keywords.map((kw, idx) => (
                          <div key={idx} className="flex items-center">
                            <span className="w-20 text-xs text-gray-700 truncate">{kw.keyword}</span>
                            <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(kw.frequency / maxFreq) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{kw.frequency}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">데이터 없음</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 섹션 2: 감성 분석 비교 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">감성 분석 비교</h3>
            <div className="space-y-4">
              {allBrands.map((brand) => {
                const sentiment = getSentimentScore(brand.contentAnalysis, activeTab);
                const pos = sentiment?.positive || 0;
                const neu = sentiment?.neutral || 0;
                const neg = sentiment?.negative || 0;

                return (
                  <div key={brand.brandKeyword} className="flex items-center gap-4">
                    <div className="w-28 flex items-center gap-2 flex-shrink-0">
                      {brand.isOwnBrand && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>}
                      <span className={`text-sm font-medium truncate ${brand.isOwnBrand ? 'text-blue-700' : 'text-gray-700'}`}>
                        {brand.brandKeyword}
                      </span>
                    </div>
                    <div className="flex-1">
                      {sentiment ? (
                        <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
                          <div className="bg-green-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${pos}%` }}>
                            {pos > 10 && `${pos}%`}
                          </div>
                          <div className="bg-gray-400 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${neu}%` }}>
                            {neu > 10 && `${neu}%`}
                          </div>
                          <div className="bg-red-500 flex items-center justify-center text-xs text-white font-medium" style={{ width: `${neg}%` }}>
                            {neg > 10 && `${neg}%`}
                          </div>
                        </div>
                      ) : (
                        <div className="h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-400">데이터 없음</span>
                        </div>
                      )}
                    </div>
                    <div className="w-36 text-xs text-gray-500 text-right flex-shrink-0">
                      긍정 {pos}% / 부정 {neg}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> 긍정</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-400 rounded"></span> 중립</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> 부정</span>
            </div>
          </div>

          {/* 섹션 3: 긍부정 평가 비교 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">긍부정 평가 비교</h3>
            <div className={`grid grid-cols-1 ${allBrands.length === 2 ? 'md:grid-cols-2' : allBrands.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
              {allBrands.map((brand) => {
                const items = brand.contentAnalysis?.[activeTab]?.contentItems || [];
                const total = items.length;
                const pos = items.filter(i => i.sentiment === 'positive').length;
                const neg = items.filter(i => i.sentiment === 'negative').length;
                const neu = items.filter(i => i.sentiment === 'neutral').length;
                const posPercent = total > 0 ? Math.round((pos / total) * 100) : 0;
                const negPercent = total > 0 ? Math.round((neg / total) * 100) : 0;
                const neuPercent = total > 0 ? 100 - posPercent - negPercent : 0;

                return (
                  <div key={brand.brandKeyword} className={`rounded-lg p-4 ${brand.isOwnBrand ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {brand.isOwnBrand && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">자사</span>}
                      <span className={`text-sm font-semibold ${brand.isOwnBrand ? 'text-blue-700' : 'text-gray-700'}`}>{brand.brandKeyword}</span>
                    </div>
                    {total > 0 ? (
                      <div>
                        <div className="flex justify-center mb-3">
                          <DonutChart positive={pos} negative={neg} neutral={neu} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-green-50 p-2 rounded-lg">
                            <div className="text-lg font-bold text-green-600">{pos}</div>
                            <div className="text-xs text-gray-600">긍정</div>
                            <div className="text-xs font-medium text-green-600">{posPercent}%</div>
                          </div>
                          <div className="bg-gray-100 p-2 rounded-lg">
                            <div className="text-lg font-bold text-gray-600">{neu}</div>
                            <div className="text-xs text-gray-600">중립</div>
                            <div className="text-xs font-medium text-gray-600">{neuPercent}%</div>
                          </div>
                          <div className="bg-red-50 p-2 rounded-lg">
                            <div className="text-lg font-bold text-red-600">{neg}</div>
                            <div className="text-xs text-gray-600">부정</div>
                            <div className="text-xs font-medium text-red-600">{negPercent}%</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-2">
                          총 {total}개 콘텐츠
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">데이터 없음</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 섹션 4: 작성일 기준 분석 비교 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-4">작성일 기준 분석 비교</h3>
            <div className={`grid grid-cols-1 ${allBrands.length === 2 ? 'md:grid-cols-2' : allBrands.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
              {allBrands.map((brand) => {
                const items = brand.contentAnalysis?.[activeTab]?.contentItems || [];
                const dateData = getDateAnalysisChartData(items);
                const total = dateData.threeMonths + dateData.oneYear + dateData.twoYears + dateData.older;
                const threeMonthsPercent = total > 0 ? Math.round((dateData.threeMonths / total) * 100) : 0;
                const oneYearPercent = total > 0 ? Math.round((dateData.oneYear / total) * 100) : 0;
                const twoYearsPercent = total > 0 ? Math.round((dateData.twoYears / total) * 100) : 0;
                const olderPercent = total > 0 ? Math.round((dateData.older / total) * 100) : 0;

                return (
                  <div key={brand.brandKeyword} className={`rounded-lg p-4 ${brand.isOwnBrand ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {brand.isOwnBrand && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">자사</span>}
                      <span className={`text-sm font-semibold ${brand.isOwnBrand ? 'text-blue-700' : 'text-gray-700'}`}>{brand.brandKeyword}</span>
                    </div>
                    {total > 0 ? (
                      <div>
                        {/* Stacked bar */}
                        <div className="w-full bg-gray-200 rounded-full h-5 mb-3 overflow-hidden flex">
                          {dateData.threeMonths > 0 && (
                            <div className="bg-blue-500 h-5 text-xs font-medium text-blue-100 text-center leading-5" style={{ width: `${threeMonthsPercent}%` }}>
                              {threeMonthsPercent > 8 && `${threeMonthsPercent}%`}
                            </div>
                          )}
                          {dateData.oneYear > 0 && (
                            <div className="bg-green-500 h-5 text-xs font-medium text-green-100 text-center leading-5" style={{ width: `${oneYearPercent}%` }}>
                              {oneYearPercent > 8 && `${oneYearPercent}%`}
                            </div>
                          )}
                          {dateData.twoYears > 0 && (
                            <div className="bg-yellow-500 h-5 text-xs font-medium text-yellow-100 text-center leading-5" style={{ width: `${twoYearsPercent}%` }}>
                              {twoYearsPercent > 8 && `${twoYearsPercent}%`}
                            </div>
                          )}
                          {dateData.older > 0 && (
                            <div className="bg-red-500 h-5 text-xs font-medium text-red-100 text-center leading-5" style={{ width: `${olderPercent}%` }}>
                              {olderPercent > 8 && `${olderPercent}%`}
                            </div>
                          )}
                        </div>
                        {/* 범례 */}
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {dateData.threeMonths > 0 && (
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <span>3개월 {dateData.threeMonths}개</span>
                            </div>
                          )}
                          {dateData.oneYear > 0 && (
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <span>~1년 {dateData.oneYear}개</span>
                            </div>
                          )}
                          {dateData.twoYears > 0 && (
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                              <span>~2년 {dateData.twoYears}개</span>
                            </div>
                          )}
                          {dateData.older > 0 && (
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                              <span>2년+ {dateData.older}개</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-2">
                          총 {total}개 (날짜 있는 콘텐츠)
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">작성일 데이터 없음</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

// ===== Step 4: 쇼핑 검색 분석 (쇼핑 유형용 - 네이버/쿠팡 멀티 플랫폼) =====
interface Step4ShoppingProps {
  keyword: string;
  shoppingAnalysis: ShoppingSearchAnalysisResult | null;
  loading: boolean;
  naverShoppingText: string;
  coupangShoppingText: string;
  onNaverShoppingTextChange: (text: string) => void;
  onCoupangShoppingTextChange: (text: string) => void;
  onAnalyze: () => void;
  onReanalyze: () => void;
  onPrev: () => void;
}

const Step4ShoppingAnalysis: React.FC<Step4ShoppingProps> = ({
  keyword,
  shoppingAnalysis,
  loading,
  naverShoppingText,
  coupangShoppingText,
  onNaverShoppingTextChange,
  onCoupangShoppingTextChange,
  onAnalyze,
  onReanalyze,
  onPrev,
}) => {
  const hasAnyText = naverShoppingText.trim() || coupangShoppingText.trim();

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">쇼핑 검색 분석</h2>
        <p className="text-gray-600">네이버 쇼핑 / 쿠팡 검색 결과를 분석하여 이커머스 마케팅 인사이트를 제공합니다.</p>
      </div>

      {!shoppingAnalysis && !loading && (
        <>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-indigo-800">
              두 플랫폼 모두 입력하면 <strong>비교 분석</strong>이 포함됩니다. 하나만 입력해도 분석 가능합니다.
            </p>
          </div>

          {/* 네이버 쇼핑 섹션 */}
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🟢</div>
                <div>
                  <p className="text-sm text-green-800 font-medium mb-1">네이버 쇼핑 검색 결과</p>
                  <ol className="text-sm text-green-700 list-decimal list-inside space-y-1">
                    <li>네이버에서 &ldquo;{keyword}&rdquo; 검색</li>
                    <li>쇼핑 탭 클릭</li>
                    <li>검색 결과를 드래그하여 선택 후 복사 (Ctrl+C)</li>
                    <li>아래 입력창에 붙여넣기 (Ctrl+V)</li>
                  </ol>
                </div>
              </div>
            </div>
            <textarea
              value={naverShoppingText}
              onChange={(e) => onNaverShoppingTextChange(e.target.value)}
              placeholder={"네이버 쇼핑 검색 결과를 복사하여 붙여넣어 주세요.\n\n예시:\n[상품명] 다이어트 도시락 냉동 식단 ...\n가격: 29,900원\n리뷰: 4.8 (1,234)\n배송: 무료배송"}
              className="w-full h-48 p-4 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-mono resize-y"
            />
            <p className="mt-1 text-xs text-gray-500">
              상품명, 가격, 리뷰, 판매처 등의 정보가 포함될수록 분석 품질이 향상됩니다.
            </p>
          </div>

          {/* 쿠팡 섹션 */}
          <div className="mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🟠</div>
                <div>
                  <p className="text-sm text-orange-800 font-medium mb-1">쿠팡 검색 결과</p>
                  <ol className="text-sm text-orange-700 list-decimal list-inside space-y-1">
                    <li>쿠팡에서 &ldquo;{keyword}&rdquo; 검색</li>
                    <li>검색 결과를 드래그하여 선택 후 복사 (Ctrl+C)</li>
                    <li>아래 입력창에 붙여넣기 (Ctrl+V)</li>
                  </ol>
                </div>
              </div>
            </div>
            <textarea
              value={coupangShoppingText}
              onChange={(e) => onCoupangShoppingTextChange(e.target.value)}
              placeholder={"쿠팡 검색 결과를 복사하여 붙여넣어 주세요.\n\n예시:\n[상품명] 다이어트 도시락 세트 ...\n가격: 27,900원\n리뷰: 4.7 (2,345)\n로켓배송"}
              className="w-full h-48 p-4 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-mono resize-y"
            />
            <p className="mt-1 text-xs text-gray-500">
              쿠팡 로켓배송, 가격, 리뷰 등의 정보가 포함될수록 분석 품질이 향상됩니다.
            </p>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={onAnalyze}
              disabled={!hasAnyText}
              className={`px-6 py-3 font-semibold rounded-lg transition-all ${
                hasAnyText
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              쇼핑 검색 분석하기
            </button>
          </div>
        </>
      )}

      {shoppingAnalysis && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {/* 소스 배지 */}
            <div className="flex gap-2">
              {shoppingAnalysis.sources?.includes('naver') && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🟢 네이버 쇼핑
                </span>
              )}
              {shoppingAnalysis.sources?.includes('coupang') && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  🟠 쿠팡
                </span>
              )}
            </div>
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

          {/* 쇼핑 분석 결과 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 p-4">
            <h3 className="text-sm font-bold text-emerald-800 flex items-center mb-4">
              <span className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs mr-2">🛒</span>
              쇼핑 검색 분석 결과
            </h3>

            <div className="space-y-3">
              {/* 가격 분석 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-emerald-500">
                <div className="text-sm font-bold text-emerald-700 mb-2">💰 가격대 분석</div>
                <p className="text-sm text-gray-700">{shoppingAnalysis.gptAnalysis.priceAnalysis}</p>
              </div>

              {/* 주요 브랜드 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                <div className="text-sm font-bold text-blue-700 mb-2">🏷️ 주요 브랜드/판매처</div>
                <p className="text-sm text-gray-700">{shoppingAnalysis.gptAnalysis.topBrands}</p>
              </div>

              {/* 상품 특성 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-violet-500">
                <div className="text-sm font-bold text-violet-700 mb-2">📦 상품 특성 및 차별화 포인트</div>
                <p className="text-sm text-gray-700">{shoppingAnalysis.gptAnalysis.productFeatures}</p>
              </div>

              {/* 구매 결정 요인 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
                <div className="text-sm font-bold text-orange-700 mb-2">🎯 소비자 구매 결정 요인</div>
                <p className="text-sm text-gray-700">{shoppingAnalysis.gptAnalysis.purchaseFactors}</p>
              </div>

              {/* 시장 포지셔닝 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-pink-500">
                <div className="text-sm font-bold text-pink-700 mb-2">📈 시장 포지셔닝 전략</div>
                <p className="text-sm text-gray-700">{shoppingAnalysis.gptAnalysis.marketPositioning}</p>
              </div>

              {/* 네이버 vs 쿠팡 비교 (두 플랫폼 모두 입력 시) */}
              {shoppingAnalysis.gptAnalysis.platformComparison && (
                <div className="bg-white rounded-lg p-4 border-l-4 border-cyan-500">
                  <div className="text-sm font-bold text-cyan-700 mb-2">🔄 네이버 vs 쿠팡 비교</div>
                  <p className="text-sm text-gray-700">{shoppingAnalysis.gptAnalysis.platformComparison}</p>
                </div>
              )}

              {/* 마케팅 추천 */}
              <div className="bg-white rounded-lg p-4 border-l-4 border-amber-500">
                <div className="text-sm font-bold text-amber-700 mb-2">✨ 마케팅 추천 사항</div>
                <ul className="space-y-2">
                  {shoppingAnalysis.gptAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                      <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                        {idx + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
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
      updateState({
        keywordExpansion: null,
        keywordExpansionGPTAnalysis: null,
        brandComparison: null,
        brandKeywordFilters: [],
      });
    }
    if (fromStep <= 3) {
      updateState({
        contentAnalysis: { blog: null, cafe: null, youtube: null, news: null },
      });
    }
    if (fromStep <= 4) {
      updateState({
        adAnalysis: null,
        adText: '',
        skipAdAnalysis: false,
        shoppingAnalysis: null,
        naverShoppingText: '',
        coupangShoppingText: '',
      });
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

  // 키워드 유형 변경 핸들러 (변경 시 하위 단계 리셋)
  const handleKeywordTypeChange = (newType: KeywordType) => {
    if (analysisState.keywordType !== newType) {
      resetFromStep(2);
      // 유형별 특수 데이터 초기화
      const typeSpecificReset: Partial<IntegratedAnalysisState> = {
        keywordType: newType,
        shoppingAnalysis: null,
        naverShoppingText: '',
        coupangShoppingText: '',
        brandComparison: null,
      };
      // 브랜드 유형으로 변경 시 경쟁사 브랜드 배열 초기화
      if (newType === 'brand') {
        typeSpecificReset.competitorBrands = analysisState.competitorBrands.length === 0 ? [''] : analysisState.competitorBrands;
      } else {
        typeSpecificReset.competitorBrands = [];
      }
      updateState(typeSpecificReset);
    }
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
        keywordType: analysisState.keywordType,
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
          keywordType: analysisState.keywordType,
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
    // 브랜드 유형: keyword가 업체명, 그 외: companyName 사용
    const effectiveCompanyName = analysisState.keywordType === 'brand'
      ? analysisState.keyword
      : analysisState.companyName;

    if (!effectiveCompanyName) {
      setError('광고 분석을 위해 업체명을 입력해주세요.');
      return;
    }

    updateState({ adAnalysisLoading: true });

    try {
      const formData = new FormData();
      formData.append('keyword', analysisState.keyword);
      formData.append('companyName', effectiveCompanyName);
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

  // Step 2: 브랜드별 키워드 확장 분석 (브랜드 유형용)
  const handleBrandKeywordExpansion = async () => {
    updateState({ brandComparisonLoading: true });

    try {
      const validCompetitors = analysisState.competitorBrands.filter(b => b.trim());
      const allBrands = [analysisState.keyword, ...validCompetitors];

      // 모든 브랜드에 대해 병렬로 키워드 확장 API 호출
      const results = await Promise.all(
        allBrands.map(async (brand, index) => {
          try {
            const response = await axios.post('/api/keyword-expansion', { keyword: brand });
            return {
              brandKeyword: brand,
              isOwnBrand: index === 0,
              keywordExpansion: response.data.data as KeywordExpansionResult,
              contentAnalysis: { blog: null, cafe: null, youtube: null, news: null },
            };
          } catch (err) {
            console.error(`${brand} 키워드 확장 오류:`, err);
            return {
              brandKeyword: brand,
              isOwnBrand: index === 0,
              keywordExpansion: null,
              contentAnalysis: { blog: null, cafe: null, youtube: null, news: null },
            };
          }
        })
      );

      const ownBrandData = results[0];
      const competitorData = results.slice(1);

      // 브랜드별 필터 초기화 (기본: 브랜드명 포함 필터 활성화)
      const brandFilters: BrandKeywordFilter[] = allBrands.map(brand => ({
        brandKeyword: brand,
        filterText: brand,
        isEnabled: true,
      }));

      // 자사 브랜드 필터 적용된 keywordExpansion 저장 (리포트 생성용)
      const ownFilter = brandFilters[0];
      const filteredOwnExpansion = ownBrandData.keywordExpansion
        ? {
            ...ownBrandData.keywordExpansion,
            keywordList: applyBrandKeywordFilter(ownBrandData.keywordExpansion.keywordList, ownFilter),
          }
        : null;

      updateState({
        brandComparison: {
          ownBrand: ownBrandData,
          competitors: competitorData,
        },
        keywordExpansion: filteredOwnExpansion,
        brandKeywordFilters: brandFilters,
        brandComparisonLoading: false,
      });

      // GPT 분석도 자동 호출 (자사 브랜드 필터 적용 기준)
      if (filteredOwnExpansion) {
        await handleKeywordExpansionGPTAnalysis(filteredOwnExpansion);
      }
    } catch (err) {
      console.error('브랜드 키워드 확장 오류:', err);
      setError('브랜드 키워드 확장 분석 중 오류가 발생했습니다.');
      updateState({ brandComparisonLoading: false });
    }
  };

  // 브랜드 키워드 필터 텍스트 변경
  const filterDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleBrandFilterChange = (brandKeyword: string, filterText: string) => {
    const newFilters = analysisState.brandKeywordFilters.map(f =>
      f.brandKeyword === brandKeyword ? { ...f, filterText } : f
    );
    updateState({ brandKeywordFilters: newFilters });

    // 자사 브랜드 필터 변경 시 keywordExpansion 동기화 (디바운스 500ms)
    if (brandKeyword === analysisState.keyword && analysisState.brandComparison?.ownBrand.keywordExpansion) {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
      filterDebounceRef.current = setTimeout(() => {
        const updatedFilter: BrandKeywordFilter = { brandKeyword, filterText, isEnabled: true };
        const ownExpansion = analysisState.brandComparison?.ownBrand.keywordExpansion;
        if (ownExpansion) {
          updateState({
            keywordExpansion: {
              ...ownExpansion,
              keywordList: applyBrandKeywordFilter(ownExpansion.keywordList, updatedFilter),
            },
          });
        }
      }, 500);
    }
  };

  // 브랜드 키워드 필터 on/off 토글
  const handleBrandFilterToggle = (brandKeyword: string, isEnabled: boolean) => {
    const newFilters = analysisState.brandKeywordFilters.map(f =>
      f.brandKeyword === brandKeyword ? { ...f, isEnabled } : f
    );
    updateState({ brandKeywordFilters: newFilters });

    // 자사 브랜드 필터 토글 시 keywordExpansion 동기화
    if (brandKeyword === analysisState.keyword && analysisState.brandComparison?.ownBrand.keywordExpansion) {
      const filter = newFilters.find(f => f.brandKeyword === brandKeyword);
      const ownExpansion = analysisState.brandComparison.ownBrand.keywordExpansion;
      updateState({
        keywordExpansion: {
          ...ownExpansion,
          keywordList: applyBrandKeywordFilter(ownExpansion.keywordList, filter),
        },
      });
    }
  };

  // Step 3: 브랜드별 콘텐츠 분석 (브랜드 유형용)
  const handleBrandContentAnalysis = async () => {
    if (!analysisState.brandComparison) return;

    const loadingState = { blog: true, cafe: true, youtube: true, news: true };
    updateState({ contentAnalysisLoading: loadingState, brandComparisonLoading: true });

    try {
      const allBrands = [
        analysisState.brandComparison.ownBrand,
        ...analysisState.brandComparison.competitors,
      ];

      // 모든 브랜드 × 모든 채널에 대해 병렬 분석
      const updatedBrands = await Promise.all(
        allBrands.map(async (brand) => {
          const channelResults = await Promise.all(
            analysisState.selectedChannels.map(async (channel) => {
              try {
                const response = await axios.post('/api/keyword-analysis', {
                  keyword: brand.brandKeyword,
                  contentType: channel,
                  keywordType: analysisState.keywordType,
                });
                return { channel, data: response.data as KeywordAnalysisResult };
              } catch (err) {
                console.error(`${brand.brandKeyword} ${channel} 분석 오류:`, err);
                return { channel, data: null };
              }
            })
          );

          const contentAnalysis = { blog: null, cafe: null, youtube: null, news: null } as {
            blog: KeywordAnalysisResult | null;
            cafe: KeywordAnalysisResult | null;
            youtube: KeywordAnalysisResult | null;
            news: KeywordAnalysisResult | null;
          };
          channelResults.forEach(({ channel, data }) => {
            contentAnalysis[channel] = data;
          });

          return { ...brand, contentAnalysis };
        })
      );

      const ownBrandData = updatedBrands[0];
      const competitorData = updatedBrands.slice(1);

      // 자사 브랜드 콘텐츠 분석 결과를 기본 contentAnalysis에도 저장
      updateState({
        brandComparison: {
          ownBrand: ownBrandData,
          competitors: competitorData,
        },
        contentAnalysis: ownBrandData.contentAnalysis,
        contentAnalysisLoading: { blog: false, cafe: false, youtube: false, news: false },
        brandComparisonLoading: false,
      });
    } catch (err) {
      console.error('브랜드 콘텐츠 분석 오류:', err);
      setError('브랜드 콘텐츠 분석 중 오류가 발생했습니다.');
      updateState({
        contentAnalysisLoading: { blog: false, cafe: false, youtube: false, news: false },
        brandComparisonLoading: false,
      });
    }
  };

  // Step 4: 쇼핑 검색 분석 (쇼핑 유형용 - 네이버/쿠팡)
  const handleShoppingAnalysis = async () => {
    if (!analysisState.naverShoppingText.trim() && !analysisState.coupangShoppingText.trim()) {
      setError('네이버 쇼핑 또는 쿠팡 검색 결과 중 하나 이상을 입력해주세요.');
      return;
    }

    updateState({ shoppingAnalysisLoading: true });

    try {
      const response = await axios.post('/api/shopping-search-analysis', {
        keyword: analysisState.keyword,
        naverShoppingText: analysisState.naverShoppingText,
        coupangShoppingText: analysisState.coupangShoppingText,
      });

      updateState({
        shoppingAnalysis: response.data.analysis,
        shoppingAnalysisLoading: false,
      });
    } catch (err) {
      console.error('쇼핑 검색 분석 오류:', err);
      setError('쇼핑 검색 분석 중 오류가 발생했습니다.');
      updateState({ shoppingAnalysisLoading: false });
    }
  };

  // 콘텐츠 분석 데이터 요약 (contentItems 제외하여 데이터 크기 축소)
  const summarizeContentAnalysis = (content: KeywordAnalysisResult | null) => {
    if (!content) return undefined;
    return {
      keywords: content.keywords?.slice(0, 15) || [],
      sentiment: content.sentiment,
      contentType: content.contentType,
      // contentItems는 제외 (데이터 크기 축소)
    };
  };

  // 키워드 확장 데이터 요약 (상위 30개만 유지)
  const summarizeKeywordExpansion = (expansion: KeywordExpansionResult | null) => {
    if (!expansion) return null;
    return {
      ...expansion,
      keywordList: expansion.keywordList?.slice(0, 30) || [],
    };
  };

  // 브랜드 비교 데이터 요약
  const summarizeBrandComparison = (comparison: typeof analysisState.brandComparison) => {
    if (!comparison) return undefined;

    const getFilteredList = (brandKeyword: string, keywordList: KeywordExpansionData[]) => {
      const filter = analysisState.brandKeywordFilters.find(f => f.brandKeyword === brandKeyword);
      return applyBrandKeywordFilter(keywordList, filter).slice(0, 20);
    };

    return {
      ownBrand: {
        brandKeyword: comparison.ownBrand.brandKeyword,
        keywordExpansion: comparison.ownBrand.keywordExpansion
          ? { keywordList: getFilteredList(comparison.ownBrand.brandKeyword, comparison.ownBrand.keywordExpansion.keywordList || []) }
          : null,
        contentAnalysis: {
          blog: summarizeContentAnalysis(comparison.ownBrand.contentAnalysis?.blog || null),
          cafe: summarizeContentAnalysis(comparison.ownBrand.contentAnalysis?.cafe || null),
          youtube: summarizeContentAnalysis(comparison.ownBrand.contentAnalysis?.youtube || null),
          news: summarizeContentAnalysis(comparison.ownBrand.contentAnalysis?.news || null),
        },
      },
      competitors: comparison.competitors.map((comp) => ({
        brandKeyword: comp.brandKeyword,
        keywordExpansion: comp.keywordExpansion
          ? { keywordList: getFilteredList(comp.brandKeyword, comp.keywordExpansion.keywordList || []) }
          : null,
        contentAnalysis: {
          blog: summarizeContentAnalysis(comp.contentAnalysis?.blog || null),
          cafe: summarizeContentAnalysis(comp.contentAnalysis?.cafe || null),
          youtube: summarizeContentAnalysis(comp.contentAnalysis?.youtube || null),
          news: summarizeContentAnalysis(comp.contentAnalysis?.news || null),
        },
      })),
    };
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
      // 데이터 요약하여 전송 (1MB 제한 방지)
      const requestData = {
        keyword: analysisState.keyword,
        keywordType: analysisState.keywordType,
        companyName: analysisState.companyName || undefined,
        keywordExpansion: summarizeKeywordExpansion(analysisState.keywordExpansion),
        keywordExpansionGPTAnalysis: analysisState.keywordExpansionGPTAnalysis || undefined,
        contentAnalysis: {
          blog: summarizeContentAnalysis(analysisState.contentAnalysis.blog),
          cafe: summarizeContentAnalysis(analysisState.contentAnalysis.cafe),
          youtube: summarizeContentAnalysis(analysisState.contentAnalysis.youtube),
          news: summarizeContentAnalysis(analysisState.contentAnalysis.news),
        },
        adAnalysis: analysisState.adAnalysis || undefined,
        shoppingAnalysis: analysisState.shoppingAnalysis || undefined,
        brandComparison: summarizeBrandComparison(analysisState.brandComparison),
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

  const handleReanalyzeStep4Shopping = () => {
    updateState({ shoppingAnalysis: null, naverShoppingText: '', coupangShoppingText: '' });
    // 쇼핑 입력 UI로 돌아감
  };

  // 브랜드 비교 재분석 핸들러
  const handleReanalyzeStep2Brand = () => {
    resetFromStep(2);
    handleBrandKeywordExpansion();
  };

  const handleReanalyzeStep3Brand = () => {
    resetFromStep(3);
    handleBrandContentAnalysis();
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
    analysisState.shoppingAnalysisLoading ? '쇼핑 검색 결과를 분석 중입니다...' :
    analysisState.brandComparisonLoading ? '브랜드 비교 분석 중입니다...' :
    analysisState.reportLoading ? '종합 리포트를 생성 중입니다...' :
    pptLoading ? 'PPT를 생성 중입니다...' : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Head>
        <title>키워드 통합 분석 | GPTKOREA 키워드 분석 서비스</title>
        <meta name="description" content="키워드 분석, 콘텐츠 분석, 광고 분석을 통합하여 종합 마케팅 리포트를 제공합니다." />
      </Head>

      <main className="max-w-5xl mx-auto px-4 pt-10 pb-12">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">키워드 통합 분석</h1>
          <p className="text-gray-500">키워드 분석 및 마케팅 전략을 포함한 종합 리포트 생성</p>
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
            keywordType={analysisState.keywordType}
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
                keywordType={analysisState.keywordType}
                companyName={analysisState.companyName}
                competitorBrands={analysisState.competitorBrands}
                onKeywordChange={handleKeywordChange}
                onKeywordTypeChange={handleKeywordTypeChange}
                onCompanyNameChange={(v) => updateState({ companyName: v })}
                onCompetitorBrandsChange={(brands) => updateState({ competitorBrands: brands })}
                onNext={() => goToStep(2)}
              />
            )}

            {currentStep === 2 && analysisState.keywordType !== 'brand' && (
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

            {currentStep === 2 && analysisState.keywordType === 'brand' && (
              <Step2BrandComparison
                ownBrand={analysisState.keyword}
                competitorBrands={analysisState.competitorBrands}
                brandComparison={analysisState.brandComparison}
                loading={analysisState.brandComparisonLoading}
                brandKeywordFilters={analysisState.brandKeywordFilters}
                onFilterChange={handleBrandFilterChange}
                onFilterToggle={handleBrandFilterToggle}
                onAnalyze={handleBrandKeywordExpansion}
                onReanalyze={handleReanalyzeStep2Brand}
                onPrev={() => goToStep(1)}
                onNext={() => goToStep(3)}
              />
            )}

            {currentStep === 3 && analysisState.keywordType !== 'brand' && (
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

            {currentStep === 3 && analysisState.keywordType === 'brand' && (
              <Step3BrandComparison
                brandComparison={analysisState.brandComparison}
                selectedChannels={analysisState.selectedChannels}
                loading={analysisState.brandComparisonLoading}
                onChannelToggle={handleChannelToggle}
                onAnalyze={handleBrandContentAnalysis}
                onReanalyze={handleReanalyzeStep3Brand}
                onPrev={() => goToStep(2)}
                onNext={() => goToStep(4)}
              />
            )}

            {currentStep === 4 && analysisState.keywordType === 'shopping' && (
              <Step4ShoppingAnalysis
                keyword={analysisState.keyword}
                shoppingAnalysis={analysisState.shoppingAnalysis}
                loading={analysisState.shoppingAnalysisLoading}
                naverShoppingText={analysisState.naverShoppingText}
                coupangShoppingText={analysisState.coupangShoppingText}
                onNaverShoppingTextChange={(text) => updateState({ naverShoppingText: text })}
                onCoupangShoppingTextChange={(text) => updateState({ coupangShoppingText: text })}
                onAnalyze={handleShoppingAnalysis}
                onReanalyze={handleReanalyzeStep4Shopping}
                onPrev={() => goToStep(3)}
              />
            )}

            {currentStep === 4 && analysisState.keywordType !== 'shopping' && (
              <Step4AdAnalysis
                keyword={analysisState.keyword}
                companyName={analysisState.keywordType === 'brand' ? analysisState.keyword : analysisState.companyName}
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
            {(completedSteps.includes(3) || (currentStep === 4 && (
              analysisState.adAnalysis ||
              analysisState.skipAdAnalysis ||
              analysisState.shoppingAnalysis
            ))) && (
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
