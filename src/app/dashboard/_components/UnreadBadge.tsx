"use client";

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// UnreadBadge — polls /api/reports/unread-count every 30 s and shows a
// count badge next to the "Reports" nav link in the dashboard sidebar.
// Uses simple polling (no WebSockets) — acceptable for MVP traffic.
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000;

export default function UnreadBadge() {
  const [count, setCount] = useState<number>(0);

  async function fetchCount() {
    try {
      const res = await fetch("/api/reports/unread-count", {
        // Bypass Next.js cache so we always get a fresh count
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        setCount(data.count);
      }
    } catch {
      // Silently ignore network errors during polling
    }
  }

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}
