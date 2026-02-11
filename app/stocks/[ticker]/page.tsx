'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ScreenerResult,
  formatMarketCap,
  formatPercent,
  formatNumber,
} from '@/app/utils/screener';

interface SentimentData {
  symbol: string;
  tweet_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  negative_keyword_count: number;
  sentiment_score: number;
  sample_tweets: { id: string; text: string; authorUsername: string; sentiment: string; createdAt: string }[] | null;
  fetched_at: string;
}

interface StockDetailData {
  stock: ScreenerResult;
  competitors: ScreenerResult[];
}

function ScoreCard({
  label,
  score,
  max,
  color,
}: {
  label: string;
  score: number;
  max: number;
  color: string;
}) {
  const percentage = (score / max) * 100;
  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="font-bold">
          {score}/{max}
        </span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-700">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">
        {value !== null ? `${value}${suffix}` : '-'}
      </span>
    </div>
  );
}

function TrendIndicator({ signal }: { signal: 'bullish' | 'bearish' | 'neutral' }) {
  const config = {
    bullish: { text: '上昇', color: 'text-green-400', bg: 'bg-green-900' },
    bearish: { text: '下落', color: 'text-red-400', bg: 'bg-red-900' },
    neutral: { text: '中立', color: 'text-yellow-400', bg: 'bg-yellow-900' },
  };
  const { text, color, bg } = config[signal];
  return (
    <span className={`px-2 py-1 rounded text-sm ${color} ${bg}`}>{text}</span>
  );
}

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const [data, setData] = useState<StockDetailData | null>(null);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stockResponse, sentimentResponse] = await Promise.all([
          fetch(`/api/screener/${ticker}`),
          fetch(`/api/twitter/sentiment?symbol=${ticker}`).catch(() => null),
        ]);

        const result = await stockResponse.json();
        if (result.success) {
          setData(result);
        } else {
          setError(result.error || '銘柄情報を取得できませんでした');
        }

        if (sentimentResponse?.ok) {
          const sentimentResult = await sentimentResponse.json();
          if (sentimentResult.data) {
            setSentiment(sentimentResult.data);
          }
        }
      } catch (err) {
        setError('データの取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-xl text-red-400">{error}</div>
        <Link
          href="/screener"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
        >
          スクリーニングに戻る
        </Link>
      </div>
    );
  }

  const { stock, competitors } = data;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{stock.symbol}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  stock.changePercent >= 0
                    ? 'bg-green-900 text-green-300'
                    : 'bg-red-900 text-red-300'
                }`}
              >
                {formatPercent(stock.changePercent)}
              </span>
            </div>
            <p className="text-xl text-gray-300">{stock.name}</p>
            <p className="text-gray-400">
              {stock.sector} / {stock.industry}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">${stock.price.toFixed(2)}</div>
            <div
              className={`text-lg ${
                stock.change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {stock.change >= 0 ? '+' : ''}
              {stock.change.toFixed(2)}
            </div>
            <div className="text-gray-400 mt-2">
              時価総額: {formatMarketCap(stock.marketCap)}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-8">
          <Link
            href="/screener"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            スクリーニングに戻る
          </Link>
          <Link
            href={`/?symbol=${stock.symbol}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
          >
            テクニカル分析を見る
          </Link>
        </div>

        {/* Score Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">総合スコア</h2>
            <div className="flex items-center gap-2">
              <span className="text-5xl font-bold">{stock.score.total}</span>
              <span className="text-2xl text-gray-400">/ 100</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <ScoreCard
              label="成長性"
              score={stock.score.growth}
              max={30}
              color="bg-green-500"
            />
            <ScoreCard
              label="割安性"
              score={stock.score.value}
              max={25}
              color="bg-blue-500"
            />
            <ScoreCard
              label="財務健全性"
              score={stock.score.financial}
              max={20}
              color="bg-purple-500"
            />
            <ScoreCard
              label="配当"
              score={stock.score.dividend}
              max={10}
              color="bg-yellow-500"
            />
            <ScoreCard
              label="テクニカル"
              score={stock.score.technical}
              max={15}
              color="bg-red-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fundamental Metrics */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">バリュエーション</h2>
            <MetricRow label="PER" value={formatNumber(stock.per)} suffix="倍" />
            <MetricRow label="PBR" value={formatNumber(stock.pbr)} suffix="倍" />
            <MetricRow label="PEG" value={formatNumber(stock.peg)} />
            <MetricRow label="PSR" value={formatNumber(stock.psRatio)} suffix="倍" />
          </div>

          {/* Growth Metrics */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">成長性</h2>
            <MetricRow label="ROE" value={formatNumber(stock.roe)} suffix="%" />
            <MetricRow
              label="EPS成長率 (3Y)"
              value={formatNumber(stock.epsGrowth3Y)}
              suffix="%"
            />
            <MetricRow
              label="EPS成長率 (5Y)"
              value={formatNumber(stock.epsGrowth5Y)}
              suffix="%"
            />
            <MetricRow
              label="売上成長率"
              value={formatNumber(stock.revenueGrowth)}
              suffix="%"
            />
            <MetricRow
              label="営業利益率"
              value={formatNumber(stock.operatingMargin)}
              suffix="%"
            />
          </div>

          {/* Financial Health */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">財務健全性</h2>
            <MetricRow
              label="自己資本比率"
              value={formatNumber(stock.equityRatio)}
              suffix="%"
            />
            <MetricRow
              label="流動比率"
              value={formatNumber(stock.currentRatio)}
              suffix="倍"
            />
            <MetricRow
              label="有利子負債比率"
              value={formatNumber(stock.debtRatio)}
              suffix="%"
            />
            <MetricRow
              label="営業キャッシュフロー"
              value={
                stock.operatingCF !== null
                  ? formatMarketCap(stock.operatingCF)
                  : null
              }
            />
          </div>

          {/* Dividend */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">配当</h2>
            <MetricRow
              label="配当利回り"
              value={formatNumber(stock.dividendYield)}
              suffix="%"
            />
            <MetricRow
              label="連続増配年数"
              value={stock.consecutiveDividendYears}
              suffix="年"
            />
            <MetricRow
              label="配当性向"
              value={formatNumber(stock.payoutRatio)}
              suffix="%"
            />
          </div>

          {/* Technical */}
          <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">テクニカル指標</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">RSI (14)</div>
                <div className="text-2xl font-bold">
                  {formatNumber(stock.rsi, 1)}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">50日移動平均</div>
                <div className="text-2xl font-bold">
                  ${formatNumber(stock.sma50)}
                </div>
                <div
                  className={`text-sm ${
                    stock.sma50 && stock.price > stock.sma50
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {stock.sma50 && stock.price > stock.sma50 ? '上回る' : '下回る'}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">200日移動平均</div>
                <div className="text-2xl font-bold">
                  ${formatNumber(stock.sma200)}
                </div>
                <div
                  className={`text-sm ${
                    stock.sma200 && stock.price > stock.sma200
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {stock.sma200 && stock.price > stock.sma200
                    ? '上回る'
                    : '下回る'}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">MACDシグナル</div>
                <div className="mt-1">
                  <TrendIndicator signal={stock.macdSignal} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment */}
        {sentiment && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">X (Twitter) センチメント</h2>
              <span className="text-xs text-gray-500">
                分析日時: {new Date(sentiment.fetched_at).toLocaleString('ja-JP')}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">スコア</div>
                <div
                  className={`text-3xl font-bold ${
                    sentiment.sentiment_score > 20
                      ? 'text-green-400'
                      : sentiment.sentiment_score < -20
                        ? 'text-red-400'
                        : 'text-yellow-400'
                  }`}
                >
                  {sentiment.sentiment_score > 0 ? '+' : ''}
                  {sentiment.sentiment_score}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">ツイート数</div>
                <div className="text-2xl font-bold">{sentiment.tweet_count}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">ポジ / ニュートラル / ネガ</div>
                <div className="flex items-center gap-2 text-lg font-bold">
                  <span className="text-green-400">{sentiment.positive_count}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-yellow-400">{sentiment.neutral_count}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-red-400">{sentiment.negative_count}</span>
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">ネガティブKW検出</div>
                <div
                  className={`text-2xl font-bold ${
                    sentiment.negative_keyword_count > 0 ? 'text-red-400' : 'text-gray-400'
                  }`}
                >
                  {sentiment.negative_keyword_count}件
                </div>
              </div>
            </div>
            {sentiment.sample_tweets && sentiment.sample_tweets.length > 0 && (
              <div>
                <h3 className="text-sm text-gray-400 mb-2">注目ツイート（エンゲージメント順）</h3>
                <div className="space-y-2">
                  {sentiment.sample_tweets.map((tweet: { id: string; text: string; authorUsername: string; sentiment: string; createdAt: string }, i: number) => (
                    <a
                      key={i}
                      href={tweet.id ? `https://x.com/i/web/status/${tweet.id}` : `https://x.com/${tweet.authorUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-700 rounded p-3 text-sm hover:bg-gray-600 border border-transparent hover:border-gray-500 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            tweet.sentiment === 'positive'
                              ? 'bg-green-900 text-green-300'
                              : tweet.sentiment === 'negative'
                                ? 'bg-red-900 text-red-300'
                                : 'bg-gray-600 text-gray-300'
                          }`}
                        >
                          {tweet.sentiment === 'positive'
                            ? 'Positive'
                            : tweet.sentiment === 'negative'
                              ? 'Negative'
                              : 'Neutral'}
                        </span>
                        {tweet.authorUsername && (
                          <span className="text-blue-400 font-medium">@{tweet.authorUsername}</span>
                        )}
                        {tweet.createdAt && (
                          <span className="text-gray-500 text-xs ml-auto">
                            {new Date(tweet.createdAt).toLocaleString('ja-JP')}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-300 line-clamp-2">{tweet.text}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Competitors */}
        {competitors.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              同セクター銘柄との比較
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2">銘柄</th>
                    <th className="text-right py-3 px-2">株価</th>
                    <th className="text-right py-3 px-2">PER</th>
                    <th className="text-right py-3 px-2">ROE</th>
                    <th className="text-right py-3 px-2">配当利回り</th>
                    <th className="text-center py-3 px-2">スコア</th>
                    <th className="text-center py-3 px-2">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((comp) => (
                    <tr
                      key={comp.symbol}
                      className="border-b border-gray-700 hover:bg-gray-750"
                    >
                      <td className="py-3 px-2">
                        <span className="font-semibold text-blue-400">
                          {comp.symbol}
                        </span>
                        <div className="text-xs text-gray-400">{comp.name}</div>
                      </td>
                      <td className="text-right py-3 px-2">
                        ${comp.price.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-2">
                        {formatNumber(comp.per)}
                      </td>
                      <td className="text-right py-3 px-2">
                        {formatNumber(comp.roe)}%
                      </td>
                      <td className="text-right py-3 px-2">
                        {formatNumber(comp.dividendYield)}%
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="px-2 py-1 bg-gray-700 rounded">
                          {comp.score.total}
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <Link
                          href={`/stocks/${comp.symbol}`}
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
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg text-sm text-gray-400">
          <p>
            ※ 本サイトは投資助言を目的としたものではありません。投資判断は自己責任でお願いします。
            データは参考値であり、実際の値と異なる場合があります。
          </p>
        </div>
      </div>
    </div>
  );
}
