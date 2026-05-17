"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  turnLabel: string;
  value: string;
  onSave: (next: string) => void;
}

export function NarrativeEditor({ turnLabel, value, onSave }: Props) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const dirty = draft !== value;

  return (
    <div className="relative rounded border-2 bg-card p-3">
      <div className="absolute -top-3 left-3 bg-card px-1.5 text-xs font-semibold">
        {turnLabel} 내러티브
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (dirty) onSave(draft);
        }}
        placeholder="이 턴의 내러티브를 자유롭게 작성하세요. 포커스가 벗어나면 자동 저장됩니다."
        rows={3}
        className="resize-none border-0 p-0 focus-visible:ring-0"
      />
    </div>
  );
}
