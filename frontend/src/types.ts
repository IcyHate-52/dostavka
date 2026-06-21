export type Status = "Новый" | "Готовится" | "В пути" | "Доставлен";

export const STATUS_ORDER: Status[] = ["Новый", "Готовится", "В пути", "Доставлен"];

export interface Order {
  id: number;
  clientName: string;
  address: string;
  sum: number;
  comment?: string;
  status: Status;
  createdAt: string; // ISO timestamp
  statusChangedAt: string; // ISO timestamp
}

export interface CreateOrderInput {
  clientName: string;
  address: string;
  sum: number;
  comment?: string;
}

export const STATUS_META: Record<
  Status,
  { label: string; dot: string; chip: string; bar: string }
> = {
  Новый: {
    label: "Новый",
    dot: "bg-column-new",
    chip: "bg-[#FFFAE0] text-[#8A6400] border-[#FFE89E]",
    bar: "bg-column-new",
  },
  Готовится: {
    label: "Готовится",
    dot: "bg-column-preparing",
    chip: "bg-[#EAF2FF] text-[#1456D6] border-[#C7DEFF]",
    bar: "bg-column-preparing",
  },
  "В пути": {
    label: "В пути",
    dot: "bg-column-transit",
    chip: "bg-[#F2ECFF] text-[#6427D6] border-[#DCCBFF]",
    bar: "bg-column-transit",
  },
  Доставлен: {
    label: "Доставлен",
    dot: "bg-column-delivered",
    chip: "bg-[#E9FAF0] text-[#0A7A4E] border-[#BCEED4]",
    bar: "bg-column-delivered",
  },
};

export const OVERDUE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes, "Новый" only
export const DELIVERED_AUTOHIDE_MS = 60 * 1000; // auto-remove from board 1 min after delivery
