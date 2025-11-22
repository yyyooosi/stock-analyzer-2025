// 暴落予測ロジック
// X投稿のセンチメント分析と株価データを組み合わせた予測

import { Tweet } from './twitterAPI';
import { analyzeMultipleTweets, evaluateCrashRisk } from './sentimentAnalysis';

export interface CrashPrediction {
  riskScore: number; // 0-100 (高いほど暴落リスクが高い)
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  prediction: string;
  sentiment: {
    averageNegativeScore: number;
    totalNegativeWords: number;
    mostCommonWords: { word: string; count: number }[];
    overallSentiment: 'very_negative' | 'negative' | 'neutral' | 'positive';
  };
  tweetAnalysis: {
    totalTweets: number;
    recentTweets: number; // 過去1時間のツイート数
    viralTweets: number; // バイラル化しているツイート（高エンゲージメント）
    averageEngagement: number;
  };
  timeline: {
    timestamp: string;
    riskScore: number;
  }[];
  recommendation: string;
  warnings: string[];
}

/**
 * ツイートデータから暴落リスクを予測
 */
export function predictCrash(tweets: Tweet[]): CrashPrediction {
  if (tweets.length === 0) {
    return {
      riskScore: 0,
      riskLevel: 'low',
      prediction: 'データ不足のため予測できません',
      sentiment: {
        averageNegativeScore: 0,
        totalNegativeWords: 0,
        mostCommonWords: [],
        overallSentiment: 'neutral'
      },
      tweetAnalysis: {
        totalTweets: 0,
        recentTweets: 0,
        viralTweets: 0,
        averageEngagement: 0
      },
      timeline: [],
      recommendation: 'より多くのデータを収集してください',
      warnings: []
    };
  }

  // ツイートテキストを抽出
  const tweetTexts = tweets.map(t => t.text);

  // センチメント分析を実行
  const sentimentAnalysis = analyzeMultipleTweets(tweetTexts);

  // ツイート分析
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentTweets = tweets.filter(t => new Date(t.createdAt) > oneHourAgo).length;

  // バイラルツイート（高エンゲージメント）の判定
  // リツイート+いいね+リプライが100以上
  const viralTweets = tweets.filter(t => {
    const engagement = t.publicMetrics.retweetCount +
                      t.publicMetrics.likeCount +
                      t.publicMetrics.replyCount;
    return engagement >= 100;
  }).length;

  // 平均エンゲージメントを計算
  const totalEngagement = tweets.reduce((sum, t) => {
    return sum + t.publicMetrics.retweetCount +
           t.publicMetrics.likeCount +
           t.publicMetrics.replyCount +
           t.publicMetrics.quoteCount;
  }, 0);
  const averageEngagement = tweets.length > 0 ? totalEngagement / tweets.length : 0;

  // 暴落リスクの評価
  const riskEvaluation = evaluateCrashRisk(
    sentimentAnalysis.averageNegativeScore,
    tweets.length
  );

  // タイムライン分析（時系列でリスクスコアを追跡）
  const timeline = generateTimeline(tweets);

  // リスクレベルに応じた予測メッセージ
  const prediction = generatePrediction(
    riskEvaluation.riskLevel,
    sentimentAnalysis.averageNegativeScore,
    tweets.length,
    viralTweets
  );

  // 推奨アクション
  const recommendation = generateRecommendation(
    riskEvaluation.riskLevel,
    sentimentAnalysis.overallSentiment
  );

  // 警告メッセージ
  const warnings = generateWarnings(
    riskEvaluation.riskLevel,
    sentimentAnalysis.averageNegativeScore,
    viralTweets,
    recentTweets
  );

  return {
    riskScore: riskEvaluation.riskScore,
    riskLevel: riskEvaluation.riskLevel,
    prediction,
    sentiment: {
      averageNegativeScore: sentimentAnalysis.averageNegativeScore,
      totalNegativeWords: sentimentAnalysis.totalNegativeWords,
      mostCommonWords: sentimentAnalysis.mostCommonNegativeWords,
      overallSentiment: sentimentAnalysis.overallSentiment
    },
    tweetAnalysis: {
      totalTweets: tweets.length,
      recentTweets,
      viralTweets,
      averageEngagement: Math.round(averageEngagement)
    },
    timeline,
    recommendation,
    warnings
  };
}

/**
 * タイムライン分析（時系列データの生成）
 */
