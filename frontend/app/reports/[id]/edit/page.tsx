"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ReportForm } from "@/components/reports/report-form";
import type {
  ArmyListCreate,
  BattleReport,
  BattleReportCreate,
} from "@/lib/types/battle-report";

export default function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<BattleReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<BattleReport>(`/api/v1/reports/${id}`)
      .then(setReport)
      .catch(() => {
        toast.error("리포트를 불러올 수 없습니다.");
        router.push("/reports");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  /**
   * 설정 편집 전략:
   * - report 본체(title, is_public, metadata)는 PATCH
   * - army_lists는 단순 처리: 기존 전부 삭제 → 새로 INSERT
   * - turns / report_text는 작성 페이지(/write)에서 관리하므로 여기서 건드리지 않음
   */
  const handleSubmit = async (data: BattleReportCreate) => {
    if (!report) return;
    try {
      await apiPatch(`/api/v1/reports/${id}`, {
        title: data.title,
        is_public: data.is_public,
        metadata: data.metadata,
      });

      for (const a of report.army_lists) {
        await apiDelete(`/api/v1/reports/${id}/army-lists/${a.id}`);
      }
      for (const a of (data.army_lists ?? []) as ArmyListCreate[]) {
        if (!a.player_name.trim()) continue;
        await apiPost(`/api/v1/reports/${id}/army-lists`, a);
      }

      toast.success("저장되었습니다.");
      router.push(`/reports/${id}`);
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>;
  }
  if (!report) return null;

  const initial: Partial<BattleReportCreate> = {
    title: report.title,
    is_public: report.is_public,
    metadata: report.metadata,
    army_lists: report.army_lists.map((a) => ({
      player_name: a.player_name,
      raw_text: a.raw_text,
      total_points: a.total_points,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.push(`/reports/${id}`)}>← 취소</Button>
        <h1 className="text-2xl font-bold">설정 수정</h1>
      </div>

      <ReportForm initial={initial} submitLabel="변경사항 저장" onSubmit={handleSubmit} />
    </div>
  );
}
