import { Bell, CheckCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useMinhasNotificacoes,
  useMarcarNotificacaoLida,
  useMarcarTodasLidas,
  useExcluirNotificacao,
} from "@/hooks/useNotificacoes";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { data: notificacoes = [] } = useMinhasNotificacoes();
  const marcarLida = useMarcarNotificacaoLida();
  const marcarTodas = useMarcarTodasLidas();
  const excluir = useExcluirNotificacao();
  const navigate = useNavigate();

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const handleClick = (notif: (typeof notificacoes)[number]) => {
    if (!notif.lida) marcarLida.mutate(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notificações"
          className="relative flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold text-sm">Notificações</span>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => marcarTodas.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notificacoes.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação.
            </div>
          ) : (
            notificacoes.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full text-left p-3 border-b last:border-b-0 hover:bg-accent transition-colors block",
                  !n.lida && "bg-accent/40"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.lida && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {n.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {n.mensagem}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
