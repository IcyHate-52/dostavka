import { useState } from "react";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { Column } from "@/components/Column";
import { CreateOrderDialog } from "@/components/CreateOrderDialog";
import { useOrders } from "@/hooks/useOrders";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Order, STATUS_ORDER } from "@/types";

export default function App() {
  const { orders, loading, error, create, move, remove } = useOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="bottom-right" richColors />

      <header className="sticky top-0 z-10 border-b border-black/[0.05] bg-background/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-column-new text-base font-extrabold text-[#1A1A1A]">
              Д
            </span>
            <h1 className="text-lg font-extrabold tracking-tight">Доставка</h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <Button
              size="lg"
              className="h-12 gap-2 rounded-full bg-column-new px-5 font-extrabold text-[#1A1A1A] shadow-card hover:bg-[#FFD633] active:scale-[0.98]"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Создать заказ
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        {error && (
          <p className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error} — повторная попытка через несколько секунд...
          </p>
        )}

        {loading ? (
          <p className="py-12 text-center text-muted-foreground">Загрузка доски...</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="text-4xl">📦</span>
            <p className="text-base font-bold">Заказов пока нет</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Нажмите «Создать заказ» в правом верхнем углу, чтобы добавить первый заказ на доску.
            </p>
            <Button
              className="mt-2 gap-2 rounded-full bg-column-new px-5 font-extrabold text-[#1A1A1A] hover:bg-[#FFD633]"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Создать заказ
            </Button>
          </div>
        ) : (
          <div className={isMobile ? "flex flex-col gap-6" : "flex gap-4 overflow-x-auto"}>
            {STATUS_ORDER.map((status) => (
              <Column
                key={status}
                status={status}
                orders={orders.filter((o) => o.status === status)}
                searchQuery={searchQuery}
                draggedOrder={draggedOrder}
                draggable={!isMobile}
                onMove={move}
                onDelete={remove}
                onDragStart={setDraggedOrder}
                onDragEnd={() => setDraggedOrder(null)}
              />
            ))}
          </div>
        )}
      </main>

      <CreateOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={create} />
    </div>
  );
}
