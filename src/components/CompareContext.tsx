"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/lib/types";

interface CompareContextValue {
  selected: Product[];
  toggle: (product: Product) => void;
  isSelected: (id: string) => boolean;
  clear: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Product[]>([]);

  const toggle = (product: Product) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      if (prev.length >= 4) return prev;
      return [...prev, product];
    });
  };

  const isSelected = (id: string) => selected.some((p) => p.id === id);

  const clear = () => setSelected([]);

  return (
    <CompareContext.Provider value={{ selected, toggle, isSelected, clear }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
