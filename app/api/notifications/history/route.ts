import { NextRequest, NextResponse } from "next/server";
import { getNotificationHistory } from "@/app/utils/notifications";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    const history = getNotificationHistory(Math.min(limit, 100));

    return NextResponse.json({
      success: true,
      data: history,
      total: history.length,
    });
  } catch (error) {
    console.error("Error fetching notification history:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve notification history",
      },
      { status: 500 }
    );
  }
}
