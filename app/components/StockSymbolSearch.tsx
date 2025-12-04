'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
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
  const [suggestions, setSuggestions] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '検索に失敗しました');
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setSuggestions(data.results || []);
      setShowDropdown(data.results && data.results.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
      setError('検索中にエラーが発生しました');
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  const handleInputChange = (newValue: string) => {
    const upperValue = newValue.toUpperCase();
    onChange(upperValue);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(upperValue);
    }, 300); // 300ms debounce
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
          disabled={disabled}
          autoFocus={autoFocus}
          className={className}
          autoComplete="off"
        />
        {isLoading && (
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
                  {suggestion.type}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && !isLoading && suggestions.length === 0 && value.trim().length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
          <div className="text-gray-400 text-sm">
            「{value}」に一致する銘柄が見つかりませんでした
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute z-50 w-full mt-1 bg-red-900 border border-red-700 rounded-lg shadow-lg p-3">
          <div className="text-red-200 text-sm">{error}</div>
        </div>
      )}
    </div>
  );
}
