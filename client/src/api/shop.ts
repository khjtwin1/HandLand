import { request } from "./client";

export type ItemCategory = "hair" | "face" | "outfit";
export type ItemState = "can_buy" | "not_enough" | "owned" | "tier_locked";

// 서버 GET /shop/items 응답과 같은 모양
export interface ShopItem {
  id: number;
  category: ItemCategory;
  name: string;
  price: number;
  image_url: string | null;
  required_tier: string | null;
  state: ItemState;
}

export interface ShopData {
  coins: number;
  items: ShopItem[];
}

export function fetchShop(token: string): Promise<ShopData> {
  return request<ShopData>("/shop/items", { token });
}

// 서버 GET /closet 응답: 카테고리별 장착 중인 아이템
export interface ClosetData {
  equipped: Record<ItemCategory, { id: number; name: string } | null>;
}

export function fetchCloset(token: string): Promise<ClosetData> {
  return request<ClosetData>("/closet", { token });
}

export function buyItem(
  token: string,
  itemId: number,
): Promise<{ total_coins: number }> {
  return request<{ total_coins: number }>(`/shop/items/${itemId}/buy`, {
    method: "POST",
    token,
  });
}

// 장착 / 해제 (이미 장착 중이면 해제)
export function toggleItem(
  token: string,
  itemId: number,
): Promise<{ equipped: boolean }> {
  return request<{ equipped: boolean }>(`/closet/items/${itemId}/toggle`, {
    method: "POST",
    token,
  });
}
