"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ segundos = 60 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
