'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SECTORS,
  THEME_TAGS,
  PRESET_CONDITIONS,
  ScreeningConditions
} from '../utils/screeningData';

interface RangeInputProps {
  label: string;
  minValue: number | undefined;
  maxValue: number | undefined;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
  unit?: string;
  step?: number;
}

function RangeInput({ label, minValue, maxValue, onMinChange, onMaxChange, unit = '', step = 1 }: RangeInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="最小"
          value={minValue ?? ''}
          onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : undefined)}
          step={step}
          className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <span className="text-gray-400">〜</span>
        <input
          type="number"
          placeholder="最大"
          value={maxValue ?? ''}
          onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : undefined)}
          step={step}
          className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        />
        {unit && <span className="text-gray-400 text-sm">{unit}</span>}
      </div>
    </div>
  );
}

interface SliderInputProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
}

function SliderInput({ label, value, onChange, min, max, step = 1, unit = '', showValue = true }: SliderInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        {showValue && value !== undefined && (
          <span className="text-sm text-blue-400">{value}{unit}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <button
          onClick={() => onChange(undefined)}
          className="text-xs text-gray-400 hover:text-white"
        >
          クリア
        </button>
      </div>
    </div>
  );
}

export default function ScreenerPage() {
  const router = useRouter();
  const [conditions, setConditions] = useState<ScreeningConditions>({});
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePresetClick = (presetKey: string) => {
    if (activePreset === presetKey) {
      setConditions({});
      setActivePreset(null);
    } else {
      setConditions(PRESET_CONDITIONS[presetKey].conditions);
      setActivePreset(presetKey);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else {
          params.set(key, String(value));
        }
      }
    });
    router.push(`/results?${params.toString()}`);
  };

  const handleReset = () => {
    setConditions({});
    setActivePreset(null);
  };

  const updateCondition = <K extends keyof ScreeningConditions>(
    key: K,
    value: ScreeningConditions[K]
  ) => {
    setConditions(prev => ({ ...prev, [key]: value }));
    setActivePreset(null);
  };

  const toggleArrayItem = (key: 'sectors' | 'tags', item: string) => {
    const current = conditions[key] || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updateCondition(key, updated.length > 0 ? updated : undefined);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">スクリーニング条件設定</h1>
          <p className="text-gray-400">条件を設定して、あなたの投資スタイルに合った銘柄を見つけましょう</p>
        </header>

        {/* プリセット戦略 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">戦略プリセット</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(PRESET_CONDITIONS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetClick(key)}
                className={`p-4 rounded-lg border transition-all ${
                  activePreset === key
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 hover:border-blue-500 text-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{preset.name}</div>
              </button>
            ))}
          </div>
          {activePreset && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-300">
                {PRESET_CONDITIONS[activePreset].description}
              </p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ファンダメンタル条件 */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-blue-400">A. ファンダメンタル条件</h2>
            <div className="space-y-4">
              <RangeInput
                label="PER（株価収益率）"
                minValue={conditions.perMin}
                maxValue={conditions.perMax}
                onMinChange={(v) => updateCondition('perMin', v)}
                onMaxChange={(v) => updateCondition('perMax', v)}
                unit="倍"
                step={0.1}
              />
              <RangeInput
                label="PBR（株価純資産倍率）"
                minValue={conditions.pbrMin}
                maxValue={conditions.pbrMax}
                onMinChange={(v) => updateCondition('pbrMin', v)}
                onMaxChange={(v) => updateCondition('pbrMax', v)}
                unit="倍"
                step={0.1}
              />
              <RangeInput
                label="PEG（PER/成長率）"
                minValue={conditions.pegMin}
                maxValue={conditions.pegMax}
                onMinChange={(v) => updateCondition('pegMin', v)}
                onMaxChange={(v) => updateCondition('pegMax', v)}
                step={0.1}
              />
              <SliderInput
                label="ROE（自己資本利益率）"
                value={conditions.roeMin}
                onChange={(v) => updateCondition('roeMin', v)}
                min={0}
                max={50}
                unit="%以上"
              />
              <SliderInput
                label="EPS成長率（3年）"
                value={conditions.epsGrowthMin}
                onChange={(v) => updateCondition('epsGrowthMin', v)}
                min={0}
                max={100}
                unit="%以上"
              />
              <SliderInput
                label="売上高成長率"
                value={conditions.revenueGrowthMin}
                onChange={(v) => updateCondition('revenueGrowthMin', v)}
                min={0}
                max={100}
                unit="%以上"
              />
              <SliderInput
                label="営業利益率"
                value={conditions.operatingMarginMin}
                onChange={(v) => updateCondition('operatingMarginMin', v)}
                min={0}
                max={50}
                unit="%以上"
              />
            </div>
          </section>

          {/* 財務健全性 */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-green-400">B. 財務健全性</h2>
            <div className="space-y-4">
              <SliderInput
                label="自己資本比率"
                value={conditions.equityRatioMin}
                onChange={(v) => updateCondition('equityRatioMin', v)}
                min={0}
                max={80}
                unit="%以上"
              />
              <SliderInput
                label="流動比率"
                value={conditions.currentRatioMin}
                onChange={(v) => updateCondition('currentRatioMin', v)}
                min={0}
                max={3}
                step={0.1}
                unit="倍以上"
              />
              <SliderInput
                label="有利子負債比率"
                value={conditions.debtRatioMax}
                onChange={(v) => updateCondition('debtRatioMax', v)}
                min={0}
                max={200}
                unit="%以下"
              />
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="operatingCashFlowPositive"
                  checked={conditions.operatingCashFlowPositive || false}
                  onChange={(e) => updateCondition('operatingCashFlowPositive', e.target.checked || undefined)}
                  className="w-4 h-4 bg-gray-700 border-gray-600 rounded accent-green-500"
                />
                <label htmlFor="operatingCashFlowPositive" className="text-sm text-gray-300">
                  営業CFがプラスの銘柄のみ
                </label>
              </div>
            </div>
          </section>

          {/* 配当条件 */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-yellow-400">C. 配当条件</h2>
            <div className="space-y-4">
              <RangeInput
                label="配当利回り"
                minValue={conditions.dividendYieldMin}
                maxValue={conditions.dividendYieldMax}
                onMinChange={(v) => updateCondition('dividendYieldMin', v)}
                onMaxChange={(v) => updateCondition('dividendYieldMax', v)}
                unit="%"
                step={0.1}
              />
              <SliderInput
                label="連続増配年数"
                value={conditions.consecutiveDividendYearsMin}
                onChange={(v) => updateCondition('consecutiveDividendYearsMin', v)}
                min={0}
                max={50}
                unit="年以上"
              />
              <RangeInput
                label="配当性向"
                minValue={conditions.payoutRatioMin}
                maxValue={conditions.payoutRatioMax}
                onMinChange={(v) => updateCondition('payoutRatioMin', v)}
                onMaxChange={(v) => updateCondition('payoutRatioMax', v)}
                unit="%"
                step={1}
              />
            </div>
          </section>

          {/* テクニカル条件 */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-purple-400">D. テクニカル条件</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="aboveMA50"
                    checked={conditions.aboveMA50 || false}
                    onChange={(e) => updateCondition('aboveMA50', e.target.checked || undefined)}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded accent-purple-500"
                  />
                  <label htmlFor="aboveMA50" className="text-sm text-gray-300">
                    株価 &gt; 50日MA
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="aboveMA200"
                    checked={conditions.aboveMA200 || false}
                    onChange={(e) => updateCondition('aboveMA200', e.target.checked || undefined)}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded accent-purple-500"
                  />
                  <label htmlFor="aboveMA200" className="text-sm text-gray-300">
                    株価 &gt; 200日MA
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="macdBullish"
                    checked={conditions.macdBullish || false}
                    onChange={(e) => updateCondition('macdBullish', e.target.checked || undefined)}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded accent-purple-500"
                  />
                  <label htmlFor="macdBullish" className="text-sm text-gray-300">
                    MACD上昇トレンド
                  </label>
                </div>
              </div>
              <RangeInput
                label="RSI"
                minValue={conditions.rsiMin}
                maxValue={conditions.rsiMax}
                onMinChange={(v) => updateCondition('rsiMin', v)}
                onMaxChange={(v) => updateCondition('rsiMax', v)}
                step={1}
              />
              <SliderInput
                label="出来高増加率"
                value={conditions.volumeChangeMin}
                onChange={(v) => updateCondition('volumeChangeMin', v)}
                min={-50}
                max={100}
                unit="%以上"
              />
            </div>
          </section>

          {/* 時価総額 */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-orange-400">E. 時価総額</h2>
            <div className="space-y-4">
              <RangeInput
                label="時価総額"
                minValue={conditions.marketCapMin}
                maxValue={conditions.marketCapMax}
                onMinChange={(v) => updateCondition('marketCapMin', v)}
                onMaxChange={(v) => updateCondition('marketCapMax', v)}
                unit="百万ドル"
                step={1000}
              />
            </div>
          </section>

          {/* セクター */}
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-cyan-400">F. セクター</h2>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map(sector => (
                <button
                  key={sector}
                  onClick={() => toggleArrayItem('sectors', sector)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    conditions.sectors?.includes(sector)
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {sector}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* テーマタグ */}
        <section className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-bold mb-4 text-pink-400">G. テーマタグ</h2>
          <div className="flex flex-wrap gap-2">
            {THEME_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleArrayItem('tags', tag)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  conditions.tags?.includes(tag)
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* 検索ボタン */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={handleReset}
            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            条件をリセット
          </button>
          <button
            onClick={handleSearch}
            className="px-12 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg transition-colors"
          >
            スクリーニング実行
          </button>
        </div>
      </div>
    </div>
  );
}
