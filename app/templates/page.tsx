"use client";

import { Suspense } from "react";
import { AppLayout } from "@/components/app-layout";

export default function TemplatesRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppLayout initialView="templates" />
    </Suspense>
  );
}
