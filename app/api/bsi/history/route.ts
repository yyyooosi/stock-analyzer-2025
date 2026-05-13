import { NextRequest, NextResponse } from 'next/server';
import { initializeBsiTables, getBsiHistory } from '@/app/utils/bsi/database';
import { getBsiLevel } from '@/app/utils/bsi/compute/bsi';

// BSI の履歴スナップショットを返す
export async function GET(request: NextRequest) {
  try {
    await initializeBsiTables();

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '90', 10), 365);

    const snapshots = await getBsiHistory(limit);

    const data = snapshots.map((s) => {
      const score = Number(s.score);
      const { level, label } = getBsiLevel(score);
      return {
        score,
        liquidityScore: Number(s.liquidity_score),
        concentrationScore: Number(s.concentration_score),
        riskLevel: level,
        riskLabel: label,
        calculatedAt: s.calculated_at,
      };
    });

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error('[BSI History API] エラー:', error);
    return NextResponse.json(
      { success: false, error: '履歴データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
