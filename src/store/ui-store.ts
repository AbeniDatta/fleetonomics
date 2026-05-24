import { create } from "zustand";

type UiState = {
  selectedVehiclePlate: string | null;
  mapFilter: "all" | "active" | "alerts" | "idle" | "offline";
  setSelectedVehiclePlate: (plate: string | null) => void;
  setMapFilter: (f: UiState["mapFilter"]) => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedVehiclePlate: null,
  mapFilter: "all",
  setSelectedVehiclePlate: (plate) => set({ selectedVehiclePlate: plate }),
  setMapFilter: (mapFilter) => set({ mapFilter }),
}));
