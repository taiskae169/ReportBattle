import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">ReportBattle</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="flex gap-2">
          <Link href="/reports">
            <Button>배틀리포트</Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline">프로필 설정</Button>
          </Link>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" type="submit">로그아웃</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
