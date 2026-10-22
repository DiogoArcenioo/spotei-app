import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { usePublicacao } from "@/hooks/usePublicacao";
import { useAcao } from "@/hooks/usePublicacoes";
import { servicos } from "@/services/servicos";
import { useSessao } from "@/stores/useSessao";
import { CartaoPublicacao } from "@/components/CartaoPublicacao";
import { Confirmacao } from "@/components/Confirmacao";
import { Campo } from "@/components/Campo";
import { Estado } from "@/components/Estado";
import { Botao } from "@/components/Botao";
import { estilos } from "@/utils/tema";
export default function DetalhePublicacao() {
  const { id, acao } = useLocalSearchParams<{ id: string; acao?: string }>();
  const rolagem = useRef<ScrollView>(null);
  const campoComentario = useRef<TextInput>(null);
  const consulta = usePublicacao(id);
  const perfil = useSessao((s) => s.perfil)!;
  const comentarios = useQuery({
    queryKey: ["comentarios", id],
    queryFn: () => servicos.comentarios(id),
  });
  const [texto, definirTexto] = useState("");
  const [motivo, definirMotivo] = useState("");
  const [confirmarExclusao, definirConfirmacao] = useState(false);
  const [denunciaAberta, definirDenunciando] = useState(false);
  const denunciando =
    denunciaAberta ||
    (acao === "denunciar" && consulta.data?.autorId !== perfil.id);
  const [aviso, definirAviso] = useState("");
  const comentar = useAcao(async (_: undefined) => {
    if (!texto.trim()) throw new Error("Escreva seu comentário.");
    await servicos.comentar(id, texto);
    definirTexto("");
  });
  const excluirComentario = useAcao((idComentario: string) =>
    servicos.excluirComentario(idComentario),
  );
  const denunciar = useAcao(async (_: undefined) => {
    if (motivo.trim().length < 5)
      throw new Error("Descreva o motivo com pelo menos 5 caracteres.");
    await servicos.denunciar(id, motivo.trim());
    definirAviso("Denúncia recebida. A moderação vai revisar este spot.");
    definirDenunciando(false);
    router.setParams({ acao: undefined });
  });
  const excluir = useAcao(async (_: undefined) => {
    await servicos.excluir(id);
    definirConfirmacao(false);
    if (router.canGoBack()) router.back();
    else router.replace("/perfil");
  });
  function abrirComentario() {
    campoComentario.current?.focus();
    requestAnimationFrame(() =>
      rolagem.current?.scrollToEnd({ animated: true }),
    );
  }
  useEffect(() => {
    if (!consulta.data || comentarios.isLoading || acao !== "comentar") return;
    abrirComentario();
    router.setParams({ acao: undefined });
  }, [acao, consulta.data, comentarios.isLoading]);
  return (
    <KeyboardAvoidingView
      style={estilos.tela}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={rolagem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={estilos.conteudo}
      >
        <Estado
          carregando={consulta.isLoading}
          erro={consulta.error}
          repetir={() => void consulta.refetch()}
        />
        {consulta.isError && (
          <Botao
            titulo="Voltar ao início"
            onPress={() => router.replace("/feed")}
            secundario
          />
        )}
        {consulta.data && (
          <>
            <View style={{ marginHorizontal: -20 }}>
              <CartaoPublicacao
                publicacao={consulta.data}
                detalhado
                onComentar={abrirComentario}
              />
            </View>
            <Text style={estilos.secundario}>
              {consulta.data.estado === "rejeitado"
                ? "Registro rejeitado pela moderação. Nenhum ponto foi concedido."
                : consulta.data.estado === "pendente"
                  ? "Pendente de moderação. Nenhum ponto definitivo foi concedido."
                  : "Registro aprovado. Os pontos seguem a regra do primeiro carro da coleção."}
            </Text>
            <Botao
              titulo="Ver detalhes do carro"
              onPress={() =>
                router.push({ pathname: "/carro/[id]", params: { id } })
              }
              secundario
            />
            <View style={estilos.linha}>
              {consulta.data.autorId === perfil.id && (
                <View style={{ flex: 1 }}>
                  <Botao
                    titulo="Excluir spot"
                    onPress={() => definirConfirmacao(true)}
                    secundario
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                {consulta.data.autorId !== perfil.id && (
                  <Botao
                    titulo={denunciando ? "Cancelar denúncia" : "Denunciar"}
                    onPress={() => {
                      definirDenunciando(!denunciando);
                      router.setParams({ acao: undefined });
                    }}
                    secundario
                  />
                )}
              </View>
            </View>
            {denunciando && (
              <>
                <Campo
                  titulo="Motivo da denúncia"
                  placeholder="Identificação incorreta, foto copiada..."
                  value={motivo}
                  onChangeText={definirMotivo}
                  multiline
                  maxLength={500}
                />
                <Botao
                  titulo="Enviar denúncia"
                  onPress={() => denunciar.mutate(undefined)}
                  carregando={denunciar.isPending}
                />
              </>
            )}
            {!!aviso && (
              <Text style={[estilos.texto, estilos.destaque]}>{aviso}</Text>
            )}
            <Estado erro={denunciar.error} />
            <Text style={estilos.subtitulo}>Comentários</Text>
            <Estado
              carregando={comentarios.isLoading}
              erro={comentarios.error}
              repetir={() => void comentarios.refetch()}
            />
            {comentarios.data?.map((comentario) => (
              <View key={comentario.id} style={estilos.card}>
                <View style={estilos.entre}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Ver perfil de ${comentario.usuario}`}
                    onPress={() =>
                      router.push({
                        pathname: "/usuario/[id]",
                        params: { id: comentario.autorId },
                      })
                    }
                  >
                    <Text style={[estilos.texto, estilos.destaque]}>
                      @{comentario.usuario}
                    </Text>
                  </TouchableOpacity>
                  {comentario.autorId === perfil.id && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Excluir meu comentário"
                      disabled={excluirComentario.isPending}
                      onPress={() => excluirComentario.mutate(comentario.id)}
                    >
                      <Text style={estilos.secundario}>Excluir</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={estilos.texto}>{comentario.texto}</Text>
              </View>
            ))}
            {!comentarios.isLoading && !comentarios.data?.length && (
              <Text style={estilos.secundario}>
                Comece a conversa sobre esse achado.
              </Text>
            )}
            <Campo
              referencia={campoComentario}
              titulo="Seu comentário"
              value={texto}
              onChangeText={(valor) => {
                definirTexto(valor);
                comentar.reset();
              }}
              maxLength={500}
              multiline
            />
            <Botao
              titulo="Comentar"
              onPress={() => comentar.mutate(undefined)}
              carregando={comentar.isPending}
            />
            <Estado erro={comentar.error ?? excluirComentario.error} />
          </>
        )}
        <Confirmacao
          aberta={
            confirmarExclusao ||
            (acao === "excluir" && consulta.data?.autorId === perfil.id)
          }
          titulo="Excluir este spot?"
          texto="A foto sairá das suas publicações. Os pontos e a garagem serão recalculados com os registros aprovados restantes."
          confirmar={() => excluir.mutate(undefined)}
          cancelar={() => {
            definirConfirmacao(false);
            router.setParams({ acao: undefined });
            excluir.reset();
          }}
          carregando={excluir.isPending}
          erro={excluir.error}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
