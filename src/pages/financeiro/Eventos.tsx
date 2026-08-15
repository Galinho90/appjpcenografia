import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Calendar, DollarSign, TrendingUp, Clock, Receipt, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { 
  useEventos, 
  useCreateEvento, 
  useUpdateEvento, 
  useDeleteEvento, 
  useCreateEventoCusto,
  useDeleteEventoCusto,
  type Evento, 
  type StatusEvento,
  type EventoCusto
} from "@/hooks/useEventos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { fmtBRL, fmtDate } from "@/lib/financeiro";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const emptyForm = {
  nome: "",
  descricao: "",
  verba: "",
  status: "planejado" as StatusEvento,
  data_inicio: "",
  data_fim: "",
};

export default function Eventos() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const { data: eventos = [], isLoading } = useEventos();
  const createMutation = useCreateEvento();
  const updateMutation = useUpdateEvento();
  const deleteMutation = useDeleteEvento();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const stats = useMemo(() => {
    const totalVerba = eventos.reduce((acc, e) => acc + (Number(e.verba) || 0), 0);
    const ativos = eventos.filter(e => e.status === 'em_andamento').length;
    const totalUtilizado = eventos.reduce((acc, e) => {
      const movs = (e as any).movimentacoes_financeiras || [];
      const utilizado = movs.reduce((sum: number, m: any) => {
        if (m.tipo === 'saida') return sum + (Number(m.valor) || 0);
        if (m.tipo === 'entrada') return sum - (Number(m.valor) || 0);
        return sum;
      }, 0);
      return acc + utilizado;
    }, 0);
    return { totalVerba, ativos, total: eventos.length, totalUtilizado };
  }, [eventos]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (e: Evento) => {
    setEditingId(e.id);
    setForm({
      nome: e.nome,
      descricao: e.descricao || "",
      verba: String(e.verba),
      status: e.status,
      data_inicio: e.data_inicio || "",
      data_fim: e.data_fim || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.verba) {
      toast({ title: "Nome e Verba são obrigatórios", variant: "destructive" });
      return;
    }

    const payload = {
      nome: form.nome,
      descricao: form.descricao || null,
      verba: Number(form.verba),
      status: form.status,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Evento atualizado" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Evento criado" });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Evento excluído" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const statusMap = {
    planejado: { label: "Planejado", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
    em_andamento: { label: "Em Andamento", color: "bg-green-500/10 text-green-600 border-green-200" },
    concluido: { label: "Concluído", color: "bg-gray-500/10 text-gray-600 border-gray-200" },
    cancelado: { label: "Cancelado", color: "bg-red-500/10 text-red-600 border-red-200" },
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando eventos...</div>;
  }

  return (
    <div className="space-y-6 pt-6 px-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader 
          title="Eventos" 
          description="Gestão de verbas e custos por evento" 
          className="px-0"
        />
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Novo Evento
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="Total em Verbas" 
          value={fmtBRL(stats.totalVerba)} 
          icon={DollarSign}
          hint={`${stats.total} eventos cadastrados`}
        />
        <StatCard 
          label="Eventos Ativos" 
          value={stats.ativos} 
          icon={TrendingUp}
          tone="success"
        />
        <StatCard 
          label="Média por Evento" 
          value={fmtBRL(stats.total > 0 ? stats.totalVerba / stats.total : 0)} 
          icon={Clock}
          tone="primary"
          hint={`Utilizado: ${fmtBRL(stats.totalUtilizado)}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventos.map((evento) => {
          const movs = (evento as any).movimentacoes_financeiras || [];
          const utilizado = movs.reduce((sum: number, m: any) => {
            if (m.tipo === 'saida') return sum + (Number(m.valor) || 0);
            if (m.tipo === 'entrada') return sum - (Number(m.valor) || 0);
            return sum;
          }, 0);
          const percent = Math.min(100, Math.max(0, (utilizado / (Number(evento.verba) || 1)) * 100));

          return (
            <Card key={evento.id} className="group overflow-hidden border-none shadow-premium bg-card/50 backdrop-blur-md hover:bg-card/80 transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge className={cn("text-[10px] font-bold px-2 py-0.5", statusMap[evento.status].color)}>
                    {statusMap[evento.status].label}
                  </Badge>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(evento)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(evento.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl font-bold truncate">{evento.nome}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                  {evento.descricao || "Sem descrição disponível."}
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Verba</span>
                    <span className="font-bold text-primary">{fmtBRL(evento.verba)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilizado</span>
                    <span className={cn("font-medium", utilizado > evento.verba ? "text-destructive" : "text-foreground")}>
                      {fmtBRL(utilizado)}
                    </span>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {evento.data_inicio ? fmtDate(evento.data_inicio) : 'N/A'}
                  </div>
                  <span>a</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {evento.data_fim ? fmtDate(evento.data_fim) : 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Evento</Label>
              <Input 
                value={form.nome} 
                onChange={e => setForm({...form, nome: e.target.value})} 
                placeholder="Ex: Stand CCXP 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Verba (Orçamento)</Label>
              <Input 
                type="number"
                value={form.verba} 
                onChange={e => setForm({...form, verba: e.target.value})} 
                placeholder="0,00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input 
                  type="date"
                  value={form.data_inicio} 
                  onChange={e => setForm({...form, data_inicio: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input 
                  type="date"
                  value={form.data_fim} 
                  onChange={e => setForm({...form, data_fim: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: StatusEvento) => setForm({...form, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={form.descricao} 
                onChange={e => setForm({...form, descricao: e.target.value})} 
                placeholder="Detalhes sobre o evento..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Salvar Evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os custos associados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
