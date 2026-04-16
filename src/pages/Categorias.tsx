import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tags } from "lucide-react";

export default function Categorias() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
        <p className="text-muted-foreground">Organize categorias de lançamentos</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" /> Em breve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cadastro de categorias será implementado em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
}
