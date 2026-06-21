import { useState } from "react";
import { cn } from "@/lib/utils";
import { Order, Status, STATUS_META, STATUS_ORDER } from "@/types";
import { OrderCard } from "@/components/OrderCard";

interface ColumnProps {
  status: Status;
  orders: Order[];
  searchQuery: string;
  draggedOrder: Order | null;
  draggable: boolean;
  onMove: (id: number, direction: "forward" | "backward") => void;
  onDelete: (id: number) => void;
  onDragStart: (order: Order) => void;
  onDragEnd: () => void;
}

export function Column({
  status,
  orders,
  searchQuery,
  draggedOrder,
  draggable,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
}: ColumnProps) {
  const [isOver, setIsOver] = useState(false);
  const meta = STATUS_META[status];

  const myIdx = STATUS_ORDER.indexOf(status);
  const isValidDrop =
    draggedOrder !== null && Math.abs(STATUS_ORDER.indexOf(draggedOrder.status) - myIdx) === 1;

  return (
    <div className="flex min-w-[280px] flex-1 flex-col md:min-w-0">
      <div
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-bold",
          meta.chip
        )}
      >
        <span className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-extrabold tabular-nums">
          {orders.length}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          if (!isValidDrop) return;
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          if (!draggedOrder || !isValidDrop) return;
          const direction = myIdx > STATUS_ORDER.indexOf(draggedOrder.status) ? "forward" : "backward";
          onMove(draggedOrder.id, direction);
        }}
        className={cn(
          "mt-3 flex min-h-[320px] flex-1 flex-col gap-2.5 rounded-2xl bg-black/[0.02] p-2.5 transition-colors",
          isOver && isValidDrop && "drop-target"
        )}
      >
        {orders.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
            <span className="text-2xl opacity-40">🗂️</span>
            <p className="text-xs text-muted-foreground">Нет заказов</p>
          </div>
        )}
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            draggable={draggable}
            highlighted={
              searchQuery.trim() === ""
                ? null
                : order.address.toLowerCase().includes(searchQuery.trim().toLowerCase())
            }
            onMove={onMove}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
