import { create } from "zustand";
import { filaSincronizacao } from "@/utils/filaSincronizacao";
import { consultas } from "@/utils/consulta";
import { mensagemErro } from "@/utils/erro";
interface Estado {
  online: boolean;
  sincronizando: boolean;
  pendencias: number;
  erro: string;
  definirOnline: (online: boolean) => void;
  sincronizar: () => Promise<void>;
  atualizarPendencias: () => Promise<void>;
}
export const useSincronizacao = create<Estado>((set, get) => ({
  online: true,
  sincronizando: false,
  pendencias: 0,
  erro: "",
  definirOnline: (online) => set({ online }),
  atualizarPendencias: async () => {
    try {
      set({ pendencias: (await filaSincronizacao.getPendencias()).length });
    } catch (erro) {
      set({ erro: mensagemErro(erro) });
    }
  },
  sincronizar: async () => {
    if (get().sincronizando || !get().online) return;
    set({ sincronizando: true, erro: "" });
    try {
      await filaSincronizacao.sincronizar();
      await consultas.invalidateQueries();
    } catch (erro) {
      set({ erro: mensagemErro(erro) });
    } finally {
      set({ sincronizando: false });
      await get().atualizarPendencias();
    }
  },
}));
