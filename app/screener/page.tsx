'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ScreenerFilters,
  ScreenerResult,
  PRESET_FILTERS,
  SECTORS,
  formatMarketCap,
  formatPercent,
  formatNumber,
} from '@/app/utils/screener';

interface FilterInputProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  step?: number;
}

function FilterInput({ label, value, onChange, placeholder, step = 1 }: FilterInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
        placeholder={placeholder}
        step={step}
        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

interface FilterCheckboxProps {
  label: string;
  checked: boolean | undefined;
  onChange: (checked: boolean | undefined) => void;
}

function FilterCheckbox({ label, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked ?? false}
        onChange={(e) => onChange(e.target.checked ? true : undefined)}
        className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  const percentage = (score / max) * 100;
  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let bgColor = 'bg-red-900 text-red-300';
  if (score >= 70) bgColor = 'bg-green-900 text-green-300';
  else if (score >= 50) bgColor = 'bg-yellow-900 text-yellow-300';
  else if (score >= 30) bgColor = 'bg-orange-900 text-orange-300';

  return (
    <span className={`px-2 py-1 rounded text-sm font-bold ${bgColor}`}>{score}</span>
  );
}

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>({});
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('fundamental');

  const updateFilter = <K extends keyof ScreenerFilters>(
    key: K,
    value: ScreenerFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setActivePreset(null);
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_FILTERS[presetKey as keyof typeof PRESET_FILTERS];
    if (preset) {
      setFilters(preset.filters);
      setActivePreset(presetKey);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setActivePreset(null);
  };

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/screener?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setError(null);
      } else {
        // API returned an error
        setResults([]);
        setError({
          message: data.error || 'データの取得に失敗しました',
          details: data.details || data.hint,
        });
        console.error('[Screener UI] API error:', data);
      }
    } catch (error) {
      console.error('[Screener UI] Fetch error:', error);
      setResults([]);
      setError({
        message: 'サーバーとの通信に失敗しました',
        details: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">米国株スクリーニング</h1>
            <p className="text-gray-400 mt-1">
              ファンダメンタル・テクニカル条件で銘柄を絞り込み
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            トップへ戻る
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Presets */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">プリセット</h3>
              <div className="space-y-1">
                {Object.entries(PRESET_FILTERS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`w-full px-3 py-2 rounded text-xs transition-colors text-left ${
                      activePreset === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                    title={preset.description}
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-[10px] opacity-75 mt-0.5 truncate">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={clearFilters}
                className="w-full mt-3 px-3 py-2 bg-red-700 hover:bg-red-600 rounded text-sm text-white font-semibold"
              >
                条件クリア
              </button>
            </div>

            {/* Fundamental Filters */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('fundamental')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700"
              >
                <span className="font-semibold">ファンダメンタル</span>
                <span>{expandedSection === 'fundamental' ? '−' : '+'}</span>
              </button>
              {expandedSection === 'fundamental' && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <FilterInput
                      label="PER (最小)"
                      value={filters.perMin}
                      onChange={(v) => updateFilter('perMin', v)}
                      step={0.1}
                    />
                    <FilterInput
                      label="PER (最大)"
                      value={filters.perMax}
                      onChange={(v) => updateFilter('perMax', v)}
                      step={0.1}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterInput
                      label="PBR (最小)"
                      value={filters.pbrMin}
                      onChange={(v) => updateFilter('pbrMin', v)}
                      step={0.1}
                    />
                    <FilterInput
                      label="PBR (最大)"
                      value={filters.pbrMax}
                      onChange={(v) => updateFilter('pbrMax', v)}
                      step={0.1}
                    />
                  </div>
                  <FilterInput
                    label="PEG (最大)"
                    value={filters.pegMax}
                    onChange={(v) => updateFilter('pegMax', v)}
                    step={0.1}
                  />
                  <FilterInput
                    label="ROE (最小 %)"
                    value={filters.roeMin}
                    onChange={(v) => updateFilter('roeMin', v)}
                  />
                  <FilterInput
                    label="EPS成長率 3Y (最小 %)"
                    value={filters.epsGrowth3YMin}
                    onChange={(v) => updateFilter('epsGrowth3YMin', v)}
                  />
                  <FilterInput
                    label="売上成長率 (最小 %)"
                    value={filters.revenueGrowthMin}
                    onChange={(v) => updateFilter('revenueGrowthMin', v)}
                  />
                  <FilterInput
                    label="営業利益率 (最小 %)"
                    value={filters.operatingMarginMin}
                    onChange={(v) => updateFilter('operatingMarginMin', v)}
                  />
                </div>
              )}
            </div>

            {/* Financial Health Filters */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('financial')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700"
              >
                <span className="font-semibold">財務健全性</span>
                <span>{expandedSection === 'financial' ? '−' : '+'}</span>
              </button>
              {expandedSection === 'financial' && (
                <div className="px-4 pb-4 space-y-3">
                  <FilterInput
                    label="自己資本比率 (最小 %)"
                    value={filters.equityRatioMin}
                    onChange={(v) => updateFilter('equityRatioMin', v)}
                  />
                  <FilterInput
                    label="流動比率 (最小)"
                    value={filters.currentRatioMin}
                    onChange={(v) => updateFilter('currentRatioMin', v)}
                    step={0.1}
                  />
                  <FilterInput
                    label="有利子負債比率 (最大 %)"
                    value={filters.debtRatioMax}
                    onChange={(v) => updateFilter('debtRatioMax', v)}
                  />
                  <FilterCheckbox
                    label="営業CF プラスのみ"
                    checked={filters.operatingCFPositive}
                    onChange={(v) => updateFilter('operatingCFPositive', v)}
                  />
                </div>
              )}
            </div>

            {/* Dividend Filters */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('dividend')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700"
              >
                <span className="font-semibold">配当</span>
                <span>{expandedSection === 'dividend' ? '−' : '+'}</span>
              </button>
              {expandedSection === 'dividend' && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <FilterInput
                      label="配当利回り (最小 %)"
                      value={filters.dividendYieldMin}
                      onChange={(v) => updateFilter('dividendYieldMin', v)}
                      step={0.1}
                    />
                    <FilterInput
                      label="配当利回り (最大 %)"
                      value={filters.dividendYieldMax}
                      onChange={(v) => updateFilter('dividendYieldMax', v)}
                      step={0.1}
                    />
                  </div>
                  <FilterInput
                    label="連続増配年数 (最小)"
                    value={filters.consecutiveDividendYearsMin}
                    onChange={(v) => updateFilter('consecutiveDividendYearsMin', v)}
                  />
                  <FilterInput
                    label="配当性向 (最大 %)"
                    value={filters.payoutRatioMax}
                    onChange={(v) => updateFilter('payoutRatioMax', v)}
                  />
                </div>
              )}
            </div>

            {/* Technical Filters */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('technical')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700"
              >
                <span className="font-semibold">テクニカル</span>
                <span>{expandedSection === 'technical' ? '−' : '+'}</span>
              </button>
              {expandedSection === 'technical' && (
                <div className="px-4 pb-4 space-y-3">
                  <FilterCheckbox
                    label="50日移動平均線を上回る"
                    checked={filters.aboveSMA50}
                    onChange={(v) => updateFilter('aboveSMA50', v)}
                  />
                  <FilterCheckbox
                    label="200日移動平均線を上回る"
                    checked={filters.aboveSMA200}
                    onChange={(v) => updateFilter('aboveSMA200', v)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FilterInput
                      label="RSI (最小)"
                      value={filters.rsiMin}
                      onChange={(v) => updateFilter('rsiMin', v)}
                    />
                    <FilterInput
                      label="RSI (最大)"
                      value={filters.rsiMax}
                      onChange={(v) => updateFilter('rsiMax', v)}
                    />
                  </div>
                  <FilterCheckbox
                    label="MACD 上昇トレンド"
                    checked={filters.macdBullish}
                    onChange={(v) => updateFilter('macdBullish', v)}
                  />
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('advanced')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700"
              >
                <span className="font-semibold">高度な条件</span>
                <span>{expandedSection === 'advanced' ? '−' : '+'}</span>
              </button>
              {expandedSection === 'advanced' && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="text-xs text-gray-400 font-semibold">バリュエーション</div>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterInput
                      label="予想PER (最小)"
                      value={filters.forwardPERMin}
                      onChange={(v) => updateFilter('forwardPERMin', v)}
                      step={0.1}
                    />
                    <FilterInput
                      label="予想PER (最大)"
                      value={filters.forwardPERMax}
                      onChange={(v) => updateFilter('forwardPERMax', v)}
                      step={0.1}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterInput
                      label="EV/EBITDA (最小)"
                      value={filters.evEbitdaMin}
                      onChange={(v) => updateFilter('evEbitdaMin', v)}
                      step={0.1}
                    />
                    <FilterInput
                      label="EV/EBITDA (最大)"
                      value={filters.evEbitdaMax}
                      onChange={(v) => updateFilter('evEbitdaMax', v)}
                      step={0.1}
                    />
                  </div>
                  <FilterInput
                    label="粗利率 (最小 %)"
                    value={filters.grossMarginMin}
                    onChange={(v) => updateFilter('grossMarginMin', v)}
                  />
                  <div className="text-xs text-gray-400 font-semibold mt-3">財務</div>
                  <FilterInput
                    label="D/Eレシオ (最大)"
                    value={filters.debtToEquityMax}
                    onChange={(v) => updateFilter('debtToEquityMax', v)}
                    step={0.1}
                  />
                  <FilterCheckbox
                    label="FCF プラスのみ"
                    checked={filters.freeCashFlowPositive}
                    onChange={(v) => updateFilter('freeCashFlowPositive', v)}
                  />
                  <FilterCheckbox
                    label="FCF 3年連続プラス"
                    checked={filters.freeCashFlow3YPositive}
                    onChange={(v) => updateFilter('freeCashFlow3YPositive', v)}
                  />
                  <div className="text-xs text-gray-400 font-semibold mt-3">テクニカル</div>
                  <FilterCheckbox
                    label="ゴールデンクロス (50日>200日)"
                    checked={filters.goldenCross}
                    onChange={(v) => updateFilter('goldenCross', v)}
                  />
                  <FilterInput
                    label="52週高値からの距離 (最大 %)"
                    value={filters.week52HighDistanceMax}
                    onChange={(v) => updateFilter('week52HighDistanceMax', v)}
                  />
                  <div className="text-xs text-gray-400 font-semibold mt-3">時価総額（USD）</div>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterInput
                      label="最小 (USD)"
                      value={filters.marketCapUSDMin}
                      onChange={(v) => updateFilter('marketCapUSDMin', v)}
                      placeholder="例: 10000000000"
                    />
                    <FilterInput
                      label="最大 (USD)"
                      value={filters.marketCapUSDMax}
                      onChange={(v) => updateFilter('marketCapUSDMax', v)}
                      placeholder="例: 100000000000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Twitter/X Sentiment Filter */}
            <div className="bg-gray-800 rounded-lg overflow-hidden border-2 border-blue-500">
              <button
                onClick={() => toggleSection('twitter')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700"
              >
                <span className="font-semibold">🐦 X (Twitter) 感情分析</span>
                <span>{expandedSection === 'twitter' ? '−' : '+'}</span>
              </button>
              {expandedSection === 'twitter' && (
                <div className="px-4 pb-4 space-y-3">
                  <FilterCheckbox
                    label="メンション数が増加傾向"
                    checked={filters.twitterMentionTrendPositive}
                    onChange={(v) => updateFilter('twitterMentionTrendPositive', v)}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">感情フィルター</label>
                    <select
                      value={filters.twitterSentimentFilter || 'any'}
                      onChange={(e) =>
                        updateFilter(
                          'twitterSentimentFilter',
                          e.target.value === 'any'
                            ? undefined
                            : (e.target.value as 'positive' | 'neutral' | 'negative')
                        )
                      }
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="any">すべて</option>
                      <option value="positive">ポジティブのみ</option>
                      <option value="neutral">ニュートラルのみ</option>
                      <option value="negative">ネガティブのみ</option>
                    </select>
                  </div>
                  <FilterCheckbox
                    label="⚠️ 地雷キーワードを除外"
                    checked={filters.excludeNegativeKeywords}
                    onChange={(v) => updateFilter('excludeNegativeKeywords', v)}
                  />
                  <div className="mt-2 p-2 bg-blue-900 bg-opacity-30 rounded text-[10px] text-blue-300">
                    <strong>地雷キーワード:</strong> fraud, scam, lawsuit, SEC
                    investigation等を除外
                  </div>
                </div>
              )}
            </div>

            {/* Sector Filter */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('sector')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700"
              >
                <span className="font-semibold">セクター</span>
                <span>{expandedSection === 'sector' ? '−' : '+'}</span>
              </button>
              {expandedSection === 'sector' && (
                <div className="px-4 pb-4 space-y-2">
                  {SECTORS.map((sector) => (
                    <label key={sector} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.sectors?.includes(sector) ?? false}
                        onChange={(e) => {
                          const newSectors = e.target.checked
                            ? [...(filters.sectors ?? []), sector]
                            : (filters.sectors ?? []).filter((s) => s !== sector);
                          updateFilter('sectors', newSectors.length > 0 ? newSectors : undefined);
                        }}
                        className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                      />
                      <span className="text-sm text-gray-300">{sector}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  検索結果 ({results.length}件)
                </h2>
                {loading && (
                  <span className="text-sm text-gray-400">読み込み中...</span>
                )}
              </div>

              {/* Error Display */}
              {error && !loading && (
                <div className="mb-4 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-red-400 text-xl">⚠️</div>
                    <div className="flex-1">
                      <h3 className="text-red-300 font-semibold mb-1">{error.message}</h3>
                      {error.details && (
                        <p className="text-red-200 text-sm">{error.details}</p>
                      )}
                      <button
                        onClick={fetchResults}
                        className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-sm text-white"
                      >
                        再試行
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {results.length === 0 && !loading && !error ? (
                <div className="text-center py-12 text-gray-400">
                  条件に一致する銘柄がありません
                </div>
              ) : !error ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-2">銘柄</th>
                        <th className="text-right py-3 px-2">株価</th>
                        <th className="text-right py-3 px-2">騰落率</th>
                        <th className="text-right py-3 px-2">PER</th>
                        <th className="text-right py-3 px-2">PEG</th>
                        <th className="text-right py-3 px-2">ROE</th>
                        <th className="text-right py-3 px-2">配当利回り</th>
                        <th className="text-center py-3 px-2">スコア</th>
                        <th className="text-center py-3 px-2">詳細</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((stock) => (
                        <tr
                          key={stock.symbol}
                          className="border-b border-gray-700 hover:bg-gray-750"
                        >
                          <td className="py-3 px-2">
                            <div>
                              <span className="font-semibold text-blue-400">
                                {stock.symbol}
                              </span>
                              <div className="text-xs text-gray-400 truncate max-w-[150px]">
                                {stock.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {stock.sector}
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2">
                            ${stock.price.toFixed(2)}
                          </td>
                          <td
                            className={`text-right py-3 px-2 ${
                              stock.changePercent >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {formatPercent(stock.changePercent)}
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatNumber(stock.per)}
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatNumber(stock.peg)}
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatNumber(stock.roe)}%
                          </td>
                          <td className="text-right py-3 px-2">
                            {formatNumber(stock.dividendYield)}%
                          </td>
                          <td className="text-center py-3 px-2">
                            <ScoreBadge score={stock.score.total} />
                          </td>
                          <td className="text-center py-3 px-2">
                            <Link
                              href={`/stocks/${stock.symbol}`}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
                            >
                              詳細
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Score Legend */}
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">スコア配点</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 mb-1">成長性 (30点)</div>
                  <ScoreBar score={30} max={30} color="bg-green-500" />
                </div>
                <div>
                  <div className="text-gray-400 mb-1">割安性 (25点)</div>
                  <ScoreBar score={25} max={25} color="bg-blue-500" />
                </div>
                <div>
                  <div className="text-gray-400 mb-1">財務健全性 (20点)</div>
                  <ScoreBar score={20} max={20} color="bg-purple-500" />
                </div>
                <div>
                  <div className="text-gray-400 mb-1">配当 (10点)</div>
                  <ScoreBar score={10} max={10} color="bg-yellow-500" />
                </div>
                <div>
                  <div className="text-gray-400 mb-1">テクニカル (15点)</div>
                  <ScoreBar score={15} max={15} color="bg-red-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
