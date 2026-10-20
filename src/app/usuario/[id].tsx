import { useLocalSearchParams } from "expo-router";
import { PerfilConteudo } from "@/components/PerfilConteudo";
export default function Usuario() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PerfilConteudo id={id} />;
}
