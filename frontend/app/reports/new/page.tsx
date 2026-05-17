"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ReportForm } from "@/components/reports/report-form";
import type { BattleReport, BattleReportCreate } from "@/lib/types/battle-report";

export default function NewReportPage() {
  const router = useRouter();

  const handleSubmit = async (data: BattleReportCreate) => {
    try {
      const created = await apiPost<BattleReport>("/api/v1/reports", data);
      toast.success("설정이 저장되었습니다. 배치 단계로 이동합니다.");
      router.push(`/reports/${created.id}/write`);
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.push("/reports")}>← 목록</Button>
        <h1 className="text-2xl font-bold">새 배틀리포트 - 설정</h1>
      </div>

      <ReportForm submitLabel="작성 시작 →" onSubmit={handleSubmit} />
    </div>
  );
}
