"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArmyListEditor } from "./army-list-editor";
import type {
  ArmyListCreate,
  BattleReportCreate,
  ReportMetadata,
} from "@/lib/types/battle-report";

interface Props {
  initial?: Partial<BattleReportCreate>;
  submitLabel?: string;
  onSubmit: (data: BattleReportCreate) => Promise<void>;
}

const MISSION_PACK_OPTIONS = [
  { value: "Chapter Approved 2025-26", label: "Chapter Approved 2025-26" },
];

const TERRAIN_OPTIONS = Array.from({ length: 9 }, (_, i) => ({
  value: `지형${i + 1}`,
  label: `지형${i + 1}`,
}));

const DEPLOY_OPTIONS = [
  { value: "배치구역_1", label: "배치구역_1" },
  { value: "배치구역_2", label: "배치구역_2" },
];

export function ReportForm({ initial, submitLabel = "저장", onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);

  const [metadata, setMetadata] = useState<ReportMetadata>(initial?.metadata ?? {});

  const [armyLists, setArmyLists] = useState<ArmyListCreate[]>(
    initial?.army_lists ?? [
      { player_name: "", raw_text: "", total_points: null },
      { player_name: "", raw_text: "", total_points: null },
    ]
  );

  const [submitting, setSubmitting] = useState(false);

  const updateMeta = (patch: Partial<ReportMetadata>) =>
    setMetadata((m) => ({ ...m, ...patch }));

  const updateArmy = (i: number, next: ArmyListCreate) =>
    setArmyLists((arr) => arr.map((a, idx) => (idx === i ? next : a)));

  const addArmy = () =>
    setArmyLists((arr) => [...arr, { player_name: "", raw_text: "", total_points: null }]);

  const removeArmy = (i: number) =>
    setArmyLists((arr) => arr.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        is_public: isPublic,
        metadata,
        army_lists: armyLists.filter((a) => a.player_name.trim()),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const missionPackSelected = Boolean(metadata.mission_pack?.trim());

  return (
    <div className="flex flex-col gap-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>제목 *</Label>
            <Input
              placeholder="예: vs 카오스 - 격전의 시굼"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="size-4"
            />
            공개 (다른 사용자가 볼 수 있음)
          </label>
        </CardContent>
      </Card>

      {/* 매치 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>매치 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>미션 팩</Label>
            <Select
              value={metadata.mission_pack ?? ""}
              onValueChange={(v) => updateMeta({ mission_pack: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="미션 팩 선택" />
              </SelectTrigger>
              <SelectContent>
                {MISSION_PACK_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {missionPackSelected && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>배치 구역</Label>
                <Select
                  value={metadata.deploy ?? ""}
                  onValueChange={(v) => updateMeta({ deploy: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="배치 구역 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPLOY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>지형</Label>
                <Select
                  value={metadata.terrain ?? ""}
                  onValueChange={(v) => updateMeta({ terrain: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="지형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRAIN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 아미 리스트 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>아미 리스트</CardTitle>
          <Button variant="outline" size="sm" onClick={addArmy}>
            + 추가
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {armyLists.map((a, i) => (
            <ArmyListEditor
              key={i}
              title={i === 0 ? "내 아미" : i === 1 ? "상대 아미" : `플레이어 ${i + 1}`}
              value={a}
              onChange={(next) => updateArmy(i, next)}
              onRemove={armyLists.length > 2 ? () => removeArmy(i) : undefined}
            />
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={submitting || !title.trim()} size="lg">
        {submitting ? "저장 중..." : submitLabel}
      </Button>
    </div>
  );
}
