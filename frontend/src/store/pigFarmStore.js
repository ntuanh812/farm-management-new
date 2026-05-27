import { create } from "zustand";
import {
  BreedingStatus,
  LifecycleStatus,
  PigCategory,
  FatteningPhase,
} from "../domain/pigFarm";

function uid(prefix = "id") {
  const u =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random()}`;
  return `${prefix}-${u}`;
}

export const usePigFarmStore = create((set) => ({
  // ✅ STATE
  barns: [],
  staff: [],
  pigs: [],
  movements: [],
  deaths: [],
  saleBatches: [],
  feedUsages: [],
  medicineUsages: [],
  vaccinations: [],
  activities: [],

  // ✅ ACTION
  addPig: (data) =>
    set((s) => {
      const pig = {
        id: uid("pig"),
        lifecycleStatus: LifecycleStatus.ACTIVE,
        ...data,
      };
      return {
        pigs: [pig, ...s.pigs],
      };
    }),

  recordSaleBatch: ({ pigIds, soldAt, pricePerKg }) =>
    set((s) => {
      const lines = pigIds.map((id) => {
        const p = s.pigs.find((x) => x.id === id);
        return {
          pigId: id,
          weightKg: p?.weightKg || 0,
          pricePerKg,
          totalAmount: (p?.weightKg || 0) * pricePerKg,
        };
      });

      return {
        pigs: s.pigs.map((p) =>
          pigIds.includes(p.id)
            ? {
                ...p,
                lifecycleStatus: LifecycleStatus.SOLD,
                fattening: null,
              }
            : p
        ),
        saleBatches: [
          {
            id: uid("sale"),
            soldAt,
            lines,
          },
          ...s.saleBatches,
        ],
      };
    }),
}));