import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@vercel/postgres';

// デバッグ用: ウォッチリストのデータを詳細表示
export async function GET() {
  try {
    let session;
    try {
      session = await auth();
    } catch (authError) {
      console.error('認証エラー:', authError);
      return NextResponse.json(
        { error: '認証が必要です', authError: String(authError) },
        { status: 401 }
      );
    }

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です', session: session },
        { status: 401 }
      );
    }

    // 直接SQLクエリを実行してデバッグ情報を取得
    const userEmail = session.user.email;

    console.log('=== デバッグ情報 ===');
    console.log('ユーザーメール:', userEmail);

    // すべてのレコードを取得（LIMITなし）
    const { rows, rowCount } = await sql`
      SELECT id, user_email, symbol, added_at,
             to_char(added_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_date
      FROM watchlist
      WHERE user_email = ${userEmail}
      ORDER BY added_at DESC
    `;

    console.log('取得した行数:', rowCount);
    console.log('Rows配列の長さ:', rows.length);
    console.log('取得したデータ:', JSON.stringify(rows, null, 2));

    // テーブルの全体統計も取得
    const { rows: statsRows } = await sql`
      SELECT
        user_email,
        COUNT(*) as count
      FROM watchlist
      WHERE user_email = ${userEmail}
      GROUP BY user_email
    `;

    return NextResponse.json({
      success: true,
      userEmail,
      rowCount,
      rowsLength: rows.length,
      data: rows,
      stats: statsRows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('デバッグエンドポイントエラー:', error);
    return NextResponse.json(
      {
        error: 'デバッグ情報の取得に失敗しました',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
