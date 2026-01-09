'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { getScoredStocks, PRESET_CONDITIONS, filterStocks } from '../utils/screeningData';
import { getScoreRating, getStockStrengths } from '../utils/scoring';

function TopStockCard({ stock, rank }: { stock: ReturnType<typeof getScoredStocks>[0]; rank: number }) {
  const rating = getScoreRating(stock.score.total);
  const strengths = getStockStrengths(stock.score);

  return (
    <Link
      href={`/stocks/${stock.symbol}`}
      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-all hover:shadow-lg"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-500">#{rank}</span>
          <div>
            <div className="font-bold text-lg">{stock.symbol}</div>
            <div className="text-sm text-gray-400">{stock.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{stock.score.total}</div>
          <div className={`text-sm ${rating.color}`}>{rating.rating}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-mono">${stock.price.toFixed(2)}</span>
        <span className={`font-mono ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {strengths.slice(0, 3).map(s => (
          <span key={s} className="text-xs bg-gray-700 px-2 py-0.5 rounded">
            {s}
          </span>
        ))}
        {stock.tags.slice(0, 2).map(tag => (
          <span key={tag} className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

function StrategyCard({ strategyKey, preset }: { strategyKey: string; preset: typeof PRESET_CONDITIONS[string] }) {
  const stocks = useMemo(() => {
    const allStocks = getScoredStocks();
    return filterStocks(allStocks, preset.conditions).slice(0, 3);
  }, [preset.conditions]);

  const colors: { [key: string]: string } = {
    growth: 'from-blue-600 to-blue-800',
    value: 'from-green-600 to-green-800',
    dividend: 'from-yellow-600 to-yellow-800',
    quality: 'from-emerald-600 to-emerald-800',
    momentum: 'from-purple-600 to-purple-800',
    ai: 'from-pink-600 to-pink-800',
    semiconductor: 'from-cyan-600 to-cyan-800'
  };

  return (
    <Link
      href={`/results?${new URLSearchParams(
        Object.entries(preset.conditions).reduce((acc, [k, v]) => {
          if (v !== undefined) {
            if (Array.isArray(v)) {
              acc[k] = v.join(',');
            } else {
              acc[k] = String(v);
            }
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString()}`}
      className={`bg-gradient-to-br ${colors[strategyKey] || 'from-gray-600 to-gray-800'} rounded-lg p-5 hover:scale-105 transition-transform`}
    >
      <h3 className="text-xl font-bold mb-1">{preset.name}</h3>
      <p className="text-sm text-gray-200 mb-3 opacity-90">{preset.description}</p>

      {stocks.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-white/70">注目銘柄:</div>
          <div className="flex gap-2">
            {stocks.map(s => (
              <span key={s.symbol} className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded">
                {s.symbol}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-sm font-medium text-white/80">
        {filterStocks(getScoredStocks(), preset.conditions).length}銘柄が該当
      </div>
    </Link>
  );
}

function MarketOverview() {
  // デモ用の市場データ
  const marketData = [
    { name: 'S&P 500', value: 5234.18, change: 0.82, changePercent: 0.016 },
    { name: 'NASDAQ', value: 16428.82, change: 156.25, changePercent: 0.96 },
    { name: 'DOW', value: 39512.84, change: 125.08, changePercent: 0.32 }
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {marketData.map(market => (
        <div key={market.name} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">{market.name}</div>
          <div className="text-xl font-bold">{market.value.toLocaleString()}</div>
          <div className={`text-sm ${market.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {market.changePercent >= 0 ? '+' : ''}{market.change.toFixed(2)} ({market.changePercent >= 0 ? '+' : ''}{market.changePercent.toFixed(2)}%)
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const topStocks = useMemo(() => {
    return getScoredStocks().slice(0, 10);
  }, []);

  const strategies = Object.entries(PRESET_CONDITIONS).slice(0, 7);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">米国株スクリーニング</h1>
          <p className="text-gray-400">精度の高いファンダメンタル × テクニカル条件で、本当に買う価値のある米国株を自動抽出</p>
        </header>

        {/* 市場概況 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">市場概況</h2>
          <MarketOverview />
        </section>

        {/* 戦略別ショートカット */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">戦略別スクリーニング</h2>
            <Link
              href="/screener"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              詳細条件設定 →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {strategies.map(([key, preset]) => (
              <StrategyCard key={key} strategyKey={key} preset={preset} />
            ))}
          </div>
        </section>

        {/* 本日の注目銘柄 TOP10 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">本日の注目銘柄 TOP10</h2>
            <Link
              href="/results"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              すべて見る →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topStocks.map((stock, index) => (
              <TopStockCard key={stock.symbol} stock={stock} rank={index + 1} />
            ))}
          </div>
        </section>

        {/* クイックアクション */}
        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">クイックアクション</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/screener"
              className="flex flex-col items-center justify-center p-6 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <span className="text-3xl mb-2">🔍</span>
              <span className="font-medium">スクリーニング</span>
            </Link>
            <Link
              href="/"
              className="flex flex-col items-center justify-center p-6 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <span className="text-3xl mb-2">📊</span>
              <span className="font-medium">銘柄分析</span>
            </Link>
            <Link
              href="/watchlist"
              className="flex flex-col items-center justify-center p-6 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
            >
              <span className="text-3xl mb-2">⭐</span>
              <span className="font-medium">ウォッチリスト</span>
            </Link>
            <Link
              href="/results"
              className="flex flex-col items-center justify-center p-6 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <span className="text-3xl mb-2">📈</span>
              <span className="font-medium">全銘柄一覧</span>
            </Link>
          </div>
        </section>

        {/* 免責事項 */}
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>
            ※ 本サイトは投資助言を目的としたものではありません。
            投資判断は自己責任でお願いいたします。
          </p>
          <p className="mt-1">
            データ出典: デモデータ（実際のAPIから取得したデータではありません）
          </p>
        </footer>
      </div>
    </div>
  );
}
