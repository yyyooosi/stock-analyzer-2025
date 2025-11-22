import { NextRequest, NextResponse } from 'next/server';

// Twitter API v2のエンドポイント
const TWITTER_API_BASE = 'https://api.twitter.com/2';

export async function GET(request: NextRequest) {
  try {
    // 環境変数からBearer Tokenを取得
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Twitter API Bearer Tokenが設定されていません' },
        { status: 500 }
      );
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const maxResults = searchParams.get('max_results') || '100';

    if (!query) {
      return NextResponse.json(
        { error: 'クエリパラメータが必要です' },
        { status: 400 }
      );
    }

    // Twitter APIにリクエスト
    const twitterUrl = new URL(`${TWITTER_API_BASE}/tweets/search/recent`);
    twitterUrl.searchParams.set('query', query);
    twitterUrl.searchParams.set('max_results', maxResults);
    twitterUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
    twitterUrl.searchParams.set('user.fields', 'username');
    twitterUrl.searchParams.set('expansions', 'author_id');

    const response = await fetch(twitterUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Twitter API Error:', errorData);

      return NextResponse.json(
        {
          error: 'Twitter APIリクエストに失敗しました',
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Twitter API Route Error:', error);

    return NextResponse.json(
      {
        error: 'サーバーエラーが発生しました',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
