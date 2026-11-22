export const dynamic = "force-dynamic";

const steps = [
  {
    n: "01",
    title: "See your team",
    body: "This is your team. Green means on. Amber means they need you. No reports to learn. Just who is doing what.",
  },
  {
    n: "02",
    title: "Talk to an agent",
    body: "Type like you would text a person. Your agent answers in plain words and waits before anything goes out.",
  },
  {
    n: "03",
    title: "Approve first",
    body: "Every change comes to you as a card. What it is, and why. Tap yes or not now. Not one rupee moves without you.",
  },
  {
    n: "04",
    title: "Pause everything",
    body: "Need a break? One switch. Every agent stops. No posts. No messages. No spending. Turn it back on when you are ready.",
  },
];

export default function HelpPage() {
  return (
    <div>
      <p className="br-kicker">Help</p>
      <h1>Four taps. That is the job.</h1>
      <div className="steps">
        {steps.map((step) => (
          <article key={step.n}>
            <b>{step.n}</b>
            <h2 style={{ fontSize: 26, margin: "8px 0" }}>{step.title}</h2>
            <p className="muted">{step.body}</p>
          </article>
        ))}
      </div>
      <p style={{ marginTop: 22 }}>
        Stuck? Write to <a href="mailto:support@adiology.io">support@adiology.io</a>. A real person replies.
      </p>
    </div>
  );
}
