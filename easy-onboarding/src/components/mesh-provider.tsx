"use client";

import { MeshProvider } from "@meshsdk/react";

type MeshContextProviderProps = {
  children: React.ReactNode;
};

export function MeshContextProvider({ children }: MeshContextProviderProps) {
  return <MeshProvider>{children}</MeshProvider>;
}
