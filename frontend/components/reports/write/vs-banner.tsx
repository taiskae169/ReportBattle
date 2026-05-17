"use client";

import type { SideRoster } from "./types";

interface Props {
  sideA: SideRoster;
  sideB: SideRoster;
}

function Avatar({ shape }: { shape: "circle" | "square" }) {
  if (shape === "circle") {
    return (
      <svg width="42" height="42" className="shrink-0">
        <circle cx="21" cy="21" r="18" className="fill-foreground" />
      </svg>
    );
  }
  return (
    <svg width="42" height="42" className="shrink-0">
      <rect x="4" y="4" width="34" height="34" fill="none" className="stroke-foreground" strokeWidth="3" />
    </svg>
  );
}

function SideInfo({ roster, align }: { roster: SideRoster; align: "left" | "right" }) {
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start"}`}>
      <div className="text-lg font-semibold leading-tight">
        플레이어 {roster.side} · {roster.player_name || "(미입력)"}
      </div>
      <div className="text-xs font-mono text-muted-foreground">
        {roster.parsed?.faction ?? "팩션 미정"}
        {roster.total_points != null && ` · ${roster.total_points}pt`}
      </div>
    </div>
  );
}

export function VSBanner({ sideA, sideB }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-lg border-2 bg-card px-4 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <Avatar shape="circle" />
        <SideInfo roster={sideA} align="left" />
      </div>
      <div className="text-4xl font-bold tracking-tighter">VS</div>
      <div className="flex flex-1 items-center justify-end gap-3 min-w-0">
        <SideInfo roster={sideB} align="right" />
        <Avatar shape="square" />
      </div>
    </div>
  );
}
