import { useState } from "react";
import { AlarmClock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Order, OVERDUE_THRESHOLD_MS, STATUS_ORDER } from "@/types";
import { Button } from "@/components/ui/button";
import { useTick } from "@/hooks/useTick";

interface OrderCardProps {
  order: Order;
  highlighted: boolean | null; // null = no active search
  draggable: boolean;
  onMove: (id: number, direction: "forward" | "backward") => void;
  onDelete: (id: number) => void;
  onDragStart: (order: Order) => void;
  onDragEnd: () => void;
}

function formatElapsed(fromIso: string): string {
  const ms = Date.now() - new Date(fromIso).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} ч ${rest} мин назад`;
}

export function OrderCard({
  order,
  highlighted,
  draggable,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
}: OrderCardProps) {
  useTick(15000); // refresh the relative timer periodically
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const idx = STATUS_ORDER.indexOf(order.status);
  const isFirst = idx === 0;
  const isLast = idx === STATUS_ORDER.length - 1;

  const referenceTime = order.status === "Новый" ? order.createdAt : order.statusChangedAt;
  const ageMs = Date.now() - new Date(referenceTime).getTime();
  const isOverdue = order.status === "Новый" && ageMs > OVERDUE_THRESHOLD_MS;

  const dimmed = highlighted === false;

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(order.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart(order);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group animate-card-in rounded-2xl border border-black/[0.04] bg-card p-3.5 shadow-card transition-all hover:shadow-card-hover",
        draggable && "cursor-grab active:cursor-grabbing",
        dimmed && "opacity-30",
        highlighted && "ring-2 ring-[#FFCB05] bg-[#FFFDF2]",
        isOverdue && "border-red-200 bg-red-50/70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-foreground/70">№{order.id}</span>
        <span className="text-lg font-extrabold text-emerald-600 tabular-nums">
          {order.sum.toLocaleString("ru-RU")} ₽
        </span>
      </div>

      <p className="mt-1.5 text-sm font-bold">{order.clientName}</p>
      <p className="text-sm text-muted-foreground">{order.address}</p>

      {order.comment && (
        <p className="mt-1.5 rounded-lg bg-secondary px-2 py-1 text-xs italic text-muted-foreground">
          «{order.comment}»
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs",
            isOverdue
              ? "flex items-center gap-1 font-extrabold text-red-600"
              : "font-medium text-muted-foreground"
          )}
        >
          {isOverdue && <AlarmClock className="h-3.5 w-3.5" />}
          {isOverdue ? "ПРОСРОЧЕН!" : formatElapsed(referenceTime)}
        </span>

        <div className="flex items-center gap-1">
          {confirmingDelete ? (
            <>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                Нет
              </button>
              <button
                onClick={() => onDelete(order.id)}
                className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700"
              >
                Удалить
              </button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                onClick={() => setConfirmingDelete(true)}
                aria-label="Удалить заказ"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 rounded-full"
                disabled={isFirst}
                onClick={() => onMove(order.id, "backward")}
                aria-label="Вернуть влево"
              >
                ←
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 rounded-full"
                disabled={isLast}
                onClick={() => onMove(order.id, "forward")}
                aria-label="Переместить вправо"
              >
                →
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
