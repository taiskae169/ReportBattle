"use client";

interface Props {
  a: number;
  b: number;
}

export function ScoreBar({ a, b }: Props) {
  const total = a + b;
  const ratio = total === 0 ? 0.5 : a / total;

  return (
    <div className="rounded border-2 bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="text-base font-semibold">점수</div>
        <div className="relative h-3.5 flex-1 overflow-hidden rounded border-2 bg-background">
          <div
            className="absolute inset-y-0 left-0 bg-foreground"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <div className="font-mono text-base">
          {a} — {b}
        </div>
      </div>
      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
        턴별 누적 (이벤트의 vp_gain 합산)
      </div>
    </div>
  );
}
