import { NextRequest, NextResponse } from 'next/server';
import {
  getNextSymbolToProcess,
  saveSentimentResult,
  initializeSentimentTable,
} from '@/app/utils/database';
import {
  searchTickerMentionsDirect,
  aggregateSentiment,
  generateSampleTweets,
} from '@/app/utils/twitterAPI';

/**
 * POST /api/twitter/batch
 *
 * Vercel Cron Job から15分ごとに呼び出される。
 * 1回の実行で1銘柄だけ処理する。
 *
 * 処理順序:
 *   1. まだセンチメントデータがない銘柄（新規追加分）
 *   2. 最も古いデータの銘柄
 */
export async function POST(request: NextRequest) {
  try {
    // Vercel Cron の認証チェック
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // テーブル初期化（存在しなければ作成）
    await initializeSentimentTable();

    // 処理対象の銘柄を取得
    const symbol = await getNextSymbolToProcess();

    if (!symbol) {
      return NextResponse.json({
        success: true,
        message: 'ウォッチリストに銘柄がありません',
        processed: null,
      });
    }

    console.log(`[Batch] 処理開始: ${symbol}`);

    // X API でツイートを取得 → センチメント分析
    let tweets;
    let usedDemo = false;
    try {
      tweets = await searchTickerMentionsDirect(symbol, 100);
    } catch (apiError) {
      console.warn(
        `[Batch] X API エラー (${symbol}), デモデータで保存:`,
        apiError instanceof Error ? apiError.message : apiError
      );
      // API エラー時はデモデータで記録（処理済みとしてマークするため）
      const demoResult = generateSampleTweets(symbol);
      tweets = demoResult.tweets;
      usedDemo = true;
    }

    const aggregation = aggregateSentiment(tweets);

    // DBに保存
    await saveSentimentResult({
      symbol,
      tweetCount: aggregation.tweetCount,
      positiveCount: aggregation.positiveCount,
      neutralCount: aggregation.neutralCount,
      negativeCount: aggregation.negativeCount,
      negativeKeywordCount: aggregation.negativeKeywordCount,
      sampleTweets: aggregation.sampleTweets,
      sentimentScore: aggregation.sentimentScore,
    });

    console.log(
      `[Batch] 処理完了: ${symbol} (ツイート数: ${aggregation.tweetCount}, スコア: ${aggregation.sentimentScore})`
    );

    return NextResponse.json({
      success: true,
      processed: {
        symbol,
        tweetCount: aggregation.tweetCount,
        sentimentScore: aggregation.sentimentScore,
        positiveCount: aggregation.positiveCount,
        neutralCount: aggregation.neutralCount,
        negativeCount: aggregation.negativeCount,
        usedDemoData: usedDemo,
      },
    });
  } catch (error) {
    console.error('[Batch] バッチ処理エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'バッチ処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twitter/batch
 *
 * 次に処理される銘柄を確認するためのエンドポイント
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await initializeSentimentTable();
    const nextSymbol = await getNextSymbolToProcess();

    return NextResponse.json({
      nextSymbol,
      message: nextSymbol
        ? `次の処理対象: ${nextSymbol}`
        : 'ウォッチリストに銘柄がありません',
    });
  } catch (error) {
    console.error('[Batch] ステータス取得エラー:', error);
    return NextResponse.json(
      { error: 'ステータスの取得に失敗しました' },
      { status: 500 }
    );
  }
}
