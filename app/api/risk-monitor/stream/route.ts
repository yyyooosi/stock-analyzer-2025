// SSE (Server-Sent Events) endpoint for real-time risk monitoring
import { NextRequest } from "next/server";
import { performRiskAssessment } from "@/app/utils/riskAssessmentService";
import {
  checkRateLimit,
  getClientIdentifier,
  RateLimitConfigs,
} from "@/app/utils/rateLimit";

// 更新間隔（ミリ秒）- 環境変数で設定可能、デフォルト30秒
const UPDATE_INTERVAL_MS = parseInt(process.env.RISK_MONITOR_INTERVAL_MS || "30000", 10);

// 接続中のクライアント数を追跡
let activeConnections = 0;

export async function GET(request: NextRequest) {
  // Rate limiting check
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId, RateLimitConfigs.riskMonitor);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.resetIn.toString(),
        },
      }
    );
  }

  // SSE response headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable buffering for nginx
  });

  activeConnections++;
  console.log(`[SSE] New connection. Active connections: ${activeConnections}`);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let isActive = true;

      // Send initial connection event
      const sendEvent = (eventType: string, data: unknown) => {
        if (!isActive) return;
        try {
          const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Connection might be closed
          isActive = false;
        }
      };

      // Send heartbeat to keep connection alive
      const sendHeartbeat = () => {
        if (!isActive) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          isActive = false;
        }
      };

      // Send connection established event
      sendEvent("connected", {
        message: "Connected to risk monitor stream",
        updateInterval: UPDATE_INTERVAL_MS,
        timestamp: new Date().toISOString(),
      });

      // Fetch and send initial data
      try {
        const assessment = await performRiskAssessment();
        sendEvent("assessment", {
          success: true,
          data: assessment,
        });
      } catch (error) {
        console.error("[SSE] Initial assessment error:", error);
        sendEvent("error", {
          message: "Failed to fetch initial assessment",
        });
      }

      // Set up periodic updates
      const updateInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(updateInterval);
          return;
        }

        try {
          const assessment = await performRiskAssessment();
          sendEvent("assessment", {
            success: true,
            data: assessment,
          });
        } catch (error) {
          console.error("[SSE] Assessment update error:", error);
          sendEvent("error", {
            message: "Failed to fetch assessment update",
          });
        }
      }, UPDATE_INTERVAL_MS);

      // Send heartbeat every 15 seconds
      const heartbeatInterval = setInterval(() => {
        if (!isActive) {
          clearInterval(heartbeatInterval);
          return;
        }
        sendHeartbeat();
      }, 15000);

      // Handle client disconnect via abort signal
      request.signal.addEventListener("abort", () => {
        isActive = false;
        activeConnections--;
        console.log(`[SSE] Connection closed. Active connections: ${activeConnections}`);
        clearInterval(updateInterval);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      });
    },
  });

  return new Response(stream, { headers });
}

// Expose connection count for monitoring
export function getActiveConnections(): number {
  return activeConnections;
}
