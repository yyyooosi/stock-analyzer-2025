"use client";

import { useEffect, useState } from "react";
import { RiskAssessment, RiskIndicator, CategoryRiskScore, getIndicatorDescription } from "@/app/utils/riskMonitor";

// ツールチップコンポーネント
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block group cursor-help">
      <div onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
        {children}
      </div>
      {showTooltip && (
        <div className="absolute z-50 w-48 p-2 text-xs bg-gray-950 text-white border border-gray-600 rounded shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none">
          <div className="break-words">{text}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-950"></div>
        </div>
      )}
    </div>
  );
}

export default function RiskMonitorPage() {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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

  const formatValue = (indicator: RiskIndicator): string => {
    const { name, value } = indicator;

    // Format based on indicator type
    if (name.includes("M2") || name.includes("Margin")) return value.toExponential(2);
    if (name.includes("VIX")) return value.toFixed(2);
    if (name.includes("Rate") || name.includes("Spread") || name.includes("Yield")) return value.toFixed(2);
    if (name.includes("CPI") || name.includes("Price") || name.includes("Ratio")) return value.toFixed(2);
    if (name.includes("Unemployment") || name.includes("Concentration") || name.includes("Balance")) return value.toFixed(2);

    return value.toFixed(2);
  };

  const getUnit = (name: string): string => {
    if (name.includes("Rate") || name.includes("Spread") || name.includes("Yield")) return "%";
    if (name.includes("Concentration")) return "%";
    if (name.includes("Unemployment")) return "%";
    if (name.includes("Curve")) return "";
    return "";
  };

  const fetchRiskAssessment = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/risk-monitor");
      const result = await response.json();

      if (result.success) {
        setAssessment(result.data);
        setLastUpdate(new Date());
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
      <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">🚨 リスク監視</h1>
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Compact Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🚨 リスク監視ダッシュボード</h1>
            <p className="text-xs text-gray-400">
              最終更新: {lastUpdate?.toLocaleTimeString("ja-JP")}
            </p>
          </div>
          <div className={`text-right ${getRiskColor(assessment.overallScore)} border rounded px-4 py-2`}>
            <div className={`text-3xl font-bold ${getRiskTextColor(assessment.overallScore)}`}>
              {assessment.overallScore.toFixed(1)}
            </div>
            <p className="text-xs">{assessment.riskLevel.toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-12 gap-3 h-full">
          {/* Left Column: Categories + Alerts */}
          <div className="col-span-3 flex flex-col gap-3">
            {/* Category Scores */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              <h3 className="text-sm font-bold mb-2">📊 カテゴリースコア</h3>
              <div className="space-y-2">
                {assessment.categories.map((cat) => (
                  <div
                    key={cat.category}
                    className="bg-gray-900 rounded p-2 cursor-pointer hover:bg-gray-850"
                    onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{cat.name}</span>
                      <span className={`text-sm font-bold ${getRiskTextColor(cat.score)}`}>
                        {cat.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                      <div
                        className={`h-1 rounded-full ${
                          cat.score < 30
                            ? "bg-green-500"
                            : cat.score < 50
                              ? "bg-yellow-500"
                              : cat.score < 70
                                ? "bg-orange-500"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${cat.score}%` }}
                      ></div>
                    </div>

                    {/* Expanded Category Details */}
                    {expandedCategory === cat.category && (
                      <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
                        {cat.indicators.map((ind, idx) => (
                          <div key={idx} className="text-xs bg-gray-800 rounded p-1">
                            <div className="flex justify-between">
                              <Tooltip text={getIndicatorDescription(ind.name)}>
                                <span className="truncate hover:underline">{ind.name}</span>
                              </Tooltip>
                              <span className={getRiskTextColor(ind.normalizedScore)}>
                                {formatValue(ind)}{getUnit(ind.name)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            {assessment.alerts.length > 0 && (
              <div className="bg-red-900 border border-red-600 rounded p-3">
                <h3 className="text-sm font-bold mb-2">⚠️ アラート</h3>
                <ul className="space-y-1">
                  {assessment.alerts.map((alert, idx) => (
                    <li key={idx} className="text-xs text-red-200">
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Center Column: Key Indicators */}
          <div className="col-span-4 flex flex-col gap-3">
            {/* Top 5 Risk Indicators */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              <h3 className="text-sm font-bold mb-2">🔴 リスク指標 TOP 5</h3>
              <div className="space-y-2 text-xs">
                {assessment.topWarnings.map((indicator, idx) => (
                  <div key={idx} className="bg-gray-900 rounded p-2 border-l-2 border-red-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Tooltip text={getIndicatorDescription(indicator.name)}>
                          <div className="font-semibold truncate hover:underline cursor-help">{indicator.name}</div>
                        </Tooltip>
                        <div className={`text-sm font-bold ${getRiskTextColor(indicator.normalizedScore)}`}>
                          {formatValue(indicator)}{getUnit(indicator.name)}
                        </div>
                      </div>
                      <div className={`ml-2 px-2 py-1 rounded ${getRiskColor(indicator.normalizedScore)} text-white font-bold`}>
                        {indicator.normalizedScore.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Historical Comparison */}
          <div className="col-span-5 flex flex-col gap-3">
            {/* Historical Crash Comparison */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3 flex-1">
              <h3 className="text-sm font-bold mb-3">📈 過去クラッシュとの類似度</h3>
              <div className="grid grid-cols-1 gap-3 h-full">
                {[
                  { label: "ドットコム 2000", value: assessment.historicalComparison.dotCom2000, color: "bg-blue-500" },
                  { label: "金融危機 2008", value: assessment.historicalComparison.financialCrisis2008, color: "bg-purple-500" },
                  { label: "パンデミック 2020", value: assessment.historicalComparison.pandemic2020, color: "bg-cyan-500" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-900 rounded p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold">{item.label}</span>
                      <span className={`font-bold ${getRiskTextColor(item.value)}`}>
                        {item.value.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full`}
                        style={{ width: `${item.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Macro Data */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              <h3 className="text-sm font-bold mb-2">📊 マクロ指標</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {assessment.categories
                  .find((c) => c.category === "macroeconomic")
                  ?.indicators.slice(0, 4)
                  .map((ind, idx) => (
                    <div key={idx} className="bg-gray-900 rounded p-1">
                      <Tooltip text={getIndicatorDescription(ind.name)}>
                        <div className="text-gray-400 truncate hover:underline cursor-help">{ind.name}</div>
                      </Tooltip>
                      <div className={`font-bold ${getRiskTextColor(ind.normalizedScore)}`}>
                        {formatValue(ind)}{getUnit(ind.name)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
