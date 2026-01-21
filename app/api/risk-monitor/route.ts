import { NextRequest, NextResponse } from "next/server";
import { performRiskAssessment } from "@/app/utils/riskAssessmentService";
import {
  sendSlackNotification,
  sendDiscordNotification,
  shouldSendNotification,
} from "@/app/utils/notifications";
import {
  checkRateLimit,
  getClientIdentifier,
  RateLimitConfigs,
  createRateLimitHeaders,
} from "@/app/utils/rateLimit";

let lastNotificationTime: Date | undefined = undefined;

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.riskMonitor);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    // 共通サービスを使用してリスク評価を実行
    const assessment = await performRiskAssessment();

    // Handle notifications
    let notificationStatus = {
      slack: false,
      discord: false,
      sent: false,
    };

    if (shouldSendNotification(assessment.overallScore, lastNotificationTime)) {
      const [slackResult, discordResult] = await Promise.all([
        sendSlackNotification(assessment),
        sendDiscordNotification(assessment),
      ]);

      notificationStatus = {
        slack: slackResult,
        discord: discordResult,
        sent: slackResult || discordResult,
      };

      if (notificationStatus.sent) {
        lastNotificationTime = new Date();
      }
    }

    return NextResponse.json({
      success: true,
      data: assessment,
      notifications: notificationStatus,
    });
  } catch (error) {
    console.error("Risk monitor error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate risk assessment",
      },
      { status: 500 }
    );
  }
}
