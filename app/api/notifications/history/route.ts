import { NextResponse } from 'next/server';
import { getNotificationHistory } from '@/app/utils/notifications';

/**
 * 通知履歴取得API
 * GET /api/notifications/history
 */
export async function GET() {
  try {
    const history = getNotificationHistory(100);

    return NextResponse.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error('Notification history API error:', error);
    return NextResponse.json(
      { success: false, error: '通知履歴の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
