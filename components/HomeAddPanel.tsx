"use client";

import { useRouter } from "next/navigation";

import { AddLinkForm } from "@/components/AddLinkForm";

export function HomeAddPanel() {
  const router = useRouter();

  return <AddLinkForm onSaved={() => router.refresh()} />;
}
