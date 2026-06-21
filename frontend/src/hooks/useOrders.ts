import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createOrder, deleteOrder, listOrders, moveOrder } from "@/api/orders";
import { CreateOrderInput, Order, STATUS_ORDER } from "@/types";
import { playBellSound, playClickSound } from "@/lib/sounds";

const POLL_INTERVAL_MS = 5000;

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const knownIds = useRef<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const data = await listOrders();
      setOrders(data);
      setError(null);
      knownIds.current = new Set(data.map((o) => o.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Hide "Доставлен" cards from the board exactly 1 minute after they
  // reached that status — the backend permanently archives them a little
  // later (sweep runs every 15s), but the UI shouldn't wait for that.
  useEffect(() => {
    const id = setInterval(() => {
      setOrders((prev) =>
        prev.filter((o) => {
          if (o.status !== "Доставлен") return true;
          const age = Date.now() - new Date(o.statusChangedAt).getTime();
          return age < 60_000;
        })
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const create = useCallback(
    async (input: CreateOrderInput) => {
      const order = await createOrder(input);
      setOrders((prev) => [...prev, order]);
      knownIds.current.add(order.id);
      toast.success(`Заказ №${order.id} создан!`);
      return order;
    },
    []
  );

  const move = useCallback(
    async (id: number, direction: "forward" | "backward") => {
      const current = orders.find((o) => o.id === id);
      if (!current) return;
      const curIdx = STATUS_ORDER.indexOf(current.status);
      const nextIdx = direction === "forward" ? curIdx + 1 : curIdx - 1;
      if (nextIdx < 0 || nextIdx >= STATUS_ORDER.length) return;

      try {
        const updated = await moveOrder(id, direction);
        setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
        if (updated.status === "Доставлен") {
          playBellSound();
        } else {
          playClickSound();
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Не удалось переместить заказ"
        );
      }
    },
    [orders]
  );

  const remove = useCallback(async (id: number) => {
    try {
      await deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить заказ");
    }
  }, []);

  return { orders, loading, error, create, move, remove, refresh };
}
