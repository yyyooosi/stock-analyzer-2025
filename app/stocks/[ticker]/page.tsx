'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getStockBySymbol, getScoredStocks, ScoredStock } from '../../utils/screeningData';
import { getScoreRating, getStockStrengths, ScoreBreakdown } from '../../utils/scoring';

interface PageProps {
  params: Promise<{ ticker: string }>;
}

function ScoreBar({ label, score, maxScore, color }: { label: string; score: number; maxScore: number; color: string }) {
  const percentage = (score / maxScore) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono">{score}/{maxScore}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, colorClass }: { label: string; value: string | number; unit?: string; colorClass?: string }) {
  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${colorClass || 'text-white'}`}>
        {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default function StockDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const ticker = resolvedParams.ticker.toUpperCase();
  const router = useRouter();
  const [stock, setStock] = useState<ScoredStock | null>(null);
  const [competitors, setCompetitors] = useState<ScoredStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stockData = getStockBySymbol(ticker);
    if (stockData) {
      setStock(stockData);

      // 同セクター・同タグの競合を取得
      const allStocks = getScoredStocks();
      const sameCategory = allStocks.filter(s =>
        s.symbol !== ticker && (
          s.sector === stockData.sector ||
          s.tags.some(t => stockData.tags.includes(t))
        )
      ).slice(0, 5);
      setCompetitors(sameCategory);
    }
    setLoading(false);
  }, [ticker]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">読み込み中...</p>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold mb-4">銘柄が見つかりません</h1>
            <p className="text-gray-400 mb-8">ティッカー「{ticker}」は登録されていません。</p>
            <div className="flex justify-center gap-4">
              <Link
                href="/screener"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                スクリーニングへ
              </Link>
              <Link
                href={`/?symbol=${ticker}`}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                詳細分析で検索
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rating = getScoreRating(stock.score.total);
  const strengths = getStockStrengths(stock.score);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-bold">{stock.symbol}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${rating.color} bg-gray-800`}>
                  {rating.rating}
                </span>
              </div>
              <p className="text-xl text-gray-300">{stock.name}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-2 py-1 bg-gray-700 rounded text-sm">{stock.sector}</span>
                {stock.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold mb-1">${stock.price.toFixed(2)}</div>
              <div className={`text-lg ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.changePercent >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/?symbol=${stock.symbol}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              詳細分析
            </Link>
            <Link
              href="/screener"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              スクリーニングへ
            </Link>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              戻る
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* スコア詳細 */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 sticky top-4">
              <h2 className="text-xl font-bold mb-4">総合スコア</h2>

              <div className="text-center mb-6">
                <div className="text-6xl font-bold mb-2">{stock.score.total}</div>
                <div className="text-gray-400">/ 100</div>
                <p className={`mt-2 ${rating.color}`}>{rating.description}</p>
              </div>

              <div className="space-y-4">
                <ScoreBar label="成長性" score={stock.score.growth} maxScore={30} color="bg-blue-500" />
                <ScoreBar label="割安性" score={stock.score.value} maxScore={25} color="bg-green-500" />
                <ScoreBar label="財務健全性" score={stock.score.financial} maxScore={20} color="bg-yellow-500" />
                <ScoreBar label="配当" score={stock.score.dividend} maxScore={10} color="bg-purple-500" />
                <ScoreBar label="テクニカル" score={stock.score.technical} maxScore={15} color="bg-pink-500" />
              </div>

              {strengths.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">この銘柄の強み</h3>
                  <div className="flex flex-wrap gap-2">
                    {strengths.map(s => (
                      <span key={s} className="px-3 py-1 bg-green-900 text-green-300 rounded-full text-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 詳細データ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ファンダメンタル指標 */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-blue-400">ファンダメンタル指標</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="PER" value={stock.per > 0 ? stock.per.toFixed(1) : '-'} unit="倍" />
                <MetricCard label="PBR" value={stock.pbr.toFixed(1)} unit="倍" />
                <MetricCard label="PEG" value={stock.peg > 0 ? stock.peg.toFixed(2) : '-'} />
                <MetricCard label="ROE" value={stock.roe.toFixed(1)} unit="%" colorClass={stock.roe > 15 ? 'text-green-400' : 'text-white'} />
                <MetricCard label="EPS成長率 (3Y)" value={stock.epsGrowth3Y.toFixed(1)} unit="%" colorClass={stock.epsGrowth3Y > 15 ? 'text-green-400' : stock.epsGrowth3Y < 0 ? 'text-red-400' : 'text-white'} />
                <MetricCard label="EPS成長率 (5Y)" value={stock.epsGrowth5Y.toFixed(1)} unit="%" colorClass={stock.epsGrowth5Y > 15 ? 'text-green-400' : stock.epsGrowth5Y < 0 ? 'text-red-400' : 'text-white'} />
                <MetricCard label="売上成長率" value={stock.revenueGrowth.toFixed(1)} unit="%" colorClass={stock.revenueGrowth > 10 ? 'text-green-400' : stock.revenueGrowth < 0 ? 'text-red-400' : 'text-white'} />
                <MetricCard label="営業利益率" value={stock.operatingMargin.toFixed(1)} unit="%" colorClass={stock.operatingMargin > 20 ? 'text-green-400' : 'text-white'} />
              </div>
            </section>

            {/* 財務健全性 */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-green-400">財務健全性</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="自己資本比率" value={stock.equityRatio.toFixed(1)} unit="%" colorClass={stock.equityRatio > 40 ? 'text-green-400' : stock.equityRatio < 20 ? 'text-red-400' : 'text-white'} />
                <MetricCard label="流動比率" value={stock.currentRatio.toFixed(2)} unit="倍" colorClass={stock.currentRatio > 1.5 ? 'text-green-400' : stock.currentRatio < 1 ? 'text-red-400' : 'text-white'} />
                <MetricCard label="有利子負債比率" value={stock.debtRatio.toFixed(1)} unit="%" colorClass={stock.debtRatio < 50 ? 'text-green-400' : stock.debtRatio > 100 ? 'text-red-400' : 'text-white'} />
                <MetricCard
                  label="営業CF"
                  value={stock.operatingCashFlow > 0 ? `$${(stock.operatingCashFlow / 1000).toFixed(1)}B` : '-'}
                  colorClass={stock.operatingCashFlow > 0 ? 'text-green-400' : 'text-red-400'}
                />
              </div>
            </section>

            {/* 配当情報 */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">配当情報</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard label="配当利回り" value={stock.dividendYield > 0 ? stock.dividendYield.toFixed(2) : '-'} unit="%" colorClass={stock.dividendYield > 3 ? 'text-green-400' : 'text-white'} />
                <MetricCard label="連続増配年数" value={stock.consecutiveDividendYears > 0 ? stock.consecutiveDividendYears : '-'} unit="年" colorClass={stock.consecutiveDividendYears > 20 ? 'text-green-400' : 'text-white'} />
                <MetricCard label="配当性向" value={stock.payoutRatio > 0 ? stock.payoutRatio.toFixed(1) : '-'} unit="%" colorClass={stock.payoutRatio > 80 ? 'text-red-400' : stock.payoutRatio > 60 ? 'text-yellow-400' : 'text-white'} />
              </div>
            </section>

            {/* テクニカル指標 */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-purple-400">テクニカル指標</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="vs 50日MA" value={stock.priceVs50MA > 0 ? '+' : ''} colorClass={stock.priceVs50MA > 0 ? 'text-green-400' : 'text-red-400'} />
                <MetricCard label="vs 200日MA" value={stock.priceVs200MA > 0 ? '+' : ''} colorClass={stock.priceVs200MA > 0 ? 'text-green-400' : 'text-red-400'} />
                <MetricCard label="RSI" value={stock.rsi} colorClass={stock.rsi > 70 ? 'text-red-400' : stock.rsi < 30 ? 'text-green-400' : 'text-white'} />
                <MetricCard
                  label="MACDシグナル"
                  value={stock.macdSignal === 'bullish' ? '強気' : stock.macdSignal === 'bearish' ? '弱気' : '中立'}
                  colorClass={stock.macdSignal === 'bullish' ? 'text-green-400' : stock.macdSignal === 'bearish' ? 'text-red-400' : 'text-yellow-400'}
                />
              </div>
              <div className="mt-4">
                <MetricCard label="出来高変化率" value={stock.volumeChange > 0 ? '+' : ''} unit="%" colorClass={stock.volumeChange > 10 ? 'text-green-400' : stock.volumeChange < -10 ? 'text-red-400' : 'text-white'} />
              </div>
            </section>

            {/* 企業情報 */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-gray-300">企業情報</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">時価総額:</span>
                  <span className="ml-2 font-bold">${(stock.marketCap / 1000).toFixed(0)}B</span>
                </div>
                <div>
                  <span className="text-gray-400">セクター:</span>
                  <span className="ml-2">{stock.sector}</span>
                </div>
              </div>
            </section>

            {/* 競合比較 */}
            {competitors.length > 0 && (
              <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4">同条件の競合銘柄</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-2 text-left">ティッカー</th>
                        <th className="px-4 py-2 text-left">企業名</th>
                        <th className="px-4 py-2 text-right">株価</th>
                        <th className="px-4 py-2 text-right">スコア</th>
                        <th className="px-4 py-2 text-left">評価</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map(comp => {
                        const compRating = getScoreRating(comp.score.total);
                        return (
                          <tr key={comp.symbol} className="border-b border-gray-700 hover:bg-gray-700">
                            <td className="px-4 py-3">
                              <Link
                                href={`/stocks/${comp.symbol}`}
                                className="text-blue-400 hover:text-blue-300 font-bold"
                              >
                                {comp.symbol}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm">{comp.name}</td>
                            <td className="px-4 py-3 text-right font-mono">${comp.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold">{comp.score.total}</td>
                            <td className={`px-4 py-3 ${compRating.color}`}>{compRating.rating}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
