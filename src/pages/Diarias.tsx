import { useState, useMemo } from "react";
import { Plus, Search, Trash2, Pencil, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useColaboradores,
  useCategorias,
  useLancamentos,
  useCreateLancamento,
  useUpdateLancamento,
  useDeleteLancamento,
} from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const emptyForm = {
  colaborador_id: "",
  categoria_id: "",
  data: "",
  hora_entrada: "",
  hora_saida: "",
  valor: 0,
  descricao: "",
};

export default function Diarias() {
  const [search, setSearch] = useState("");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("all");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [colabPopoverOpen, setColabPopoverOpen] = useState(false);
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);
  const { toast } = useToast();

  const { data: lancamentos = [], isLoading } = useLancamentos();
  const { data: colaboradores = [] } = useColaboradores();
  const { data: categorias = [] } = useCategorias();
  const createMutation = useCreateLancamento();
  const updateMutation = useUpdateLancamento();
  const deleteMutation = useDeleteLancamento();

  const [form, setForm] = useState(emptyForm);

  const categoriasAtivas = useMemo(() => categorias.filter((c) => c.ativo), [categorias]);
  const colaboradoresAtivos = useMemo(() => colaboradores.filter((c) => c.ativo), [colaboradores]);
  const categoriaSelecionada = categorias.find((c) => c.id === form.categoria_id);
  const isDiaria = (categoriaSelecionada?.descricao || "").toUpperCase().includes("DIÁRIA")
    || (categoriaSelecionada?.descricao || "").toUpperCase().includes("DIARIA");

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (l: any) => {
    setEditingId(l.id);
    setForm({
      colaborador_id: l.colaborador_id,
      categoria_id: l.categoria_id,
      data: l.data,
      hora_entrada: l.hora_entrada || "",
      hora_saida: l.hora_saida || "",
      valor: Number(l.valor),
      descricao: l.descricao || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Lançamento excluído!" });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const filtered = lancamentos.filter((l) => {
    const nome = l.colaborador?.nome?.toLowerCase() ?? "";
    const cat = l.categoria?.descricao?.toLowerCase() ?? "";
    const desc = l.descricao?.toLowerCase() ?? "";
    const term = search.toLowerCase();
    const matchesSearch = !term || nome.includes(term) || cat.includes(term) || l.data.includes(term) || desc.includes(term);
    const matchesColab = filtroColaborador === "all" || l.colaborador_id === filtroColaborador;
    const matchesCat = filtroCategoria === "all" || l.categoria_id === filtroCategoria;
    const matchesInicio = !dataInicio || l.data >= dataInicio;
    const matchesFim = !dataFim || l.data <= dataFim;
    return matchesSearch && matchesColab && matchesCat && matchesInicio && matchesFim;
  });

  const limparFiltros = () => {
    setSearch("");
    setFiltroColaborador("all");
    setFiltroCategoria("all");
    setDataInicio("");
    setDataFim("");
  };

  const totalCreditos = filtered.filter((l) => l.categoria?.tipo === "C").reduce((s, l) => s + l.valor, 0);
  const totalDebitos = filtered.filter((l) => l.categoria?.tipo === "D").reduce((s, l) => s + l.valor, 0);
  const saldo = totalCreditos - totalDebitos;

  const handleSave = async () => {
    if (!form.colaborador_id || !form.categoria_id || !form.data) {
      toast({ title: "Preencha colaborador, categoria e data", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        colaborador_id: form.colaborador_id,
        categoria_id: form.categoria_id,
        data: form.data,
        hora_entrada: isDiaria && form.hora_entrada ? form.hora_entrada : null,
        hora_saida: isDiaria && form.hora_saida ? form.hora_saida : null,
        valor: Number(form.valor) || 0,
        descricao: form.descricao || null,
      };
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Lançamento atualizado!" });
      } else {
        await createMutation.mutateAsync(payload as any);
        toast({ title: "Lançamento registrado!" });
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const colabSelecionado = colaboradores.find((c) => c.id === form.colaborador_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Lançamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Controle de lançamentos por categoria</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}><Plus className="h-4 w-4" /> Registrar Lançamento</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Diarista</Label>
              <Popover open={colabPopoverOpen} onOpenChange={setColabPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {colabSelecionado?.nome || "Selecione..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar diarista..." />
                    <CommandList>
                      <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                      <CommandGroup>
                        {colaboradoresAtivos.map((c) => (
                          <CommandItem key={c.id} value={c.nome} onSelect={() => {
                            setForm({ ...form, colaborador_id: c.id, valor: editingId ? form.valor : (c.valor_diaria_padrao ?? form.valor) });
                            setColabPopoverOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", form.colaborador_id === c.id ? "opacity-100" : "opacity-0")} />
                            {c.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {categoriaSelecionada ? (
                      <span className="flex items-center gap-2">
                        <Badge variant={categoriaSelecionada.tipo === "C" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                          {categoriaSelecionada.tipo === "C" ? "Crédito" : "Débito"}
                        </Badge>
                        {categoriaSelecionada.descricao}
                      </span>
                    ) : "Selecione a categoria..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar categoria..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma encontrada.</CommandEmpty>
                      <CommandGroup>
                        {categoriasAtivas.map((c) => (
                          <CommandItem key={c.id} value={c.descricao} onSelect={() => {
                            setForm({ ...form, categoria_id: c.id });
                            setCatPopoverOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", form.categoria_id === c.id ? "opacity-100" : "opacity-0")} />
                            <Badge variant={c.tipo === "C" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0 mr-2">
                              {c.tipo === "C" ? "Crédito" : "Débito"}
                            </Badge>
                            {c.descricao}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {isDiaria ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div className="space-y-2"><Label>Entrada</Label><Input type="time" value={form.hora_entrada} onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })} /></div>
                <div className="space-y-2"><Label>Saída</Label><Input type="time" value={form.hora_saida} onChange={(e) => setForm({ ...form, hora_saida: e.target.value })} /></div>
              </div>
            ) : (
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            )}

            <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição opcional..." /></div>
            <Button className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando..." : (editingId ? "Atualizar Lançamento" : "Salvar Lançamento")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/70 p-4">
            <p className="text-sm text-primary-foreground/80">Total de Créditos</p>
            <p className="text-2xl font-bold text-primary-foreground">R$ {totalCreditos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-destructive to-destructive/70 p-4">
            <p className="text-sm text-destructive-foreground/80">Total de Débitos</p>
            <p className="text-2xl font-bold text-destructive-foreground">R$ {totalDebitos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-secondary to-secondary/70 p-4">
            <p className="text-sm text-secondary-foreground/80">Saldo</p>
            <p className="text-2xl font-bold text-secondary-foreground">R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Diarista</Label>
              <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.descricao}</SelectItem>
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
            <Button variant="outline" size="sm" onClick={limparFiltros}>Limpar filtros</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Diarista</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.colaborador?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={l.categoria?.tipo === "C" ? "default" : "destructive"}>
                        {l.categoria?.descricao ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{l.hora_entrada || "—"}</TableCell>
                    <TableCell>{l.hora_saida || "—"}</TableCell>
                    <TableCell className={l.categoria?.tipo === "D" ? "text-destructive font-medium" : "text-primary font-medium"}>
                      {l.categoria?.tipo === "D" ? "- " : "+ "}R$ {l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.descricao || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(l.id)} className="text-destructive hover:text-destructive">
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
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
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
