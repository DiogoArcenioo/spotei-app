import { isAxiosError } from "axios";
export function mensagemErro(erro: unknown) {
  if (typeof erro === "string") return erro;
  if (isAxiosError(erro)) {
    const dados = erro.response?.data;
    return (
      dados?.erro ??
      dados?.msg ??
      dados?.message ??
      (erro.response
        ? `Não foi possível concluir (${erro.response.status}).`
        : "Sem conexão. Tente novamente quando estiver online.")
    );
  }
  return erro instanceof Error
    ? erro.message
    : "Não foi possível concluir. Tente novamente.";
}
