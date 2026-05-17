"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  nickname: string | null;
  bio: string | null;
  llm_provider: string | null;
  llm_model: string | null;
  has_llm_api_key: boolean;
}

const LLM_PROVIDERS = [
  { value: "none", label: "사용 안함" },
  { value: "openai", label: "OpenAI" },
  { value: "claude", label: "Anthropic Claude" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (로컬)" },
];

const LLM_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
  ],
  claude: [
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  gemini: [
    { value: "gemini/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini/gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  ollama: [
    { value: "ollama/llama3", label: "Llama 3" },
    { value: "ollama/mistral", label: "Mistral" },
  ],
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [llmProvider, setLlmProvider] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");

  useEffect(() => {
    apiGet<UserProfile>("/api/v1/users/me")
      .then((data) => {
        setProfile(data);
        setNickname(data.nickname ?? "");
        setBio(data.bio ?? "");
        setLlmProvider(data.llm_provider ?? "none");
        setLlmModel(data.llm_model ?? "");

      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/v1/users/me", {
        nickname: nickname || null,
        bio: bio || null,
        llm_provider: llmProvider === "none" ? null : llmProvider || null,
        llm_model: llmProvider === "none" ? null : llmModel || null,
        llm_api_key: llmApiKey || null,
      });
      toast.success("프로필이 저장되었습니다.");
      setLlmApiKey("");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">프로필 설정</h1>
        <Button variant="ghost" onClick={() => router.push("/")}>← 홈</Button>
      </div>

      <div className="flex flex-col gap-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>닉네임</Label>
              <Input
                placeholder="닉네임을 입력하세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>자기소개</Label>
              <Textarea
                placeholder="플레이하는 팩션, 게임 등을 자유롭게 적어주세요"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* LLM 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>LLM 설정</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>LLM Provider</Label>
              <Select value={llmProvider} onValueChange={(v) => { setLlmProvider(v ?? "none"); setLlmModel(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Provider 선택" />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {llmProvider && llmProvider !== "none" && (
              <div className="flex flex-col gap-1.5">
                <Label>모델</Label>
                <Select value={llmModel} onValueChange={(v) => setLlmModel(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="모델 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_MODELS[llmProvider]?.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>
                API Key
                {profile?.has_llm_api_key && (
                  <span className="ml-2 text-xs text-green-600">✓ 등록됨</span>
                )}
              </Label>
              <Input
                type="password"
                placeholder={profile?.has_llm_api_key ? "변경하려면 새 키를 입력하세요" : "API 키를 입력하세요"}
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                API 키는 암호화되어 저장됩니다. 저장 후 다시 확인할 수 없습니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}
