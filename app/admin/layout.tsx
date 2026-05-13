import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 — Folio Cards",
  description: "Admin Dashboard",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
