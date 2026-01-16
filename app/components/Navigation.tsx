import Link from 'next/link';
import { auth, signOut } from '@/auth';

export default async function Navigation() {
  const session = await auth();

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-white">
              米国株分析ツール
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                ホーム
              </Link>
              <Link
                href="/screener"
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                スクリーニング
              </Link>
              <Link
                href="/risk-monitor"
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-red-400 hover:bg-gray-700 hover:text-red-300"
              >
                🚨 リスク監視
              </Link>
              <Link
                href="/watchlist"
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                マイウォッチリスト
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session?.user ? (
              <>
                <div className="flex items-center gap-3">
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-gray-300 text-sm">
                    {session.user.name || session.user.email}
                  </span>
                </div>
                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/' });
                  }}
                >
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    ログアウト
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
