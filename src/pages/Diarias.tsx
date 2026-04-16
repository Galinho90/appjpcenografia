import { useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiarias, useColaboradores, useCreateDiaria, useDeleteDiaria, useUpdateDiaria } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";

const emptyForm = { colaborador_id: "", data: "", hora_entrada: "", hora_saida: "", valor: 0, observacoes: "" };

export default function Diarias() {
  const [search, setSearch] = useState("");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: diarias = [], isLoading } = useDiarias();
  const { data: colaboradores = [] } = useColaboradores();
  const createMutation = useCreateDiaria();
  const updateMutation = useUpdateDiaria();
  const deleteMutation = useDeleteDiaria();

  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      colaborador_id: d.colaborador_id,
      data: d.data,
      hora_entrada: d.horario_entrada || "",
      hora_saida: d.horario_saida || "",
      valor: d.valor,
      observacoes: d.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Diária excluída!" });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const filtered = diarias.filter((d) => {
    const nome = (d.colaborador as any)?.nome?.toLowerCase() ?? "";
    const obs = d.observacoes?.toLowerCase() ?? "";
    const term = search.toLowerCase();
    const matchesSearch = !term || nome.includes(term) || d.data.includes(term) || obs.includes(term);
    const matchesColab = filtroColaborador === "all" || d.colaborador_id === filtroColaborador;
    const matchesInicio = !dataInicio || d.data >= dataInicio;
    const matchesFim = !dataFim || d.data <= dataFim;
    return matchesSearch && matchesColab && matchesInicio && matchesFim;
  });

  const limparFiltros = () => {
    setSearch("");
    setFiltroColaborador("all");
    setDataInicio("");
    setDataFim("");
  };

  const totalValor = filtered.reduce((s, d) => s + d.valor, 0);

  const handleSave = async () => {
    try {
      const payload = {
        colaborador_id: form.colaborador_id,
        data: form.data,
        hora_entrada: form.hora_entrada || undefined,
        hora_saida: form.hora_saida || undefined,
        valor: form.valor,
        observacoes: form.observacoes || undefined,
      };
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Diária atualizada!" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Diária registrada!" });
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Diárias</h1>
          <p className="text-muted-foreground">Controle de diárias trabalhadas</p>
        </div>
        <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Registrar Diária</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Diária" : "Nova Diária"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={form.colaborador_id} onValueChange={(v) => {
                const col = colaboradores.find(c => c.id === v);
                setForm({ ...form, colaborador_id: v, valor: editingId ? form.valor : (col?.valor_diaria_padrao ?? form.valor) });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {colaboradores.filter(c => c.ativo).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              <div className="space-y-2"><Label>Entrada</Label><Input type="time" value={form.hora_entrada} onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })} /></div>
              <div className="space-y-2"><Label>Saída</Label><Input type="time" value={form.hora_saida} onChange={(e) => setForm({ ...form, hora_saida: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações opcionais..." /></div>
            <Button className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando..." : (editingId ? "Atualizar Diária" : "Salvar Diária")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/70 p-4">
            <p className="text-sm text-primary-foreground/80">Total Diárias</p>
            <p className="text-2xl font-bold text-primary-foreground">{diarias.length}</p>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-secondary to-secondary/70 p-4">
            <p className="text-sm text-secondary-foreground/80">Valor Total</p>
            <p className="text-2xl font-bold text-secondary-foreground">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
            <p className="text-sm text-accent-foreground/80">Média por Diária</p>
            <p className="text-2xl font-bold text-accent-foreground">
              R$ {diarias.length ? Math.round(totalValor / diarias.length).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}
            </p>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Nome, data, obs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Colaborador</Label>
              <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
                <SelectTrigger><SelectValue placeholder="Colaborador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos colaboradores</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}
            </p>
            <Button variant="ghost" size="sm" onClick={limparFiltros}>Limpar filtros</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{(d.colaborador as any)?.nome ?? "—"}</TableCell>
                    <TableCell>{new Date(d.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{d.horario_entrada || "—"}</TableCell>
                    <TableCell>{d.horario_saida || "—"}</TableCell>
                    <TableCell>R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d.observacoes || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir diária?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
