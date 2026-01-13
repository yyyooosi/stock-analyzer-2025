#!/usr/bin/env tsx
/**
 * FMP API診断スクリプト
 *
 * 使い方:
 * 1. FMP_API_KEYを環境変数に設定
 * 2. npx tsx scripts/test-fmp-api.ts
 */

// FMP APIキーのチェック
const FMP_API_KEY = process.env.FMP_API_KEY;

console.log('=== FMP API 診断スクリプト ===\n');

if (!FMP_API_KEY) {
  console.error('❌ エラー: FMP_API_KEYが設定されていません');
  console.log('\n設定方法:');
  console.log('  export FMP_API_KEY=your_api_key_here');
  console.log('  または');
  console.log('  .envファイルを作成して FMP_API_KEY=your_api_key_here を追加\n');
  process.exit(1);
}

console.log(`✅ FMP_API_KEY: ${FMP_API_KEY.substring(0, 4)}...${FMP_API_KEY.substring(FMP_API_KEY.length - 4)}\n`);

// テスト1: Quote APIエンドポイント（バッチ）
async function testQuoteAPI() {
  console.log('📊 テスト1: Quote API (バッチ)');
  const symbols = ['AAPL', 'MSFT', 'GOOGL'];
  const url = `https://financialmodelingprep.com/api/v3/quote/${symbols.join(',')}?apikey=${FMP_API_KEY}`;

  try {
    const response = await fetch(url);
    console.log(`   ステータス: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.log(`   エラー: ${error}`);
      return false;
    }

    const data = await response.json();
    console.log(`   ✅ 成功: ${data.length}件のデータ取得`);
    console.log(`   サンプル: ${data[0]?.symbol} - $${data[0]?.price} (PE: ${data[0]?.pe})`);
    return true;
  } catch (error) {
    console.error(`   ❌ 失敗:`, error);
    return false;
  }
}

// テスト2: Stock List APIエンドポイント
async function testStockListAPI() {
  console.log('\n📋 テスト2: Stock List API');
  const url = `https://financialmodelingprep.com/api/v3/financial-statement-symbol-lists?apikey=${FMP_API_KEY}`;

  try {
    const response = await fetch(url);
    console.log(`   ステータス: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.log(`   エラー: ${error}`);
      return false;
    }

    const data = await response.json();
    console.log(`   ✅ 成功: ${data.length}件のシンボル取得`);
    console.log(`   サンプル: ${data.slice(0, 5).join(', ')}`);
    return true;
  } catch (error) {
    console.error(`   ❌ 失敗:`, error);
    return false;
  }
}

// テスト3: 複合データ取得（スクリーニングAPIと同じフロー）
async function testComprehensiveFlow() {
  console.log('\n🔄 テスト3: 総合データ取得フロー');

  // Step 1: シンボル一覧取得
  console.log('   Step 1: シンボル一覧取得...');
  const listUrl = `https://financialmodelingprep.com/api/v3/financial-statement-symbol-lists?apikey=${FMP_API_KEY}`;
  const listResponse = await fetch(listUrl);

  if (!listResponse.ok) {
    console.log('   ❌ シンボル一覧取得失敗');
    return false;
  }

  const allSymbols = await listResponse.json();
  const symbols = allSymbols.slice(0, 10); // 最初の10銘柄のみテスト
  console.log(`   ✅ ${symbols.length}銘柄を取得`);

  // Step 2: Quote データ取得
  console.log('   Step 2: Quote データ取得...');
  const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${symbols.join(',')}?apikey=${FMP_API_KEY}`;
  const quoteResponse = await fetch(quoteUrl);

  if (!quoteResponse.ok) {
    console.log('   ❌ Quote データ取得失敗');
    return false;
  }

  const quotes = await quoteResponse.json();
  console.log(`   ✅ ${quotes.length}件のQuoteデータ取得`);

  // データ検証
  console.log('\n   📋 データ内容の検証:');
  const sample = quotes[0];
  console.log(`   シンボル: ${sample?.symbol}`);
  console.log(`   企業名: ${sample?.name}`);
  console.log(`   株価: $${sample?.price}`);
  console.log(`   PER: ${sample?.pe || 'N/A'}`);
  console.log(`   時価総額: $${sample?.marketCap?.toLocaleString() || 'N/A'}`);
  console.log(`   SMA50: $${sample?.priceAvg50 || 'N/A'}`);
  console.log(`   SMA200: $${sample?.priceAvg200 || 'N/A'}`);
  console.log(`   52週高値: $${sample?.yearHigh || 'N/A'}`);

  // スクリーニングに必要なデータがあるか確認
  const hasRequiredData = quotes.filter((q: any) =>
    q.symbol && q.price > 0 && q.marketCap > 0
  );

  console.log(`\n   ✅ スクリーニング可能な銘柄: ${hasRequiredData.length}/${quotes.length}件`);

  return true;
}

// テスト4: API使用状況確認
async function testAPIUsage() {
  console.log('\n📈 テスト4: API使用状況');
  console.log('   FMP APIの使用状況は以下で確認できます:');
  console.log('   https://financialmodelingprep.com/developer/docs/dashboard');
  console.log('\n   無料プラン: 250リクエスト/日');
  console.log('   このテストでの使用: 約3リクエスト\n');
}

// メイン実行
async function main() {
  const test1 = await testQuoteAPI();
  const test2 = await testStockListAPI();
  const test3 = await testComprehensiveFlow();
  await testAPIUsage();

  console.log('\n=== テスト結果 ===');
  console.log(`Quote API: ${test1 ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`Stock List API: ${test2 ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`総合フロー: ${test3 ? '✅ 成功' : '❌ 失敗'}`);

  if (test1 && test2 && test3) {
    console.log('\n✅ すべてのテストが成功しました！');
    console.log('スクリーニングAPIは正しく動作するはずです。\n');
  } else {
    console.log('\n❌ 一部のテストが失敗しました。');
    console.log('API キーまたはネットワーク接続を確認してください。\n');
  }
}

main().catch(console.error);
