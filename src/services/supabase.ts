import { api, apiAuth } from "@/utils/api";
import { validarConfiguracao } from "@/utils/configuracao";
import { useSessao } from "@/stores/useSessao";
import { obterBytes } from "./fotografia";
import type {
  Comentario,
  Identificacao,
  NovaPublicacao,
  Perfil,
  Publicacao,
  Raridade,
  Sessao,
  Denuncia,
  Movimento,
  Carro,
} from "@/types/spot";
import { Platform } from "react-native";

function usuarioId() {
  const id =
    useSessao.getState().perfil?.id ?? useSessao.getState().sessao?.user.id;
  if (!id) throw new Error("Entre para continuar.");
  return id;
}
async function assinarFoto(caminho: string) {
  if (!caminho || caminho.startsWith("https://")) return caminho;
  const { data } = await api.post<{ signedURL: string }>(
    `/storage/v1/object/sign/spots/${caminho}`,
    { expiresIn: 3600 },
  );
  return `${api.defaults.baseURL}/storage/v1${data.signedURL}`;
}
async function fotos(publicacoes: Publicacao[]) {
  return Promise.all(
    publicacoes.map(async (publicacao) => ({
      ...publicacao,
      foto: await assinarFoto(publicacao.foto),
    })),
  );
}
export const supabase = {
  async raridades(): Promise<Record<Raridade, number>> {
    const { data } = await api.get<{ codigo: Raridade; pontos: number }[]>(
      "/rest/v1/rarity_tiers?select=codigo,pontos",
    );
    return Object.fromEntries(data.map((r) => [r.codigo, r.pontos])) as Record<
      Raridade,
      number
    >;
  },
  async entrarDemo(_administrador = false) {
    throw new Error("A demonstração está desativada neste ambiente.");
  },
  async entrar(email: string, senha: string) {
    validarConfiguracao();
    const { data } = await apiAuth.post<Sessao>("/token?grant_type=password", {
      email,
      password: senha,
    });
    useSessao.getState().atualizarSessao({
      ...data,
      expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    });
    const perfil = await this.perfil(data.user.id);
    useSessao.getState().entrar(perfil, useSessao.getState().sessao!);
  },
  async cadastrar(nome: string, apelido: string, email: string, senha: string) {
    validarConfiguracao();
    const { data } = await apiAuth.post("/signup", {
      email,
      password: senha,
      data: { nome, usuario: apelido },
    });
    if (data.access_token) {
      useSessao.getState().atualizarSessao({
        ...data,
        expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      });
      await this.entrar(email, senha);
    } else
      throw new Error(
        "Conta criada! Confirme o e-mail recebido e depois entre com sua senha.",
      );
  },
  async recuperar(email: string) {
    validarConfiguracao();
    const destino =
      process.env.EXPO_PUBLIC_RECOVERY_URL ||
      (Platform.OS === "web"
        ? `${window.location.origin}/redefinir-senha`
        : "spotei://redefinir-senha");
    await apiAuth.post(`/recover?redirect_to=${encodeURIComponent(destino)}`, {
      email,
    });
  },
  async sair() {
    const sessao = useSessao.getState().sessao;
    if (sessao)
      await apiAuth.post(
        "/logout",
        {},
        { headers: { Authorization: `Bearer ${sessao.access_token}` } },
      );
    useSessao.getState().sair();
  },
  async feed() {
    const { data } = await api.get<Publicacao[]>(
      "/rest/v1/publicacoes_app?select=*&estado=neq.rejeitado&order=criadoEm.desc&limit=1000",
    );
    return fotos(data);
  },
  async paginaFeed(pagina: number) {
    const { data } = await api.get<Publicacao[]>(
      `/rest/v1/publicacoes_app?select=*&estado=neq.rejeitado&order=criadoEm.desc&limit=12&offset=${pagina * 12}`,
    );
    return fotos(data);
  },
  async publicacoesPerfil(id: string) {
    const { data } = await api.get<Publicacao[]>(
      `/rest/v1/publicacoes_app?autorId=eq.${encodeURIComponent(id)}&order=criadoEm.desc`,
    );
    return fotos(data);
  },
  async publicacao(id: string) {
    const { data } = await api.get<Publicacao[]>(
      `/rest/v1/publicacoes_app?id=eq.${encodeURIComponent(id)}`,
    );
    if (!data[0]) throw new Error("Spot não encontrado ou indisponível.");
    return (await fotos(data))[0];
  },
  async perfil(id: string) {
    const { data } = await api.get<Perfil[]>(
      `/rest/v1/perfis_app?id=eq.${encodeURIComponent(id)}&select=*`,
    );
    if (!data[0]) throw new Error("Perfil não encontrado.");
    return data[0];
  },
  async perfis() {
    const { data } = await api.get<Perfil[]>(
      "/rest/v1/perfis_app?order=pontos.desc&limit=100",
    );
    return data;
  },
  async ranking(periodo: string, cidade: string) {
    const { data } = await api.post<Perfil[]>("/rest/v1/rpc/ranking", {
      periodo,
      cidade_filtro: cidade || null,
    });
    return data;
  },
  async editarPerfil(
    campos: Pick<Perfil, "nome" | "usuario" | "bio" | "cidade" | "avatar">,
  ) {
    let avatar = campos.avatar;
    if (avatar && !avatar.startsWith("https://")) {
      const caminho = `${usuarioId()}/avatar.jpg`;
      await api.post(
        `/storage/v1/object/avatares/${caminho}`,
        await obterBytes(avatar),
        {
          headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
          transformRequest: (dados) => dados,
        },
      );
      avatar = `${api.defaults.baseURL}/storage/v1/object/public/avatares/${caminho}?v=${Date.now()}`;
    }
    await api.patch(`/rest/v1/profiles?id=eq.${usuarioId()}`, {
      ...campos,
      avatar,
    });
    useSessao.getState().atualizarPerfil(await this.perfil(usuarioId()));
  },
  async analisar(
    _cenario: string,
    foto: string,
    hash: string,
  ): Promise<Identificacao> {
    const caminho = `${usuarioId()}/${hash}.jpg`;
    try {
      await api.post(
        `/storage/v1/object/spots/${caminho}`,
        await obterBytes(foto),
        {
          headers: { "Content-Type": "image/jpeg", "x-upsert": "false" },
          transformRequest: (dados) => dados,
        },
      );
    } catch (erro: unknown) {
      const { isAxiosError } = await import("axios");
      const duplicado =
        isAxiosError(erro) &&
        (erro.response?.status === 409 ||
          (erro.response?.status === 400 &&
            /duplicate|already exists/i.test(
              `${erro.response.data?.error ?? ""} ${erro.response.data?.message ?? ""}`,
            )));
      if (!duplicado) throw erro;
    }
    const { data } = await api.post<Identificacao>(
      "/functions/v1/identify-vehicle",
      { caminho },
      { timeout: 65000 },
    );
    return data;
  },
  async publicar(nova: NovaPublicacao): Promise<Publicacao> {
    const { data: id } = await api.post<string>(
      "/rest/v1/rpc/publicar_spot_enquadrado",
      {
        spot_id: nova.id,
        identificacao_id: nova.identificacao.identificacaoId,
        marca_corrigida: nova.marca,
        modelo_corrigido: nova.modelo,
        versao_corrigida: nova.versao || null,
        legenda: nova.descricao,
        cidade_spot: nova.cidade,
        enquadramento_foto: nova.enquadramento ?? "inteira",
      },
    );
    const { data } = await api.get<Publicacao[]>(
      `/rest/v1/publicacoes_app?id=eq.${id}`,
    );
    return (await fotos(data))[0];
  },
  async excluir(id: string) {
    await api.delete(`/rest/v1/posts?id=eq.${id}`);
  },
  async curtir(id: string) {
    await api.post("/rest/v1/rpc/alternar_curtida", { spot_id: id });
  },
  async comentarios(id: string) {
    const { data } = await api.get<Comentario[]>(
      `/rest/v1/comentarios_app?publicacaoId=eq.${id}&order=criadoEm.asc`,
    );
    return data;
  },
  async comentar(id: string, texto: string) {
    await api.post("/rest/v1/post_comments", {
      post_id: id,
      autor_id: usuarioId(),
      texto: texto.trim(),
    });
  },
  async excluirComentario(id: string) {
    await api.delete(`/rest/v1/post_comments?id=eq.${id}`);
  },
  async seguindo() {
    const { data } = await api.get<{ seguidor: string; seguido: string }[]>(
      "/rest/v1/user_follows?select=seguidor,seguido",
    );
    return data;
  },
  async seguir(id: string) {
    await api.post("/rest/v1/rpc/alternar_seguir", { perfil_id: id });
  },
  async denunciar(id: string, motivo: string) {
    await api.post("/rest/v1/reports", {
      post_id: id,
      autor_id: usuarioId(),
      motivo,
    });
  },
  async moderacao() {
    const { data } = await api.post<{
      pendentes: Publicacao[];
      denuncias: Denuncia[];
      movimentos: Movimento[];
      catalogo: Carro[];
    }>("/rest/v1/rpc/painel_moderacao");
    return { ...data, pendentes: await fotos(data.pendentes) };
  },
  async moderar(
    id: string,
    aprovado: boolean,
    marca?: string,
    modelo?: string,
    versao?: string,
  ) {
    await api.post("/rest/v1/rpc/moderar_spot", {
      spot_id: id,
      aprovado,
      marca_corrigida: marca ?? null,
      modelo_corrigido: modelo ?? null,
      versao_corrigida: versao ?? null,
    });
  },
  async resolverDenuncia(id: string) {
    await api.post("/rest/v1/rpc/resolver_denuncia", { denuncia_id: id });
  },
  async editarRaridade(id: string, raridade: Raridade) {
    await api.post("/rest/v1/rpc/editar_raridade", {
      carro_id: id,
      nova_raridade: raridade,
    });
  },
};
