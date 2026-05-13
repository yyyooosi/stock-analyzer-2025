import { NextResponse } from 'next/server';
import { initializeBsiTables, getLatestBsiSnapshot } from '@/app/utils/bsi/database';
import { getBsiLevel } from '@/app/utils/bsi/compute/bsi';

// 最新の BSI スコアを返す
export async function GET() {
  try {
    await initializeBsiTables();
    const snapshot = await getLatestBsiSnapshot();

    if (!snapshot) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'BSI データがまだありません。/api/bsi/calculate を実行してください。',
      });
    }

    const score = Number(snapshot.score);
    const { level, label, color } = getBsiLevel(score);

    return NextResponse.json({
      success: true,
      data: {
        score,
        liquidityScore: Number(snapshot.liquidity_score),
        concentrationScore: Number(snapshot.concentration_score),
        rawValues: {
          yieldCurve: snapshot.yield_curve !== null ? Number(snapshot.yield_curve) : null,
          moveIndex: snapshot.move_index !== null ? Number(snapshot.move_index) : null,
          mag7Share: snapshot.mag7_share !== null ? Number(snapshot.mag7_share) : null,
        },
        riskLevel: { level, label, color },
        calculatedAt: snapshot.calculated_at,
      },
    });
  } catch (error) {
    console.error('[BSI API] エラー:', error);
    return NextResponse.json(
      { success: false, error: 'BSI データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
