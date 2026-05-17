"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BattleReportSummary, ReportResult } from "@/lib/types/battle-report";

const RESULT_LABEL: Record<ReportResult, { label: string; className: string }> = {
  win: { label: "승", className: "bg-blue-100 text-blue-700" },
  lose: { label: "패", className: "bg-red-100 text-red-700" },
  draw: { label: "무", className: "bg-gray-100 text-gray-700" },
};

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<BattleReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<BattleReportSummary[]>("/api/v1/reports")
      .then(setReports)
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push("/")}>← 홈</Button>
          <h1 className="text-2xl font-bold">내 배틀리포트</h1>
        </div>
        <Link href="/reports/new">
          <Button>+ 새 리포트</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <p>아직 작성한 리포트가 없습니다.</p>
            <Link href="/reports/new">
              <Button>첫 리포트 작성하기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <Link key={r.id} href={`/reports/${r.id}`}>
              <Card className="transition hover:bg-accent/40">
                <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.result && (
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${RESULT_LABEL[r.result].className}`}
                      >
                        {RESULT_LABEL[r.result].label}
                      </span>
                    )}
                    <CardTitle className="truncate text-base">{r.title}</CardTitle>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {r.status === "draft" && (
                      <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700">초안</span>
                    )}
                    {r.is_public && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">공개</span>
                    )}
                    <span>{new Date(r.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                </CardHeader>
                {(r.metadata.mission || r.metadata.mission_pack) && (
                  <CardContent className="pt-0 pb-4 text-sm text-muted-foreground">
                    {r.metadata.mission_pack && <span>{r.metadata.mission_pack}</span>}
                    {r.metadata.mission_pack && r.metadata.mission && <span> · </span>}
                    {r.metadata.mission && <span>{r.metadata.mission}</span>}
                    {(r.metadata.my_score != null || r.metadata.opponent_score != null) && (
                      <span className="ml-2">
                        {r.metadata.my_score ?? "-"} : {r.metadata.opponent_score ?? "-"}
                      </span>
                    )}
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
