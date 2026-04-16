import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useReembolsos, useColaboradores, useCreateReembolso, useDeleteReembolso } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";

export default function Reembolsos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { data: reembolsos = [], isLoading } = useReembolsos();
  const { data: colaboradores = [] } = useColaboradores();
  const createMutation = useCreateReembolso();
  const deleteMutation = useDeleteReembolso();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({ colaborador_id: "", data: "", valor: 0, descricao: "" });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Reembolso excluído!" });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      await createMutation.mutateAsync(form);
      toast({ title: "Reembolso registrado!" });
      setDialogOpen(false);
      setForm({ colaborador_id: "", data: "", valor: 0, descricao: "" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reembolsos</h1>
          <p className="text-muted-foreground">Reembolsos de despesas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Reembolso</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Reembolso</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select value={form.colaborador_id} onValueChange={(v) => setForm({ ...form, colaborador_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {colaboradores.filter(c => c.ativo).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do reembolso..." /></div>
              <Button className="w-full" onClick={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar Reembolso"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-secondary to-secondary/70 p-4">
          <p className="text-sm text-secondary-foreground/80">Total em Reembolsos</p>
          <p className="text-2xl font-bold text-secondary-foreground">
            R$ {reembolsos.reduce((s, r) => s + r.valor, 0).toLocaleString("pt-BR")}
          </p>
        </div>
      </Card>

      <Card className="shadow-md">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reembolsos.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{(r.colaborador as any)?.nome ?? "—"}</TableCell>
                    <TableCell>{new Date(r.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>R$ {r.valor.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-muted-foreground">{r.descricao}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <AlertDialogTitle>Excluir reembolso?</AlertDialogTitle>
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
