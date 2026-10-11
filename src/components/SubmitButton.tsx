"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  const cls = tone === "primary" ? "bg-brand text-white" : "border border-line bg-white";
  return (
    <button disabled={pending} className={`px-3 py-1.5 rounded ${cls} disabled:opacity-60`}>
      {pending ? "Working…" : children}
    </button>
  );
}
