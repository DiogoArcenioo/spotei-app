export type Raridade = "comum" | "incomum" | "raro" | "epico" | "lendario";
export type EstadoSpot = "aprovado" | "pendente" | "rejeitado";
export type Enquadramento = "inteira" | "preencher";
export interface Perfil {
  id: string;
  usuario: string;
  nome: string;
  bio: string;
  avatar: string | null;
  pontos: number;
  cidade: string;
  criadoEm: string;
  administrador: boolean;
}
export interface Carro {
  id: string;
  marca: string;
  modelo: string;
  versao: string | null;
  geracao: string | null;
  ano: number | null;
  raridade: Raridade;
  caracteristicas: string[];
  justificativa: string;
  verificado: boolean;
}
export interface Identificacao extends Carro {
  identificacaoId: string;
  caminho: string;
  hash: string;
  confianca: "alta" | "media" | "baixa";
  revisao: boolean;
  simulada: boolean;
  candidatos?: Identificacao[];
}
export interface Publicacao {
  id: string;
  autorId: string;
  autor: Perfil;
  carro: Carro;
  foto: string;
  descricao: string;
  cidade: string;
  criadoEm: string;
  estado: EstadoSpot;
  pontos: number;
  curtidas: string[];
  hash: string;
  sincronizando?: boolean;
  enquadramento?: Enquadramento;
}
export interface NovaPublicacao {
  id: string;
  foto: string;
  identificacao: Identificacao;
  marca: string;
  modelo: string;
  versao: string;
  descricao: string;
  cidade: string;
  enquadramento?: Enquadramento;
}
export interface Comentario {
  id: string;
  publicacaoId: string;
  autorId: string;
  usuario: string;
  texto: string;
  criadoEm: string;
}
export interface Sessao {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string };
}
export interface ContaDemo {
  perfil: Perfil;
  email: string;
  senhaHash: string;
}
export interface Movimento {
  id: string;
  usuarioId: string;
  publicacaoId: string;
  pontos: number;
  motivo: string;
  criadoEm: string;
}
export interface Denuncia {
  id: string;
  publicacaoId: string;
  autorId: string;
  motivo: string;
  criadoEm: string;
  resolvida?: boolean;
  estadoPublicacao?: EstadoSpot;
}
export interface DadosDemo {
  perfis: Perfil[];
  contas: ContaDemo[];
  publicacoes: Publicacao[];
  comentarios: Comentario[];
  seguindo: { seguidor: string; seguido: string }[];
  denuncias: Denuncia[];
  movimentos: Movimento[];
  catalogo: Carro[];
}
