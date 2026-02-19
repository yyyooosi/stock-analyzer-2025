import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  checkRateLimit,
  getClientIdentifier,
  RateLimitConfigs,
  createRateLimitHeaders,
} from '@/app/utils/rateLimit';

// 環境変数チェックエンドポイント
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

  // Security: Only allow in development
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
    } catch {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
  }

  // 環境変数の存在チェック（値は表示しない、詳細な変数名も隠蔽）
  const envCheck = {
    // NextAuth (詳細は隠蔽)
    authSecretConfigured: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    authTrustHostConfigured: !!(process.env.AUTH_TRUST_HOST || process.env.NEXTAUTH_URL),

    // OAuth Providers (存在のみ、詳細は非表示)
    githubOAuthConfigured: !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
    googleOAuthConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),

    // Database
    databaseConfigured: !!process.env.POSTGRES_URL,

    // External APIs (存在のみ)
    stockApiConfigured: !!(process.env.FMP_API_KEY || process.env.ALPHA_VANTAGE_API_KEY),
    apifyConfigured: !!process.env.APIFY_API_TOKEN,
    fredApiConfigured: !!process.env.FRED_API_KEY,

    // Node環境
    environment: process.env.NODE_ENV,
  };

  // 警告とエラーのチェック
  const warnings: string[] = [];
  const errors: string[] = [];

  // NextAuthシークレットのチェック
  if (!envCheck.authSecretConfigured) {
    errors.push('認証シークレットが設定されていません');
  }

  // OAuthプロバイダーのチェック
  if (!envCheck.githubOAuthConfigured && !envCheck.googleOAuthConfigured) {
    errors.push('OAuth認証情報が設定されていません');
  }

  // データベースのチェック
  if (!envCheck.databaseConfigured) {
    warnings.push('データベースが設定されていません');
  }

  // AUTH_TRUST_HOSTのチェック
  if (!envCheck.authTrustHostConfigured) {
    warnings.push('認証ホスト設定を推奨します');
  }

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return NextResponse.json(
    {
      status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
      configuration: envCheck,
      errors,
      warnings,
      recommendation: hasErrors
        ? '必要な設定を完了してください'
        : hasWarnings
        ? '一部の設定が不足していますが動作可能です'
        : '設定が正しく完了しています',
      timestamp: new Date().toISOString(),
    },
    { headers: createRateLimitHeaders(rateLimitResult) }
  );
}
