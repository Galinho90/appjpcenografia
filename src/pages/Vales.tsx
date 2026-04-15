import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useVales, useColaboradores, useCreateVale } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";

export default function Vales() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { data: vales = [], isLoading } = useVales();
  const { data: colaboradores = [] } = useColaboradores();
  const createMutation = useCreateVale();

  const [form, setForm] = useState({ colaborador_id: "", data: "", valor: 0, descricao: "" });

  const handleSave = async () => {
    try {
      await createMutation.mutateAsync(form);
      toast({ title: "Vale registrado!" });
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
          <h1 className="text-3xl font-bold text-foreground">Vales</h1>
          <p className="text-muted-foreground">Adiantamentos para colaboradores</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Vale</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Vale</DialogTitle></DialogHeader>
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
              <div className="space-y-2"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Motivo do vale..." /></div>
              <Button className="w-full" onClick={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar Vale"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
          <p className="text-sm text-accent-foreground/80">Total em Vales</p>
          <p className="text-2xl font-bold text-accent-foreground">
            R$ {vales.reduce((s, v) => s + v.valor, 0).toLocaleString("pt-BR")}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {vales.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{(v.colaborador as any)?.nome ?? "—"}</TableCell>
                    <TableCell>{new Date(v.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>R$ {v.valor.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-muted-foreground">{v.descricao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
