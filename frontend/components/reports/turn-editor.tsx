"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BattleTurnCreate } from "@/lib/types/battle-report";

interface Props {
  value: BattleTurnCreate;
  onChange: (next: BattleTurnCreate) => void;
  onRemove?: () => void;
}

export function TurnEditor({ value, onChange, onRemove }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">턴</Label>
          <Input
            type="number"
            min={1}
            className="w-20"
            value={value.turn_number}
            onChange={(e) => onChange({ ...value, turn_number: Number(e.target.value) || 1 })}
          />
        </div>
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            삭제
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>메모 (간단한 한 줄)</Label>
        <Input
          placeholder="예: 1턴 - 양측 진영 정비"
          value={value.memo ?? ""}
          onChange={(e) => onChange({ ...value, memo: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>턴 리포트</Label>
        <Textarea
          rows={4}
          placeholder="이번 턴 진행 상황을 자유롭게 기록하세요"
          value={value.report_text ?? ""}
          onChange={(e) => onChange({ ...value, report_text: e.target.value })}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        유닛 이동/공격 등 actions는 추후 맵 UI에서 입력 예정
      </p>
    </div>
  );
}
