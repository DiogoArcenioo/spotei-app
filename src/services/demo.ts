import {
  digestStringAsync,
  CryptoDigestAlgorithm,
  randomUUID,
} from "expo-crypto";
import {
  lerLocal,
  salvarLocal,
  salvarPublicacao,
  excluirPublicacaoLocal,
} from "@/db/database";
import { criarDadosDemo } from "@/db/dadosDemo";
import { useSessao } from "@/stores/useSessao";
import { chaveCarro, normalizar, pontosRaridade } from "@/utils/pontuacao";
import { recalcularPontos } from "@/utils/regrasDemo";
import type {
  DadosDemo,
  Identificacao,
  NovaPublicacao,
  Perfil,
  Raridade,
} from "@/types/spot";

let fila: Promise<unknown> = Promise.resolve();
async function dados() {
  const banco = (await lerLocal<DadosDemo>("demo")) ?? criarDadosDemo();
  // Inclui no catálogo também os modelos identificados por IA em versões anteriores.
  for (const publicacao of banco.publicacoes) {
    const carro = banco.catalogo.find(
      (c) => chaveCarro(c) === chaveCarro(publicacao.carro),
    );
    if (carro) publicacao.carro.id = carro.id;
    else banco.catalogo.push({ ...publicacao.carro });
  }
  return banco;
}
function usuario() {
  const perfil = useSessao.getState().perfil;
  if (!perfil) throw new Error("Entre para continuar.");
  return perfil;
}
// Serializar evita duas mutações locais lerem e sobrescreverem o mesmo estado.
function alterar<T>(acao: (banco: DadosDemo) => T | Promise<T>): Promise<T> {
  const tarefa = fila.then(async () => {
    const banco = await dados();
    const resultado = await acao(banco);
    recalcularPontos(banco);
    await salvarLocal("demo", banco);
    const perfil = banco.perfis.find(
      (p) => p.id === useSessao.getState().perfil?.id,
    );
    if (perfil) useSessao.getState().atualizarPerfil(perfil);
    return resultado;
  });
  fila = tarefa.catch(() => undefined);
  return tarefa;
}
export const demo = {
  async raridades() {
    return pontosRaridade;
  },
  async entrarDemo(administrador = false) {
    const banco = await dados();
    await salvarLocal("demo", banco);
    useSessao
      .getState()
      .entrar(
        banco.perfis.find(
          (p) => p.id === (administrador ? "admin-demo" : "demo"),
        )!,
      );
  },
  async entrar(email: string, senha: string) {
    const banco = await dados();
    const senhaHash = await digestStringAsync(
      CryptoDigestAlgorithm.SHA256,
      `${email.toLowerCase()}:${senha}`,
    );
    const conta = banco.contas.find(
      (c) => c.email === email.toLowerCase() && c.senhaHash === senhaHash,
    );
    if (!conta)
      throw new Error(
        "E-mail ou senha inválidos. Você também pode usar Entrar na demonstração.",
      );
    useSessao
      .getState()
      .entrar(banco.perfis.find((p) => p.id === conta.perfil.id)!);
  },
  async cadastrar(nome: string, apelido: string, email: string, senha: string) {
    const senhaHash = await digestStringAsync(
      CryptoDigestAlgorithm.SHA256,
      `${email.toLowerCase()}:${senha}`,
    );
    await alterar((banco) => {
      if (banco.contas.some((c) => c.email === email.toLowerCase()))
        throw new Error("Este e-mail já está cadastrado.");
      if (
        banco.perfis.some((p) => normalizar(p.usuario) === normalizar(apelido))
      )
        throw new Error("Este nome de usuário já existe.");
      const perfil: Perfil = {
        id: randomUUID(),
        nome,
        usuario: apelido.toLowerCase(),
        bio: "",
        avatar: null,
        cidade: "",
        pontos: 0,
        criadoEm: new Date().toISOString(),
        administrador: false,
      };
      banco.perfis.push(perfil);
      banco.contas.push({ perfil, email: email.toLowerCase(), senhaHash });
      useSessao.getState().entrar(perfil);
    });
  },
  async recuperar(_email: string) {
    throw new Error(
      "A demonstração não envia e-mails. Use a conta demo ou configure o Supabase para recuperar sua senha.",
    );
  },
  async sair() {
    useSessao.getState().sair();
  },
  async feed() {
    await fila;
    return (await dados()).publicacoes
      .filter(
        (p) =>
          p.estado === "aprovado" ||
          (p.estado === "pendente" &&
            (p.autorId === usuario().id || usuario().administrador)),
      )
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  },
  async publicacao(id: string) {
    await fila;
    const publicacao = (await dados()).publicacoes.find((p) => p.id === id);
    if (
      !publicacao ||
      (publicacao.estado !== "aprovado" &&
        publicacao.autorId !== usuario().id &&
        !usuario().administrador)
    )
      throw new Error("Spot não encontrado ou indisponível.");
    return publicacao;
  },
  async publicacoesPerfil(id: string) {
    await fila;
    return (await dados()).publicacoes
      .filter(
        (p) =>
          p.autorId === id &&
          (p.estado === "aprovado" ||
            id === usuario().id ||
            usuario().administrador),
      )
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  },
  async perfil(id: string) {
    const perfil = (await dados()).perfis.find((p) => p.id === id);
    if (!perfil) throw new Error("Perfil não encontrado.");
    return perfil;
  },
  async perfis() {
    return (await dados()).perfis.filter((p) => !p.administrador);
  },
  async editarPerfil(
    campos: Pick<Perfil, "nome" | "usuario" | "bio" | "cidade" | "avatar">,
  ) {
    await alterar((banco) => {
      if (
        banco.perfis.some(
          (p) =>
            p.id !== usuario().id &&
            normalizar(p.usuario) === normalizar(campos.usuario),
        )
      )
        throw new Error("Este usuário já existe.");
      Object.assign(banco.perfis.find((p) => p.id === usuario().id)!, campos);
    });
  },
  async analisar(
    cenario: string,
    foto: string,
    hash: string,
  ): Promise<Identificacao> {
    const banco = await dados();
    const carro = banco.catalogo.find((c) => c.id === cenario);
    if (!carro)
      throw new Error(
        "Escolha um cenário demonstrativo. A demo não reconhece o conteúdo da foto.",
      );
    return {
      ...carro,
      identificacaoId: randomUUID(),
      caminho: foto,
      hash,
      confianca: "alta",
      revisao: ["epico", "lendario"].includes(carro.raridade),
      simulada: true,
    };
  },
  async publicar(nova: NovaPublicacao) {
    return alterar(async (banco) => {
      const existente = banco.publicacoes.find((p) => p.id === nova.id);
      if (existente) return existente;
      if (banco.publicacoes.some((p) => p.hash === nova.identificacao.hash))
        throw new Error("Esta foto já foi publicada. Escolha outro arquivo.");
      const carro = {
        ...nova.identificacao,
        marca: nova.marca,
        modelo: nova.modelo,
        versao: nova.versao || null,
      };
      const catalogado = banco.catalogo.find(
        (c) => chaveCarro(c) === chaveCarro(carro),
      );
      if (catalogado) carro.id = catalogado.id;
      else banco.catalogo.push({ ...carro, verificado: false });
      const corrigido = chaveCarro(carro) !== chaveCarro(nova.identificacao);
      const publicacao = {
        id: nova.id,
        autorId: usuario().id,
        autor: usuario(),
        carro,
        foto: nova.foto,
        enquadramento: nova.enquadramento ?? "inteira",
        descricao: nova.descricao,
        cidade: nova.cidade,
        hash: nova.identificacao.hash,
        criadoEm: new Date().toISOString(),
        estado: (corrigido || nova.identificacao.revisao
          ? "pendente"
          : "aprovado") as "pendente" | "aprovado",
        pontos: 0,
        curtidas: [] as string[],
      };
      banco.publicacoes.unshift(publicacao);
      await salvarPublicacao(publicacao.id, usuario().id, publicacao);
      return publicacao;
    });
  },
  async excluir(id: string) {
    await alterar(async (banco) => {
      const publicacao = banco.publicacoes.find((p) => p.id === id);
      if (!publicacao || publicacao.autorId !== usuario().id)
        throw new Error("Você só pode excluir seus próprios spots.");
      if (publicacao.pontos)
        banco.movimentos.push({
          id: randomUUID(),
          usuarioId: usuario().id,
          publicacaoId: id,
          pontos: -publicacao.pontos,
          motivo: "Exclusão do spot",
          criadoEm: new Date().toISOString(),
        });
      banco.publicacoes = banco.publicacoes.filter((p) => p.id !== id);
      banco.comentarios = banco.comentarios.filter(
        (c) => c.publicacaoId !== id,
      );
      banco.denuncias = banco.denuncias.filter((d) => d.publicacaoId !== id);
      await excluirPublicacaoLocal(id);
    });
  },
  async curtir(id: string) {
    await this.publicacao(id);
    await alterar((banco) => {
      const publicacao = banco.publicacoes.find((p) => p.id === id);
      if (!publicacao) throw new Error("Spot não encontrado.");
      publicacao.curtidas = publicacao.curtidas.includes(usuario().id)
        ? publicacao.curtidas.filter((c) => c !== usuario().id)
        : [...publicacao.curtidas, usuario().id];
    });
  },
  async comentarios(id: string) {
    await this.publicacao(id);
    const banco = await dados();
    return banco.comentarios
      .filter((c) => c.publicacaoId === id)
      .map((c) => ({
        ...c,
        usuario:
          banco.perfis.find((p) => p.id === c.autorId)?.usuario ?? c.usuario,
      }));
  },
  async comentar(id: string, texto: string) {
    await this.publicacao(id);
    await alterar((banco) => {
      if (!texto.trim() || texto.length > 500)
        throw new Error("Escreva um comentário de até 500 caracteres.");
      banco.comentarios.push({
        id: randomUUID(),
        publicacaoId: id,
        autorId: usuario().id,
        usuario: usuario().usuario,
        texto: texto.trim(),
        criadoEm: new Date().toISOString(),
      });
    });
  },
  async excluirComentario(id: string) {
    await alterar((banco) => {
      const comentario = banco.comentarios.find((c) => c.id === id);
      if (comentario?.autorId !== usuario().id)
        throw new Error("Este comentário pertence a outro usuário.");
      banco.comentarios = banco.comentarios.filter((c) => c.id !== id);
    });
  },
  async seguindo() {
    return (await dados()).seguindo;
  },
  async seguir(id: string) {
    await alterar((banco) => {
      if (id === usuario().id)
        throw new Error("Você não pode seguir seu próprio perfil.");
      if (!banco.perfis.some((p) => p.id === id))
        throw new Error("Perfil não encontrado.");
      const existe = banco.seguindo.some(
        (s) => s.seguidor === usuario().id && s.seguido === id,
      );
      banco.seguindo = existe
        ? banco.seguindo.filter(
            (s) => !(s.seguidor === usuario().id && s.seguido === id),
          )
        : [...banco.seguindo, { seguidor: usuario().id, seguido: id }];
    });
  },
  async denunciar(id: string, motivo: string) {
    await this.publicacao(id);
    await alterar((banco) => {
      if (motivo.trim().length < 5 || motivo.trim().length > 500)
        throw new Error("Descreva o motivo com 5 a 500 caracteres.");
      if (
        banco.denuncias.some(
          (d) => d.publicacaoId === id && d.autorId === usuario().id,
        )
      )
        throw new Error("Você já denunciou esse spot.");
      banco.denuncias.push({
        id: randomUUID(),
        publicacaoId: id,
        autorId: usuario().id,
        motivo: motivo.trim(),
        criadoEm: new Date().toISOString(),
      });
    });
  },
  async moderacao() {
    if (!usuario().administrador)
      throw new Error("Acesso restrito à moderação.");
    const banco = await dados();
    return {
      pendentes: banco.publicacoes.filter((p) => p.estado === "pendente"),
      denuncias: banco.denuncias
        .filter((d) => !d.resolvida)
        .map((d) => ({
          ...d,
          estadoPublicacao: banco.publicacoes.find(
            (p) => p.id === d.publicacaoId,
          )?.estado,
        })),
      movimentos: banco.movimentos,
      catalogo: banco.catalogo,
    };
  },
  async resolverDenuncia(id: string) {
    await alterar((banco) => {
      if (!usuario().administrador) throw new Error("Sem permissão.");
      const denuncia = banco.denuncias.find((d) => d.id === id);
      if (!denuncia) throw new Error("Denúncia não encontrada.");
      denuncia.resolvida = true;
    });
  },
  async moderar(
    id: string,
    aprovado: boolean,
    marca?: string,
    modelo?: string,
    versao?: string,
  ) {
    await alterar((banco) => {
      if (!usuario().administrador) throw new Error("Sem permissão.");
      const publicacao = banco.publicacoes.find((p) => p.id === id);
      if (!publicacao) throw new Error("Spot não encontrado.");
      if (
        (marca !== undefined && !marca.trim()) ||
        (modelo !== undefined && !modelo.trim())
      )
        throw new Error("Informe a marca e o modelo antes de aprovar.");
      if (marca && modelo)
        publicacao.carro = {
          ...publicacao.carro,
          marca,
          modelo,
          versao: versao || null,
        };
      publicacao.estado = aprovado ? "aprovado" : "rejeitado";
      const catalogado = banco.catalogo.find(
        (c) => chaveCarro(c) === chaveCarro(publicacao.carro),
      );
      if (catalogado) publicacao.carro.id = catalogado.id;
      else {
        publicacao.carro.id = randomUUID();
        banco.catalogo.push({ ...publicacao.carro, verificado: aprovado });
      }
      if (aprovado) {
        publicacao.carro.verificado = true;
        const carro = banco.catalogo.find((c) => c.id === publicacao.carro.id);
        if (carro) carro.verificado = true;
      }
    });
  },
  async editarRaridade(id: string, raridade: Raridade) {
    await alterar((banco) => {
      if (!usuario().administrador) throw new Error("Sem permissão.");
      const carro = banco.catalogo.find((c) => c.id === id);
      if (!carro) throw new Error("Carro não encontrado.");
      carro.raridade = raridade;
      carro.verificado = true;
      for (const p of banco.publicacoes.filter((p) => p.carro.id === id))
        p.carro.raridade = raridade;
    });
  },
};
