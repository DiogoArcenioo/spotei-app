import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { Botao } from "@/components/Botao";
import { Campo } from "@/components/Campo";
import { Estado } from "@/components/Estado";
import { Filtros } from "@/components/Filtros";
import { servicos } from "@/services/servicos";
import { modoDemo, usaGeminiLocal } from "@/utils/configuracao";
import { cores, estilos } from "@/utils/tema";
export default function Entrar() {
  const [acao, definirAcao] = useState("entrar");
  const [nome, definirNome] = useState("");
  const [usuario, definirUsuario] = useState("");
  const [email, definirEmail] = useState("");
  const [senha, definirSenha] = useState("");
  const [aceito, definirAceito] = useState(false);
  const [enviado, definirEnviado] = useState(false);
  const [aviso, definirAviso] = useState("");
  const erros = {
    nome: nome.trim().length < 2 ? "Informe pelo menos 2 caracteres." : "",
    usuario: !/^[a-z0-9_.]{3,24}$/i.test(usuario)
      ? "Use 3 a 24 letras, números, pontos ou _."
      : "",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? "Informe um e-mail válido."
      : "",
    senha: senha.length < 8 ? "Use pelo menos 8 caracteres." : "",
  };
  const autenticar = useMutation({
    mutationFn: async (adminDemo: boolean | undefined) => {
      definirAviso("");
      if (adminDemo !== undefined) {
        await servicos.entrarDemo(adminDemo);
        return;
      }
      definirEnviado(true);
      if (
        erros.email ||
        (acao !== "recuperar" && erros.senha) ||
        (acao === "cadastrar" && (erros.nome || erros.usuario || !aceito))
      )
        throw new Error("Confira os campos destacados.");
      if (acao === "entrar") await servicos.entrar(email.trim(), senha);
      if (acao === "cadastrar")
        await servicos.cadastrar(
          nome.trim(),
          usuario.trim().toLowerCase(),
          email.trim(),
          senha,
        );
      if (acao === "recuperar") {
        await servicos.recuperar(email.trim());
        definirAviso(
          "Verifique o e-mail de recuperação enviado pelo Supabase.",
        );
      }
    },
    onSuccess: () => {
      if (acao !== "recuperar") router.replace("/feed");
    },
  });
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={estilos.tela}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.conteudo, { paddingTop: 44, gap: 22 }]}
      >
        <View style={{ alignItems: "center", paddingBottom: 10 }}>
          <Logo largura={300} />
          <Text
            style={[estilos.secundario, { marginTop: 20, letterSpacing: 2 }]}
          >
            A RUA É A SUA GARAGEM.
          </Text>
        </View>
        <View>
          <Text style={estilos.titulo}>
            {acao === "cadastrar"
              ? "Seu primeiro passo."
              : acao === "recuperar"
                ? "De volta à pista."
                : "Bom te ver por aqui."}
          </Text>
          <Text style={estilos.secundario}>
            Encontre. Fotografe. Compartilhe.
          </Text>
        </View>
        <Filtros
          valor={acao}
          selecionar={(valor) => {
            definirAcao(valor);
            definirEnviado(false);
            autenticar.reset();
          }}
          opcoes={[
            { valor: "entrar", titulo: "Entrar" },
            { valor: "cadastrar", titulo: "Criar conta" },
            ...(!modoDemo ? [{ valor: "recuperar", titulo: "Recuperar" }] : []),
          ]}
        />
        {acao === "cadastrar" && (
          <>
            <Campo
              titulo="Nome"
              value={nome}
              onChangeText={definirNome}
              maxLength={60}
              erro={enviado ? erros.nome : undefined}
            />
            <Campo
              titulo="Usuário"
              value={usuario}
              onChangeText={definirUsuario}
              autoCapitalize="none"
              maxLength={24}
              erro={enviado || usuario ? erros.usuario : undefined}
            />
          </>
        )}
        <Campo
          titulo="E-mail"
          value={email}
          onChangeText={definirEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          erro={enviado || email ? erros.email : undefined}
        />
        {acao !== "recuperar" && (
          <Campo
            titulo="Senha"
            value={senha}
            onChangeText={definirSenha}
            secureTextEntry
            autoComplete={
              acao === "cadastrar" ? "new-password" : "current-password"
            }
            erro={enviado || senha ? erros.senha : undefined}
          />
        )}
        {acao === "cadastrar" && (
          <View>
            <View style={estilos.linha}>
              <Switch
                value={aceito}
                onValueChange={definirAceito}
                trackColor={{ true: cores.destaque, false: "#333" }}
                thumbColor="#FFF"
              />
              <Text style={[estilos.secundario, { flex: 1 }]}>
                Li os cuidados de privacidade. Publicarei fotos que tenho
                direito de usar.
              </Text>
            </View>
            {enviado && !aceito && (
              <Text style={estilos.erro}>
                Confirme antes de criar sua conta.
              </Text>
            )}
          </View>
        )}
        <Estado erro={autenticar.error} />
        {aviso ? <Text style={estilos.texto}>{aviso}</Text> : null}
        <Botao
          titulo={
            acao === "cadastrar"
              ? "Criar minha conta"
              : acao === "recuperar"
                ? "Enviar recuperação"
                : "Entrar"
          }
          onPress={() => autenticar.mutate(undefined)}
          carregando={autenticar.isPending}
        />
        {modoDemo && (
          <View style={estilos.card}>
            <Text style={[estilos.subtitulo, estilos.destaque]}>
              Experimente o Spotei
            </Text>
            <Text style={estilos.secundario}>
              {usaGeminiLocal
                ? "As fotos são identificadas pelo Gemini. Seu perfil e suas interações ficam salvos neste aparelho."
                : "Sem cadastro ou chaves de API. As interações são salvas neste aparelho."}
            </Text>
            <Botao
              titulo={
                usaGeminiLocal ? "Entrar no app" : "Entrar na demonstração"
              }
              onPress={() => autenticar.mutate(false)}
              desabilitado={autenticar.isPending}
            />
            <Botao
              titulo="Moderação demonstrativa"
              onPress={() => autenticar.mutate(true)}
              secundario
              desabilitado={autenticar.isPending}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
