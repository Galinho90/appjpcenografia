import { useState } from "react";
import { CalendarDays, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mockDiarias, mockColaboradores } from "@/data/mock";

export default function Diarias() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const enriched = mockDiarias.map((d) => ({
    ...d,
    colaborador: mockColaboradores.find((c) => c.id === d.colaborador_id),
  }));

  const filtered = enriched.filter(
    (d) =>
      d.colaborador?.nome.toLowerCase().includes(search.toLowerCase()) ||
      d.data.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Diárias</h1>
          <p className="text-muted-foreground">Controle de diárias trabalhadas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Registrar Diária
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Diária</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {mockColaboradores.filter(c => c.ativo).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Entrada</Label>
                  <Input type="time" />
                </div>
                <div className="space-y-2">
                  <Label>Saída</Label>
                  <Input type="time" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" placeholder="Automático pelo padrão" />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Observações opcionais..." />
              </div>
              <Button className="w-full" onClick={() => setDialogOpen(false)}>
                Salvar Diária
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/70 p-4">
            <p className="text-sm text-primary-foreground/80">Total Diárias</p>
            <p className="text-2xl font-bold text-primary-foreground">{mockDiarias.length}</p>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-secondary to-secondary/70 p-4">
            <p className="text-sm text-secondary-foreground/80">Valor Total</p>
            <p className="text-2xl font-bold text-secondary-foreground">
              R$ {mockDiarias.reduce((s, d) => s + d.valor, 0).toLocaleString("pt-BR")}
            </p>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
            <p className="text-sm text-accent-foreground/80">Média por Diária</p>
            <p className="text-2xl font-bold text-accent-foreground">
              R$ {Math.round(mockDiarias.reduce((s, d) => s + d.valor, 0) / mockDiarias.length).toLocaleString("pt-BR")}
            </p>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.colaborador?.nome}</TableCell>
                  <TableCell>{new Date(d.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{d.horario_entrada}</TableCell>
                  <TableCell>{d.horario_saida}</TableCell>
                  <TableCell>R$ {d.valor.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.observacoes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
