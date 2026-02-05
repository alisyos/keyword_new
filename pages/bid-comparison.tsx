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

function buildComparisonRows(
  result: BidComparisonResult,
  device: 'pc' | 'mobile'
): BidComparisonRow[] {
  const bids1 = result.keyword1[device];
  const bids2 = result.keyword2[device];
  const maxLen = Math.max(bids1.length, bids2.length);
  const rows: BidComparisonRow[] = [];

  for (let i = 0; i < maxLen; i++) {
    const b1 = bids1[i]?.bid ?? 0;
    const b2 = bids2[i]?.bid ?? 0;
    const diff = b2 - b1;
    const base = Math.max(b1, b2);
    const percentDiff = base > 0 ? Math.round((Math.abs(diff) / base) * 1000) / 10 : 0;
    const higherKeyword =
      diff > 0
        ? result.keyword2.keyword
        : diff < 0
        ? result.keyword1.keyword
        : '-';

    rows.push({
      position: (bids1[i]?.position ?? bids2[i]?.position ?? i + 1),
      bid1: b1,
      bid2: b2,
      difference: diff,
      percentDiff,
      higherKeyword,
    });
  }

  return rows;
}

function buildChartData(
  result: BidComparisonResult,
  device: 'pc' | 'mobile'
) {
  const bids1 = result.keyword1[device];
  const bids2 = result.keyword2[device];
  const maxLen = Math.max(bids1.length, bids2.length);
  const data = [];

  for (let i = 0; i < maxLen; i++) {
    data.push({
      position: `${(bids1[i]?.position ?? bids2[i]?.position ?? i + 1)}위`,
      [result.keyword1.keyword]: bids1[i]?.bid ?? 0,
      [result.keyword2.keyword]: bids2[i]?.bid ?? 0,
    });
  }

  return data;
}

export default function BidComparison() {
  const [keyword1, setKeyword1] = useState('');
  const [keyword2, setKeyword2] = useState('');
  const [adType, setAdType] = useState<AdType>('powerlink');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BidComparisonResult | null>(null);
  const [analysis, setAnalysis] = useState<BidComparisonAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'pc' | 'mobile'>('pc');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword1.trim() || !keyword2.trim()) {
      setError('두 개의 키워드를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysis(null);

    try {
      const response = await axios.post<BidComparisonResult>('/api/bid-comparison', {
        keyword1: keyword1.trim(),
        keyword2: keyword2.trim(),
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
        <meta name="description" content="두 키워드의 순위별 입찰가를 비교 분석합니다." />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
              키워드 입찰가 비교
            </h1>
            <p className="text-gray-500">
              두 키워드의 순위별 입찰가를 비교하여 효율적인 광고 전략을 수립하세요.
            </p>
          </div>

          {/* 입력 폼 */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  키워드 1
                </label>
                <input
                  type="text"
                  value={keyword1}
                  onChange={(e) => setKeyword1(e.target.value)}
                  placeholder="예: LG정수기"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  키워드 2
                </label>
                <input
                  type="text"
                  value={keyword2}
                  onChange={(e) => setKeyword2(e.target.value)}
                  placeholder="예: SK매직정수기"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
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

              {/* 비교 표 + 그래프 좌우 배치 */}
              <div className="flex flex-col lg:flex-row gap-6 mb-8">
                {/* 비교 표 */}
                <div className="w-full lg:w-[45%] bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">
                      순위별 입찰가 비교 ({activeTab === 'pc' ? 'PC' : '모바일'})
                    </h2>
                  </div>
                  <div className="overflow-x-auto text-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                            순위
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-blue-600">
                            {result.keyword1.keyword}
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-red-600">
                            {result.keyword2.keyword}
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                            차액
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                            비교
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.position}
                            className="border-t border-gray-50 hover:bg-gray-50 transition"
                          >
                            <td className="px-4 py-2 text-center font-medium text-gray-700">
                              {row.position}위
                            </td>
                            <td className="px-4 py-2 text-center text-blue-700 font-medium">
                              {row.bid1.toLocaleString()}원
                            </td>
                            <td className="px-4 py-2 text-center text-red-700 font-medium">
                              {row.bid2.toLocaleString()}원
                            </td>
                            <td
                              className={`px-4 py-2 text-center font-medium ${
                                row.difference > 0
                                  ? 'text-red-500'
                                  : row.difference < 0
                                  ? 'text-blue-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {row.difference > 0 ? '+' : ''}
                              {row.difference.toLocaleString()}원
                            </td>
                            <td className="px-4 py-2 text-center text-xs text-gray-600">
                              {row.difference === 0
                                ? '동일'
                                : `${row.higherKeyword} ${row.percentDiff}% 높음`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 그래프 */}
                <div className="w-full lg:w-[55%] bg-white rounded-2xl shadow-lg p-6 flex flex-col">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">
                    입찰가 추이 그래프 ({activeTab === 'pc' ? 'PC' : '모바일'})
                  </h2>
                  <div className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
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
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line
                          type="monotone"
                          dataKey={result.keyword1.keyword}
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey={result.keyword2.keyword}
                          stroke="#EF4444"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
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

                    {/* 키워드1 운영전략 */}
                    <div>
                      <h3 className="font-semibold text-blue-800 mb-3 text-base">
                        {result.keyword1.keyword} 운영전략
                      </h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <span className="inline-block px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-semibold rounded mb-2">PC</span>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                            {analysis.keyword1StrategyPc}
                          </p>
                        </div>
                        <div className="flex-1 p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <span className="inline-block px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-semibold rounded mb-2">모바일</span>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                            {analysis.keyword1StrategyMobile}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 키워드2 운영전략 */}
                    <div>
                      <h3 className="font-semibold text-red-800 mb-3 text-base">
                        {result.keyword2.keyword} 운영전략
                      </h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 p-4 bg-red-50 rounded-xl border border-red-100">
                          <span className="inline-block px-2 py-0.5 bg-red-200 text-red-800 text-xs font-semibold rounded mb-2">PC</span>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                            {analysis.keyword2StrategyPc}
                          </p>
                        </div>
                        <div className="flex-1 p-4 bg-red-50 rounded-xl border border-red-100">
                          <span className="inline-block px-2 py-0.5 bg-red-200 text-red-800 text-xs font-semibold rounded mb-2">모바일</span>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                            {analysis.keyword2StrategyMobile}
                          </p>
                        </div>
                      </div>
                    </div>
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
