"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/context/ToastContext";
import { TimezoneProvider } from "@/context/TimezoneContext";
import { ApolloProvider } from "@/providers/ApolloProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider>
      <TimezoneProvider>
        <ToastProvider>{children}</ToastProvider>
      </TimezoneProvider>
    </ApolloProvider>
  );
}

