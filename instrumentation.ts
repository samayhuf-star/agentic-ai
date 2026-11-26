export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRecoveryWorker } = await import("./lib/followups/worker");
    await startRecoveryWorker();
  }
}
