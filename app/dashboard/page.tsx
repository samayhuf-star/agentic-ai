import { PauseSwitch } from "@/components/PauseSwitch";
import { goalLabel } from "@/data/agents";
import { previewLayout } from "@/lib/dashboard/preview";
import { requireDashboardUser, startOfTodayIst } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await requireDashboardUser();
  const user = session.user!;
  const [running, waiting, doneToday, recent] = await Promise.all([
    prisma.userAgent.count({ where: { userId: user.id, enabled: true } }),
    prisma.approval.count({ where: { userId: user.id, status: "pending" } }),
    prisma.task.count({ where: { userId: user.id, createdAt: { gte: startOfTodayIst() } } }),
    prisma.task.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const active = user.paused ? 0 : running;
  const layout = await previewLayout();

  return (
    <div className={layout ? `overview-preview layout-${layout}` : undefined}>
      <p className="br-kicker">{user.businessName?.trim() || "Your business"}</p>
      <h1>Good to see you.</h1>
      <p className="muted">Goal: {user.goal ? goalLabel(user.goal) : "Not set"}. Nothing goes live until you say yes.</p>
      {user.paused ? <div className="banner">Paused. No posts, no messages, no spending.</div> : null}
      <div className="stats">
        <div className="stat">
          <small>Switched on</small>
          <b>{active}</b>
        </div>
        <div className="stat y">
          <small>Needs yes</small>
          <b>{waiting}</b>
        </div>
        <div className="stat">
          <small>Approved today</small>
          <b>{doneToday}</b>
        </div>
      </div>
      <div className="note">
        <small>Summary</small>
        <p>
          Ayaan here. {waiting > 0 ? `${waiting} thing${waiting === 1 ? "" : "s"} need your yes.` : "Nothing is waiting on you."} I will not invent results. When a job is only an idea, it stays in Needs your yes.
        </p>
      </div>
      <div className="pause-big">
        <div>
          <b>Pause everything</b>
          <div className="muted">One switch. Every agent stops.</div>
        </div>
        <PauseSwitch key={`overview-${String(user.paused)}`} initial={user.paused} big />
      </div>
      <h2 style={{ marginTop: 28, fontSize: 28 }}>Your yes decisions</h2>
      {recent.length === 0 ? (
        <p className="muted">Nothing finished yet. Your team waits for your yes before anything goes out.</p>
      ) : (
        <div className="stack" style={{ marginTop: 10 }}>
          {recent.map((task) => (
            <div className="card" key={task.id}>
              {task.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
