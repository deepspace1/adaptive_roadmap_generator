"use client";

import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

const steps = ["Topic", "Background", "Preferences", "Assessment"];

export function OnboardingLayout({
  step,
  canContinue,
  submitting,
  children,
  onBack,
  onNext
}: {
  step: number;
  canContinue: boolean;
  submitting?: boolean;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <main className="min-h-screen px-4 py-6 text-ink dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="grid gap-3 sm:grid-cols-4">
            {steps.map((label, index) => {
              const number = index + 1;
              const active = number === step;
              const complete = number < step;
              return (
                <div key={label} className="relative flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold transition-all duration-200 ease-in-out ${
                      complete
                        ? "bg-green-500 text-white"
                        : active
                          ? "bg-teal text-white"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {complete ? <CheckCircle2 className="h-4 w-4" /> : number}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${active ? "text-teal" : "text-ink dark:text-gray-100"}`}>{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{complete ? "Complete" : active ? "Active" : "Upcoming"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-800 sm:p-8">
          <div className="animate-[fadeIn_0.2s_ease-in-out]">{children}</div>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
              onClick={onBack}
              disabled={step === 1 || submitting}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < 4 ? (
              <button
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onNext}
                disabled={!canContinue || submitting}
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
