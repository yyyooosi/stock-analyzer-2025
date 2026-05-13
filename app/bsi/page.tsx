'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BsiData {
  score: number;
  liquidityScore: number;
  concentrationScore: number;
  rawValues: {
    yieldCurve: number | null;
    moveIndex: number | null;
    mag7Share: number | null;
  };
  riskLevel: {
    level: string;
    label: string;
    color: string;
  };
  calculatedAt: string;
}

interface HistoryItem {
  score: number;
  liquidityScore: number;
  concentrationScore: number;
  riskLevel: string;
  riskLabel: string;
  calculatedAt: string;
}

function getBsiColors(score: number) {
  if (score < 25) return { bg: 'bg-green-900/40', border: 'border-green-500', text: 'text-green-400', gauge: '#22c55e' };
  if (score < 45) return { bg: 'bg-yellow-900/40', border: 'border-yellow-500', text: 'text-yellow-400', gauge: '#eab308' };
  if (score < 65) return { bg: 'bg-orange-900/40', border: 'border-orange-500', text: 'text-orange-400', gauge: '#f97316' };
  if (score < 80) return { bg: 'bg-red-900/40', border: 'border-red-500', text: 'text-red-400', gauge: '#ef4444' };
  return { bg: 'bg-red-950/60', border: 'border-red-400', text: 'text-red-300', gauge: '#dc2626' };
}

