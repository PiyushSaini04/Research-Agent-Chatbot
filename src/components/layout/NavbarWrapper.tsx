"use client";

import dynamic from "next/dynamic";

// Dynamically load the Navbar client-side to avoid Supabase SSR during build
const NavbarInner = dynamic(
  () => import("./Navbar").then((m) => m.Navbar),
  {
    ssr: false,
    loading: () => (
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md h-[52px]" />
    ),
  }
);

export function NavbarWrapper() {
  return <NavbarInner />;
}
