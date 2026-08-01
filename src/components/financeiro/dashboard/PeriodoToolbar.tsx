import { format } from "date-fns";
import { CalendarIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PeriodoPreset = "mes" | "mes_anterior" | "30d" | "ano" | "custom";

export interface ContaOption {
  id: string;
  apelido: string;
}

export interface PeriodoToolbarProps {
  preset: PeriodoPreset;
  onPresetChange: (p: PeriodoPreset) => void;
  dataInicio: Date;
  dataFim: Date;
  onDataInicio: (d: Date) => void;
  onDataFim: (d: Date) => void;
  contas: ContaOption[];
  contaId: string;
  onContaChange: (id: string) => void;
}

const PRESETS: { key: PeriodoPreset; label: string }[] = [
  { key: "mes", label: "Este mês" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "ano", label: "Este ano" },
];

export function PeriodoToolbar({
  preset, onPresetChange, dataInicio, dataFim, onDataInicio, onDataFim,
  contas, contaId, onContaChange,
}: PeriodoToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/80 p-4 shadow-premium-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/65 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? "default" : "ghost"}
            className={cn("h-9 rounded-full text-xs", preset !== p.key && "text-muted-foreground")}
            onClick={() => onPresetChange(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 items-center gap-1 rounded-lg border bg-background px-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs font-normal">
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {format(dataInicio, "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataInicio}
                onSelect={(d) => d && (onDataInicio(d), onPresetChange("custom"))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">–</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs font-normal">
                {format(dataFim, "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataFim}
                onSelect={(d) => d && (onDataFim(d), onPresetChange("custom"))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <Select value={contaId} onValueChange={onContaChange}>
          <SelectTrigger className="h-9 w-[180px] text-xs">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {contas.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button asChild size="sm" variant="outline" className="h-9">
          <Link to="/financeiro/movimentacoes">
            Movimentações <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
