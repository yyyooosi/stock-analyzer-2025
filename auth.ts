import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

// 認証プロバイダーの設定（環境変数がある場合のみ）
const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

// 環境変数チェック
if (providers.length === 0) {
  console.warn('⚠️ 警告: OAuth プロバイダーが設定されていません');
  console.warn('   GITHUB_ID と GITHUB_SECRET を環境変数に設定してください');
  console.warn('   設定後は必ず再デプロイしてください');
}

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.error('❌ エラー: AUTH_SECRET または NEXTAUTH_SECRET が設定されていません');
  console.error('   認証が正しく動作しません');
}

export const config = {
  providers,
  trustHost: true, // Vercelデプロイ時に必須
  debug: process.env.NODE_ENV === 'development', // 開発環境でデバッグログを有効化
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // リダイレクトしてログインページへ
      } else if (isLoggedIn) {
        return true;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
