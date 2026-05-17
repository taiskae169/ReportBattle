"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiDelete, apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BattleReport, ReportResult } from "@/lib/types/battle-report";

const RESULT_LABEL: Record<ReportResult, { label: string; className: string }> = {
  win: { label: "승리", className: "bg-blue-100 text-blue-700" },
  lose: { label: "패배", className: "bg-red-100 text-red-700" },
  draw: { label: "무승부", className: "bg-gray-100 text-gray-700" },
};

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await apiDelete(`/api/v1/reports/${id}`);
      toast.success("삭제되었습니다.");
      router.push("/reports");
    } catch {
      toast.error("삭제 실패");
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>;
  }
  if (!report) return null;

  const meta = report.metadata;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/reports")}>← 목록</Button>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/reports/${id}/write`)}>
            작성하기
          </Button>
          <Button variant="outline" onClick={() => router.push(`/reports/${id}/edit`)}>
            설정 수정
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            삭제
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs">
            {report.result && (
              <span className={`rounded px-2 py-0.5 font-semibold ${RESULT_LABEL[report.result].className}`}>
                {RESULT_LABEL[report.result].label}
              </span>
            )}
            {report.status === "draft" && (
              <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700">초안</span>
            )}
            {report.is_public && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">공개</span>
            )}
            <span className="text-muted-foreground">
              {new Date(report.created_at).toLocaleString("ko-KR")}
            </span>
          </div>
          <h1 className="text-3xl font-bold">{report.title}</h1>
        </div>

        {/* 매치 정보 */}
        {(meta.mission_pack || meta.mission || meta.my_score != null || meta.terrain || meta.deploy) && (
          <Card>
            <CardHeader>
              <CardTitle>매치 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {(meta.mission_pack || meta.mission) && (
                <div>
                  <span className="text-muted-foreground">미션: </span>
                  {meta.mission_pack && <span>{meta.mission_pack}</span>}
                  {meta.mission_pack && meta.mission && <span> · </span>}
                  {meta.mission && <span>{meta.mission}</span>}
                </div>
              )}
              {(meta.my_score != null || meta.opponent_score != null) && (
                <div>
                  <span className="text-muted-foreground">점수: </span>
                  <span className="font-mono">
                    {meta.my_score ?? "-"} : {meta.opponent_score ?? "-"}
                  </span>
                </div>
              )}
              {meta.deploy && (
                <div>
                  <span className="text-muted-foreground">배치: </span>
                  <span>{meta.deploy}</span>
                </div>
              )}
              {meta.terrain && (
                <div>
                  <span className="text-muted-foreground">지형: </span>
                  <span>{meta.terrain}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 아미 리스트 */}
        {report.army_lists.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>아미 리스트</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {report.army_lists.map((a) => (
                <div key={a.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{a.player_name}</span>
                    {a.total_points != null && (
                      <span className="text-sm text-muted-foreground">{a.total_points} pts</span>
                    )}
                  </div>
                  {a.raw_text && (
                    <pre className="whitespace-pre-wrap rounded bg-muted/40 p-2 font-mono text-xs">
                      {a.raw_text}
                    </pre>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 턴 기록 */}
        {report.turns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>턴별 기록</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {report.turns.map((t) => (
                <div key={t.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-sm font-semibold">
                      턴 {t.turn_number}
                    </span>
                    {t.memo && <span className="text-sm text-muted-foreground">{t.memo}</span>}
                  </div>
                  {t.report_text && (
                    <p className="whitespace-pre-wrap text-sm">{t.report_text}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 종합 리포트 */}
        {report.report_text && (
          <Card>
            <CardHeader>
              <CardTitle>종합 리포트</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{report.report_text}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
