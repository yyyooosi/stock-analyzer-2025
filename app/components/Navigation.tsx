'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="mb-8">
      <div className="flex gap-4">
        <Link
          href="/"
          className={`px-4 py-2 rounded-lg transition-colors ${
            pathname === '/'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          ホーム
        </Link>
        <Link
          href="/watchlist"
          className={`px-4 py-2 rounded-lg transition-colors ${
            pathname === '/watchlist'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          ウォッチリスト
        </Link>
      </div>
    </nav>
  );
}
