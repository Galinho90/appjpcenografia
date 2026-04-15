import { FileBarChart, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockColaboradores, mockFechamentos } from "@/data/mock";

export default function Relatorios() {
  const enriched = mockFechamentos.map((f) => ({
    ...f,
    colaborador: mockColaboradores.find((c) => c.id === f.colaborador_id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Exporte relatórios por colaborador ou período</p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {mockColaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quinzena</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1q-abr-2026">1ª Quinzena Abr/2026</SelectItem>
                  <SelectItem value="2q-mar-2026">2ª Quinzena Mar/2026</SelectItem>
                  <SelectItem value="1q-mar-2026">1ª Quinzena Mar/2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
              <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Exportar PDF</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Resumo por Colaborador — 1ª Quinzena Abr/2026</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Diárias</TableHead>
                <TableHead>Vales</TableHead>
                <TableHead>Reembolsos</TableHead>
                <TableHead>Valor Final</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.colaborador?.nome}</TableCell>
                  <TableCell>{f.colaborador?.funcao}</TableCell>
                  <TableCell>R$ {f.total_diarias.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>R$ {f.total_vales.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>R$ {f.total_reembolsos.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="font-bold">R$ {f.valor_final.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="capitalize">{f.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
