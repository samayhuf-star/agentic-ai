export function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="5" cy="3.2" r="1.15" fill="currentColor" />
      <circle cx="11" cy="3.2" r="1.15" fill="currentColor" />
      <circle cx="5" cy="8" r="1.15" fill="currentColor" />
      <circle cx="11" cy="8" r="1.15" fill="currentColor" />
      <circle cx="5" cy="12.8" r="1.15" fill="currentColor" />
      <circle cx="11" cy="12.8" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.1 1.6h3.8l-.35 3.7 2.15 1.9v1.3H8.7V13.2L8 14.2l-.7-1V8.5H4.3V7.2l2.15-1.9-.35-3.7Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M2.2 9.1 15.4 2.6c.5-.2 1 .3.8.8l-2.4 11.2c-.1.5-.7.7-1.1.4L9 12.2 6.4 14.6c-.4.4-1.1.1-1.1-.5v-3.2L2.2 9.8c-.4-.3-.4-.9 0-1.1Z" fill="currentColor" />
    </svg>
  );
}

export function NavIcon({ name }: { name: string }) {
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "home") return <svg {...props}><path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-8.8Z" /></svg>;
  if (name === "team") return <svg {...props}><circle cx="8" cy="9" r="2.2" /><circle cx="16" cy="9.5" r="1.8" /><path d="M4.5 18.5c.6-2.4 2.2-3.6 3.5-3.6s2.9 1.2 3.5 3.6" /><path d="M13 15.2c.8-.5 1.8-.8 2.8-.8 1.2 0 2.6.9 3.2 3.1" /></svg>;
  if (name === "yes") return <svg {...props}><circle cx="12" cy="12" r="8" /><path d="M8.5 12.2 11 14.6 15.8 9.4" /></svg>;
  if (name === "chat") return <svg {...props}><path d="M5 6.5h14v9H8.2L5 18.2V6.5Z" /></svg>;
  if (name === "settings") return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3V20.5M4.8 6.6l1.6 1.6M17.6 15.8l1.6 1.6M3.5 12h2.2M18.3 12H20.5M4.8 17.4l1.6-1.6M17.6 8.2l1.6-1.6" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8h.01" /></svg>;
}
