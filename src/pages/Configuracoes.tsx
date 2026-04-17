import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, SlidersHorizontal, Plug, CheckCircle2, XCircle, Save, UserPlus, Trash2, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { maskPhoneBR, isValidPhoneBR } from "@/lib/phone";

type Empresa = {
  id?: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj: string;
  email: string;
  telefone: string;
};

type Preferencias = {
  valor_diaria_padrao: number;
  tema_escuro: boolean;
  formato_data: "dd/MM/yyyy" | "yyyy-MM-dd";
};

const PREFS_KEY = "config:preferencias";

const defaultEmpresa: Empresa = { razao_social: "JP Eventos e Cenografia", cnpj: "", email: "", telefone: "" };
const defaultPrefs: Preferencias = { valor_diaria_padrao: 150, tema_escuro: false, formato_data: "dd/MM/yyyy" };

export default function Configuracoes() {
  const [empresa, setEmpresa] = useState<Empresa>(defaultEmpresa);
  const [prefs, setPrefs] = useState<Preferencias>(defaultPrefs);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const queryClient = useQueryClient();

  const { data: empresaData } = useQuery({
    queryKey: ["configuracoes_empresa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_empresa")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (empresaData) {
      setEmpresa({
        id: empresaData.id,
        razao_social: empresaData.razao_social ?? "",
        nome_fantasia: empresaData.nome_fantasia,
        cnpj: empresaData.cnpj ?? "",
        email: empresaData.email ?? "",
        telefone: empresaData.telefone ?? "",
      });
    }
    try {
      const p = localStorage.getItem(PREFS_KEY);
      if (p) setPrefs({ ...defaultPrefs, ...JSON.parse(p) });
    } catch {}
  }, [empresaData]);

  const salvarEmpresa = async () => {
    setSavingEmpresa(true);
    try {
      const payload = {
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj || null,
        email: empresa.email || null,
        telefone: empresa.telefone || null,
      };
      if (empresa.id) {
        const { error } = await supabase.from("configuracoes_empresa").update(payload).eq("id", empresa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("configuracoes_empresa").insert(payload);
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["configuracoes_empresa"] });
      toast({ title: "Empresa salva", description: "Dados atualizados com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSavingEmpresa(false);
    }
  };

  const salvarPrefs = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    toast({ title: "Preferências salvas", description: "Configurações aplicadas." });
  };

  const { role: currentRole } = useAuth();
  const isAdmin = currentRole === "admin";

  const { data: roles, refetch: refetchRoles } = useQuery({
    queryKey: ["user_roles_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Cadastro de usuário
  const [novoNome, setNovoNome] = useState("");
  const [novoPhone, setNovoPhone] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoRole, setNovoRole] = useState<AppRole>("visualizador");
  const [criandoUser, setCriandoUser] = useState(false);

  const criarUsuario = async () => {
    if (!novoNome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!isValidPhoneBR(novoPhone)) {
      toast({ title: "Celular inválido", variant: "destructive" });
      return;
    }
    if (novaSenha.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setCriandoUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { nome: novoNome, phone: novoPhone, password: novaSenha, role: novoRole },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Usuário criado", description: `${novoNome} adicionado como ${novoRole}.` });
      setNovoNome(""); setNovoPhone(""); setNovaSenha(""); setNovoRole("visualizador");
      await refetchRoles();
    } catch (e: any) {
      toast({ title: "Erro ao criar usuário", description: e.message, variant: "destructive" });
    } finally {
      setCriandoUser(false);
    }
  };

  const alterarRole = async (id: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").update({ role }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao alterar papel", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Papel atualizado" });
    await refetchRoles();
  };

  const removerRole = async (id: string) => {
    if (!confirm("Remover acesso deste usuário?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Acesso removido" });
    await refetchRoles();
  };

  // Reset de senha
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const submitReset = async () => {
    if (!resetUserId) return;
    if (resetPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setResetSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: resetUserId, new_password: resetPassword },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Senha redefinida", description: "A nova senha já está ativa." });
      setResetUserId(null);
      setResetPassword("");
    } catch (e: any) {
      toast({ title: "Erro ao resetar senha", description: e.message, variant: "destructive" });
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Ajustes gerais do sistema</p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="empresa"><Building2 className="h-4 w-4 mr-2" />Empresa</TabsTrigger>
          <TabsTrigger value="usuarios"><Users className="h-4 w-4 mr-2" />Usuários</TabsTrigger>
          <TabsTrigger value="prefs"><SlidersHorizontal className="h-4 w-4 mr-2" />Preferências</TabsTrigger>
          <TabsTrigger value="integracoes"><Plug className="h-4 w-4 mr-2" />Integrações</TabsTrigger>
        </TabsList>

        {/* EMPRESA */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Perfil da empresa</CardTitle>
              <CardDescription>Dados que aparecem em relatórios e recibos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razao">Razão social</Label>
                  <Input id="razao" value={empresa.razao_social} onChange={(e) => setEmpresa({ ...empresa, razao_social: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" value={empresa.cnpj} onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={empresa.email} onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel">Telefone</Label>
                  <Input id="tel" value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} />
                </div>
              </div>
              <Button onClick={salvarEmpresa} disabled={savingEmpresa}><Save className="h-4 w-4 mr-2" />{savingEmpresa ? "Salvando..." : "Salvar"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* USUÁRIOS */}
        <TabsContent value="usuarios">
          <div className="space-y-6">
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Cadastrar usuário</CardTitle>
                  <CardDescription>Cria um novo acesso ao sistema. O usuário entrará usando celular + senha.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nu_nome">Nome</Label>
                      <Input id="nu_nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nu_phone">Celular</Label>
                      <Input id="nu_phone" placeholder="(11) 99999-8888" value={novoPhone} onChange={(e) => setNovoPhone(maskPhoneBR(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nu_senha">Senha inicial</Label>
                      <Input id="nu_senha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Papel</Label>
                      <Select value={novoRole} onValueChange={(v) => setNovoRole(v as AppRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="visualizador">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={criarUsuario} disabled={criandoUser}>
                    <UserPlus className="h-4 w-4 mr-2" />{criandoUser ? "Criando..." : "Criar usuário"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Usuários e papéis</CardTitle>
                <CardDescription>{isAdmin ? "Gerencie os papéis dos usuários do sistema." : "Visualização dos papéis cadastrados."}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Criado em</TableHead>
                      {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(roles ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-6">
                          Nenhum papel cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {(roles ?? []).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Select value={r.role} onValueChange={(v) => alterarRole(r.id, v as AppRole)}>
                              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="gerente">Gerente</SelectItem>
                                <SelectItem value="visualizador">Visualizador</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={r.role === "admin" ? "default" : r.role === "gerente" ? "secondary" : "outline"}>{r.role}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => { setResetUserId(r.user_id); setResetPassword(""); }} title="Resetar senha">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removerRole(r.id)} title="Remover acesso">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PREFERÊNCIAS */}
        <TabsContent value="prefs">
          <Card>
            <CardHeader>
              <CardTitle>Preferências do sistema</CardTitle>
              <CardDescription>Ajustes pessoais salvos neste navegador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vdiaria">Valor padrão da diária (R$)</Label>
                  <Input
                    id="vdiaria"
                    type="number"
                    step="0.01"
                    value={prefs.valor_diaria_padrao}
                    onChange={(e) => setPrefs({ ...prefs, valor_diaria_padrao: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdata">Formato de data</Label>
                  <select
                    id="fdata"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={prefs.formato_data}
                    onChange={(e) => setPrefs({ ...prefs, formato_data: e.target.value as Preferencias["formato_data"] })}
                  >
                    <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                    <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="tema">Tema escuro</Label>
                  <p className="text-sm text-muted-foreground">Ativar interface no modo escuro.</p>
                </div>
                <Switch
                  id="tema"
                  checked={prefs.tema_escuro}
                  onCheckedChange={(v) => {
                    setPrefs({ ...prefs, tema_escuro: v });
                    document.documentElement.classList.toggle("dark", v);
                  }}
                />
              </div>

              <Button onClick={salvarPrefs}><Save className="h-4 w-4 mr-2" />Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRAÇÕES */}
        <TabsContent value="integracoes">
          <Card>
            <CardHeader>
              <CardTitle>Banco Inter — PIX</CardTitle>
              <CardDescription>Status da integração para pagamentos automáticos de fechamentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="font-medium">Não configurada</span>
                <Badge variant="outline" className="ml-2">Pendente</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Para ativar pagamentos PIX automáticos é necessário cadastrar as credenciais do Banco Inter PJ
                (client id, client secret, certificado mTLS e conta corrente).
              </p>
              <div className="rounded-lg border p-4 space-y-2 bg-muted/40">
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> INTER_CLIENT_ID</div>
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> INTER_CLIENT_SECRET</div>
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> INTER_CERT_PEM</div>
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> INTER_KEY_PEM</div>
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> INTER_CONTA_CORRENTE</div>
              </div>
              <Button variant="outline" disabled>Configurar (em breve)</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
