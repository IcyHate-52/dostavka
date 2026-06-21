import { CreateOrderInput, Order } from "@/types";

// In production (Render) the frontend is served by the same Go server,
// so VITE_API_URL is set to "" at build time and requests stay relative
// ("/api/orders"). Locally, with two separate dev servers, it defaults
// to the Go server's port.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function listOrders(): Promise<Order[]> {
  return request<Order[]>("/api/orders");
}

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return request<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function moveOrder(
  id: number,
  direction: "forward" | "backward"
): Promise<Order> {
  return request<Order>(`/api/orders/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ direction }),
  });
}

export async function deleteOrder(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/orders/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
}
