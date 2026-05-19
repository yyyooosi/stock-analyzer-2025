import { NextRequest, NextResponse } from 'next/server';
import { calculateBsi } from '@/app/utils/bsi/compute/bsi';

// GitHub Actions Cron または手動実行で BSI を計算するエンドポイント
export async function POST(request: NextRequest) {
  // CRON_SECRET による認証
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }

  try {
    console.log('[BSI] 計算開始');
    const result = await calculateBsi();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[BSI] 計算エラー:', error);
    return NextResponse.json(
      { success: false, error: 'BSI 計算に失敗しました' },
      { status: 500 }
    );
  }
}

// 開発用: GET でも計算できるようにする
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: '本番環境では POST を使用してください' }, { status: 405 });
  }
  return POST(request);
}
