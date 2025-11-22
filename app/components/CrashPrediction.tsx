'use client';

import { useState } from 'react';
import { CrashPrediction } from '../utils/crashPrediction';
import { Tweet } from '../utils/twitterAPI';

interface CrashPredictionProps {
  prediction: CrashPrediction;
  symbol: string;
  tweets: Tweet[];
}

export function CrashPredictionComponent({ prediction, symbol, tweets }: CrashPredictionProps) {
  const [showAllTweets, setShowAllTweets] = useState(false);
  const displayTweets = showAllTweets ? tweets : tweets.slice(0, 10);
  // リスクレベルに応じた色
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-500 bg-red-900/30 border-red-500';
      case 'high':
        return 'text-orange-500 bg-orange-900/30 border-orange-500';
      case 'medium':
        return 'text-yellow-500 bg-yellow-900/30 border-yellow-500';
      case 'low':
        return 'text-green-500 bg-green-900/30 border-green-500';
      default:
        return 'text-gray-500 bg-gray-900/30 border-gray-500';
    }
  };

  // リスクレベルのラベル
  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical':
        return '危機的';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '不明';
    }
  };

  // センチメントの色
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'very_negative':
        return 'text-red-400';
      case 'negative':
        return 'text-orange-400';
      case 'neutral':
        return 'text-yellow-400';
      case 'positive':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  // センチメントのラベル
  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'very_negative':
        return '非常にネガティブ';
      case 'negative':
        return 'ネガティブ';
      case 'neutral':
        return '中立';
      case 'positive':
        return 'ポジティブ';
      default:
        return '不明';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">暴落予測分析（X投稿センチメント）</h3>
        <div className={`px-4 py-2 rounded-lg border-2 ${getRiskColor(prediction.riskLevel)}`}>
          <span className="font-bold">リスクレベル: {getRiskLabel(prediction.riskLevel)}</span>
        </div>
      </div>

      {/* リスクスコア */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300">暴落リスクスコア</span>
          <span className="text-2xl font-bold">{prediction.riskScore}/100</span>
        </div>
        <div className="bg-gray-600 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${
              prediction.riskScore >= 75 ? 'bg-red-500' :
              prediction.riskScore >= 50 ? 'bg-orange-500' :
              prediction.riskScore >= 30 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${prediction.riskScore}%` }}
          ></div>
        </div>
      </div>

      {/* 予測メッセージ */}
      <div className={`rounded-lg p-4 border-l-4 ${getRiskColor(prediction.riskLevel)}`}>
        <p className="text-gray-200">{prediction.prediction}</p>
      </div>

      {/* センチメント分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3 text-gray-300">センチメント分析</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">ネガティブスコア:</span>
              <span className="font-bold">{prediction.sentiment.averageNegativeScore}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">全体センチメント:</span>
              <span className={`font-bold ${getSentimentColor(prediction.sentiment.overallSentiment)}`}>
                {getSentimentLabel(prediction.sentiment.overallSentiment)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ネガティブワード数:</span>
              <span className="font-bold">{prediction.sentiment.totalNegativeWords}個</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3 text-gray-300">投稿分析</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">総投稿数:</span>
              <span className="font-bold">{prediction.tweetAnalysis.totalTweets}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">過去1時間:</span>
              <span className="font-bold">{prediction.tweetAnalysis.recentTweets}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">バイラル投稿:</span>
              <span className="font-bold text-orange-400">{prediction.tweetAnalysis.viralTweets}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">平均エンゲージメント:</span>
              <span className="font-bold">{prediction.tweetAnalysis.averageEngagement}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 頻出ネガティブワード */}
      {prediction.sentiment.mostCommonWords.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3 text-gray-300">頻出ネガティブワード</h4>
          <div className="flex flex-wrap gap-2">
            {prediction.sentiment.mostCommonWords.slice(0, 8).map((item, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-red-900/40 text-red-300 rounded-full text-sm"
              >
                {item.word} <span className="font-bold">({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 警告メッセージ */}
      {prediction.warnings.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3 text-gray-300">警告</h4>
          <ul className="space-y-2">
            {prediction.warnings.map((warning, index) => (
              <li key={index} className="text-gray-300 flex items-start">
                <span className="mr-2">{warning.startsWith('✅') ? '✅' : '⚠️'}</span>
                <span>{warning.replace(/^[✅⚠️]\s*/, '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 推奨アクション */}
      <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
        <h4 className="text-lg font-semibold mb-2 text-blue-400">💡 推奨アクション</h4>
        <p className="text-gray-200">{prediction.recommendation}</p>
      </div>

      {/* タイムライン（簡易版） */}
      {prediction.timeline.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3 text-gray-300">リスク推移</h4>
          <div className="flex items-end justify-between h-24 gap-1">
            {prediction.timeline.map((point, index) => {
              const height = `${point.riskScore}%`;
              const color = point.riskScore >= 75 ? 'bg-red-500' :
                           point.riskScore >= 50 ? 'bg-orange-500' :
                           point.riskScore >= 30 ? 'bg-yellow-500' :
                           'bg-green-500';

              return (
                <div
                  key={index}
                  className={`flex-1 ${color} rounded-t transition-all`}
                  style={{ height }}
                  title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.riskScore}点`}
                ></div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>過去</span>
            <span>現在</span>
          </div>
        </div>
      )}

      {/* X投稿一覧 */}
      {tweets.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-300">
              分析対象のX投稿 ({tweets.length}件)
            </h4>
            {tweets.length > 10 && (
              <button
                onClick={() => setShowAllTweets(!showAllTweets)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
              >
                {showAllTweets ? '最初の10件のみ表示' : `すべて表示 (${tweets.length}件)`}
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {displayTweets.map((tweet) => {
              const tweetDate = new Date(tweet.createdAt);
              const timeAgo = getTimeAgo(tweetDate);
              const totalEngagement =
                tweet.publicMetrics.retweetCount +
                tweet.publicMetrics.likeCount +
                tweet.publicMetrics.replyCount +
                tweet.publicMetrics.quoteCount;

              return (
                <div
                  key={tweet.id}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  {/* ツイートヘッダー */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-400">@{tweet.authorUsername}</span>
                      <span className="text-xs text-gray-500">{timeAgo}</span>
                    </div>
                    {totalEngagement >= 100 && (
                      <span className="px-2 py-0.5 bg-orange-900/40 text-orange-300 rounded text-xs">
                        🔥 バイラル
                      </span>
                    )}
                  </div>

                  {/* ツイート本文 */}
                  <p className="text-gray-200 text-sm mb-3 whitespace-pre-wrap">{tweet.text}</p>

                  {/* エンゲージメント */}
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>💬 {tweet.publicMetrics.replyCount}</span>
                    <span>🔁 {tweet.publicMetrics.retweetCount}</span>
                    <span>❤️ {tweet.publicMetrics.likeCount}</span>
                    {tweet.publicMetrics.quoteCount > 0 && (
                      <span>💭 {tweet.publicMetrics.quoteCount}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!showAllTweets && tweets.length > 10 && (
            <div className="mt-3 text-center text-sm text-gray-400">
              残り {tweets.length - 10} 件のツイートがあります
            </div>
          )}
        </div>
      )}

      {/* 免責事項 */}
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
        <p>※ この予測はX（旧Twitter）の投稿から自動的に抽出されたセンチメント分析に基づいています。投資判断の際は、テクニカル指標やファンダメンタルズも併せてご検討ください。</p>
      </div>
    </div>
  );

  // 時間経過を表示するヘルパー関数
  function getTimeAgo(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間前`;
    return `${Math.floor(seconds / 86400)}日前`;
  }
}
