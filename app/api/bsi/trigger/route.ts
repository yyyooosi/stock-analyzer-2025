import { NextResponse } from 'next/server';
import { calculateBsi } from '@/app/utils/bsi/compute/bsi';

export async function POST() {
  try {
    const result = await calculateBsi();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[BSI] 計算エラー:', error);
    return NextResponse.json(
      { success: false, error: 'BSI 計算に失敗しました' },
      { status: 500 }
    );
  }
}
