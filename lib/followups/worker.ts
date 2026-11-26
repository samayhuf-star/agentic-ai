/** Node-only worker for payment recovery emails (off unless RECOVERY_EMAILS=on). */
export async function startRecoveryWorker() {
  if (process.env.NODE_ENV !== "production") return;
  const g = globalThis as typeof globalThis & { __recoveryTimer?: ReturnType<typeof setInterval> };
  if (g.__recoveryTimer) return;
  const { runRecovery, sendRecoveryTest } = await import("@/lib/followups/recovery");

  // One-off test send to an approved address, e.g. RECOVERY_TEST_ORDER=br... RECOVERY_TEST_TO=you@x.com RECOVERY_TEST_STEPS=r1,r2
  const testOrder = process.env.RECOVERY_TEST_ORDER;
  const testTo = process.env.RECOVERY_TEST_TO;
  if (testOrder && testTo) {
    setTimeout(async () => {
      try {
        const steps = (process.env.RECOVERY_TEST_STEPS || "r1").split(",").map((s) => s.trim()) as ("r1" | "r2")[];
        const ids = await sendRecoveryTest(testOrder, testTo, steps);
        console.log(`recovery test: ${JSON.stringify(ids)}`);
      } catch (error) {
        console.error("recovery test", error);
      }
    }, 20 * 1000);
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { sent } = await runRecovery();
      if (sent) console.log(`recovery: sent ${sent}`);
    } catch (error) {
      console.error("recovery worker", error);
    } finally {
      running = false;
    }
  };
  g.__recoveryTimer = setInterval(tick, 60 * 1000);
}
