// ==================================
// 東横イン空室チェッカー
// Google Apps Script
// ==================================
//
// ★ 複数アカウント運用について ★
// 設定（urls / email / hotelInfo / checkHistory）はすべて
// PropertiesService.getUserProperties() に保存されるため、
// 「Webアプリにアクセスしたユーザーごと」に自動的に分離されます。
//
// ただし分離が効くのは、Webアプリのデプロイ設定が
//   実行ユーザー: 「ウェブアプリケーションにアクセスしているユーザー」
//   アクセス権  : 「全員」
// になっている場合だけです（appsscript.json の webapp 設定を参照）。
// 「自分（オーナー）として実行」のままだと全員がオーナーのデータを
// 共有してしまい、メール等が上書きされます。詳細は README を参照。

// ========== 設定管理 ==========

/**
 * 設定を取得
 * @return {{ monitoring, urls, hotelInfo, email, intervalMinutes, notifyErrors }}
 */
function getSettings() {
  const props = PropertiesService.getUserProperties();
  return {
    monitoring: props.getProperty('monitoring') === 'true',
    urls: JSON.parse(props.getProperty('urls') || '[]'),
    hotelInfo: JSON.parse(props.getProperty('hotelInfo') || '{}'),
    email: props.getProperty('email') || '',
    intervalMinutes: parseInt(props.getProperty('intervalMinutes') || '5'),
    notifyErrors: props.getProperty('notifyErrors') !== 'false'
  };
}

/**
 * 設定を保存
 * monitoring / intervalMinutes が変化した時のみトリガーを更新する
 * @param {{ monitoring, urls, hotelInfo, email, intervalMinutes, notifyErrors }} settings
 */
function saveSettings(settings) {
  const props = PropertiesService.getUserProperties();

  // 変更前の値を保持（トリガー更新が必要か判定するため）
  const prevMonitoring = props.getProperty('monitoring') === 'true';
  const prevInterval = props.getProperty('intervalMinutes') || '5';

  props.setProperty('monitoring', settings.monitoring ? 'true' : 'false');
  props.setProperty('urls', JSON.stringify(settings.urls || []));
  props.setProperty('hotelInfo', JSON.stringify(settings.hotelInfo || {}));
  props.setProperty('email', settings.email || '');
  props.setProperty('intervalMinutes', String(settings.intervalMinutes || 5));
  props.setProperty('notifyErrors', settings.notifyErrors !== false ? 'true' : 'false');

  // 監視状態またはチェック間隔が変わった場合のみトリガーを更新
  const monitoringChanged = prevMonitoring !== settings.monitoring;
  const intervalChanged = prevInterval !== String(settings.intervalMinutes || 5);
  if (monitoringChanged || intervalChanged) {
    updateTrigger(settings.monitoring, settings.intervalMinutes);
  }

  return { success: true };
}

// ========== Webアプリ ==========

/**
 * WebアプリのGETリクエスト処理
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('東横イン空室チェッカー')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ========== URL正規化 ==========

/**
 * URLを正規化: r_avail_only=true がなければ追加
 */
function normalizeUrl(url) {
  if (url.indexOf('r_avail_only=true') === -1) {
    url = url + (url.indexOf('?') === -1 ? '?' : '&') + 'r_avail_only=true';
  }
  return url;
}

// ========== ホテル名取得 ==========

/**
 * 単一URLからホテル名を取得（URL正規化付き）
 * @param {string} url
 * @return {{ success, url, hotelName }}
 */
function fetchSingleHotelName(url) {
  try {
    // URL正規化（登録時に r_avail_only=true を付与）
    url = normalizeUrl(url);

    var hotelName = null;

    var res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    if (res.getResponseCode() === 200) {
      hotelName = extractHotelNameFromHtml(res.getContentText());
    }

    return { success: true, url: url, hotelName: hotelName || 'ホテル名不明' };
  } catch (error) {
    Logger.log('fetchSingleHotelName error: ' + error);
    return { success: false, url: url, hotelName: 'ホテル名不明' };
  }
}

/**
 * HTMLからホテル名を抽出
 * h1タグ → titleタグ → OGPタグ の順で試みる
 */
function extractHotelNameFromHtml(html) {
  // h1タグ（最優先）
  var h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    var h1Name = h1Match[1].trim();
    if (h1Name) return h1Name;
  }

  // titleタグ
  var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    var titleName = cleanHotelName(titleMatch[1]);
    if (titleName) return titleName;
  }

  // OGPタグ（property/content の順序両方に対応）
  var ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogMatch) {
    var ogName = cleanHotelName(ogMatch[1]);
    if (ogName) return ogName;
  }

  return null;
}

/**
 * ホテル名文字列から余分なサイト名や「東横INN」プレフィックスを除去して
 * 場所名のみを返す
 */
