import type { Metadata } from "next";
import { MeshContextProvider } from "@/components/mesh-provider";
import "./globals.css";
import "@meshsdk/react/styles.css";

export const metadata: Metadata = {
  title: "Andamio | Easy Onboarding",
  description:
    "Cardano wallet onboarding for Andamio programs, including access token setup, prerequisite verification, and project access.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <MeshContextProvider>{children}</MeshContextProvider>
      </body>
    </html>
  );
}
