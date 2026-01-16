import { NextRequest, NextResponse } from "next/server";
import { testNotifications } from "@/app/utils/notifications";

export async function POST(request: NextRequest) {
  try {
    const results = await testNotifications();

    return NextResponse.json({
      success: true,
      message: "Test notifications sent",
      data: results,
    });
  } catch (error) {
    console.error("Error sending test notifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send test notifications",
      },
      { status: 500 }
    );
  }
}
