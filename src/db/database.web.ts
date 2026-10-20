import AsyncStorage from "@react-native-async-storage/async-storage";
// Na prévia web usamos AsyncStorage. No celular, o mesmo import usa SQLite.
export async function lerLocal<T>(chave: string): Promise<T | null> {
  const texto = await AsyncStorage.getItem(`spotei:${chave}`);
  return texto ? JSON.parse(texto) : null;
}
export async function salvarLocal(chave: string, dados: unknown) {
  await AsyncStorage.setItem(`spotei:${chave}`, JSON.stringify(dados));
}
export async function salvarPublicacao(
  id: string,
  autorId: string,
  dados: unknown,
) {
  await salvarLocal(`publicacao:${id}`, { autorId, dados });
}
export async function excluirPublicacaoLocal(id: string) {
  await AsyncStorage.removeItem(`spotei:publicacao:${id}`);
}
