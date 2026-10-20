import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
export const DB_NAME = "spotei.db";
let banco: Promise<SQLiteDatabase> | undefined;
async function abrirBanco() {
  const db = await openDatabaseAsync(DB_NAME);
  await db.execAsync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS dados_locais (chave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS publicacoes (id TEXT PRIMARY KEY NOT NULL, autor_id TEXT NOT NULL, dados TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS indice_autor ON publicacoes(autor_id);
    PRAGMA user_version = 1;`);
  return db;
}
function obterBanco() {
  banco ??= abrirBanco();
  return banco;
}
export async function lerLocal<T>(chave: string): Promise<T | null> {
  const db = await obterBanco();
  const registro = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM dados_locais WHERE chave = ?",
    chave,
  );
  return registro ? JSON.parse(registro.valor) : null;
}
export async function salvarLocal(chave: string, dados: unknown) {
  const db = await obterBanco();
  await db.runAsync(
    "INSERT OR REPLACE INTO dados_locais (chave, valor) VALUES (?, ?)",
    chave,
    JSON.stringify(dados),
  );
}
export async function salvarPublicacao(
  id: string,
  autorId: string,
  dados: unknown,
) {
  const db = await obterBanco();
  await db.runAsync(
    "INSERT OR REPLACE INTO publicacoes (id, autor_id, dados) VALUES (?, ?, ?)",
    id,
    autorId,
    JSON.stringify(dados),
  );
}
export async function excluirPublicacaoLocal(id: string) {
  const db = await obterBanco();
  await db.runAsync("DELETE FROM publicacoes WHERE id = ?", id);
}
