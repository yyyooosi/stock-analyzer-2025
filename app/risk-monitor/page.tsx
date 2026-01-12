'use client';

import { useState, useEffect } from 'react';
import {
  RiskAssessment,
  RiskIndicator,
  CategoryScore,
  RISK_LEVEL_CONFIG,
  CATEGORY_CONFIG,
} from '@/app/utils/riskMonitor';

export default function RiskMonitorPage() {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [indicators, setIndicators] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    fetchRiskData();
    // 5分ごとに自動更新
    const interval = setInterval(fetchRiskData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/risk-monitor', { cache: 'no-store' });
      const data = await response.json();

      if (data.success) {
        setAssessment(data.data);
        setIndicators(data.indicators);
        setLastUpdate(new Date().toLocaleString('ja-JP'));
      }
    } catch (error) {
      console.error('Failed to fetch risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">リスクデータを読み込み中...</div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">データの取得に失敗しました</div>
      </div>
    );
  }

  const riskConfig = RISK_LEVEL_CONFIG[assessment.overallLevel];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* ヘッダー */}
      <div className="border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                🚨 S&P500 大暴落リスク監視システム
              </h1>
              <p className="text-slate-400 text-sm">
                歴史的な暴落前の危険要素を24時間自動監視
              </p>
            </div>
            <button
              onClick={fetchRiskData}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              🔄 更新
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            最終更新: {lastUpdate}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 総合リスクスコア */}
        <div
          className="mb-8 p-8 rounded-2xl border-2 shadow-2xl"
          style={{
            backgroundColor: riskConfig.bgColor + '20',
            borderColor: riskConfig.color,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">総合リスクスコア</div>
              <div className="flex items-center gap-3">
                <span className="text-6xl">{riskConfig.emoji}</span>
                <div>
                  <div className="text-4xl font-bold" style={{ color: riskConfig.color }}>
                    {assessment.overallScore}
                  </div>
                  <div className="text-xl font-semibold" style={{ color: riskConfig.color }}>
                    {riskConfig.label}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-300 mb-2">{riskConfig.description}</div>
              <div className="text-sm text-slate-400">
                警告指標: {assessment.topWarnings.length}個
              </div>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="w-full bg-slate-700 rounded-full h-4 mt-4">
            <div
              className="h-4 rounded-full transition-all duration-500"
              style={{
                width: `${assessment.overallScore}%`,
                backgroundColor: riskConfig.color,
              }}
            />
          </div>
        </div>

        {/* アラート */}
        {assessment.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">⚠️ アクティブアラート</h2>
            <div className="space-y-3">
              {assessment.alerts.map((alert) => {
                const alertConfig = RISK_LEVEL_CONFIG[alert.severity];
                return (
                  <div
                    key={alert.id}
                    className="p-4 rounded-lg border-l-4"
                    style={{
                      backgroundColor: alertConfig.bgColor + '30',
                      borderColor: alertConfig.color,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{alertConfig.emoji}</span>
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{alert.message}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(alert.timestamp).toLocaleString('ja-JP')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* カテゴリ別スコア */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">📊 カテゴリ別リスク評価</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {assessment.categoryScores.map((category) => {
              const categoryConfig = CATEGORY_CONFIG[category.category];
              const levelConfig = RISK_LEVEL_CONFIG[category.level];

              return (
                <button
                  key={category.category}
                  onClick={() => setSelectedCategory(category.category)}
                  className="p-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{categoryConfig.icon}</span>
                    <span className="text-2xl">{levelConfig.emoji}</span>
                  </div>
                  <div className="text-sm text-slate-400 mb-1">
                    {categoryConfig.name}
                  </div>
                  <div className="text-3xl font-bold mb-2">{category.score}</div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${category.score}%`,
                        backgroundColor: levelConfig.color,
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    警告: {category.warningCount}/{category.totalIndicators}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 過去の暴落局面との類似度 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">📈 過去の暴落局面との類似度</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                year: '2000年',
                event: 'ITバブル崩壊',
                similarity: assessment.historicalComparison.similarTo2000,
                icon: '💻',
              },
              {
                year: '2008年',
                event: 'リーマンショック',
                similarity: assessment.historicalComparison.similarTo2008,
                icon: '🏦',
              },
              {
                year: '2020年',
                event: 'コロナショック',
                similarity: assessment.historicalComparison.similarTo2020,
                icon: '🦠',
              },
            ].map((comparison) => (
              <div
                key={comparison.year}
                className="p-4 rounded-xl bg-slate-800 border border-slate-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{comparison.icon}</span>
                  <div>
                    <div className="font-semibold">{comparison.year}</div>
                    <div className="text-xs text-slate-400">{comparison.event}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-2">{comparison.similarity}%</div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${comparison.similarity}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* トップ警告指標 */}
        {assessment.topWarnings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">🔴 最も危険な指標 Top 5</h2>
            <div className="space-y-3">
              {assessment.topWarnings.map((indicator, index) => {
                const categoryConfig = CATEGORY_CONFIG[indicator.category];
                return (
                  <div
                    key={indicator.id}
                    className="p-4 rounded-xl bg-slate-800 border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-slate-600">
                          #{index + 1}
                        </span>
                        <span className="text-xl">{categoryConfig.icon}</span>
                        <div>
                          <div className="font-semibold">{indicator.name}</div>
                          <div className="text-xs text-slate-400">
                            {categoryConfig.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-400">
                          {indicator.normalizedScore}
                        </div>
                        <div className="text-xs text-slate-400">
                          {indicator.historicalPercentile}th percentile
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-300 mb-2">
                      {indicator.description}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        現在値: {indicator.currentValue.toFixed(2)}
                      </span>
                      <span
                        className={
                          indicator.trend === 'rising'
                            ? 'text-red-400'
                            : indicator.trend === 'falling'
                              ? 'text-green-400'
                              : 'text-slate-400'
                        }
                      >
                        {indicator.trend === 'rising' ? '↗️ 上昇中' : ''}
                        {indicator.trend === 'falling' ? '↘️ 下降中' : ''}
                        {indicator.trend === 'stable' ? '→ 安定' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 全指標一覧 */}
        {indicators && selectedCategory && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {CATEGORY_CONFIG[selectedCategory as keyof typeof CATEGORY_CONFIG].icon}{' '}
                {CATEGORY_CONFIG[selectedCategory as keyof typeof CATEGORY_CONFIG].name}
                カテゴリ詳細
              </h2>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-slate-400 hover:text-white"
              >
                閉じる ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {indicators[selectedCategory]?.map((indicator: RiskIndicator) => {
                const levelConfig = RISK_LEVEL_CONFIG[
                  indicator.isWarning ? 'warning' : 'safe'
                ];
                return (
                  <div
                    key={indicator.id}
                    className="p-4 rounded-xl bg-slate-800 border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{indicator.name}</div>
                      <span className="text-xl">{levelConfig.emoji}</span>
                    </div>
                    <div className="text-sm text-slate-400 mb-3">
                      {indicator.description}
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">現在値</span>
                      <span className="font-semibold">
                        {indicator.currentValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">リスクスコア</span>
                      <span className="font-semibold">{indicator.normalizedScore}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${indicator.normalizedScore}%`,
                          backgroundColor: levelConfig.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 免責事項 */}
        <div className="mt-12 p-6 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="font-bold mb-2">⚠️ 重要な注意事項</h3>
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              本システムは、歴史的に暴落前に観測された数値的兆候を監視するツールです。
            </p>
            <p>
              「暴落を予言する」ものではなく、「歴史的に危険な状態に近づいていることを定量的に知らせる」ことを目的としています。
            </p>
            <p>
              投資判断は必ずご自身の責任で行ってください。本システムの情報のみに基づく投資判断による損失について、一切の責任を負いません。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
