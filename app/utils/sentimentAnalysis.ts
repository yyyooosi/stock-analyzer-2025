// センチメント分析ユーティリティ
// X（Twitter）投稿のネガティブワード分析

export interface SentimentResult {
  negativeScore: number; // 0-100のスコア（高いほどネガティブ）
  negativeWords: string[]; // 検出されたネガティブワード
  totalWords: number; // 総単語数
  negativeRatio: number; // ネガティブワードの割合（0-1）
  language: 'ja' | 'en' | 'mixed';
}

// 日本語のネガティブワード辞書（投資・株式市場関連）
const JAPANESE_NEGATIVE_WORDS = [
  // 暴落関連
  '暴落', '大暴落', '急落', '下落', '続落', '反落',

  // 危機・リスク関連
  '危険', '危機', 'リスク', '懸念', '不安', '恐怖', '警戒',

  // 損失関連
  '損失', '赤字', '減益', '下方修正', '損切り', '塩漬け',

  // 市場状況
  '低迷', '不振', '悪化', '停滞', '下降', '縮小',

  // ネガティブ感情
  '最悪', 'ひどい', 'やばい', 'ダメ', '終わり', '崩壊',

  // 売り圧力
  '売られる', '売り圧力', '投げ売り', '手放す', '撤退',

  // その他
  '失敗', '問題', 'トラブル', '困難', '厳しい', '弱気',
  'ショック', 'パニック', 'クラッシュ', '破綻', '倒産'
];

// 英語のネガティブワード辞書（投資・株式市場関連）
const ENGLISH_NEGATIVE_WORDS = [
  // Crash related
  'crash', 'plunge', 'plummet', 'tumble', 'dive', 'collapse',
  'tank', 'drop', 'fall', 'decline', 'slump', 'sink',

  // Crisis & Risk
  'crisis', 'risk', 'danger', 'fear', 'panic', 'worry',
  'concern', 'threat', 'warning', 'alert',

  // Loss related
  'loss', 'losses', 'losing', 'deficit', 'negative', 'down',

  // Market condition
  'bear', 'bearish', 'downturn', 'recession', 'depression',
  'weak', 'weakness', 'poor', 'bad', 'worst', 'terrible',

  // Sell pressure
  'sell-off', 'selloff', 'selling', 'dump', 'dumping',

  // Others
  'fail', 'failure', 'problem', 'trouble', 'difficult',
  'shock', 'bankruptcy', 'bankrupt', 'disaster', 'catastrophe'
];

/**
 * テキストからネガティブワードを検出し、センチメントスコアを計算
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return {
      negativeScore: 0,
      negativeWords: [],
      totalWords: 0,
      negativeRatio: 0,
      language: 'mixed'
    };
  }

  const lowerText = text.toLowerCase();
  const detectedWords: string[] = [];

  // 日本語のネガティブワードをチェック
  let japaneseCount = 0;
  JAPANESE_NEGATIVE_WORDS.forEach(word => {
    if (text.includes(word)) {
      detectedWords.push(word);
      // 出現回数をカウント
      const matches = text.match(new RegExp(word, 'g'));
      japaneseCount += matches ? matches.length : 0;
    }
  });

  // 英語のネガティブワードをチェック
  let englishCount = 0;
  ENGLISH_NEGATIVE_WORDS.forEach(word => {
    // 単語境界を考慮した正規表現でマッチング
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      detectedWords.push(word);
      englishCount += matches.length;
    }
  });

  // 言語判定
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);
  const language: 'ja' | 'en' | 'mixed' =
    hasJapanese && hasEnglish ? 'mixed' :
    hasJapanese ? 'ja' : 'en';

  // 総単語数の推定（簡易的な方法）
  const japaneseWords = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
  const englishWords = text.match(/\b[a-zA-Z]+\b/g) || [];
  const totalWords = japaneseWords.length + englishWords.length;

  const totalNegativeCount = japaneseCount + englishCount;

  // ネガティブワードの割合を計算
  const negativeRatio = totalWords > 0 ? totalNegativeCount / totalWords : 0;

  // ネガティブスコアを0-100にスケーリング
  // 10%以上がネガティブワードなら高スコア
  const negativeScore = Math.min(100, negativeRatio * 1000);

  return {
    negativeScore: Math.round(negativeScore),
    negativeWords: [...new Set(detectedWords)], // 重複を除去
    totalWords,
    negativeRatio,
    language
  };
}

/**
 * 複数のツイートからセンチメントを集約分析
 */
