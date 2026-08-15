import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Calendar, DollarSign, TrendingUp, Clock, Receipt, ArrowUpCircle, ArrowDownCircle, ArrowLeft, Maximize2 } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

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
  const createCustoMutation = useCreateEventoCusto();
  const deleteCustoMutation = useDeleteEventoCusto();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [newCusto, setNewCusto] = useState({ descricao: "", valor: "" });
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null);

  const selectedEvento = useMemo(() => 
    eventos.find(e => e.id === selectedEventoId), 
  [eventos, selectedEventoId]);

  const stats = useMemo(() => {
    const totalVerba = eventos.reduce((acc: number, e: any) => acc + (Number(e.verba) || 0), 0);
    const ativos = eventos.filter((e: any) => e.status === 'em_andamento').length;
    const totalUtilizado = eventos.reduce((acc: number, e: any) => {
      const movs = e.movimentacoes_financeiras || [];
      const manualCosts = e.evento_custos || [];
      
      const utilizadoMovs = movs.reduce((sum: number, m: any) => {
        if (m.tipo === 'saida') return sum + (Number(m.valor) || 0);
        if (m.tipo === 'entrada') return sum - (Number(m.valor) || 0);
        return sum;
      }, 0);
      
      const utilizadoManual = manualCosts.reduce((sum: number, c: any) => sum + (Number(c.valor) || 0), 0);
      
      return acc + utilizadoMovs + utilizadoManual;
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
      if (selectedEventoId === deleteId) setSelectedEventoId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const handleAddCusto = async (eventoId: string) => {
    if (!newCusto.descricao || !newCusto.valor) return;
    try {
      await createCustoMutation.mutateAsync({
        evento_id: eventoId,
        descricao: newCusto.descricao,
        valor: Number(newCusto.valor),
        categoria_id: null,
        movimentacao_id: null
      });
      setNewCusto({ descricao: "", valor: "" });
      toast({ title: "Custo adicionado" });
    } catch (e: any) {
      toast({ title: "Erro ao adicionar custo", description: e.message, variant: "destructive" });
    }
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
    <div className="space-y-6 pt-6 px-4 sm:px-6 min-h-screen">
      <AnimatePresence mode="wait">
        {!selectedEventoId ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
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
              {eventos.map((evento: any) => {
                const movs = evento.movimentacoes_financeiras || [];
                const custosManuais = evento.evento_custos || [];
                const totalSaidas = movs.reduce((sum: number, m: any) => m.tipo === 'saida' ? sum + (Number(m.valor) || 0) : sum, 0);
                const totalEntradas = movs.reduce((sum: number, m: any) => m.tipo === 'entrada' ? sum + (Number(m.valor) || 0) : sum, 0);
                const totalCustosManuais = custosManuais.reduce((sum: number, c: any) => sum + (Number(c.valor) || 0), 0);
                const utilizado = totalSaidas - totalEntradas + totalCustosManuais;
                const percent = Math.min(100, Math.max(0, (utilizado / (Number(evento.verba) || 1)) * 100));
                const statusConfig = statusMap[evento.status as keyof typeof statusMap] || statusMap.planejado;

                return (
                  <Card key={evento.id} className="group overflow-hidden border-none shadow-premium bg-card/50 backdrop-blur-md hover:bg-card/80 transition-all duration-300 flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={cn("text-[10px] font-bold px-2 py-0.5", statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setSelectedEventoId(evento.id)}>
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); openEdit(evento); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setDeleteId(evento.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold truncate cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedEventoId(evento.id)}>
                        {evento.nome}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow cursor-pointer" onClick={() => setSelectedEventoId(evento.id)}>
                      <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                        {evento.descricao || "Sem descrição disponível."}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Verba</span>
                          <span className="font-bold text-primary">{fmtBRL(evento.verba)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className={cn("font-medium", utilizado > evento.verba ? "text-destructive" : "text-foreground")}>
                            {Math.round(percent)}%
                          </span>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{evento.data_inicio ? fmtDate(evento.data_inicio) : 'N/A'} - {evento.data_fim ? fmtDate(evento.data_fim) : 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedEventoId(null)} className="h-10 w-10 rounded-full hover:bg-muted">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-grow">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold text-foreground tracking-tight">{selectedEvento?.nome}</h2>
                  <Badge className={cn("text-xs font-bold", statusMap[selectedEvento?.status as keyof typeof statusMap]?.color)}>
                    {statusMap[selectedEvento?.status as keyof typeof statusMap]?.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{selectedEvento?.descricao || "Detalhes do evento"}</p>
              </div>
              {isAdmin && selectedEvento && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(selectedEvento)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteId(selectedEvento.id)}>
                    <Trash2 className="h-4 w-4" /> Excluir
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-premium bg-card/50 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Resumo Financeiro</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">Verba Total</span>
                        </div>
                        <span className="text-lg font-bold text-primary">{fmtBRL(selectedEvento?.verba || 0)}</span>
                      </div>
                      
                      {(() => {
                        const movs = selectedEvento?.movimentacoes_financeiras || [];
                        const custosManuais = selectedEvento?.evento_custos || [];
                        const totalSaidas = movs.reduce((sum: number, m: any) => m.tipo === 'saida' ? sum + (Number(m.valor) || 0) : sum, 0);
                        const totalEntradas = movs.reduce((sum: number, m: any) => m.tipo === 'entrada' ? sum + (Number(m.valor) || 0) : sum, 0);
                        const totalCustosManuais = custosManuais.reduce((sum: number, c: any) => sum + (Number(c.valor) || 0), 0);
                        const utilizado = totalSaidas - totalEntradas + totalCustosManuais;
                        const percent = Math.min(100, Math.max(0, (utilizado / (Number(selectedEvento?.verba) || 1)) * 100));

                        return (
                          <>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                              <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-destructive" />
                                <span className="text-sm font-medium">Total Utilizado</span>
                              </div>
                              <span className="text-lg font-bold text-destructive">{fmtBRL(utilizado)}</span>
                            </div>
                            <div className="space-y-2 px-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span>Utilização do Orçamento</span>
                                <span>{Math.round(percent)}%</span>
                              </div>
                              <Progress value={percent} className="h-2" />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="pt-4 border-t border-border/50 space-y-3 text-sm">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Início</span>
                        </div>
                        <span className="font-medium text-foreground">{selectedEvento?.data_inicio ? fmtDate(selectedEvento.data_inicio) : 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Término</span>
                        </div>
                        <span className="font-medium text-foreground">{selectedEvento?.data_fim ? fmtDate(selectedEvento.data_fim) : 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="border-none shadow-premium bg-card/50 backdrop-blur-md h-full">
                  <Tabs defaultValue="costs" className="w-full flex flex-col h-full">
                    <CardHeader className="pb-0 px-6 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <CardTitle className="text-xl font-bold">Detalhamento de Custos</CardTitle>
                        <TabsList className="bg-muted/50">
                          <TabsTrigger value="costs">Todos os Custos</TabsTrigger>
                          <TabsTrigger value="add">Adicionar Extra</TabsTrigger>
                        </TabsList>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-grow p-6">
                      <TabsContent value="costs" className="mt-0 h-full">
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                          {(() => {
                            const movs = selectedEvento?.movimentacoes_financeiras || [];
                            const custosManuais = selectedEvento?.evento_custos || [];
                            
                            if (movs.length === 0 && custosManuais.length === 0) {
                              return (
                                <div className="text-center py-12 text-muted-foreground">
                                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                  <p>Nenhum custo registrado para este evento.</p>
                                </div>
                              );
                            }

                            return (
                              <>
                                {movs.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Movimentações Financeiras</h4>
                                    {movs.map((m: any, idx: number) => (
                                      <div key={`mov-${idx}`} className="flex justify-between items-center p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                          <div className={cn("p-2 rounded-lg", m.tipo === 'saida' ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500")}>
                                            {m.tipo === 'saida' ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
                                          </div>
                                          <div>
                                            <p className="font-bold text-sm">{m.descricao}</p>
                                            <p className="text-xs text-muted-foreground">{fmtDate(m.data_pagamento)}</p>
                                          </div>
                                        </div>
                                        <span className={cn("font-mono font-bold", m.tipo === 'saida' ? "text-destructive" : "text-green-500")}>
                                          {m.tipo === 'saida' ? '-' : '+'}{fmtBRL(m.valor)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {custosManuais.length > 0 && (
                                  <div className="space-y-2 pt-4">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Custos Extras / Manuais</h4>
                                    {custosManuais.map((c: any) => (
                                      <div key={c.id} className="flex justify-between items-center p-4 rounded-xl bg-card border border-border/50 hover:border-orange-500/50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                            <Receipt className="h-5 w-5" />
                                          </div>
                                          <div>
                                            <p className="font-bold text-sm">{c.descricao}</p>
                                            <p className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="font-mono font-bold text-destructive">-{fmtBRL(c.valor)}</span>
                                          {isAdmin && (
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={() => deleteCustoMutation.mutate({ id: c.id, evento_id: selectedEvento!.id })}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </TabsContent>

                      <TabsContent value="add" className="mt-0">
                        {isAdmin && selectedEvento ? (
                          <div className="space-y-6 max-w-md mx-auto py-8">
                            <div className="text-center space-y-2 mb-6">
                              <h3 className="text-lg font-bold">Registrar Novo Custo Extra</h3>
                              <p className="text-sm text-muted-foreground">Adicione custos que não passaram pelo fluxo bancário automático.</p>
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Descrição do Custo</Label>
                                <Input 
                                  placeholder="Ex: Refeição extra equipe" 
                                  value={newCusto.descricao}
                                  onChange={e => setNewCusto({...newCusto, descricao: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input 
                                  placeholder="0,00" 
                                  type="number" 
                                  value={newCusto.valor}
                                  onChange={e => setNewCusto({...newCusto, valor: e.target.value})}
                                />
                              </div>
                              <Button 
                                className="w-full gap-2 bg-primary hover:bg-primary/90"
                                onClick={() => handleAddCusto(selectedEvento.id)}
                              >
                                <Plus className="h-4 w-4" /> Confirmar Lançamento
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>Somente administradores podem adicionar custos manuais.</p>
                          </div>
                        )}
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Evento</Label>
              <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Stand CCXP 2026" />
            </div>
            <div className="space-y-2">
              <Label>Verba (Orçamento)</Label>
              <Input type="number" value={form.verba} onChange={e => setForm({...form, verba: e.target.value})} placeholder="0,00" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: StatusEvento) => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Detalhes sobre o evento..." rows={3} />
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
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os custos associados também serão removidos.</AlertDialogDescription>
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
