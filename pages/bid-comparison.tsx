import React, { useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  AdType,
  BidComparisonResult,
  BidComparisonAnalysis,
  BidComparisonRow,
} from '../types/bid-comparison';

const AD_TYPE_OPTIONS: { value: AdType; label: string }[] = [
  { value: 'powerlink', label: '파워링크' },
  { value: 'powercontent', label: '파워콘텐츠' },
];

// 키워드별 색상 배열 (최대 5개)
const KEYWORD_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

function buildComparisonRows(
  result: BidComparisonResult,
  device: 'pc' | 'mobile'
): BidComparisonRow[] {
  const { keywords } = result;
  if (keywords.length === 0) return [];

  // 각 키워드의 해당 디바이스 입찰가 배열
  const allBids = keywords.map(k => k[device]);
  const maxLen = Math.max(...allBids.map(b => b.length));
  const rows: BidComparisonRow[] = [];

  for (let i = 0; i < maxLen; i++) {
    const bids: number[] = [];
    let maxBid = 0;
    let minBid = Infinity;
    let maxKeyword = '';
    let minKeyword = '';

    keywords.forEach((kwResult, idx) => {
      const bid = allBids[idx][i]?.bid ?? 0;
      bids.push(bid);
      if (bid > maxBid) {
        maxBid = bid;
        maxKeyword = kwResult.keyword;
      }
      if (bid < minBid && bid > 0) {
        minBid = bid;
        minKeyword = kwResult.keyword;
      }
    });

    // 모든 입찰가가 0인 경우
    if (minBid === Infinity) {
      minBid = 0;
      minKeyword = keywords[0].keyword;
    }

    const difference = maxBid - minBid;
    const percentDiff = maxBid > 0 ? Math.round((difference / maxBid) * 1000) / 10 : 0;

    rows.push({
      position: allBids[0][i]?.position ?? i + 1,
      bids,
      maxBid,
      minBid,
      maxKeyword,
      minKeyword,
      difference,
      percentDiff,
    });
  }

  return rows;
}

function buildChartData(
  result: BidComparisonResult,
  device: 'pc' | 'mobile'
) {
  const { keywords } = result;
  if (keywords.length === 0) return [];

  const allBids = keywords.map(k => k[device]);
  const maxLen = Math.max(...allBids.map(b => b.length));
  const data = [];

  for (let i = 0; i < maxLen; i++) {
    const item: Record<string, string | number> = {
      position: `${allBids[0][i]?.position ?? i + 1}위`,
    };
    keywords.forEach((kwResult, idx) => {
      item[kwResult.keyword] = allBids[idx][i]?.bid ?? 0;
    });
    data.push(item);
  }

  return data;
}