export function analyzeMultipleTweets(tweets: string[]): {
  averageNegativeScore: number;
  totalNegativeWords: number;
  mostCommonNegativeWords: { word: string; count: number }[];
  overallSentiment: 'very_negative' | 'negative' | 'neutral' | 'positive';
  riskLevel: 'high' | 'medium' | 'low';
} {
  if (tweets.length === 0) {
    return {
      averageNegativeScore: 0,
      totalNegativeWords: 0,
      mostCommonNegativeWords: [],
      overallSentiment: 'neutral',
      riskLevel: 'low'
    };
  }

  // 各ツイートを分析
  const results = tweets.map(tweet => analyzeSentiment(tweet));

  // 平均ネガティブスコア
  const averageNegativeScore = results.reduce((sum, r) => sum + r.negativeScore, 0) / results.length;

  // ネガティブワードの出現頻度を集計
  const wordFrequency: { [word: string]: number } = {};
  results.forEach(result => {
    result.negativeWords.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });

  // 頻出ネガティブワードをソート
  const mostCommonNegativeWords = Object.entries(wordFrequency)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // トップ10

  const totalNegativeWords = Object.values(wordFrequency).reduce((sum, count) => sum + count, 0);

  // 全体センチメントの判定
  let overallSentiment: 'very_negative' | 'negative' | 'neutral' | 'positive';
  if (averageNegativeScore >= 70) {
    overallSentiment = 'very_negative';
  } else if (averageNegativeScore >= 40) {
    overallSentiment = 'negative';
  } else if (averageNegativeScore >= 20) {
    overallSentiment = 'neutral';
  } else {
    overallSentiment = 'positive';
  }

  // リスクレベルの判定
  let riskLevel: 'high' | 'medium' | 'low';
  if (averageNegativeScore >= 60 || totalNegativeWords >= tweets.length * 2) {
    riskLevel = 'high';
  } else if (averageNegativeScore >= 30 || totalNegativeWords >= tweets.length) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    averageNegativeScore: Math.round(averageNegativeScore),
    totalNegativeWords,
    mostCommonNegativeWords,
    overallSentiment,
    riskLevel
  };
}

/**
 * センチメントスコアから暴落リスクを評価
 */
export function evaluateCrashRisk(sentimentScore: number, tweetCount: number): {
  riskScore: number; // 0-100 (高いほど危険)
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  message: string;
} {
  // ツイート数が多く、ネガティブスコアが高いほどリスクが高い
  const volumeFactor = Math.min(1, tweetCount / 100); // 100ツイート以上で最大
  const sentimentFactor = sentimentScore / 100;

  const riskScore = Math.round((sentimentFactor * 0.7 + volumeFactor * 0.3) * 100);

  let riskLevel: 'critical' | 'high' | 'medium' | 'low';
  let message: string;

  if (riskScore >= 75) {
    riskLevel = 'critical';
    message = '⚠️ 極めて高い暴落リスク - SNS上で大量のネガティブな投稿が検出されました';
  } else if (riskScore >= 50) {
    riskLevel = 'high';
    message = '⚠️ 高い暴落リスク - ネガティブなセンチメントが広がっています';
  } else if (riskScore >= 30) {
    riskLevel = 'medium';
    message = '⚠️ 中程度の暴落リスク - 一部ネガティブな反応が見られます';
  } else {
    riskLevel = 'low';
    message = '✅ 低い暴落リスク - センチメントは比較的安定しています';
  }

  return {
    riskScore,
    riskLevel,
    message
  };
}
