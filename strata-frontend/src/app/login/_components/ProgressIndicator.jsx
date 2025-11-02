"use client";

export default function ProgressIndicator({ step }) {
  const steps = ["email", "password", "signup"];

  return (
    <div className="flex justify-center space-x-2 mb-6">
      {steps.map((s) => (
        <div
          key={s}
          className={`w-3 h-3 rounded-full transition-colors ${
            step === s || (step === "forgot" && s === "password")
              ? "bg-primary"
              : "bg-muted dark:bg-neutral-700"
          }`}
        />
      ))}
    </div>
  );
}