function generateTimeline(tweets: Tweet[]): { timestamp: string; riskScore: number }[] {
  // ツイートを時系列でソート
  const sortedTweets = [...tweets].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 5分間隔でツイートをグループ化
  const timeGroups: { [key: string]: Tweet[] } = {};

  sortedTweets.forEach(tweet => {
    const date = new Date(tweet.createdAt);
    // 5分単位に丸める
    const roundedMinutes = Math.floor(date.getMinutes() / 5) * 5;
    date.setMinutes(roundedMinutes, 0, 0);
    const key = date.toISOString();

    if (!timeGroups[key]) {
      timeGroups[key] = [];
    }
    timeGroups[key].push(tweet);
  });

  // 各時間グループのリスクスコアを計算
  const timeline = Object.entries(timeGroups).map(([timestamp, groupTweets]) => {
    const texts = groupTweets.map(t => t.text);
    const sentiment = analyzeMultipleTweets(texts);
    const risk = evaluateCrashRisk(sentiment.averageNegativeScore, groupTweets.length);

    return {
      timestamp,
      riskScore: risk.riskScore
    };
  });

  // 時系列でソート
  return timeline.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * リスクレベルに応じた予測メッセージを生成
 */
function generatePrediction(
  riskLevel: 'critical' | 'high' | 'medium' | 'low',
  negativeScore: number,
  tweetCount: number,
  viralCount: number
): string {
  switch (riskLevel) {
    case 'critical':
      return `🚨 極めて高い暴落リスクを検出しました。SNS上で大量のネガティブな投稿（${tweetCount}件、うちバイラル${viralCount}件）が確認され、市場パニックの可能性があります。早急な対応を推奨します。`;

    case 'high':
      return `⚠️ 高い暴落リスクが検出されています。ネガティブなセンチメント（スコア: ${negativeScore}/100）が市場に広がっており、株価への影響が懸念されます。慎重な監視が必要です。`;

    case 'medium':
      return `⚡ 中程度の暴落リスクが検出されました。一部でネガティブな反応が見られますが、現時点では限定的です。市場動向に注意を払ってください。`;

    case 'low':
      return `✅ 現時点では暴落リスクは低いと判断されます。センチメントは比較的安定しており、大きな懸念は見られません。通常の投資判断を継続できます。`;

    default:
      return '予測データを分析中です。';
  }
}

/**
 * 推奨アクションを生成
 */
function generateRecommendation(
  riskLevel: 'critical' | 'high' | 'medium' | 'low',
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive'
): string {
  if (riskLevel === 'critical') {
    return '💡 推奨: ポジションの縮小、ストップロスの設定、防御的な銘柄へのシフトを検討してください。市場が落ち着くまで新規投資は控えることをお勧めします。';
  }

  if (riskLevel === 'high') {
    return '💡 推奨: リスク管理を強化し、ポートフォリオのリバランスを検討してください。損切りラインを明確にし、市場の動向を注意深く監視してください。';
  }

  if (riskLevel === 'medium') {
    return '💡 推奨: 慎重な姿勢を維持しつつ、テクニカル指標と併せて総合的に判断してください。急激な市場変動に備えた準備をしておくことをお勧めします。';
  }

  return '💡 推奨: 通常の投資戦略を継続できます。ただし、定期的にセンチメントとテクニカル指標をチェックし、市場の変化に対応できるようにしてください。';
}

/**
 * 警告メッセージを生成
 */
function generateWarnings(
  riskLevel: 'critical' | 'high' | 'medium' | 'low',
  negativeScore: number,
  viralCount: number,
  recentCount: number
): string[] {
  const warnings: string[] = [];

  if (riskLevel === 'critical' || riskLevel === 'high') {
    warnings.push('⚠️ 高いネガティブセンチメントが検出されています');
  }

  if (viralCount > 3) {
    warnings.push(`⚠️ バイラル化したネガティブ投稿が${viralCount}件確認されています`);
  }

  if (recentCount > 20) {
    warnings.push(`⚠️ 過去1時間で${recentCount}件の関連投稿があり、話題が急速に拡散中です`);
  }

  if (negativeScore >= 70) {
    warnings.push('⚠️ 極めて高いネガティブスコアを記録しています');
  }

  if (warnings.length === 0) {
    warnings.push('✅ 現時点で重大な警告はありません');
  }

  return warnings;
}

/**
 * 暴落予測とテクニカル分析を統合
 */
export function integrateWithTechnicalAnalysis(
  crashPrediction: CrashPrediction,
  technicalSignal: 'BUY' | 'SELL' | 'HOLD',
  technicalScore: number
): {
  finalScore: number;
  finalSignal: 'STRONG_SELL' | 'SELL' | 'HOLD' | 'BUY' | 'STRONG_BUY';
  reasoning: string;
} {
  // センチメント分析とテクニカル分析の重み付け統合
  // センチメント: 40%, テクニカル: 60%
  const sentimentWeight = 0.4;
  const technicalWeight = 0.6;

  // リスクスコアを逆転（高リスク = 低スコア）
  const invertedRiskScore = 100 - crashPrediction.riskScore;

  // 統合スコアの計算
  const finalScore = Math.round(
    (invertedRiskScore * sentimentWeight) + (technicalScore * technicalWeight)
  );

  // 最終シグナルの決定
  let finalSignal: 'STRONG_SELL' | 'SELL' | 'HOLD' | 'BUY' | 'STRONG_BUY';

  if (crashPrediction.riskLevel === 'critical') {
    finalSignal = 'STRONG_SELL';
  } else if (crashPrediction.riskLevel === 'high' || finalScore < 30) {
    finalSignal = 'SELL';
  } else if (finalScore < 45) {
    finalSignal = 'HOLD';
  } else if (finalScore >= 70 && crashPrediction.riskLevel === 'low') {
    finalSignal = 'STRONG_BUY';
  } else if (finalScore >= 55) {
    finalSignal = 'BUY';
  } else {
    finalSignal = 'HOLD';
  }

  // 判断理由
  const reasoning = `テクニカル分析: ${technicalSignal} (${technicalScore}点), センチメント分析: リスクレベル ${crashPrediction.riskLevel} (${crashPrediction.riskScore}点). 統合判定により最終スコア${finalScore}点で${finalSignal}と判断しました。`;

  return {
    finalScore,
    finalSignal,
    reasoning
  };
}
