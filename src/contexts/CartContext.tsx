import React, { createContext, useContext, useEffect, useState } from 'react';
import { calculateDiscountedPrice } from '../lib/pricing';
import type { CakeSizeLabel, CartItem, Product } from '../types/bakery';

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  totalCount: number;
  estimatedSubtotal: number;
  estimatedSavings: number;
  estimatedTotal: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size: CakeSizeLabel, quantity?: number, inscription?: string) => void;
  updateQuantity: (productId: string, size: CakeSizeLabel, inscription: string | undefined, qty: number) => void;
  removeItem: (productId: string, size: CakeSizeLabel, inscription?: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_STORAGE_KEY = 'tlb_active_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as CartItem[];
    } catch {
      // Ignore storage errors
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items]);

  const addItem = (
    product: Product,
    size: CakeSizeLabel,
    quantity = 1,
    inscription?: string
  ) => {
    if (!product.isAvailable) return;
    const basePrice = size === '1kg' ? product.price1kg : product.price500g;
    const finalPrice = calculateDiscountedPrice(basePrice, product.discountPercent);
    const cleanInscription = inscription?.trim() || undefined;

    setItems((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.size === size &&
          (item.inscription || undefined) === cleanInscription
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: Math.min(10, next[idx].quantity + quantity),
          unitBasePrice: basePrice,
          discountPercent: product.discountPercent,
          unitFinalPrice: finalPrice,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.imageUrl,
          size,
          unitBasePrice: basePrice,
          discountPercent: product.discountPercent,
          unitFinalPrice: finalPrice,
          quantity: Math.min(10, Math.max(1, quantity)),
          inscription: cleanInscription,
        },
      ];
    });
    setIsOpen(true);
  };

  const updateQuantity = (
    productId: string,
    size: CakeSizeLabel,
    inscription: string | undefined,
    qty: number
  ) => {
    const cleanInscription = inscription?.trim() || undefined;
    if (qty <= 0) {
      removeItem(productId, size, cleanInscription);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId &&
        item.size === size &&
        (item.inscription || undefined) === cleanInscription
          ? { ...item, quantity: Math.min(10, qty) }
          : item
      )
    );
  };

  const removeItem = (productId: string, size: CakeSizeLabel, inscription?: string) => {
    const cleanInscription = inscription?.trim() || undefined;
    setItems((prev) =>
      prev.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.size === size &&
            (item.inscription || undefined) === cleanInscription
          )
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedSubtotal = items.reduce(
    (sum, item) => sum + item.unitBasePrice * item.quantity,
    0
  );
  const estimatedTotal = items.reduce(
    (sum, item) => sum + item.unitFinalPrice * item.quantity,
    0
  );
  const estimatedSavings = Math.max(0, estimatedSubtotal - estimatedTotal);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        totalCount,
        estimatedSubtotal,
        estimatedSavings,
        estimatedTotal,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
