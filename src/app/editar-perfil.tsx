import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from "react-native";
import { router } from "expo-router";
import { useSessao } from "@/stores/useSessao";
import { useAcao } from "@/hooks/usePublicacoes";
import { escolherFotografia } from "@/services/fotografia";
import { servicos } from "@/services/servicos";
import { Campo } from "@/components/Campo";
import { Avatar } from "@/components/Avatar";
import { Botao } from "@/components/Botao";
import { Estado } from "@/components/Estado";
import { estilos } from "@/utils/tema";
export default function EditarPerfil() {
  const perfil = useSessao((s) => s.perfil)!;
  const [nome, definirNome] = useState(perfil.nome);
  const [usuario, definirUsuario] = useState(perfil.usuario);
  const [bio, definirBio] = useState(perfil.bio);
  const [cidade, definirCidade] = useState(perfil.cidade);
  const [avatar, definirAvatar] = useState(perfil.avatar);
  const [enviado, definirEnviado] = useState(false);
  const foto = useAcao(async (_: undefined) => {
    const escolhida = await escolherFotografia(false);
    if (escolhida) definirAvatar(escolhida.uri);
  });
  const salvar = useAcao(async (_: undefined) => {
    definirEnviado(true);
    if (nome.trim().length < 2 || !/^[a-z0-9_.]{3,24}$/i.test(usuario))
      throw new Error("Confira seu nome e usuário.");
    await servicos.editarPerfil({
      nome: nome.trim(),
      usuario: usuario.toLowerCase().trim(),
      bio,
      cidade,
      avatar,
    });
    if (router.canGoBack()) router.back();
    else router.replace("/perfil");
  });
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={estilos.tela}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={estilos.conteudo}
      >
      <Text style={estilos.titulo}>Do seu jeito.</Text>
      <Avatar nome={nome} foto={avatar} tamanho={84} />
      <Botao
        titulo="Trocar foto"
        secundario
        onPress={() => foto.mutate(undefined)}
        carregando={foto.isPending}
      />
      <Estado erro={foto.error} />
      <Campo
        titulo="Nome"
        value={nome}
        onChangeText={definirNome}
        maxLength={60}
        erro={
          enviado && nome.trim().length < 2
            ? "Use pelo menos 2 caracteres."
            : undefined
        }
      />
      <Campo
        titulo="Usuário"
        value={usuario}
        onChangeText={definirUsuario}
        autoCapitalize="none"
        maxLength={24}
        erro={
          !/^[a-z0-9_.]{3,24}$/i.test(usuario)
            ? "Use de 3 a 24 letras, números, pontos ou _."
            : undefined
        }
      />
      <Campo
        titulo="Biografia"
        value={bio}
        onChangeText={definirBio}
        multiline
        maxLength={250}
      />
      <Campo
        titulo="Cidade"
        value={cidade}
        onChangeText={definirCidade}
        maxLength={80}
      />
      <Estado erro={salvar.error} />
      <Botao
        titulo="Salvar perfil"
        onPress={() => salvar.mutate(undefined)}
        carregando={salvar.isPending}
        desabilitado={foto.isPending}
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
