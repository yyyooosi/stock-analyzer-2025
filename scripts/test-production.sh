#!/bin/bash

# 本番環境API動作確認スクリプト
# 使用方法: ./scripts/test-production.sh https://your-app.vercel.app

# 色の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ロゴ
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Stock Analyzer - 本番環境API動作確認スクリプト         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 引数チェック
if [ -z "$1" ]; then
    echo -e "${RED}エラー: 本番URLを指定してください${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/test-production.sh https://your-app.vercel.app"
    echo ""
    echo "例:"
    echo "  ./scripts/test-production.sh https://stock-analyzer-2025.vercel.app"
    exit 1
fi

PRODUCTION_URL=$1

# URLの正規化（末尾のスラッシュを削除）
PRODUCTION_URL=${PRODUCTION_URL%/}

echo -e "${YELLOW}本番URL: ${PRODUCTION_URL}${NC}"
echo ""

# テスト結果の集計
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# テスト関数
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_pattern=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${BLUE}[テスト $TOTAL_TESTS] ${test_name}${NC}"

    # テスト実行
    result=$(eval "$test_command" 2>&1)
    exit_code=$?

    # 結果確認
    if [ $exit_code -eq 0 ] && echo "$result" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ 成功${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ 失敗${NC}"
        echo -e "${YELLOW}レスポンス:${NC}"
        echo "$result" | head -20
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    echo ""
}

# ヘルスチェック
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  1. ヘルスチェック${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

run_test "ホームページアクセス" \
    "curl -s -o /dev/null -w '%{http_code}' ${PRODUCTION_URL}/" \
    "200"

echo ""

# 診断API
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  2. 診断API (/api/test-fmp)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

run_test "診断APIアクセス" \
    "curl -s ${PRODUCTION_URL}/api/test-fmp" \
    "apiKeyConfigured"

if [ $? -eq 0 ]; then
    # APIキー設定確認
    api_key_configured=$(curl -s ${PRODUCTION_URL}/api/test-fmp | grep -o '"apiKeyConfigured":[^,}]*' | cut -d':' -f2)

    if echo "$api_key_configured" | grep -q "true"; then
        echo -e "${GREEN}✅ FMP_API_KEY が設定されています${NC}"

        # 動作するエンドポイント確認
        working_endpoint=$(curl -s ${PRODUCTION_URL}/api/test-fmp | grep -o '"workingEndpoint":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$working_endpoint" ]; then
            echo -e "${GREEN}✅ 動作するエンドポイント: ${working_endpoint}${NC}"
        else
            echo -e "${RED}⚠️ 動作するエンドポイントが見つかりません${NC}"
            echo -e "${YELLOW}   FMP APIのレート制限または接続エラーの可能性${NC}"
        fi
    else
        echo -e "${RED}❌ FMP_API_KEY が設定されていません${NC}"
        echo -e "${YELLOW}   対処: Vercel/Netlifyで環境変数を設定してください${NC}"
    fi
fi

echo ""

# スクリーニングAPI
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  3. スクリーニングAPI (/api/screener)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

run_test "基本的なスクリーニング" \
    "curl -s '${PRODUCTION_URL}/api/screener?marketCapUSDMin=1000000000'" \
    '"success"'

if [ $? -eq 0 ]; then
    # 成功の確認
    success_status=$(curl -s "${PRODUCTION_URL}/api/screener?marketCapUSDMin=1000000000" | grep -o '"success":[^,}]*' | cut -d':' -f2)

    if echo "$success_status" | grep -q "true"; then
        echo -e "${GREEN}✅ API成功レスポンス${NC}"

        # 結果数確認
        count=$(curl -s "${PRODUCTION_URL}/api/screener?marketCapUSDMin=1000000000" | grep -o '"count":[0-9]*' | cut -d':' -f2)

        if [ -n "$count" ] && [ "$count" -gt 0 ]; then
            echo -e "${GREEN}✅ 検索結果: ${count}件${NC}"
        else
            echo -e "${YELLOW}⚠️ 検索結果が0件です${NC}"
            echo -e "${YELLOW}   フィルター条件が厳しい可能性があります${NC}"
        fi
    else
        echo -e "${RED}❌ API失敗レスポンス${NC}"
        error_msg=$(curl -s "${PRODUCTION_URL}/api/screener?marketCapUSDMin=1000000000" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$error_msg" ]; then
            echo -e "${RED}   エラー: ${error_msg}${NC}"
        fi
    fi
fi

echo ""

run_test "セクターフィルター（Technology）" \
    "curl -s '${PRODUCTION_URL}/api/screener?sectors=Technology&marketCapUSDMin=10000000000'" \
    '"success"'

echo ""

run_test "プリセットフィルター（成長株）" \
    "curl -s '${PRODUCTION_URL}/api/screener?preset=growth'" \
    '"success"'

echo ""

# フロントエンド
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  4. フロントエンドページ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

run_test "スクリーニングページアクセス" \
    "curl -s -o /dev/null -w '%{http_code}' ${PRODUCTION_URL}/screener" \
    "200"

echo ""

# セキュリティチェック
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  5. セキュリティチェック${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}[テスト] APIキーの保護確認${NC}"

# ページソースにAPIキーが含まれていないか確認
page_content=$(curl -s ${PRODUCTION_URL}/screener)

if echo "$page_content" | grep -q "FMP_API_KEY\|f3FJh2JitCLnTYOl9iVSVAe6v9SekGdy"; then
    echo -e "${RED}❌ 危険: ページソースにAPIキーが含まれています${NC}"
    echo -e "${RED}   即座にAPIキーを無効化してください！${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
else
    echo -e "${GREEN}✅ APIキーはページソースに含まれていません${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""

# HTTPS確認
echo -e "${BLUE}[テスト] HTTPS接続確認${NC}"

if echo "$PRODUCTION_URL" | grep -q "^https://"; then
    echo -e "${GREEN}✅ HTTPS接続が使用されています${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ HTTP接続が使用されています（HTTPSを推奨）${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""

# 結果サマリー
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  テスト結果サマリー${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "総テスト数: ${TOTAL_TESTS}"
echo -e "${GREEN}成功: ${PASSED_TESTS}${NC}"
echo -e "${RED}失敗: ${FAILED_TESTS}${NC}"

# 成功率計算
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "成功率: ${SUCCESS_RATE}%"
fi

echo ""

# 総合判定
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ すべてのテストが成功しました！                       ║${NC}"
    echo -e "${GREEN}║  本番環境は正常に動作しています。                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 0
elif [ $FAILED_TESTS -lt 3 ]; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️ 一部のテストが失敗しました                          ║${NC}"
    echo -e "${YELLOW}║  詳細を確認して対処してください。                       ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 1
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ 複数のテストが失敗しました                          ║${NC}"
    echo -e "${RED}║  本番環境に問題があります。早急に対処してください。     ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"

    echo ""
    echo -e "${YELLOW}推奨アクション:${NC}"
    echo -e "1. Vercel/Netlifyのダッシュボードで環境変数を確認"
    echo -e "2. デプロイログでエラーを確認"
    echo -e "3. FMP APIキーが有効か確認"
    echo -e "4. 詳細は PRODUCTION_CHECKLIST.md を参照"

    exit 2
fi
