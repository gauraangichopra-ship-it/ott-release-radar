"use client";
import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  tone?: "primary" | "secondary";
  pendingText?: string;
  confirm?: string;
};

export function SubmitButton({ children, tone = "primary", pendingText = "Working…", confirm }: Props) {
  const { pending } = useFormStatus();
  const cls = tone === "primary"
    ? "bg-accent text-white hover:brightness-95 shadow-sm"
    : "bg-white text-ink border border-line hover:bg-stone-50";
  return (
    <button
      disabled={pending}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-70 disabled:cursor-wait ${cls}`}>
      {pending && <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
      {pending ? pendingText : children}
    </button>
  );
}
