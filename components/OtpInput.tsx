"use client";

import { useEffect, useRef, useState } from "react";

const LENGTH = 6;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function OtpInput({
  onChange,
  onComplete,
}: {
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [boxes, setBoxes] = useState<string[]>(() => Array.from({ length: LENGTH }, () => ""));
  const code = boxes.join("");

  function commit(next: string[], focusIndex: number) {
    const filled = next.map((digit) => digitsOnly(digit).slice(-1));
    setBoxes(filled);
    const nextCode = filled.join("");
    onChange(nextCode);
    const target = nextCode.length >= LENGTH ? LENGTH - 1 : Math.max(0, Math.min(focusIndex, LENGTH - 1));
    window.requestAnimationFrame(() => refs.current[target]?.focus());
  }

  function place(raw: string, start: number) {
    const incoming = digitsOnly(raw);
    if (!incoming) return;
    if (incoming.length >= LENGTH) {
      commit(incoming.slice(0, LENGTH).split(""), LENGTH - 1);
      return;
    }
    const next = boxes.slice();
    for (let offset = 0; offset < incoming.length && start + offset < LENGTH; offset += 1) {
      next[start + offset] = incoming[offset];
    }
    commit(next, Math.min(start + incoming.length, LENGTH - 1));
  }

  useEffect(() => {
    if (code.length !== LENGTH || !onComplete) return;
    const timer = window.setTimeout(() => onComplete(code), 700);
    return () => window.clearTimeout(timer);
  }, [code, onComplete]);

  return (
    <div className="otp-entry" role="group" aria-label="One-time code">
      {boxes.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          value={digit}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1}`}
          onPaste={(event) => {
            event.preventDefault();
            place(event.clipboardData.getData("text"), index);
          }}
          onChange={(event) => {
            const text = event.target.value;
            if (text.length > 1) {
              place(text, index);
              return;
            }
            const next = boxes.slice();
            next[index] = digitsOnly(text).slice(-1);
            commit(next, next[index] ? Math.min(index + 1, LENGTH - 1) : index);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Backspace" || digit || index === 0) return;
            event.preventDefault();
            const next = boxes.slice();
            next[index - 1] = "";
            commit(next, index - 1);
          }}
        />
      ))}
    </div>
  );
}
