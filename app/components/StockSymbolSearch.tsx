'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
}

interface StockSymbolSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: StockSearchResult | null) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export default function StockSymbolSearch({
  value,
  onChange,
  onSelect,
  onKeyPress,
  placeholder = '株式シンボル (例: AAPL, MSFT)',
  disabled = false,
  className = '',
  autoFocus = false
}: StockSymbolSearchProps) {
  const [allSymbols, setAllSymbols] = useState<StockSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<StockSearchResult[]>([]);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 銘柄リストを一度だけ取得
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        setIsLoadingSymbols(true);
        const response = await fetch('/api/stock/symbols');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '銘柄リストの取得に失敗しました');
        }

        // StockSearchResult形式に変換
        const symbols: StockSearchResult[] = data.symbols.map((s: any) => ({
          symbol: s.symbol,
          name: s.name,
          exchange: s.exchange,
          assetType: s.assetType
        }));

        setAllSymbols(symbols);
        console.log(`[StockSymbolSearch] Loaded ${symbols.length} stock symbols`);
      } catch (err) {
        console.error('Failed to load symbols:', err);
        setError(err instanceof Error ? err.message : '銘柄リストの読み込みに失敗しました');
      } finally {
        setIsLoadingSymbols(false);
      }
    };

    loadSymbols();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ローカル検索（シンボルと企業名の両方から検索）
  const searchSymbols = useCallback((query: string): StockSearchResult[] => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const upperQuery = query.toUpperCase();

    // シンボルまたは企業名で検索
    const filtered = allSymbols.filter(symbol => {
      const symbolMatch = symbol.symbol.toUpperCase().includes(upperQuery);
      const nameMatch = symbol.name.toUpperCase().includes(upperQuery);
      return symbolMatch || nameMatch;
    });

    // シンボルが前方一致するものを優先してソート
    const sorted = filtered.sort((a, b) => {
      const aStartsWith = a.symbol.startsWith(upperQuery);
      const bStartsWith = b.symbol.startsWith(upperQuery);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // 両方とも前方一致する場合、シンボルの長さでソート
      if (aStartsWith && bStartsWith) {
        return a.symbol.length - b.symbol.length;
      }

      // それ以外はアルファベット順
      return a.symbol.localeCompare(b.symbol);
    });

    // 最大10件に制限
    return sorted.slice(0, 10);
  }, [allSymbols]);

  // Debounced search
  const handleInputChange = (newValue: string) => {
    const upperValue = newValue.toUpperCase();
    onChange(upperValue);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for local search
    debounceTimerRef.current = setTimeout(() => {
      if (upperValue.trim().length > 0) {
        const results = searchSymbols(upperValue);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 150); // 150ms debounce（ローカル検索なので短く）
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: StockSearchResult) => {
    onChange(suggestion.symbol);
    onSelect(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
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
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={disabled || isLoadingSymbols}
          autoFocus={autoFocus}
          className={className}
          autoComplete="off"
        />
        {isLoadingSymbols && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.symbol}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-700 border-b border-gray-700 last:border-b-0 ${
                index === selectedIndex ? 'bg-gray-700' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-white">{suggestion.symbol}</div>
                  <div className="text-sm text-gray-400 truncate">{suggestion.name}</div>
                </div>
                <div className="text-xs text-gray-500 ml-2">
                  {suggestion.exchange}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && !isLoadingSymbols && suggestions.length === 0 && value.trim().length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
          <div className="text-gray-400 text-sm">
            「{value}」に一致する銘柄が見つかりませんでした
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !isLoadingSymbols && (
        <div className="absolute z-50 w-full mt-1 bg-red-900 border border-red-700 rounded-lg shadow-lg p-3">
          <div className="text-red-200 text-sm">{error}</div>
        </div>
      )}

      {/* Loading symbols message */}
      {isLoadingSymbols && value.trim().length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
          <div className="text-gray-400 text-sm flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            銘柄リストを読み込み中...
          </div>
        </div>
      )}
    </div>
  );
}
