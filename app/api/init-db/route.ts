import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/app/utils/database';

// データベーステーブルを初期化するエンドポイント
// 一度だけ実行すればOK
export async function GET() {
  try {
    console.log('データベース初期化を開始...');
    await initializeDatabase();
    console.log('データベース初期化が完了しました');

    return NextResponse.json({
      success: true,
      message: 'データベースの初期化が完了しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'データベースの初期化に失敗しました',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
