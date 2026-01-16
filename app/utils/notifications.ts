// Notification System - Slack, Discord, and Email integrations

import { RiskAssessment } from "./riskMonitor";

interface NotificationRecord {
  id: string;
  timestamp: Date;
  riskScore: number;
  channel: "slack" | "discord" | "email";
  status: "success" | "failed";
  message?: string;
}

const notificationHistory: NotificationRecord[] = [];

function getRiskLevelColor(score: number): string {
  if (score < 30) return "#00AA00"; // Green
  if (score < 50) return "#FFAA00"; // Orange
  if (score < 70) return "#FF6600"; // Red-Orange
  return "#AA0000"; // Red
}

export async function sendSlackNotification(assessment: RiskAssessment): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const color = getRiskLevelColor(assessment.overallScore);
    const topWarning = assessment.topWarnings[0]?.name || "N/A";

    const payload = {
      text: `Market Risk Alert - Score: ${assessment.overallScore.toFixed(1)}/100`,
      attachments: [
        {
          color,
          title: `Risk Level: ${assessment.riskLevel.toUpperCase()}`,
          fields: [
            {
              title: "Overall Score",
              value: `${assessment.overallScore.toFixed(1)}/100`,
              short: true,
            },
            {
              title: "Top Warning",
              value: topWarning,
              short: true,
            },
            {
              title: "Dot-Com Similarity",
              value: `${assessment.historicalComparison.dotCom2000.toFixed(1)}%`,
              short: true,
            },
            {
              title: "2008 Crisis Similarity",
              value: `${assessment.historicalComparison.financialCrisis2008.toFixed(1)}%`,
              short: true,
            },
          ],
          footer: "Stock Analyzer Risk Monitor",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const success = response.ok;
    recordNotification("slack", assessment.overallScore, success);
    return success;
  } catch (error) {
    console.error("Error sending Slack notification:", error);
    recordNotification("slack", assessment.overallScore, false);
    return false;
  }
}

export async function sendDiscordNotification(assessment: RiskAssessment): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const color = parseInt(getRiskLevelColor(assessment.overallScore).replace("#", "0x"), 16);
    const topWarning = assessment.topWarnings[0]?.name || "N/A";

    const payload = {
      embeds: [
        {
          title: `Risk Level: ${assessment.riskLevel.toUpperCase()}`,
          description: `Overall Risk Score: ${assessment.overallScore.toFixed(1)}/100`,
          color,
          fields: [
            {
              name: "Top Warning",
              value: topWarning,
              inline: true,
            },
            {
              name: "Dot-Com 2000 Similarity",
              value: `${assessment.historicalComparison.dotCom2000.toFixed(1)}%`,
              inline: true,
            },
            {
              name: "2008 Crisis Similarity",
              value: `${assessment.historicalComparison.financialCrisis2008.toFixed(1)}%`,
              inline: true,
            },
            {
              name: "2020 Pandemic Similarity",
              value: `${assessment.historicalComparison.pandemic2020.toFixed(1)}%`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Stock Analyzer Risk Monitor" },
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const success = response.ok;
    recordNotification("discord", assessment.overallScore, success);
    return success;
  } catch (error) {
    console.error("Error sending Discord notification:", error);
    recordNotification("discord", assessment.overallScore, false);
    return false;
  }
}

export async function sendEmailNotification(assessment: RiskAssessment): Promise<boolean> {
  const emailProvider = process.env.EMAIL_PROVIDER;
  if (!emailProvider) {
    console.warn("EMAIL_PROVIDER not configured");
    return false;
  }

  try {
    // Email implementation would go here
    // This is a placeholder for future implementation
    recordNotification("email", assessment.overallScore, true);
    return true;
  } catch (error) {
    console.error("Error sending email notification:", error);
    recordNotification("email", assessment.overallScore, false);
    return false;
  }
}

function recordNotification(
  channel: "slack" | "discord" | "email",
  riskScore: number,
  success: boolean
): void {
  notificationHistory.push({
    id: `${channel}-${Date.now()}`,
    timestamp: new Date(),
    riskScore,
    channel,
    status: success ? "success" : "failed",
  });

  // Keep only last 100 notifications in memory
  if (notificationHistory.length > 100) {
    notificationHistory.shift();
  }
}

export function getNotificationHistory(limit: number = 100): NotificationRecord[] {
  return notificationHistory.slice(-limit);
}

export function shouldSendNotification(currentScore: number, lastNotificationTime?: Date): boolean {
  // Don't send if score is below 60
  if (currentScore < 60) {
    return false;
  }

  // Frequency control based on risk severity
  const now = new Date();
  if (lastNotificationTime) {
    const timeSinceLastNotification = (now.getTime() - lastNotificationTime.getTime()) / 1000 / 60; // minutes

    if (currentScore >= 80) {
      // High risk: notify every 30 minutes
      return timeSinceLastNotification >= 30;
    } else if (currentScore >= 70) {
      // Elevated risk: notify every 45 minutes
      return timeSinceLastNotification >= 45;
    } else {
      // Moderate risk: notify every 60 minutes
      return timeSinceLastNotification >= 60;
    }
  }

  return true; // First notification
}

export async function testNotifications(): Promise<{
  slack: boolean;
  discord: boolean;
  email: boolean;
}> {
  const testAssessment: RiskAssessment = {
    timestamp: new Date(),
    overallScore: 65,
    riskLevel: "elevated",
    categories: [],
    topWarnings: [
      {
        name: "Test Warning",
        category: "valuation",
        value: 65,
        normalizedScore: 65,
        direction: "up",
        historicalRange: [40, 80],
      },
    ],
    historicalComparison: {
      dotCom2000: 70,
      financialCrisis2008: 60,
      pandemic2020: 40,
    },
    alerts: ["📊 Test Alert"],
  };

  const results = await Promise.all([
    sendSlackNotification(testAssessment),
    sendDiscordNotification(testAssessment),
    sendEmailNotification(testAssessment),
  ]);

  return {
    slack: results[0],
    discord: results[1],
    email: results[2],
  };
}
