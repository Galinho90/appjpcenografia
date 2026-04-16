import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function Clientes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">Gerencie os clientes da empresa</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Em breve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cadastro de clientes será implementado em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
}
