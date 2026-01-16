"use client";

import { useEffect, useState } from "react";
import { RiskAssessment, RiskIndicator, CategoryRiskScore } from "@/app/utils/riskMonitor";

export default function RiskMonitorPage() {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);

  const getRiskColor = (score: number): string => {
    if (score < 30) return "bg-green-900 border-green-600";
    if (score < 50) return "bg-yellow-900 border-yellow-600";
    if (score < 70) return "bg-orange-900 border-orange-600";
    return "bg-red-900 border-red-600";
  };

  const getRiskTextColor = (score: number): string => {
    if (score < 30) return "text-green-400";
    if (score < 50) return "text-yellow-400";
    if (score < 70) return "text-orange-400";
    return "text-red-400";
  };

  const fetchRiskAssessment = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/risk-monitor");
      const result = await response.json();

      if (result.success) {
        setAssessment(result.data);
        setLastUpdate(new Date());
        setNextRefresh(new Date(Date.now() + 5 * 60 * 1000)); // 5 minutes
      }
    } catch (error) {
      console.error("Error fetching risk assessment:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskAssessment();
    const interval = setInterval(fetchRiskAssessment, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading || !assessment) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">🚨 リスク監視</h1>
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🚨 リスク監視ダッシュボード</h1>
        <p className="text-gray-400">S&P 500 クラッシュリスク監視システム</p>
        <p className="text-sm text-gray-500 mt-2">
          最終更新: {lastUpdate?.toLocaleString("ja-JP")} | 次の更新:{" "}
          {nextRefresh?.toLocaleString("ja-JP")}
        </p>
      </div>

      {/* Overall Risk Score */}
      <div
        className={`${getRiskColor(assessment.overallScore)} border-2 rounded-lg p-8 mb-8`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">総合リスクスコア</h2>
            <p className="text-gray-300">
              リスクレベル:{" "}
              <span className={`font-bold ${getRiskTextColor(assessment.overallScore)}`}>
                {assessment.riskLevel.toUpperCase()}
              </span>
            </p>
          </div>
          <div className="text-right">
            <div className={`text-6xl font-bold ${getRiskTextColor(assessment.overallScore)}`}>
              {assessment.overallScore.toFixed(1)}
            </div>
            <p className="text-gray-300">/ 100</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-gray-800 rounded-full h-4">
            <div
              className={`h-4 rounded-full ${
                assessment.overallScore < 30
                  ? "bg-green-500"
                  : assessment.overallScore < 50
                    ? "bg-yellow-500"
                    : assessment.overallScore < 70
                      ? "bg-orange-500"
                      : "bg-red-500"
              }`}
              style={{ width: `${assessment.overallScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {assessment.alerts.length > 0 && (
        <div className="bg-red-900 border-2 border-red-600 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">⚠️ アクティブなアラート</h3>
          <ul className="space-y-2">
            {assessment.alerts.map((alert, index) => (
              <li key={index} className="text-red-200">
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Category Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {assessment.categories.map((category) => (
          <div key={category.category} className="bg-gray-800 border-2 border-gray-700 rounded-lg p-4">
            <h3 className="font-bold mb-3">{category.name}</h3>
            <div className={`text-3xl font-bold ${getRiskTextColor(category.score)} mb-2`}>
              {category.score.toFixed(1)}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  category.score < 30
                    ? "bg-green-500"
                    : category.score < 50
                      ? "bg-yellow-500"
                      : category.score < 70
                        ? "bg-orange-500"
                        : "bg-red-500"
                }`}
                style={{ width: `${category.score}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Historical Crash Comparison */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-bold mb-6">📊 過去のクラッシュとの類似度</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold mb-2">ドットコムバブル (2000)</h4>
            <div className={`text-3xl font-bold ${getRiskTextColor(assessment.historicalComparison.dotCom2000)}`}>
              {assessment.historicalComparison.dotCom2000.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${assessment.historicalComparison.dotCom2000}%` }}
              ></div>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-2">金融危機 (2008)</h4>
            <div className={`text-3xl font-bold ${getRiskTextColor(assessment.historicalComparison.financialCrisis2008)}`}>
              {assessment.historicalComparison.financialCrisis2008.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full bg-purple-500"
                style={{ width: `${assessment.historicalComparison.financialCrisis2008}%` }}
              ></div>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-2">パンデミック (2020)</h4>
            <div className={`text-3xl font-bold ${getRiskTextColor(assessment.historicalComparison.pandemic2020)}`}>
              {assessment.historicalComparison.pandemic2020.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full bg-cyan-500"
                style={{ width: `${assessment.historicalComparison.pandemic2020}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Warnings */}
      <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-bold mb-6">🔴 リスク指標 TOP 5</h3>
        <div className="space-y-4">
          {assessment.topWarnings.map((indicator, index) => (
            <div
              key={index}
              className="bg-gray-900 border-l-4 border-red-500 rounded p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold">{indicator.name}</h4>
                <span className={`font-bold ${getRiskTextColor(indicator.normalizedScore)}`}>
                  {indicator.normalizedScore.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>値: {indicator.value.toFixed(2)}</span>
                <span>
                  範囲: {indicator.historicalRange[0]?.toFixed(1)} -{" "}
                  {indicator.historicalRange[1]?.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    indicator.normalizedScore < 30
                      ? "bg-green-500"
                      : indicator.normalizedScore < 50
                        ? "bg-yellow-500"
                        : indicator.normalizedScore < 70
                          ? "bg-orange-500"
                          : "bg-red-500"
                  }`}
                  style={{ width: `${indicator.normalizedScore}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Metrics by Category */}
      <div className="space-y-6">
        {assessment.categories.map((category) => (
          <div key={category.category} className="bg-gray-800 border-2 border-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">{category.name}</h3>
            <div className="space-y-3">
              {category.indicators.map((indicator, index) => (
                <div key={index} className="bg-gray-900 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{indicator.name}</span>
                    <span className={`font-bold ${getRiskTextColor(indicator.normalizedScore)}`}>
                      {indicator.normalizedScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        indicator.normalizedScore < 30
                          ? "bg-green-500"
                          : indicator.normalizedScore < 50
                            ? "bg-yellow-500"
                            : indicator.normalizedScore < 70
                              ? "bg-orange-500"
                              : "bg-red-500"
                      }`}
                      style={{ width: `${indicator.normalizedScore}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
