'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getScoredStocks,
  filterStocks,
  ScreeningConditions,
  ScoredStock
} from '../utils/screeningData';
import { getScoreRating, getStockStrengths } from '../utils/scoring';

type SortKey = 'score' | 'symbol' | 'price' | 'changePercent' | 'per' | 'peg' | 'roe' | 'dividendYield';
type SortOrder = 'asc' | 'desc';

function ResultsContent() {
  const searchParams = useSearchParams();
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // URLパラメータから条件を復元
  const conditions = useMemo<ScreeningConditions>(() => {
    const cond: ScreeningConditions = {};

    // 数値型パラメータ
    const numericParams: (keyof ScreeningConditions)[] = [
      'perMin', 'perMax', 'pbrMin', 'pbrMax', 'pegMin', 'pegMax',
      'roeMin', 'epsGrowthMin', 'revenueGrowthMin', 'operatingMarginMin',
      'equityRatioMin', 'currentRatioMin', 'debtRatioMax',
      'dividendYieldMin', 'dividendYieldMax', 'consecutiveDividendYearsMin',
      'payoutRatioMin', 'payoutRatioMax',
      'rsiMin', 'rsiMax', 'volumeChangeMin',
      'marketCapMin', 'marketCapMax'
    ];

    numericParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        (cond as Record<string, number>)[param] = Number(value);
      }
    });

    // ブール型パラメータ
    const boolParams: (keyof ScreeningConditions)[] = [
      'operatingCashFlowPositive', 'aboveMA50', 'aboveMA200', 'macdBullish'
    ];

    boolParams.forEach(param => {
      const value = searchParams.get(param);
      if (value === 'true') {
        (cond as Record<string, boolean>)[param] = true;
      }
    });

    // 配列型パラメータ
    const sectorsParam = searchParams.get('sectors');
    if (sectorsParam) {
      cond.sectors = sectorsParam.split(',');
    }

    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      cond.tags = tagsParam.split(',');
    }

    return cond;
  }, [searchParams]);

  // 銘柄データをフィルタリング
  const filteredStocks = useMemo(() => {
    const allStocks = getScoredStocks();
    return filterStocks(allStocks, conditions);
  }, [conditions]);

  // ソート処理
  const sortedStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortKey) {
        case 'score':
          aVal = a.score.total;
          bVal = b.score.total;
          break;
        case 'symbol':
          return sortOrder === 'asc'
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'changePercent':
          aVal = a.changePercent;
          bVal = b.changePercent;
          break;
        case 'per':
          aVal = a.per;
          bVal = b.per;
          break;
        case 'peg':
          aVal = a.peg;
          bVal = b.peg;
          break;
        case 'roe':
          aVal = a.roe;
          bVal = b.roe;
          break;
        case 'dividendYield':
          aVal = a.dividendYield;
          bVal = b.dividendYield;
          break;
        default:
          aVal = a.score.total;
          bVal = b.score.total;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredStocks, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'symbol' ? 'asc' : 'desc');
    }
  };

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700 transition-colors"
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          <span className="text-blue-400">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  const getConditionSummary = () => {
    const parts: string[] = [];
    if (conditions.perMax) parts.push(`PER≤${conditions.perMax}`);
    if (conditions.pegMax) parts.push(`PEG≤${conditions.pegMax}`);
    if (conditions.roeMin) parts.push(`ROE≥${conditions.roeMin}%`);
    if (conditions.dividendYieldMin) parts.push(`配当≥${conditions.dividendYieldMin}%`);
    if (conditions.aboveMA50) parts.push('50MA↑');
    if (conditions.aboveMA200) parts.push('200MA↑');
    if (conditions.sectors?.length) parts.push(`セクター: ${conditions.sectors.join(', ')}`);
    if (conditions.tags?.length) parts.push(`タグ: ${conditions.tags.join(', ')}`);
    return parts.length > 0 ? parts.join(' / ') : '全銘柄';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">スクリーニング結果</h1>
            <Link
              href="/screener"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              条件を変更
            </Link>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-sm">適用条件:</span>
                <p className="text-gray-200">{getConditionSummary()}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-400 text-sm">該当銘柄数:</span>
                <p className="text-2xl font-bold text-blue-400">{sortedStocks.length}件</p>
              </div>
            </div>
          </div>
        </header>

        {sortedStocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400 mb-4">条件に該当する銘柄がありません</p>
            <Link
              href="/screener"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              条件を変更する
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-800 sticky top-0">
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left w-12"></th>
                  <SortHeader label="ティッカー" sortKeyName="symbol" />
                  <th className="px-4 py-3 text-left">企業名</th>
                  <SortHeader label="株価" sortKeyName="price" />
                  <SortHeader label="変動率" sortKeyName="changePercent" />
                  <SortHeader label="PER" sortKeyName="per" />
                  <SortHeader label="PEG" sortKeyName="peg" />
                  <SortHeader label="ROE" sortKeyName="roe" />
                  <SortHeader label="配当" sortKeyName="dividendYield" />
                  <SortHeader label="スコア" sortKeyName="score" />
                  <th className="px-4 py-3 text-left">評価</th>
                </tr>
              </thead>
              <tbody>
                {sortedStocks.map((stock) => {
                  const rating = getScoreRating(stock.score.total);
                  const strengths = getStockStrengths(stock.score);
                  return (
                    <tr
                      key={stock.symbol}
                      className="border-b border-gray-700 hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleFavorite(stock.symbol)}
                          className="text-xl hover:scale-110 transition-transform"
                        >
                          {favorites.has(stock.symbol) ? '★' : '☆'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/stocks/${stock.symbol}`}
                          className="font-bold text-blue-400 hover:text-blue-300"
                        >
                          {stock.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm">{stock.name}</div>
                          <div className="text-xs text-gray-400">{stock.sector}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        ${stock.price.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 font-mono ${
                        stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {stock.per > 0 ? stock.per.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {stock.peg > 0 ? stock.peg.toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {stock.roe.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {stock.dividendYield > 0 ? `${stock.dividendYield.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                stock.score.total >= 65 ? 'bg-green-500' :
                                stock.score.total >= 50 ? 'bg-yellow-500' :
                                stock.score.total >= 35 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stock.score.total}%` }}
                            ></div>
                          </div>
                          <span className="font-bold">{stock.score.total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${rating.color}`}>
                          {rating.rating}
                        </span>
                        {strengths.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {strengths.map(s => (
                              <span key={s} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* スコア分布 */}
        {sortedStocks.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">スコア分布</h2>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: '優秀 (80+)', min: 80, max: 100, color: 'bg-green-500' },
                { label: '良好 (65-79)', min: 65, max: 79, color: 'bg-green-400' },
                { label: '普通 (50-64)', min: 50, max: 64, color: 'bg-yellow-500' },
                { label: '注意 (35-49)', min: 35, max: 49, color: 'bg-orange-500' },
                { label: '要警戒 (<35)', min: 0, max: 34, color: 'bg-red-500' }
              ].map(({ label, min, max, color }) => {
                const count = sortedStocks.filter(s => s.score.total >= min && s.score.total <= max).length;
                return (
                  <div key={label} className="text-center">
                    <div className={`${color} text-white rounded-lg py-2 px-4 mb-2`}>
                      {count}銘柄
                    </div>
                    <div className="text-sm text-gray-400">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">読み込み中...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
