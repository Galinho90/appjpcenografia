import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Plus, Search, Edit, Trash2, Eye, FileSpreadsheet, Upload, RefreshCw, Mail } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useColaboradores, useCreateColaborador, useDeleteColaborador, useUpdateColaborador,
} from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Colaborador } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";
import { maskPhoneBR } from "@/lib/phone";
import { maskCPF } from "@/lib/masks";

const emptyForm = {
  nome: "", cpf: "", rg: "", data_nascimento: "", telefone: "", email: "",
  funcao: "", valor_diaria_padrao: 0, pix: "", senha: "",
  chave_pix: "", banco: "", agencia: "", conta: "", foto_url: "",
  ativo: true,
};

function gerarSenha(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function Colaboradores() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ativos" | "inativos" | "ambos">("ativos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const { canEdit } = usePermissions();

  const { data: colaboradores = [], isLoading } = useColaboradores();
  const createMutation = useCreateColaborador();
  const updateMutation = useUpdateColaborador();
  const deleteMutation = useDeleteColaborador();

  const [form, setForm] = useState<any>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("diaristas-fotos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("diaristas-fotos").getPublicUrl(path);
      setForm((f: any) => ({ ...f, foto_url: data.publicUrl }));
      toast({ title: "Foto enviada!" });
    } catch (e: any) {
      toast({ title: "Erro ao enviar foto", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = colaboradores.filter((c) => {
    if (statusFilter === "ativos" && !c.ativo) return false;
    if (statusFilter === "inativos" && c.ativo) return false;
    const q = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.funcao.toLowerCase().includes(q) ||
      c.cpf.toLowerCase().includes(q) ||
      (c.telefone ?? "").toLowerCase().includes(q)
    );
  });

  const handleExportExcel = () => {
    const rows = filtered.map((c) => ({
      Nome: c.nome,
      Celular: c.telefone ?? "",
      CPF: c.cpf,
      Função: c.funcao,
      "Valor Diária": Number(c.valor_diaria_padrao),
      Status: c.ativo ? "Ativo" : "Inativo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Diaristas");
    XLSX.writeFile(wb, `diaristas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openView = (c: Colaborador) => {
    setMode("view");
    setEditingId(c.id);
    setForm({ ...emptyForm, ...c });
    setDialogOpen(true);
  };

  const openEdit = (c: Colaborador) => {
    setMode("edit");
    setEditingId(c.id);
    setForm({ ...emptyForm, ...c });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const { senha, ...rest } = form;
      const payload: any = { ...rest };
      if (senha && senha.trim()) {
        payload.senha_hash = btoa(unescape(encodeURIComponent(senha)));
      }
      if (!payload.data_nascimento) payload.data_nascimento = null;

      if (mode === "edit" && editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Diarista atualizado!" });
      } else {
        if (!form.telefone?.trim()) {
          toast({ title: "Celular obrigatório", description: "Informe o celular para criar o acesso do diarista.", variant: "destructive" });
          return;
        }
        if (!senha || senha.length < 6) {
          toast({ title: "Senha obrigatória", description: "Mínimo 6 caracteres.", variant: "destructive" });
          return;
        }
        const novo: any = await createMutation.mutateAsync(payload);
        try {
          const { data: invokeData, error: invokeErr } = await supabase.functions.invoke("create-diarista-user", {
            body: {
              phone: form.telefone,
              password: senha,
              nome: form.nome,
              colaborador_id: novo?.id,
            },
          });
          if (invokeErr) throw invokeErr;
          if ((invokeData as any)?.error) throw new Error((invokeData as any).error);
          toast({
            title: "Diarista cadastrado!",
            description: `Acesso criado. Login: ${form.telefone} | Senha: ${senha}`,
          });
        } catch (e: any) {
          toast({
            title: "Diarista salvo, mas falhou criar acesso",
            description: e.message ?? "Tente novamente em 'Criar acesso' ao editar.",
            variant: "destructive",
          });
        }
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleCriarAcesso = async () => {
    if (!editingId) return;
    if (!form.telefone?.trim()) {
      toast({ title: "Celular obrigatório", variant: "destructive" });
      return;
    }
    const senha = form.senha?.trim() || gerarSenha();
    if (senha.length < 6) {
      toast({ title: "Senha mínima 6 caracteres", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-diarista-user", {
        body: { phone: form.telefone, password: senha, nome: form.nome, colaborador_id: editingId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Acesso criado!", description: `Login: ${form.telefone} | Senha: ${senha}` });
      setForm({ ...form, senha });
    } catch (e: any) {
      toast({ title: "Falha ao criar acesso", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Colaborador removido" });
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleAtivo = async (c: Colaborador) => {
    try {
      await updateMutation.mutateAsync({ id: c.id, ativo: !c.ativo } as any);
      toast({ title: c.ativo ? "Diarista inativado" : "Diarista ativado" });
    } catch (e: any) {
      toast({ title: "Erro ao alterar status", description: e.message, variant: "destructive" });
    }
  };

  const readOnly = mode === "view";
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Diaristas</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus diaristas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            {canEdit && (
              <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}><Plus className="h-4 w-4" /> Novo Diarista</Button>
            )}
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {mode === "create" ? "Cadastrar Diarista" : mode === "edit" ? "Editar Diarista" : "Detalhes do Diarista"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input disabled={readOnly} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Celular</Label>
                    <Input disabled={readOnly} value={maskPhoneBR(form.telefone || "")} onChange={(e) => setForm({ ...form, telefone: maskPhoneBR(e.target.value) })} placeholder="(11) 99999-9999" inputMode="numeric" maxLength={15} />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  <Label>Foto do Diarista</Label>
                  <div className="border rounded-md w-32 h-32 flex items-center justify-center overflow-hidden bg-muted/30">
                    {form.foto_url ? (
                      <img src={form.foto_url} alt="Foto" className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem foto</span>
                    )}
                  </div>
                  {!readOnly && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadFoto(f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="w-32 gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="h-4 w-4" />
                        {uploading ? "Enviando..." : "Enviar"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input disabled={readOnly} value={maskCPF(form.cpf || "")} onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input disabled={readOnly} value={form.rg ?? ""} onChange={(e) => setForm({ ...form, rg: e.target.value })} placeholder="00.000.000-0" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input disabled={readOnly} type="date" value={form.data_nascimento ?? ""} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Valor da Diária</Label>
                  <Input disabled={readOnly} type="number" value={form.valor_diaria_padrao || ""} onChange={(e) => setForm({ ...form, valor_diaria_padrao: Number(e.target.value) })} placeholder="200" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input disabled={readOnly} type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="diarista@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>PIX</Label>
                  <Input disabled={readOnly} value={form.pix ?? ""} onChange={(e) => setForm({ ...form, pix: e.target.value })} placeholder="CPF, email ou telefone" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Senha</Label>
                <div className="flex gap-2">
                  <Input
                    disabled={readOnly}
                    value={form.senha ?? ""}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    placeholder={mode === "edit" ? "Deixe em branco para manter" : "Senha de acesso"}
                  />
                  {!readOnly && (
                    <Button type="button" variant="outline" className="gap-2 shrink-0" onClick={() => setForm({ ...form, senha: gerarSenha() })}>
                      <RefreshCw className="h-4 w-4" /> Gerar senha
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Função</Label>
                <Input disabled={readOnly} value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} placeholder="Montador, Eletricista..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input disabled={readOnly} value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} placeholder="Inter" />
                </div>
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input disabled={readOnly} value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} placeholder="0001" />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input disabled={readOnly} value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} placeholder="12345-6" />
                </div>
              </div>

              {mode !== "create" && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Ativo</Label>
                  <Switch disabled={readOnly} checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                </div>
              )}
              {mode === "edit" && !form.user_id && !readOnly && (
                <div className="rounded-md border border-dashed p-3 space-y-2 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Este diarista ainda não tem acesso ao painel. Informe celular e senha (ou gere uma) e clique abaixo.
                  </p>
                  <Button type="button" variant="secondary" className="w-full" onClick={handleCriarAcesso}>
                    Criar acesso do diarista
                  </Button>
                </div>
              )}
              {mode === "edit" && form.user_id && (
                <div className="space-y-2">
                  <div className="rounded-md border p-3 bg-success/10 text-sm text-foreground">
                    ✓ Acesso ao painel já criado para este diarista.
                  </div>
                  {!readOnly && form.email && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke("password-reset-request", {
                            body: { colaborador_id: editingId },
                          });
                          if (error) throw error;
                          if ((data as any)?.error) throw new Error((data as any).error);
                          toast({ title: "E-mail enviado!", description: `Link de redefinição enviado para ${form.email}` });
                        } catch (e: any) {
                          toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
                        }
                      }}
                    >
                      <Mail className="h-4 w-4" /> Enviar link de redefinição por e-mail
                    </Button>
                  )}
                  {!readOnly && !form.email && (
                    <p className="text-xs text-muted-foreground">Cadastre um e-mail acima para habilitar o envio de link de redefinição.</p>
                  )}
                </div>
              )}
              {!readOnly && (
                <Button className="w-full mt-2" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : mode === "edit" ? "Atualizar" : "Salvar Diarista"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Button onClick={handleExportExcel} className="gap-2 bg-success hover:bg-success/90 text-success-foreground w-full sm:w-auto">
                <FileSpreadsheet className="h-4 w-4" /> Exportar para Excel
              </Button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">Mostrar:</span>
                <RadioGroup
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as "ativos" | "inativos" | "ambos")}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="ativos" id="f-ativos" />
                    <Label htmlFor="f-ativos" className="cursor-pointer">Ativos</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="inativos" id="f-inativos" />
                    <Label htmlFor="f-inativos" className="cursor-pointer">Inativos</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="ambos" id="f-ambos" />
                    <Label htmlFor="f-ambos" className="cursor-pointer">Ambos</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Nenhum diarista encontrado.</div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((c) => (
                  <Card key={c.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        {c.foto_url ? (
                          <img src={c.foto_url} alt={c.nome} className="h-12 w-12 rounded-full object-cover border shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                            {c.nome.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium uppercase break-words">{c.nome}</p>
                          <p className="text-xs text-muted-foreground">{c.funcao}</p>
                          <p className="text-xs text-muted-foreground">CPF: {c.cpf}</p>
                          {c.telefone && <p className="text-xs text-muted-foreground">Tel: {c.telefone}</p>}
                          <p className="text-sm font-semibold mt-1">
                            R$ {c.valor_diaria_padrao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          disabled={!canEdit}
                          onClick={() => handleToggleAtivo(c)}
                          className={
                            c.ativo
                              ? "bg-success text-success-foreground hover:bg-success/90 h-7 px-3"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 h-7 px-3"
                          }
                        >
                          {c.ativo ? "ATIVO" : "INATIVO"}
                        </Button>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="icon" className="bg-info text-info-foreground hover:bg-info/90 h-8 w-8" onClick={() => openView(c)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8" onClick={() => openEdit(c)} title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 w-8" onClick={() => setDeleteId(c.id)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="text-right">Valor Diária</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium uppercase">
                          <div className="flex items-center gap-2">
                            {c.foto_url ? (
                              <img src={c.foto_url} alt={c.nome} className="h-8 w-8 rounded-full object-cover border" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                                {c.nome.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase()}
                              </div>
                            )}
                            <span>{c.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>{c.telefone}</TableCell>
                        <TableCell>{c.cpf}</TableCell>
                        <TableCell>{c.funcao}</TableCell>
                        <TableCell className="text-right">{c.valor_diaria_padrao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            disabled={!canEdit}
                            onClick={() => handleToggleAtivo(c)}
                            className={
                              c.ativo
                                ? "bg-success text-success-foreground hover:bg-success/90 h-7 px-3"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 h-7 px-3"
                            }
                            title={canEdit ? (c.ativo ? "Clique para inativar" : "Clique para ativar") : undefined}
                          >
                            {c.ativo ? "ATIVO" : "INATIVO"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" size="icon" className="bg-info text-info-foreground hover:bg-info/90 h-8 w-8" onClick={() => openView(c)} title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8" onClick={() => openEdit(c)} title="Editar">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 w-8" onClick={() => setDeleteId(c.id)} title="Excluir">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir diarista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O diarista será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
