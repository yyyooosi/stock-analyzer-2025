import { NextRequest, NextResponse } from 'next/server';
import { sendTestNotification } from '@/app/utils/notifications';

/**
 * テスト通知送信API
 * POST /api/notifications/test
 * Body: { type: 'slack' | 'discord' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (!type || (type !== 'slack' && type !== 'discord')) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification type. Must be "slack" or "discord"' },
        { status: 400 }
      );
    }

    console.log(`[Notification Test] Sending test notification to ${type}...`);

    const result = await sendTestNotification(type);

    if (result.success) {
      console.log(`[Notification Test] Test notification sent successfully to ${type}`);
      return NextResponse.json({
        success: true,
        message: `テスト通知が${type === 'slack' ? 'Slack' : 'Discord'}に送信されました`,
      });
    } else {
      console.error(`[Notification Test] Failed to send test notification to ${type}:`, result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'テスト通知の送信に失敗しました',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test notification API error:', error);
    return NextResponse.json(
      { success: false, error: 'テスト通知の送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
