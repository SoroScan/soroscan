"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/context/ToastContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { OnboardingTour } from "@/components/OnboardingTour";
import { ApolloProvider } from "@/providers/ApolloProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider>
      <OnboardingProvider>
        <ToastProvider>
          {children}
          <OnboardingTour />
        </ToastProvider>
      </OnboardingProvider>
    </ApolloProvider>
  );
}

