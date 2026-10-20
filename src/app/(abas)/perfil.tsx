import { View } from "react-native";
import { Cabecalho } from "@/components/Cabecalho";
import { PerfilConteudo } from "@/components/PerfilConteudo";
import { useSessao } from "@/stores/useSessao";
import { estilos } from "@/utils/tema";
export default function Perfil() {
  const id = useSessao((s) => s.perfil?.id);
  return (
    <View style={estilos.tela}>
      <Cabecalho titulo="Perfil" />
      {id && <PerfilConteudo id={id} />}
    </View>
  );
}
