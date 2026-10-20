import { Redirect } from "expo-router";
import { useSessao } from "@/stores/useSessao";
export default function Inicio() {
  const perfil = useSessao((s) => s.perfil);
  return <Redirect href={perfil ? "/feed" : "/entrar"} />;
}
