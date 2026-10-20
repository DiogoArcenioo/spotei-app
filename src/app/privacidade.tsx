import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Botao } from "@/components/Botao";
import { estilos } from "@/utils/tema";
export default function Privacidade() {
  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Text style={estilos.titulo}>O spot é seu.</Text>
      {[
        [
          "Fotografe com cuidado",
          "Publique apenas fotos que você tem direito de usar. Confira rostos, placas e informações pessoais antes de compartilhar. O app não possui editor automático de placas.",
        ],
        [
          "Localização é opcional",
          "O Spotei não solicita GPS. A cidade é preenchida manualmente. As fotos escolhidas são recriadas em JPEG sem os metadados do arquivo original.",
        ],
        [
          "Dados no aparelho",
          "Na demonstração, perfis, publicações e interações ficam neste aparelho. No celular usamos SQLite e AsyncStorage; na prévia web usamos o armazenamento do navegador.",
        ],
        [
          "Serviços reais",
          "No modo produção, autenticação e dados são armazenados no Supabase. Ao solicitar reconhecimento, a foto é enviada pelo backend ao Gemini. A chave da IA fica exclusivamente no servidor.",
        ],
        [
          "Controle sua conta",
          "Você pode editar seu perfil, sair e excluir suas próprias publicações pela tela de cada spot. As denúncias podem ser enviadas para revisão. A recuperação de senha usa o e-mail do Supabase.",
        ],
      ].map(([titulo, texto]) => (
        <View key={titulo} style={estilos.card}>
          <Text style={estilos.subtitulo}>{titulo}</Text>
          <Text style={estilos.secundario}>{texto}</Text>
        </View>
      ))}
      <Botao
        titulo="Editar meus dados"
        onPress={() => router.push("/editar-perfil")}
        secundario
      />
    </ScrollView>
  );
}
