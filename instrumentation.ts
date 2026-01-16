// Next.js Instrumentation - Initialize background tasks on app startup

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only run on Node.js runtime, not in Edge Runtime
    const { startRiskMonitorScheduler } = await import("./app/utils/scheduler");

    console.log("🚀 Initializing Risk Monitor Scheduler...");
    try {
      startRiskMonitorScheduler();
      console.log("✅ Risk Monitor Scheduler initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Risk Monitor Scheduler:", error);
    }
  }
}
