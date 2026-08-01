import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMyProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { Upload, Trash2 } from "lucide-react";
import MinhaContaDiarista from "./MinhaContaDiarista";
import { PageHeader } from "@/components/PageHeader";

export default function MinhaConta() {
  const { role } = useAuth();
  if (role === "visualizador") return <MinhaContaDiarista />;
  return <MinhaContaAdmin />;
}

function MinhaContaAdmin() {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as { nome?: string; phone?: string };
  const [nome, setNome] = useState(meta.nome ?? "");
  const [savingNome, setSavingNome] = useState(false);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [savingSenha, setSavingSenha] = useState(false);

  const { data: profile } = useMyProfile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile?.nome && !nome) setNome(profile.nome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.nome]);

  const salvarNome = async () => {
    if (!user) return;
    setSavingNome(true);
    const { error: authErr } = await supabase.auth.updateUser({ data: { ...meta, nome } });
    const { error: profErr } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, nome }, { onConflict: "user_id" });
    setSavingNome(false);
    if (authErr || profErr) return toast.error((authErr || profErr)!.message);
    await queryClient.invalidateQueries({ queryKey: ["my_profile"] });
    toast.success("Nome atualizado");
  };

  const salvarSenha = async () => {
    if (!/^\d{6,}$/.test(novaSenha)) return toast.error("A senha deve ter no mínimo 6 números");
    if (novaSenha !== confirmar) return toast.error("As senhas não coincidem");
    setSavingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingSenha(false);
    if (error) return toast.error(error.message);
    setNovaSenha("");
    setConfirmar("");
    toast.success("Senha atualizada");
  };

  const uploadAvatar = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, avatar_url: url }, { onConflict: "user_id" });
      if (profErr) throw profErr;
      await queryClient.invalidateQueries({ queryKey: ["my_profile"] });
      toast.success("Avatar atualizado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const removerAvatar = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, avatar_url: null }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["my_profile"] });
    toast.success("Avatar removido");
  };

  const initials = (nome || meta.phone || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="text-sm text-muted-foreground">Atualize sua foto, nome e senha de acesso.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
          <CardDescription>Aparece no menu superior do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center overflow-hidden border">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-primary-foreground text-xl font-bold">{initials}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setCropFile(f); setCropOpen(true); }
                  e.target.value = "";
                }}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />{uploading ? "Enviando..." : "Enviar foto"}
                </Button>
                {profile?.avatar_url && (
                  <Button variant="ghost" size="sm" onClick={removerAvatar}>
                    <Trash2 className="h-4 w-4 mr-2" />Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG ou PNG. A imagem será recortada e comprimida.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>Celular: {meta.phone ?? "—"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <Button onClick={salvarNome} disabled={savingNome}>
            {savingNome ? "Salvando..." : "Salvar nome"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <CardDescription>Apenas números, mínimo de 6 dígitos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova">Nova senha</Label>
            <Input
              id="nova"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              maxLength={20}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conf">Confirmar nova senha</Label>
            <Input
              id="conf"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              maxLength={20}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button onClick={salvarSenha} disabled={savingSenha}>
            {savingSenha ? "Salvando..." : "Atualizar senha"}
          </Button>
        </CardContent>
      </Card>

      <ImageCropDialog
        file={cropFile}
        open={cropOpen}
        onOpenChange={(o) => { setCropOpen(o); if (!o) setCropFile(null); }}
        aspect={1}
        maxSize={400}
        title="Ajustar foto de perfil"
        onCropped={uploadAvatar}
      />
    </div>
  );
}
