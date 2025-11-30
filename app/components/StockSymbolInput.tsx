'use client';

import { useState, useEffect, useRef } from 'react';
import { StockSymbol } from '../utils/stockSymbols';

interface StockSymbolInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function StockSymbolInput({
  value,
  onChange,
  onSearch,
  loading = false,
  disabled = false
}: StockSymbolInputProps) {
  const [suggestions, setSuggestions] = useState<StockSymbol[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 入力値の変更時に候補を取得
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/stock/symbols?q=${encodeURIComponent(value)}&limit=8`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.results || []);
          setShowSuggestions(data.results.length > 0);
        }
      } catch (error) {
        console.error('候補の取得に失敗:', error);
        setSuggestions([]);
      }
    };

    // デバウンス処理
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 200);

    return () => clearTimeout(timer);
  }, [value]);

  // 外部クリックで候補を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        onSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          onSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectSuggestion = (suggestion: StockSymbol) => {
    onChange(suggestion.symbol);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // 少し遅延してから検索を実行（入力フィールドの更新を待つ）
    setTimeout(() => {
      onSearch();
    }, 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
    setSelectedIndex(-1);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder="株式シンボル (例: AAPL, MSFT)"
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
        disabled={disabled || loading}
        autoComplete="off"
      />

      {/* サジェスチョンドロップダウン */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.symbol}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 ${
                index === selectedIndex ? 'bg-gray-700' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-400">{suggestion.symbol}</div>
                  <div className="text-sm text-gray-400 truncate">{suggestion.name}</div>
                </div>
                {suggestion.exchange && (
                  <div className="text-xs text-gray-500 ml-2">
                    {suggestion.exchange}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