function cleanHotelName(raw) {
  var name = raw.trim();
  // パイプ・ハイフン以降のサイト名を除去
  name = name.replace(/\s*[|｜]\s*.+$/, '').trim();
  name = name.replace(/\s*[-－]\s*.+$/, '').trim();
  // 先頭の「東横INN」「東横イン」を除去して場所名だけにする
  name = name.replace(/^東横I[Nn]{1,2}\s*/i, '').trim();
  name = name.replace(/^東横イン\s*/i, '').trim();
  return name || null;
}

// ========== Cloud Functions設定 ==========

/**
 * スクリプトプロパティからCloud Function設定を取得
 * スクリプトエディタ → プロジェクトの設定 → スクリプトプロパティ で設定:
 *   CLOUD_FUNCTION_URL : Cloud FunctionのエンドポイントURL
 *   CLOUD_FUNCTION_API_KEY : APIキー
 *
 * 注: これは全ユーザー共有のレンダリング用サービス設定なので
 *     ScriptProperties（スクリプト共通）でOK。
 */
function getCloudFunctionConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    url: props.getProperty('CLOUD_FUNCTION_URL') || '',
    apiKey: props.getProperty('CLOUD_FUNCTION_API_KEY') || ''
  };
}

/**
 * Cloud FunctionsにURLを送りレンダリング済みHTMLを取得する
 * @param {string} targetUrl
 * @return {{ success, html, error }}
 */
function fetchWithCloudFunction(targetUrl) {
  var config = getCloudFunctionConfig();
  if (!config.url) {
    return { success: false, error: 'CLOUD_FUNCTION_URL が未設定' };
  }

  try {
    var options = {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({ url: targetUrl })
    };
    if (config.apiKey) {
      options.headers = { 'X-API-Key': config.apiKey };
    }

    var res = UrlFetchApp.fetch(config.url, options);
    if (res.getResponseCode() !== 200) {
      return { success: false, error: 'Cloud Function HTTP ' + res.getResponseCode() };
    }

    var body = JSON.parse(res.getContentText());
    if (!body.success || !body.html) {
      return { success: false, error: body.error || 'Cloud Function: htmlなし' };
    }

    return { success: true, html: body.html };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ========== 空室判定 ==========

/**
 * HTMLから空室があるか判定
 */
function checkVacancyInHtml(html) {
  var cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  var text = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return text.includes('予約する') || text.includes('残り');
}

// ========== 手動チェック ==========

function manualCheck() {
  const settings = getSettings();

  if (!settings.urls || settings.urls.length === 0) {
    throw new Error('監視URLが設定されていません。URLを追加してから再試行してください。');
  }

  if (!settings.email) {
    throw new Error('通知先メールアドレスが設定されていません。');
  }

  const results = runCheck(settings);

  // スキップを集計に追加
  const skipCount    = results.filter(function(r) { return r.skipped; }).length;
  const vacantCount  = results.filter(function(r) { return r.hasVacancy; }).length;
  const checkedCount = results.filter(function(r) { return r.success && !r.skipped; }).length;
  const errorCount   = results.filter(function(r) { return !r.success; }).length;

  let message = checkedCount + '件確認、空室' + vacantCount + '件発見';
  if (skipCount > 0)  message += '（' + skipCount + '件スキップ）';
  if (errorCount > 0) message += '（' + errorCount + '件エラー）';

  return { message: message };
}

// ========== チェック実行（内部） ==========

function runCheck(settings) {
  const urls = settings.urls || [];
  const results = [];

  for (var i = 0; i < urls.length; i++) {
    var result = checkSingleUrl(urls[i]);
    results.push(result);

    // スキップ以外でホテル名が取れた場合のみ更新
    if (!result.skipped && result.success && result.hotelName) {
      settings.hotelInfo = settings.hotelInfo || {};
      settings.hotelInfo[urls[i]] = result.hotelName;
    }

    if (i < urls.length - 1) {
      Utilities.sleep(1000);
    }
  }

  // ホテル情報を更新保存
  PropertiesService.getUserProperties().setProperty(
    'hotelInfo',
    JSON.stringify(settings.hotelInfo || {})
  );

  // スキップを除いた結果のみ通知・履歴対象
  var activeResults = results.filter(function(r) { return !r.skipped; });

  var vacantResults = activeResults.filter(function(r) { return r.success && r.hasVacancy; });
  if (vacantResults.length > 0 && settings.email) {
    sendVacancyNotification(vacantResults, settings.email);
  }

  var errorResults = activeResults.filter(function(r) { return !r.success; });
  if (errorResults.length > 0 && settings.notifyErrors && settings.email) {
    sendErrorNotification(errorResults, settings.email);
  }

  appendCheckHistory(activeResults, settings.hotelInfo || {});

  return results;
}

// ========== 空室チェック（単一URL） ==========

function checkSingleUrl(url) {
  // 過去日付はスキップ
  var startMatch = url.match(/[?&]start=(\d{4}-\d{2}-\d{2})/);
  if (startMatch) {
    var tz = Session.getScriptTimeZone();
    var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var today = new Date(todayStr);
    var startDate = new Date(startMatch[1]);
    if (startDate < today) {
      Logger.log('スキップ（過去日程）: ' + url);
      return { success: true, skipped: true, url: url, hasVacancy: false };
    }
  }

  var html = null;
  var method = 'static';

  var cfResult = fetchWithCloudFunction(url);
  if (!cfResult.success) {
    return { success: false, url: url, error: 'Cloud Functions失敗: ' + cfResult.error };
  }
  html = cfResult.html;
  method = 'cloud-function';

  if (!html) {
    try {
      var res = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true
      });
      if (res.getResponseCode() !== 200) {
        return { success: false, url: url, error: 'HTTP ' + res.getResponseCode() };
      }
      html = res.getContentText();
    } catch (e) {
      return { success: false, url: url, error: e.toString() };
    }
  }

  return {
    success: true,
    url: url,
    hasVacancy: checkVacancyInHtml(html),
    hotelName: extractHotelNameFromHtml(html) || 'ホテル名不明',
    method: method
  };
}

