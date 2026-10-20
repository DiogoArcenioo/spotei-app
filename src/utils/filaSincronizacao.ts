import { lerLocal, salvarLocal } from "@/db/database";
import { supabase } from "@/services/supabase";
import { modoDemo } from "./configuracao";
import type { NovaPublicacao } from "@/types/spot";
import { useSessao } from "@/stores/useSessao";
let operacao: Promise<unknown> = Promise.resolve();
const chave = () => `fila-real-${useSessao.getState().perfil?.id ?? "anonimo"}`;
export const filaSincronizacao = {
  async getPendencias() {
    return (await lerLocal<NovaPublicacao[]>(chave())) ?? [];
  },
  incluir(item: NovaPublicacao) {
    const chaveUsuario = chave();
    const tarefa = operacao.then(async () => {
      const lista = (await lerLocal<NovaPublicacao[]>(chaveUsuario)) ?? [];
      if (!lista.some((p) => p.id === item.id))
        await salvarLocal(chaveUsuario, [...lista, item]);
    });
    operacao = tarefa.catch(() => undefined);
    return tarefa;
  },
  sincronizar() {
    if (modoDemo) return Promise.resolve();
    const chaveUsuario = chave();
    const tarefa = operacao.then(async () => {
      const lista = (await lerLocal<NovaPublicacao[]>(chaveUsuario)) ?? [];
      for (const item of [...lista]) {
        if (chave() !== chaveUsuario) break;
        await supabase.publicar(item);
        lista.splice(
          lista.findIndex((p) => p.id === item.id),
          1,
        );
        await salvarLocal(chaveUsuario, lista);
      }
    });
    operacao = tarefa.catch(() => undefined);
    return tarefa;
  },
};
