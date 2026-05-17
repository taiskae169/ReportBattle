"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold">ReportBattle</h1>
        <p className="text-muted-foreground">미니어처 게임 배틀리포트 서비스</p>
        <Button onClick={handleGoogleLogin} size="lg">
          Google로 로그인
        </Button>
      </div>
    </div>
  );
}
