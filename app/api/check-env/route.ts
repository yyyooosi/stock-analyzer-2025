import { NextResponse } from 'next/server';

export async function GET() {
  // 環境変数の存在チェック（値は表示しない）
  const envCheck = {
    // NextAuth v5 (推奨)
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    AUTH_TRUST_HOST: !!process.env.AUTH_TRUST_HOST,

    // NextAuth v4/v5 (後方互換性)
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,

    // OAuth Providers
    GITHUB_ID: !!process.env.GITHUB_ID,
    GITHUB_SECRET: !!process.env.GITHUB_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,

    // Database
    POSTGRES_URL: !!process.env.POSTGRES_URL,

    // Node環境
    NODE_ENV: process.env.NODE_ENV,
  };

  // 警告とエラーのチェック
  const warnings = [];
  const errors = [];

  // NextAuthシークレットのチェック
  if (!envCheck.AUTH_SECRET && !envCheck.NEXTAUTH_SECRET) {
    errors.push('AUTH_SECRET または NEXTAUTH_SECRET が設定されていません');
  }

  // OAuthプロバイダーのチェック
  const hasGitHub = envCheck.GITHUB_ID && envCheck.GITHUB_SECRET;
  const hasGoogle = envCheck.GOOGLE_CLIENT_ID && envCheck.GOOGLE_CLIENT_SECRET;

  if (!hasGitHub && !hasGoogle) {
    errors.push('GitHub または Google OAuth の認証情報が設定されていません');
  }

  if (envCheck.GITHUB_ID && !envCheck.GITHUB_SECRET) {
    errors.push('GITHUB_ID は設定されていますが、GITHUB_SECRET が設定されていません');
  }

  if (!envCheck.GITHUB_ID && envCheck.GITHUB_SECRET) {
    errors.push('GITHUB_SECRET は設定されていますが、GITHUB_ID が設定されていません');
  }

  // データベースのチェック
  if (!envCheck.POSTGRES_URL) {
    warnings.push('POSTGRES_URL が設定されていません（Vercel Storageでデータベースを作成してください）');
  }

  // AUTH_TRUST_HOSTのチェック
  if (!envCheck.AUTH_TRUST_HOST && !envCheck.NEXTAUTH_URL) {
    warnings.push('AUTH_TRUST_HOST または NEXTAUTH_URL の設定を推奨します');
  }

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return NextResponse.json({
    status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
    environment: envCheck,
    errors,
    warnings,
    recommendation: hasErrors
      ? '上記のエラーを解決してください。環境変数を設定した後は、必ず再デプロイしてください。'
      : hasWarnings
      ? '警告がありますが、動作する可能性があります。'
      : '全ての環境変数が正しく設定されています。',
    timestamp: new Date().toISOString(),
  });
}
