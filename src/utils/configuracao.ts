export const modoDemo = (process.env.EXPO_PUBLIC_APP_MODE ?? "demo") === "demo";
export const usaGeminiLocal =
  modoDemo && process.env.EXPO_PUBLIC_IA_MODE === "gemini";
export const analiseSimulada = modoDemo && !usaGeminiLocal;
export const enderecoSupabase = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const chavePublica =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export function validarConfiguracao() {
  if (
    !modoDemo &&
    (!enderecoSupabase.startsWith("https://") || !chavePublica)
  ) {
    throw new Error(
      "Configure a URL e a chave pública do Supabase no .env ou use APP_MODE=demo.",
    );
  }
}
