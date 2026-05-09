"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequesterHub } from "@/features/interventions/context/RequesterHubContext";

export default function RequesterInterventionStepperHeader() {
  const { currentStep, setCurrentStep } = useRequesterHub();

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep((prev) => prev + 1);
  };
  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  return (
    <div className="flex shrink-0 items-center justify-between bg-white px-4 pt-1 pb-0">
      <button
        type="button"
        onClick={handleBack}
        disabled={currentStep === 0}
        aria-label="Étape précédente"
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft className="h-5 w-5 text-slate-900" aria-hidden />
      </button>

      <div className="flex gap-1.5" aria-label="Progression du formulaire" role="status">
        {[0, 1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              currentStep === step ? "w-4 bg-black" : "w-1.5 bg-slate-200",
            )}
          />
        ))}
      </div>

      <div className="w-8">
        {currentStep > 0 && currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Étape suivante"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-slate-900" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

