"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ArmyListCreate, ParsedRoster } from "@/lib/types/battle-report";

interface Props {
  value: ArmyListCreate;
  onChange: (next: ArmyListCreate) => void;
  onRemove?: () => void;
  title: string;
}

export function ArmyListEditor({ value, onChange, onRemove, title }: Props) {
  const [parsed, setParsed] = useState<ParsedRoster | null>(null);
  const [parsing, setParsing] = useState(false);

  const handleParse = async () => {
    if (!value.raw_text?.trim()) {
      toast.error("아미 리스트를 먼저 입력하세요.");
      return;
    }
    setParsing(true);
    try {
      const result = await apiPost<ParsedRoster>("/api/v1/roster/parse", {
        raw_text: value.raw_text,
      });
      if (result.format === "unknown" || result.units.length === 0) {
        toast.warning("포맷을 인식하지 못했습니다. 40K 공식 앱 'Share as Text' 형식을 지원합니다.");
        return;
      }
      setParsed(result);
      toast.success(`${result.unit_count}개 유닛, ${result.total_points ?? "?"}pts 인식됨`);
      onChange({ ...value, total_points: result.total_points ?? value.total_points ?? null });
    } catch {
      toast.error("파싱 실패");
    } finally {
      setParsing(false);
    }
  };

  const handleReEdit = () => {
    setParsed(null);
  };

  const showRawInput = !parsed;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            삭제
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>플레이어 이름</Label>
        <Input
          placeholder="예: 홍길동"
          value={value.player_name}
          onChange={(e) => onChange({ ...value, player_name: e.target.value })}
        />
      </div>

      {showRawInput ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>아미 리스트 (40K 공식 앱 &apos;Share as Text&apos;)</Label>
            <Textarea
              rows={8}
              placeholder={`리스트이름 (NNNN points)\n\n팩션\n서브팩션\nStrike Force (2000 points)\n디태치먼트\n\nCHARACTERS\n\n유닛 (NN points)\n  • 1x ...`}
              value={value.raw_text ?? ""}
              onChange={(e) => onChange({ ...value, raw_text: e.target.value })}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleParse} disabled={parsing}>
              {parsing ? "파싱 중..." : "파싱"}
            </Button>
            {value.total_points != null && (
              <span className="text-sm text-muted-foreground">총 {value.total_points} pts</span>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2 rounded bg-muted/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              {parsed.list_name && (
                <div className="text-sm font-semibold">{parsed.list_name}</div>
              )}
              {parsed.faction && (
                <div className="text-xs font-semibold">{parsed.faction}</div>
              )}
              {parsed.game_size && (
                <div className="text-xs text-muted-foreground">
                  {parsed.game_size}
                  {parsed.game_size_points != null && ` · ${parsed.game_size_points} pts`}
                </div>
              )}
              {parsed.detachment && (
                <div className="text-xs text-muted-foreground">{parsed.detachment}</div>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleReEdit}>
              다시 입력
            </Button>
          </div>

          <ul className="flex flex-col gap-0.5 border-t pt-2 text-xs">
            {parsed.units.map((u, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">
                  {u.name}
                  <span className="ml-1 text-muted-foreground">({u.total_models}모델)</span>
                </span>
                {u.points != null && <span className="text-muted-foreground">{u.points} pts</span>}
              </li>
            ))}
          </ul>

          {parsed.total_points != null && (
            <div className="flex justify-end border-t pt-2 text-xs font-semibold">
              총 {parsed.total_points} pts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
