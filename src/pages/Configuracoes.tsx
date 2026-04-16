import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Ajustes gerais do sistema</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Em breve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">As configurações serão implementadas em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
}
