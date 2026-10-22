import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from "react-native";
import { useURL } from "expo-linking";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { apiAuth } from "@/utils/api";
import { modoDemo } from "@/utils/configuracao";
import { useSessao } from "@/stores/useSessao";
import { Botao } from "@/components/Botao";
import { Campo } from "@/components/Campo";
import { Estado } from "@/components/Estado";
import { estilos } from "@/utils/tema";
export default function RedefinirSenha() {
  const perfil = useSessao((s) => s.perfil);
  const endereco = useURL();
  const [senha, definirSenha] = useState("");
  const [confirmacao, definirConfirmacao] = useState("");
  const [enviado, definirEnviado] = useState(false);
  const [concluido, definirConcluido] = useState(false);
  const link =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.href
      : (endereco ?? "");
  const parametros = new URLSearchParams(link.split("#")[1] ?? "");
  const token = parametros.get("access_token");
  const salvar = useMutation({
    mutationFn: async () => {
      definirEnviado(true);
      if (modoDemo)
        throw new Error(
          "Recuperação por e-mail está disponível somente com Supabase configurado.",
        );
      if (senha.length < 8 || senha !== confirmacao)
        throw new Error("Confira a senha e sua confirmação.");
      if (!token || parametros.get("type") !== "recovery")
        throw new Error("Abra o link de recuperação recebido por e-mail.");
      await apiAuth.put(
        "/user",
        { password: senha },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      useSessao.getState().sair();
      definirConcluido(true);
    },
  });
  if (modoDemo)
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.titulo}>Sua conta está neste aparelho.</Text>
        <Text style={estilos.texto}>
          A recuperação por e-mail fica disponível com uma conta online. No modo
          local, entre com sua senha ou use a conta de demonstração.
        </Text>
        <Botao
          titulo={perfil ? "Voltar ao app" : "Voltar ao login"}
          onPress={() => router.replace(perfil ? "/feed" : "/entrar")}
        />
      </ScrollView>
    );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={estilos.tela}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={estilos.conteudo}
      >
      <Text style={estilos.titulo}>De volta à pista.</Text>
      {concluido ? (
        <>
          <Text style={estilos.texto}>
            Senha atualizada. Entre com a nova senha.
          </Text>
          <Botao
            titulo="Ir para o login"
            onPress={() => router.replace("/entrar")}
          />
        </>
      ) : (
        <>
          <Text style={estilos.secundario}>
            Use o link enviado por e-mail para escolher uma nova senha.
          </Text>
          <Campo
            titulo="Nova senha"
            value={senha}
            onChangeText={definirSenha}
            secureTextEntry
            autoComplete="new-password"
            erro={
              enviado && senha.length < 8
                ? "Use pelo menos 8 caracteres."
                : undefined
            }
          />
          <Campo
            titulo="Confirmar nova senha"
            value={confirmacao}
            onChangeText={definirConfirmacao}
            secureTextEntry
            erro={
              enviado && senha !== confirmacao
                ? "As senhas precisam ser iguais."
                : undefined
            }
          />
          <Botao
            titulo="Atualizar senha"
            onPress={() => salvar.mutate()}
            carregando={salvar.isPending}
          />
          <Estado erro={salvar.error} />
        </>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
