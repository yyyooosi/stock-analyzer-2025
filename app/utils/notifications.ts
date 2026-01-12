/**
 * リスク監視アラート通知システム
 * Slack、Discord、メール通知をサポート
 */

import { RiskAssessment, RiskLevel, RISK_LEVEL_CONFIG } from './riskMonitor';

// 通知設定
interface NotificationConfig {
  slack?: {
    webhookUrl: string;
    enabled: boolean;
  };
  discord?: {
    webhookUrl: string;
    enabled: boolean;
  };
  email?: {
    enabled: boolean;
    recipients: string[];
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
  };
}

// 通知履歴
interface NotificationRecord {
  id: string;
  timestamp: string;
  type: 'slack' | 'discord' | 'email';
  severity: RiskLevel;
  message: string;
  success: boolean;
  error?: string;
}

// 通知履歴（メモリ内、実際にはDBに保存すべき）
const notificationHistory: NotificationRecord[] = [];

/**
 * Slack通知を送信
 */
async function sendSlackNotification(
  webhookUrl: string,
  assessment: RiskAssessment
): Promise<{ success: boolean; error?: string }> {
  try {
    const riskConfig = RISK_LEVEL_CONFIG[assessment.overallLevel];

    const payload = {
      username: 'S&P500リスク監視Bot',
      icon_emoji: ':chart_with_downwards_trend:',
      attachments: [
        {
          color: riskConfig.color,
          title: `🚨 S&P500リスクアラート: ${riskConfig.label}`,
          text: riskConfig.description,
          fields: [
            {
              title: '総合リスクスコア',
              value: `${assessment.overallScore}/100`,
              short: true,
            },
            {
              title: 'リスクレベル',
              value: `${riskConfig.emoji} ${riskConfig.label}`,
              short: true,
            },
            {
              title: '警告指標数',
              value: `${assessment.topWarnings.length}個`,
              short: true,
            },
            {
              title: '更新時刻',
              value: new Date(assessment.timestamp).toLocaleString('ja-JP'),
              short: true,
            },
          ],
          footer: 'S&P500大暴落リスク監視システム',
          ts: Math.floor(new Date(assessment.timestamp).getTime() / 1000),
        },
      ],
    };

    // アラートがある場合は追加
    if (assessment.alerts.length > 0) {
      payload.attachments.push({
        color: '#ff0000',
        title: 'アクティブアラート',
        text: assessment.alerts.map((alert) => `• ${alert.message}`).join('\n'),
      } as any);
    }

    // トップ警告指標を追加
    if (assessment.topWarnings.length > 0) {
      payload.attachments.push({
        color: '#ff9900',
        title: '最も危険な指標 Top 5',
        text: assessment.topWarnings
          .map((ind, i) => `${i + 1}. ${ind.name}: ${ind.normalizedScore}/100`)
          .join('\n'),
      } as any);
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `Slack API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Discord通知を送信
 */
async function sendDiscordNotification(
  webhookUrl: string,
  assessment: RiskAssessment
): Promise<{ success: boolean; error?: string }> {
  try {
    const riskConfig = RISK_LEVEL_CONFIG[assessment.overallLevel];

    const embed = {
      title: `🚨 S&P500リスクアラート: ${riskConfig.label}`,
      description: riskConfig.description,
      color: parseInt(riskConfig.color.replace('#', ''), 16),
      fields: [
        {
          name: '総合リスクスコア',
          value: `**${assessment.overallScore}/100**`,
          inline: true,
        },
        {
          name: 'リスクレベル',
          value: `${riskConfig.emoji} ${riskConfig.label}`,
          inline: true,
        },
        {
          name: '警告指標数',
          value: `${assessment.topWarnings.length}個`,
          inline: true,
        },
      ],
      timestamp: assessment.timestamp,
      footer: {
        text: 'S&P500大暴落リスク監視システム',
      },
    };

    // アラートを追加
    if (assessment.alerts.length > 0) {
      embed.fields.push({
        name: '⚠️ アクティブアラート',
        value: assessment.alerts.map((alert) => `• ${alert.message}`).join('\n'),
        inline: false,
      });
    }

    // トップ警告指標を追加
    if (assessment.topWarnings.length > 0) {
      embed.fields.push({
        name: '📊 最も危険な指標 Top 5',
        value: assessment.topWarnings
          .map((ind, i) => `${i + 1}. **${ind.name}**: ${ind.normalizedScore}/100`)
          .join('\n'),
        inline: false,
      });
    }

    const payload = {
      username: 'S&P500リスク監視Bot',
      avatar_url:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SPX_NYSEarca_Logo.svg/1200px-SPX_NYSEarca_Logo.svg.png',
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `Discord API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * メール通知を送信（将来的実装）
 */
async function sendEmailNotification(
  config: NotificationConfig['email'],
  assessment: RiskAssessment
): Promise<{ success: boolean; error?: string }> {
  // メール送信はNodemailerなどのライブラリが必要
  // ここでは簡易的な実装例を示す
  console.log('Email notification not yet implemented');
  return { success: false, error: 'Email notification not implemented' };
}

/**
 * 通知が必要かどうかを判定
 */
export function shouldNotify(
  assessment: RiskAssessment,
  lastNotificationTime?: string
): boolean {
  // 危険レベルが警戒以上の場合は通知
  if (assessment.overallScore >= 60) {
    // 前回の通知から1時間以上経過している場合のみ通知
    if (lastNotificationTime) {
      const lastTime = new Date(lastNotificationTime).getTime();
      const now = new Date().getTime();
      const hoursSinceLastNotification = (now - lastTime) / (1000 * 60 * 60);

      // 危険レベルによって通知間隔を変える
      if (assessment.overallScore >= 80) {
        // 危険: 30分ごと
        return hoursSinceLastNotification >= 0.5;
      } else if (assessment.overallScore >= 60) {
        // 警戒: 1時間ごと
        return hoursSinceLastNotification >= 1;
      }
    }

    return true;
  }

  return false;
}

/**
 * すべての有効な通知チャネルに送信
 */
export async function sendNotifications(
  assessment: RiskAssessment
): Promise<NotificationRecord[]> {
  const config = getNotificationConfig();
  const records: NotificationRecord[] = [];

  // Slack通知
  if (config.slack?.enabled && config.slack.webhookUrl) {
    const result = await sendSlackNotification(config.slack.webhookUrl, assessment);
    const record: NotificationRecord = {
      id: `slack-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'slack',
      severity: assessment.overallLevel,
      message: `Slack notification: ${assessment.overallLevel}`,
      success: result.success,
      error: result.error,
    };
    records.push(record);
    notificationHistory.push(record);
  }

  // Discord通知
  if (config.discord?.enabled && config.discord.webhookUrl) {
    const result = await sendDiscordNotification(config.discord.webhookUrl, assessment);
    const record: NotificationRecord = {
      id: `discord-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'discord',
      severity: assessment.overallLevel,
      message: `Discord notification: ${assessment.overallLevel}`,
      success: result.success,
      error: result.error,
    };
    records.push(record);
    notificationHistory.push(record);
  }

  // メール通知
  if (config.email?.enabled && config.email.recipients.length > 0) {
    const result = await sendEmailNotification(config.email, assessment);
    const record: NotificationRecord = {
      id: `email-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'email',
      severity: assessment.overallLevel,
      message: `Email notification: ${assessment.overallLevel}`,
      success: result.success,
      error: result.error,
    };
    records.push(record);
    notificationHistory.push(record);
  }

  return records;
}

/**
 * 環境変数から通知設定を取得
 */
function getNotificationConfig(): NotificationConfig {
  return {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      enabled: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
    },
    discord: {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
      enabled: process.env.DISCORD_NOTIFICATIONS_ENABLED === 'true',
    },
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      recipients: process.env.EMAIL_RECIPIENTS?.split(',') || [],
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
    },
  };
}

/**
 * 通知履歴を取得
 */
export function getNotificationHistory(limit: number = 50): NotificationRecord[] {
  return notificationHistory.slice(-limit).reverse();
}

/**
 * テスト通知を送信
 */
export async function sendTestNotification(
  type: 'slack' | 'discord'
): Promise<{ success: boolean; error?: string }> {
  const config = getNotificationConfig();

  const testAssessment: RiskAssessment = {
    timestamp: new Date().toISOString(),
    overallScore: 75,
    overallLevel: 'warning',
    categoryScores: [],
    topWarnings: [],
    historicalComparison: {
      similarTo2000: 50,
      similarTo2008: 60,
      similarTo2020: 40,
    },
    alerts: [
      {
        id: 'test',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        category: 'valuation',
        message: 'これはテスト通知です。システムは正常に動作しています。',
        indicators: [],
      },
    ],
  };

  if (type === 'slack' && config.slack?.webhookUrl) {
    return await sendSlackNotification(config.slack.webhookUrl, testAssessment);
  } else if (type === 'discord' && config.discord?.webhookUrl) {
    return await sendDiscordNotification(config.discord.webhookUrl, testAssessment);
  }

  return { success: false, error: 'Webhook URL not configured' };
}
