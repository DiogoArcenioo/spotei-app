import { create, isAxiosError } from "axios";
import {
  enderecoSupabase,
  chavePublica,
  validarConfiguracao,
} from "./configuracao";
import { useSessao } from "@/stores/useSessao";
import type { Sessao } from "@/types/spot";

export const apiAuth = create({
  baseURL: `${enderecoSupabase}/auth/v1`,
  timeout: 20000,
  headers: { apikey: chavePublica },
});
export const api = create({
  baseURL: enderecoSupabase,
  timeout: 45000,
  headers: { apikey: chavePublica },
});
let renovacao: Promise<Sessao> | null = null;
export async function renovarSessao() {
  const sessao = useSessao.getState().sessao;
  if (!sessao) throw new Error("Entre novamente para continuar.");
  if (!renovacao) {
    renovacao = apiAuth
      .post<Sessao>("/token?grant_type=refresh_token", {
        refresh_token: sessao.refresh_token,
      })
      .then(({ data }) => {
        const nova = {
          ...data,
          expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        };
        useSessao.getState().atualizarSessao(nova);
        return nova;
      })
      .catch((erro: unknown) => {
        if (
          isAxiosError(erro) &&
          [400, 401, 403].includes(erro.response?.status ?? 0)
        )
          useSessao.getState().sair();
        throw erro;
      })
      .finally(() => {
        renovacao = null;
      });
  }
  return renovacao;
}
api.interceptors.request.use(async (pedido) => {
  validarConfiguracao();
  let sessao = useSessao.getState().sessao;
  if (sessao && sessao.expires_at < Date.now() / 1000 + 60)
    sessao = await renovarSessao();
  if (sessao) pedido.headers.Authorization = `Bearer ${sessao.access_token}`;
  return pedido;
});
api.interceptors.response.use(
  (resposta) => resposta,
  async (erro: unknown) => {
    if (
      isAxiosError(erro) &&
      erro.response?.status === 401 &&
      erro.config &&
      !erro.config.headers["X-Spotei-Repetido"]
    ) {
      await renovarSessao();
      erro.config.headers["X-Spotei-Repetido"] = "1";
      return api.request(erro.config);
    }
    throw erro;
  },
);
