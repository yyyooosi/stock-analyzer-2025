import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/app/utils/database';
import { auth } from '@/auth';
import {
  checkRateLimit,
  getClientIdentifier,
  RateLimitConfigs,
  createRateLimitHeaders,
} from '@/app/utils/rateLimit';

// データベースの初期化エンドポイント
// セキュリティ: このエンドポイントは開発環境のみで使用可能、または認証が必要
export async function GET(request: NextRequest) {
  // Rate limiting (admin level - very restrictive)
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.admin);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  // Security: Only allow in development, or require authentication in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDevelopment) {
    // In production, require authentication
    try {
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'このエンドポイントは認証が必要です' },
          { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
        );
      }

      // Log the user who triggered the init (without exposing email)
      console.log(`[Security] db-init triggered by authenticated user`);
    } catch {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
  }

  try {
    await initializeDatabase();
    return NextResponse.json(
      {
        success: true,
        message: 'データベースの初期化が完了しました',
      },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'データベースの初期化に失敗しました',
      },
      { status: 500, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }
}