function BsiGauge({ score }: { score: number }) {
  const colors = getBsiColors(score);
  // 半円ゲージ: 0=左端, 100=右端
  const angle = (score / 100) * 180 - 90; // -90° (左) ～ +90° (右)
  const rad = (angle * Math.PI) / 180;
  const cx = 100;
  const cy = 100;
  const r = 80;
  const needleX = cx + r * Math.sin(rad);
  const needleY = cy - r * Math.cos(rad);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-64 h-36">
        {/* 背景グレー半円 */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#374151"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* スコアに応じた着色半円 */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={colors.gauge}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 251.2} 251.2`}
          opacity="0.8"
        />
        {/* 針 */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill="white" />
        {/* ラベル */}
        <text x="20" y="115" fontSize="9" fill="#9ca3af" textAnchor="middle">0</text>
        <text x="100" y="22" fontSize="9" fill="#9ca3af" textAnchor="middle">50</text>
        <text x="180" y="115" fontSize="9" fill="#9ca3af" textAnchor="middle">100</text>
      </svg>
      <div className={`text-5xl font-bold mt-2 ${colors.text}`}>{score.toFixed(1)}</div>
      <div className="text-gray-400 text-sm mt-1">/ 100</div>
    </div>
  );
}

export default function BsiPage() {
  const [bsiData, setBsiData] = useState<BsiData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [bsiRes, histRes] = await Promise.all([
        fetch('/api/bsi'),
        fetch('/api/bsi/history?limit=90'),
      ]);
      const bsiJson = await bsiRes.json();
      const histJson = await histRes.json();

      if (bsiJson.success) setBsiData(bsiJson.data);
      if (histJson.success) setHistory(histJson.data);
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCalculate = async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetch('/api/bsi/calculate', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      } else {
        setError('計算に失敗しました: ' + (json.error ?? '不明なエラー'));
      }
    } catch {
      setError('計算リクエストに失敗しました');
    } finally {
      setCalculating(false);
    }
  };

  const chartData = {
    labels: history.map((h) =>
      new Date(h.calculatedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'BSI スコア',
        data: history.map((h) => h.score),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: history.length > 30 ? 0 : 3,
      },
      {
        label: '流動性スコア',
        data: history.map((h) => h.liquidityScore),
        borderColor: '#f97316',
        backgroundColor: 'transparent',
        tension: 0.3,
        borderDash: [4, 4],
        pointRadius: 0,
      },
      {
        label: '集中度スコア',
        data: history.map((h) => h.concentrationScore),
        borderColor: '#a78bfa',
        backgroundColor: 'transparent',
        tension: 0.3,
        borderDash: [4, 4],
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: '#374151' },
        ticks: { color: '#9ca3af' },
      },
      x: {
        grid: { color: '#1f2937' },
        ticks: { color: '#9ca3af', maxTicksLimit: 10 },
      },
    },
    plugins: {
      legend: { labels: { color: '#d1d5db' } },
      tooltip: { mode: 'index' as const, intersect: false },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">読み込み中...</p>
      </div>
    );
  }

  const colors = bsiData ? getBsiColors(bsiData.score) : getBsiColors(50);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Bubble Stress Index (BSI)
              </h1>
              <p className="text-gray-400 text-sm">
                AIバブル崩壊確率の早期警戒指標 — 0 (平静) 〜 100 (危機的)
              </p>
            </div>
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              {calculating ? '計算中...' : '今すぐ計算'}
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!bsiData ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">BSI データがまだありません。</p>
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {calculating ? '計算中...' : '初回計算を実行'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* メインスコアカード */}
            <div className={`bg-gray-800 rounded-xl p-6 border ${colors.border}`}>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <BsiGauge score={bsiData.score} />
                </div>
                <div className="flex-1 w-full">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className={`rounded-lg p-4 ${colors.bg}`}>
                      <div className="text-gray-400 text-xs mb-1">リスクレベル</div>
                      <div className={`text-2xl font-bold ${colors.text}`}>
                        {bsiData.riskLevel.label}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-xs mb-1">最終更新</div>
                      <div className="text-sm font-medium">
                        {new Date(bsiData.calculatedAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  </div>

                  {/* サブスコア */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">流動性/金利ストレス</span>
                        <span className="text-orange-400 font-medium">
                          {bsiData.liquidityScore.toFixed(1)}
                        </span>
                      </div>
                      <div className="bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${bsiData.liquidityScore}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">市場集中度ストレス</span>
                        <span className="text-purple-400 font-medium">
                          {bsiData.concentrationScore.toFixed(1)}
                        </span>
                      </div>
                      <div className="bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${bsiData.concentrationScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 生データ */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">指標の生値</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">10Y-2Y イールドカーブ (T10Y2Y)</div>
                  <div className="text-2xl font-bold">
                    {bsiData.rawValues.yieldCurve !== null
                      ? `${bsiData.rawValues.yieldCurve.toFixed(2)}%`
                      : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {bsiData.rawValues.yieldCurve !== null && bsiData.rawValues.yieldCurve < 0
                      ? '逆イールド (警戒)'
                      : '正常'}
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">MOVE Index</div>
                  <div className="text-2xl font-bold text-gray-500">
                    Phase 1 以降
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Mag7 時価総額シェア</div>
                  <div className="text-2xl font-bold">
                    {bsiData.rawValues.mag7Share !== null
                      ? `${(bsiData.rawValues.mag7Share * 100).toFixed(1)}%`
                      : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">S&amp;P500 比 (概算)</div>
                </div>
              </div>
            </div>

            {/* 履歴チャート */}
            {history.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4">BSI 推移 (直近 {history.length} 日)</h2>
                <Line data={chartData} options={chartOptions} />
              </div>
            )}

            {/* 説明 */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-3">BSI について</h2>
              <div className="text-sm text-gray-400 space-y-2">
                <p>
                  Bubble Stress Index (BSI) は、AIバブル崩壊の確率上昇を早期警戒するための複合指標です。
                  0〜100 のスコアで市場全体のストレスを可視化します。
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                  {[
                    { range: '0–24', label: '低リスク', color: 'bg-green-900 text-green-300' },
                    { range: '25–44', label: '中程度', color: 'bg-yellow-900 text-yellow-300' },
                    { range: '45–64', label: '要注意', color: 'bg-orange-900 text-orange-300' },
                    { range: '65–79', label: '高リスク', color: 'bg-red-900 text-red-300' },
                    { range: '80–100', label: '危険水域', color: 'bg-red-950 text-red-200' },
                  ].map((r) => (
                    <div key={r.range} className={`rounded p-2 text-center ${r.color}`}>
                      <div className="font-bold text-xs">{r.range}</div>
                      <div className="text-xs">{r.label}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  ※ Phase 0 構成: 流動性/金利 60% (T10Y2Y) + 市場集中度 40% (Mag7 シェア)。
                  毎日 11:00 JST に自動更新されます。投資判断の参考情報であり、将来の市場動向を保証するものではありません。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
