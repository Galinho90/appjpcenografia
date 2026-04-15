import { useState } from "react";
import { Wallet, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockVales, mockColaboradores } from "@/data/mock";

export default function Vales() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const enriched = mockVales.map((v) => ({
    ...v,
    colaborador: mockColaboradores.find((c) => c.id === v.colaborador_id),
  }));

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
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {mockColaboradores.filter(c => c.ativo).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" placeholder="0" /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Input placeholder="Motivo do vale..." /></div>
              <Button className="w-full" onClick={() => setDialogOpen(false)}>Salvar Vale</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
          <p className="text-sm text-accent-foreground/80">Total em Vales</p>
          <p className="text-2xl font-bold text-accent-foreground">
            R$ {mockVales.reduce((s, v) => s + v.valor, 0).toLocaleString("pt-BR")}
          </p>
        </div>
      </Card>

      <Card className="shadow-md">
        <CardContent className="pt-6">
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
              {enriched.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.colaborador?.nome}</TableCell>
                  <TableCell>{new Date(v.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>R$ {v.valor.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-muted-foreground">{v.descricao}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
