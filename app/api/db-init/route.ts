import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/app/utils/database';

// データベースの初期化エンドポイント
export async function GET() {
  try {
    await initializeDatabase();
    return NextResponse.json({
      success: true,
      message: 'データベースの初期化が完了しました',
    });
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'データベースの初期化に失敗しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