// ========== 定期チェック（トリガー） ==========

/**
 * トリガーから呼ばれる定期チェック
 * トリガーはユーザーごとに作成されるため、
 * getUserProperties() はトリガー作成者のデータを返す（＝アカウント分離される）。
 */
function scheduledCheck() {
  var settings = getSettings();
  if (!settings.monitoring) {
    Logger.log('監視が無効のためスキップ');
    return;
  }
  if (!settings.urls || settings.urls.length === 0) {
    Logger.log('監視URLが未設定のためスキップ');
    return;
  }
  Logger.log('定期チェック開始');
  runCheck(settings);
  Logger.log('定期チェック完了');
}

// ========== トリガー管理 ==========

/**
 * 監視状態と間隔に応じてトリガーを更新
 * ScriptApp.getProjectTriggers() は実行ユーザー自身のトリガーのみを返すため、
 * 他ユーザーのトリガーを誤って削除することはない。
 */
function updateTrigger(monitoring, intervalMinutes) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scheduledCheck') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  if (!monitoring) {
    Logger.log('監視OFF: トリガー削除済み');
    return;
  }

  var minutes = parseInt(intervalMinutes) || 5;
  ScriptApp.newTrigger('scheduledCheck')
    .timeBased()
    .everyMinutes(minutes)
    .create();

  Logger.log('トリガー設定: ' + minutes + '分ごと');
}

// ========== 履歴管理 ==========

/**
 * チェック結果を履歴に追記（最大100件）
 */
function appendCheckHistory(results, hotelInfo) {
  var props = PropertiesService.getUserProperties();
  var history = JSON.parse(props.getProperty('checkHistory') || '[]');
  var datetime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');

  for (var i = 0; i < results.length; i++) {
    var result = results[i];
    history.unshift({
      url: result.url,
      hotelName: (hotelInfo[result.url] || result.hotelName || 'ホテル名不明'),
      datetime: datetime,
      status: result.success ? (result.hasVacancy ? '🟢' : '🔴') : '⚠️'
    });
  }

  // 最大100件（PropertiesServiceの50KB制限対策）
  if (history.length > 100) {
    history.splice(100);
  }

  props.setProperty('checkHistory', JSON.stringify(history));
}

/**
 * チェック履歴を取得
 * @return {Array<{ url, hotelName, datetime, status }>}
 */
function getCheckHistory() {
  var props = PropertiesService.getUserProperties();
  return JSON.parse(props.getProperty('checkHistory') || '[]');
}

/**
 * チェック履歴をクリア
 * @return {{ message }}
 */
function clearHistory() {
  PropertiesService.getUserProperties().deleteProperty('checkHistory');
  return { message: '履歴をクリアしました' };
}

// ========== メール通知 ==========

/**
 * 空室通知メール送信
 */
function sendVacancyNotification(vacantResults, email) {
  var subject = '【東横イン】空室発見！（' + vacantResults.length + '件）';
  var body = '以下のホテルで空室が見つかりました:\n\n';
  for (var i = 0; i < vacantResults.length; i++) {
    body += '■ ' + vacantResults[i].hotelName + '\n' + vacantResults[i].url + '\n\n';
  }
  body += '\n確認日時: ' + new Date().toLocaleString('ja-JP');
  try {
    MailApp.sendEmail({ to: email, subject: subject, body: body });
  } catch (e) {
    Logger.log('メール送信エラー: ' + e);
  }
}

/**
 * エラー通知メール送信
 */
function sendErrorNotification(errorResults, email) {
  var subject = '【東横イン空室チェッカー】チェックエラー（' + errorResults.length + '件）';
  var body = '以下のURLでエラーが発生しました:\n\n';
  for (var i = 0; i < errorResults.length; i++) {
    body += '■ ' + errorResults[i].url + '\nエラー: ' + errorResults[i].error + '\n\n';
  }
  body += '\n発生日時: ' + new Date().toLocaleString('ja-JP');
  try {
    MailApp.sendEmail({ to: email, subject: subject, body: body });
  } catch (e) {
    Logger.log('エラーメール送信エラー: ' + e);
  }
}