export default function BidComparison() {
  const [keywords, setKeywords] = useState<string[]>(['', '']);
  const [adType, setAdType] = useState<AdType>('powerlink');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BidComparisonResult | null>(null);
  const [analysis, setAnalysis] = useState<BidComparisonAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'pc' | 'mobile'>('pc');

  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const addKeyword = () => {
    if (keywords.length < 5) {
      setKeywords([...keywords, '']);
    }
  };

  const removeKeyword = (index: number) => {
    if (keywords.length > 2) {
      const newKeywords = keywords.filter((_, i) => i !== index);
      setKeywords(newKeywords);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const filledKeywords = keywords.filter(k => k.trim());
    if (filledKeywords.length < 2) {
      setError('최소 2개의 키워드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysis(null);

    try {
      const response = await axios.post<BidComparisonResult>('/api/bid-comparison', {
        keywords: filledKeywords,
        adType,
      });

      setResult(response.data);

      // 결과 수신 후 GPT 분석 자동 호출
      setAnalyzing(true);
      try {
        const analysisRes = await axios.post<{ analysis: BidComparisonAnalysis }>(
          '/api/bid-comparison-analysis',
          { bidData: response.data }
        );
        setAnalysis(analysisRes.data.analysis);
      } catch {
        // GPT 분석 실패는 무시 (입찰가 데이터는 이미 표시됨)
        console.error('GPT 분석 실패');
      } finally {
        setAnalyzing(false);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error || '입찰가 데이터를 가져오는 중 오류가 발생했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const rows = result ? buildComparisonRows(result, activeTab) : [];
  const chartData = result ? buildChartData(result, activeTab) : [];

  return (
    <>
      <Head>
        <title>키워드 입찰가 비교 - GPTKOREA</title>
        <meta name="description" content="최대 5개 키워드의 순위별 입찰가를 비교 분석합니다." />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
              키워드 입찰가 비교
            </h1>
            <p className="text-gray-500">
              최대 5개 키워드의 순위별 입찰가를 비교하여 효율적인 광고 전략을 수립하세요.
            </p>
          </div>

          {/* 입력 폼 */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            {/* 키워드 입력 필드들 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비교 키워드 (최소 2개, 최대 5개)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {keywords.map((keyword, index) => (
                  <div key={index} className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                        style={{ backgroundColor: KEYWORD_COLORS[index] }}
                      />
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => handleKeywordChange(index, e.target.value)}
                        placeholder={`키워드 ${index + 1}`}
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                    {/* 제거 버튼 (최소 2개일 때 비활성화) */}
                    <button
                      type="button"
                      onClick={() => removeKeyword(index)}
                      disabled={keywords.length <= 2}
                      className={`p-2 rounded-lg transition-all ${
                        keywords.length <= 2
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={keywords.length <= 2 ? '최소 2개 키워드 필요' : '키워드 제거'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {/* 키워드 추가 버튼 */}
              <button
                type="button"
                onClick={addKeyword}
                disabled={keywords.length >= 5}
                className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  keywords.length >= 5
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                키워드 추가 {keywords.length >= 5 && '(최대 5개)'}
              </button>
            </div>

            {/* 광고 유형 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                광고 유형
              </label>
              <div className="flex flex-wrap gap-3">
                {AD_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                      adType === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="adType"
                      value={opt.value}
                      checked={adType === opt.value}
                      onChange={() => setAdType(opt.value)}
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${
                        adType === opt.value ? 'border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {adType === opt.value && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </span>
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  입찰가 조회 중...
                </span>
              ) : (
                '비교 분석'
              )}
            </button>
          </form>

          {/* 결과 영역 */}
          {result && (
            <>
              {/* 탭 */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('pc')}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                    activeTab === 'pc'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  PC
                </button>
                <button
                  onClick={() => setActiveTab('mobile')}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                    activeTab === 'mobile'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  모바일
                </button>
              </div>

              {/* 비교 표 + 그래프 수직 배치 */}
              <div className="flex flex-col gap-6 mb-8">
                {/* 비교 표 */}
                <div className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">
                      순위별 입찰가 비교 ({activeTab === 'pc' ? 'PC' : '모바일'})
                    </h2>
                  </div>
                  <div className="overflow-x-auto text-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap">
                            순위
                          </th>
                          {result.keywords.map((kwResult, idx) => (
                            <th
                              key={kwResult.keyword}
                              className="px-3 py-2 text-center text-xs font-semibold whitespace-nowrap"
                              style={{ color: KEYWORD_COLORS[idx] }}
                            >
                              {kwResult.keyword}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap">
                            최고↔최저
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.position}
                            className="border-t border-gray-50 hover:bg-gray-50 transition"
                          >
                            <td className="px-3 py-2 text-center font-medium text-gray-700 whitespace-nowrap">
                              {row.position}위
                            </td>
                            {row.bids.map((bid, idx) => (
                              <td
                                key={idx}
                                className="px-3 py-2 text-center font-medium whitespace-nowrap"
                                style={{ color: KEYWORD_COLORS[idx] }}
                              >
                                {bid.toLocaleString()}원
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center text-xs text-gray-600 whitespace-nowrap">
                              {row.difference === 0 ? (
                                <span className="text-gray-400">동일</span>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800">
                                    {row.difference.toLocaleString()}원
                                  </span>
                                  <span className="text-gray-500 text-[10px]">
                                    {row.maxKeyword} vs {row.minKeyword} ({row.percentDiff}%)
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 그래프 */}
                <div className="w-full bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">
                    입찰가 추이 그래프 ({activeTab === 'pc' ? 'PC' : '모바일'})
                  </h2>
                  <div className="flex gap-6">
                    {/* 차트 영역 */}
                    <div className="flex-1 h-[400px]">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="position" tick={{ fontSize: 12 }} />
                          <YAxis
                            tickFormatter={(v: number) => v.toLocaleString()}
                            tick={{ fontSize: 11 }}
                            width={80}
                          />
                          <Tooltip
                            formatter={(value: number) => [`${value.toLocaleString()}원`]}
                            labelFormatter={(label: string) => `${label}`}
                            contentStyle={{ fontSize: 12 }}
                          />
                          {result.keywords.map((kwResult, idx) => (
                            <Line
                              key={kwResult.keyword}
                              type="monotone"
                              dataKey={kwResult.keyword}
                              stroke={KEYWORD_COLORS[idx]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* 범례 영역 */}
                    <div className="flex items-center">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="space-y-3">
                          {result.keywords.map((kwResult, idx) => (
                            <div key={kwResult.keyword} className="flex items-center gap-2">
                              <div
                                className="w-4 h-[2px]"
                                style={{ backgroundColor: KEYWORD_COLORS[idx] }}
                              />
                              <span className="text-sm" style={{ color: KEYWORD_COLORS[idx] }}>
                                {kwResult.keyword}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPT 분석 */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">AI 전략 분석</h2>

                {analyzing ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    GPT 분석 중...
                  </div>
                ) : analysis ? (
                  <div className="space-y-6">
                    {/* 전략적 분기점 */}
                    <div>
                      <h3 className="font-semibold text-indigo-800 mb-3 text-base">
                        전략적 분기점
                      </h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                          <span className="inline-block px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs font-semibold rounded mb-2">PC</span>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                            {analysis.strategicInflectionPc}
                          </p>
                        </div>
                        <div className="flex-1 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                          <span className="inline-block px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs font-semibold rounded mb-2">모바일</span>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                            {analysis.strategicInflectionMobile}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 키워드별 운영전략 (동적 렌더링) */}
                    {analysis.keywordStrategies.map((strategy, idx) => (
                      <div key={strategy.keyword}>
                        <h3
                          className="font-semibold mb-3 text-base"
                          style={{ color: KEYWORD_COLORS[idx] }}
                        >
                          {strategy.keyword} 운영전략
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4">
                          <div
                            className="flex-1 p-4 rounded-xl border"
                            style={{
                              backgroundColor: `${KEYWORD_COLORS[idx]}10`,
                              borderColor: `${KEYWORD_COLORS[idx]}30`,
                            }}
                          >
                            <span
                              className="inline-block px-2 py-0.5 text-xs font-semibold rounded mb-2"
                              style={{
                                backgroundColor: `${KEYWORD_COLORS[idx]}30`,
                                color: KEYWORD_COLORS[idx],
                              }}
                            >
                              PC
                            </span>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                              {strategy.pc}
                            </p>
                          </div>
                          <div
                            className="flex-1 p-4 rounded-xl border"
                            style={{
                              backgroundColor: `${KEYWORD_COLORS[idx]}10`,
                              borderColor: `${KEYWORD_COLORS[idx]}30`,
                            }}
                          >
                            <span
                              className="inline-block px-2 py-0.5 text-xs font-semibold rounded mb-2"
                              style={{
                                backgroundColor: `${KEYWORD_COLORS[idx]}30`,
                                color: KEYWORD_COLORS[idx],
                              }}
                            >
                              모바일
                            </span>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                              {strategy.mobile}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    입찰가 조회 후 AI 분석이 자동으로 실행됩니다.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
