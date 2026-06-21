import { FormEvent, useState } from "react";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CreateOrderInput } from "@/types";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateOrderInput) => Promise<unknown>;
}

export function CreateOrderDialog({ open, onOpenChange, onCreate }: CreateOrderDialogProps) {
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [sum, setSum] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setClientName("");
    setAddress("");
    setSum("");
    setComment("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sumValue = Number(sum);
    if (!clientName.trim() || !address.trim()) {
      setError("Заполните имя клиента и адрес доставки");
      return;
    }
    if (!sum || Number.isNaN(sumValue) || sumValue <= 0) {
      setError("Сумма заказа должна быть положительным числом");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        clientName: clientName.trim(),
        address: address.trim(),
        sum: sumValue,
        comment: comment.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать заказ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-column-new">
              <Package className="h-4 w-4 text-[#1A1A1A]" />
            </span>
            Новый заказ
          </DialogTitle>
          <DialogDescription>
            Заказ появится в колонке «Новый» сразу после создания.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="clientName">Имя клиента</Label>
            <Input
              id="clientName"
              placeholder="Например: Иван Петров"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="address">Адрес доставки</Label>
            <Input
              id="address"
              placeholder="Улица, дом, квартира"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sum">Сумма заказа</Label>
            <Input
              id="sum"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Например: 2450"
              value={sum}
              onChange={(e) => setSum(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              placeholder="Особые пожелания..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={submitting}
            >
              {submitting ? "Создаю..." : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
