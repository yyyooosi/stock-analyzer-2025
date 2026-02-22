import { NextRequest, NextResponse } from 'next/server';
import {
  getNextSymbolsToProcess,
  saveSentimentResult,
  initializeSentimentTable,
} from '@/app/utils/database';
import {
  searchTickerMentionsDirect,
  aggregateSentiment,
} from '@/app/utils/twitterAPI';

const BATCH_SIZE = 10;

/**
 * POST /api/twitter/batch
 *
 * GitHub Actions (0 *\/8 * * *) から8時間ごとに呼び出される。
 * 1回の実行で最大10銘柄を処理する。
 *
 * データソース: StockTwits API（認証不要・無料）
 *
 * 処理順序:
 *   1. まだセンチメントデータがない銘柄（新規追加分）
 *   2. 最も古いデータの銘柄
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // テーブル初期化（存在しなければ作成）
    await initializeSentimentTable();

    // 処理対象の銘柄を最大10件取得
    const symbols = await getNextSymbolsToProcess(BATCH_SIZE);

    if (symbols.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'ウォッチリストに銘柄がありません',
        processed: [],
      });
    }

    console.log(`[Batch] 処理開始: ${symbols.join(', ')} (${symbols.length}銘柄)`);

    const results: {
      symbol: string;
      status: 'success' | 'skipped' | 'error';
      tweetCount?: number;
      sentimentScore?: number;
      reason?: string;
    }[] = [];

    for (const symbol of symbols) {
      // StockTwits でメッセージを取得 → センチメント分析
      let tweets;
      try {
        tweets = await searchTickerMentionsDirect(symbol, 20);
      } catch (apiError) {
        console.warn(
          `[Batch] StockTwits エラー (${symbol}), スキップ:`,
          apiError instanceof Error ? apiError.message : apiError
        );
        results.push({
          symbol,
          status: 'error',
          reason: apiError instanceof Error ? apiError.message : 'Unknown error',
        });
        continue;
      }

      // ツイートが0件の場合はスキップ（保存しない）
      if (tweets.length === 0) {
        console.warn(`[Batch] ${symbol} のツイートが0件、スキップ`);
        results.push({ symbol, status: 'skipped', tweetCount: 0 });
        continue;
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

      results.push({
        symbol,
        status: 'success',
        tweetCount: aggregation.tweetCount,
        sentimentScore: aggregation.sentimentScore,
      });
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    console.log(
      `[Batch] 全処理完了: 成功=${successCount}, スキップ=${skippedCount}, エラー=${errorCount}`
    );

    return NextResponse.json({
      success: true,
      message: `${symbols.length}銘柄を処理しました (成功: ${successCount}, スキップ: ${skippedCount}, エラー: ${errorCount})`,
      processed: results,
    });
  } catch (error) {
    console.error('[Batch] バッチ処理エラー:', error);
    return NextResponse.json(
      { success: false, error: 'バッチ処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twitter/batch
 *
 * 次に処理される銘柄（最大10件）を確認するためのエンドポイント
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeSentimentTable();
    const nextSymbols = await getNextSymbolsToProcess(BATCH_SIZE);

    return NextResponse.json({
      nextSymbols,
      message: nextSymbols.length > 0
        ? `次の処理対象 (${nextSymbols.length}銘柄): ${nextSymbols.join(', ')}`
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
