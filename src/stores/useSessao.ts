import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Perfil, Sessao } from "@/types/spot";

interface EstadoSessao {
  perfil: Perfil | null;
  sessao: Sessao | null;
  hidratado: boolean;
  modo: string;
  entrar: (perfil: Perfil, sessao?: Sessao) => void;
  atualizarPerfil: (perfil: Perfil) => void;
  atualizarSessao: (sessao: Sessao) => void;
  sair: () => void;
  finalizarHidratacao: () => void;
}
export const useSessao = create<EstadoSessao>()(
  persist(
    (set) => ({
      perfil: null,
      sessao: null,
      hidratado: false,
      modo: process.env.EXPO_PUBLIC_APP_MODE ?? "demo",
      entrar: (perfil, sessao) => set({ perfil, sessao: sessao ?? null }),
      atualizarPerfil: (perfil) => set({ perfil }),
      atualizarSessao: (sessao) => set({ sessao }),
      sair: () => set({ perfil: null, sessao: null }),
      finalizarHidratacao: () => set({ hidratado: true }),
    }),
    {
      name: `spotei-sessao-${process.env.EXPO_PUBLIC_APP_MODE ?? "demo"}`,
      storage: createJSONStorage(() => AsyncStorage),
      // A sessão pertence ao aparelho; a renderização do servidor não acessa o armazenamento.
      skipHydration: Platform.OS === "web" && typeof window === "undefined",
      partialize: ({ perfil, sessao, modo }) => ({ perfil, sessao, modo }),
      onRehydrateStorage: () => () =>
        useSessao.getState().finalizarHidratacao(),
    },
  ),
);
