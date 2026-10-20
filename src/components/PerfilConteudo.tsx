import { useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  useAcao,
  usePerfil,
  usePublicacoesPerfil,
} from "@/hooks/usePublicacoes";
import { servicos } from "@/services/servicos";
import { useSessao } from "@/stores/useSessao";
import { Avatar } from "./Avatar";
import { Botao } from "./Botao";
import { Estado } from "./Estado";
import { FotoCarro } from "./FotoCarro";
import { ListaConexoes } from "./ListaConexoes";
import {
  calcularNivel,
  obterConquistas,
  obterGaragem,
} from "@/utils/pontuacao";
import { cores, estilos } from "@/utils/tema";
import { filaSincronizacao } from "@/utils/filaSincronizacao";
import { modoDemo } from "@/utils/configuracao";

export function PerfilConteudo({ id }: { id: string }) {
  const rolagem = useRef<ScrollView>(null);
  const [inicioGrade, definirInicioGrade] = useState(0);
  const [listaAberta, definirListaAberta] = useState<string | null>(null);
  const [aba, definirAba] = useState("spots");
  const [mostrarOpcoes, definirMostrarOpcoes] = useState(false);
  const proprio = useSessao((s) => s.perfil?.id) === id;
  const perfil = usePerfil(id);
  const spots = usePublicacoesPerfil(id);
  const seguindo = useQuery({
    queryKey: ["seguindo", id],
    queryFn: () => servicos.seguindo(),
  });
  const fila = useQuery({
    queryKey: ["fila", id],
    queryFn: () => filaSincronizacao.getPendencias(),
    enabled: proprio && !modoDemo,
  });
  const seguir = useAcao((id: string) => servicos.seguir(id));
  const sair = useAcao(async (_valor: undefined) => {
    await servicos.sair();
  });
  const publicacoes = spots.data ?? [];
  const garagem = obterGaragem(publicacoes, id);
  const conquistas = obterConquistas(publicacoes, id);
  const nivel = calcularNivel(perfil.data?.pontos ?? 0);
  const seguido = seguindo.data?.some(
    (s) => s.seguidor === useSessao.getState().perfil?.id && s.seguido === id,
  );
  return (
    <>
      <ScrollView
        ref={rolagem}
        contentContainerStyle={visual.pagina}
        showsVerticalScrollIndicator={false}
      >
        <Estado
          carregando={perfil.isLoading}
          erro={perfil.error ?? spots.error ?? seguindo.error}
          repetir={() => {
            void perfil.refetch();
            void spots.refetch();
            void seguindo.refetch();
          }}
        />
        {perfil.isError && (
          <Botao
            titulo="Voltar ao início"
            onPress={() => router.replace("/feed")}
            secundario
          />
        )}
        {perfil.data && (
          <>
            <View style={visual.resumo}>
              <View style={estilos.entre}>
                <Text numberOfLines={1} style={visual.usuario}>
                  @{perfil.data.usuario}
                </Text>
                {proprio && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Opções do perfil"
                    accessibilityState={{ expanded: mostrarOpcoes }}
                    onPress={() => definirMostrarOpcoes(!mostrarOpcoes)}
                    style={visual.icone}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={23}
                      color={cores.texto}
                    />
                  </TouchableOpacity>
                )}
              </View>
              {proprio && mostrarOpcoes && (
                <View style={visual.opcoes}>
                  <Botao
                    titulo="Privacidade e conta"
                    icone="shield-checkmark-outline"
                    onPress={() => router.push("/privacidade")}
                    secundario
                    compacto
                  />
                  {perfil.data.administrador && (
                    <Botao
                      titulo="Abrir moderação"
                      icone="construct-outline"
                      onPress={() => router.push("/moderacao")}
                      secundario
                      compacto
                    />
                  )}
                  <Botao
                    titulo="Sair da conta"
                    icone="log-out-outline"
                    onPress={() => sair.mutate(undefined)}
                    carregando={sair.isPending}
                    secundario
                    compacto
                  />
                  <Estado erro={sair.error} />
                </View>
              )}
              <View style={visual.identidade}>
                <Avatar
                  nome={perfil.data.nome}
                  foto={perfil.data.avatar}
                  tamanho={76}
                />
                <View style={visual.contadores}>
                  {[
                    { valor: publicacoes.length, nome: "spots" },
                    {
                      valor:
                        seguindo.data?.filter((s) => s.seguido === id).length ??
                        0,
                      nome: "seguidores",
                    },
                    {
                      valor:
                        seguindo.data?.filter((s) => s.seguidor === id)
                          .length ?? 0,
                      nome: "seguindo",
                    },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.nome}
                      style={[visual.contador, { minHeight: 44 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver ${item.nome} do perfil`}
                      onPress={() => {
                        if (item.nome === "spots") {
                          definirAba("spots");
                          rolagem.current?.scrollTo({
                            y: inicioGrade,
                            animated: true,
                          });
                        } else definirListaAberta(item.nome);
                      }}
                    >
                      <Text style={visual.numero}>{item.valor}</Text>
                      <Text style={visual.rotulo}>{item.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={visual.nome}>{perfil.data.nome}</Text>
                <Text style={visual.biografia}>
                  {perfil.data.bio ||
                    "Uma coleção de encontros sobre quatro rodas."}
                </Text>
                {!!perfil.data.cidade && (
                  <View style={[estilos.linha, { gap: 4 }]}>
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color={cores.secundario}
                    />
                    <Text style={visual.rotulo}>{perfil.data.cidade}</Text>
                  </View>
                )}
              </View>
              {proprio ? (
                <View style={[estilos.linha, { gap: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Botao
                      titulo="Editar perfil"
                      onPress={() => router.push("/editar-perfil")}
                      secundario
                      compacto
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Botao
                      titulo="Minha garagem"
                      onPress={() => router.push("/garagem")}
                      secundario
                      compacto
                    />
                  </View>
                </View>
              ) : (
                <Botao
                  titulo={seguido ? "Deixar de seguir" : "Seguir spotter"}
                  onPress={() => seguir.mutate(id)}
                  carregando={seguir.isPending}
                  secundario={seguido}
                  compacto
                />
              )}
              <Estado erro={seguir.error} />
              <View style={visual.nivel}>
                <View style={estilos.entre}>
                  <Text style={visual.rotulo}>
                    Nível {nivel.nivel} · {garagem.length} carros na coleção
                  </Text>
                  <Text style={visual.pontos}>{perfil.data.pontos} pts</Text>
                </View>
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel="Progresso do nível"
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: Math.round(nivel.progresso * 100),
                  }}
                  style={visual.trilho}
                >
                  <View
                    style={[
                      visual.progresso,
                      { width: `${nivel.progresso * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
            <View
              style={visual.abas}
              onLayout={(evento) =>
                definirInicioGrade(evento.nativeEvent.layout.y)
              }
            >
              {[
                {
                  valor: "spots",
                  titulo: proprio ? "Meus spots" : "Spots",
                  icone: "grid-outline" as const,
                },
                {
                  valor: "conquistas",
                  titulo: "Conquistas",
                  icone: "ribbon-outline" as const,
                },
              ].map((item) => (
                <TouchableOpacity
                  key={item.valor}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${item.valor}`}
                  accessibilityState={{ selected: aba === item.valor }}
                  onPress={() => definirAba(item.valor)}
                  style={[visual.aba, aba === item.valor && visual.abaAtiva]}
                >
                  <Ionicons
                    name={item.icone}
                    size={18}
                    color={aba === item.valor ? cores.texto : cores.secundario}
                  />
                  <Text
                    style={[
                      visual.rotulo,
                      aba === item.valor && {
                        color: cores.texto,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {item.titulo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {aba === "spots" ? (
              <>
                <Estado carregando={spots.isLoading} erro={fila.error} />
                {fila.data?.map((p) => (
                  <View key={p.id} style={visual.pendente}>
                    <FotoCarro
                      foto={p.foto}
                      style={{ width: 56, height: 56, borderRadius: 8 }}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={estilos.texto}>
                        {p.marca} {p.modelo}
                      </Text>
                      <Text style={visual.rotulo}>
                        Aguardando sincronização · 0 pontos definitivos
                      </Text>
                    </View>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={20}
                      color={cores.destaque}
                    />
                  </View>
                ))}
                {!spots.isLoading && !publicacoes.length && (
                  <View style={visual.vazio}>
                    <Ionicons
                      name="camera-outline"
                      size={38}
                      color={cores.secundario}
                    />
                    <Text style={visual.nome}>
                      Sua história começa com um spot
                    </Text>
                    <Text style={[estilos.secundario, { textAlign: "center" }]}>
                      {proprio
                        ? "Registre um carro e comece sua coleção."
                        : "Este spotter ainda não publicou fotos."}
                    </Text>
                    {proprio && (
                      <Botao
                        titulo="Criar primeiro spot"
                        onPress={() => router.navigate("/publicar")}
                      />
                    )}
                  </View>
                )}
                <View style={visual.grade}>
                  {publicacoes.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir spot ${p.carro.marca} ${p.carro.modelo}`}
                      onPress={() =>
                        router.push({
                          pathname: "/publicacao/[id]",
                          params: { id: p.id },
                        })
                      }
                      style={visual.miniatura}
                    >
                      <FotoCarro foto={p.foto} style={visual.foto} />
                      {p.estado !== "aprovado" && (
                        <View style={visual.revisao}>
                          <Text style={visual.revisaoTexto}>
                            {p.estado === "rejeitado"
                              ? "Rejeitado · 0 pontos"
                              : "Em revisão · 0 pontos"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <View style={estilos.conteudo}>
                <View style={estilos.entre}>
                  <Text style={estilos.subtitulo}>
                    {proprio ? "Suas conquistas" : "Conquistas"}
                  </Text>
                  <Text style={estilos.secundario}>
                    {conquistas.filter((c) => c.obtida).length}/
                    {conquistas.length}
                  </Text>
                </View>
                <Text style={estilos.secundario}>
                  Próximo nível: {nivel.proximaMeta} pontos.
                </Text>
                <View style={estilos.grade}>
                  {conquistas.map((conquista) => (
                    <View
                      key={conquista.nome}
                      style={[
                        visual.conquista,
                        !conquista.obtida && { opacity: 0.6 },
                      ]}
                    >
                      <Ionicons
                        name={
                          conquista.obtida ? "ribbon" : "lock-closed-outline"
                        }
                        size={22}
                        color={
                          conquista.obtida ? cores.destaque : cores.secundario
                        }
                      />
                      <Text style={visual.conquistaNome}>{conquista.nome}</Text>
                      <Text style={visual.rotulo}>{conquista.descricao}</Text>
                    </View>
                  ))}
                </View>
                <Text style={estilos.secundario}>
                  Na comunidade desde{" "}
                  {new Date(perfil.data.criadoEm).toLocaleDateString("pt-BR")}.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <ListaConexoes
        key={`${id}-${listaAberta ?? "fechada"}`}
        aberta={!!listaAberta}
        titulo={listaAberta === "seguidores" ? "Seguidores" : "Seguindo"}
        ids={(seguindo.data ?? [])
          .filter((s) =>
            listaAberta === "seguidores" ? s.seguido === id : s.seguidor === id,
          )
          .map((s) => (listaAberta === "seguidores" ? s.seguidor : s.seguido))}
        fechar={() => definirListaAberta(null)}
      />
    </>
  );
}

const visual = StyleSheet.create({
  pagina: { paddingBottom: 24 },
  resumo: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 8, gap: 14 },
  usuario: { color: cores.texto, fontSize: 16, fontWeight: "700", flex: 1 },
  icone: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  opcoes: { gap: 8, paddingBottom: 8 },
  identidade: { flexDirection: "row", alignItems: "center", gap: 18 },
  contadores: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  contador: { flex: 1, alignItems: "center", gap: 3 },
  numero: { color: cores.texto, fontSize: 19, fontWeight: "700" },
  rotulo: { color: cores.secundario, fontSize: 12, lineHeight: 18 },
  nome: { color: cores.texto, fontSize: 16, fontWeight: "700" },
  biografia: { color: cores.texto, fontSize: 13, lineHeight: 20 },
  nivel: { gap: 8, paddingTop: 2 },
  pontos: { color: cores.destaque, fontSize: 12, fontWeight: "700" },
  trilho: {
    height: 3,
    backgroundColor: cores.borda,
    borderRadius: 2,
    overflow: "hidden",
  },
  progresso: { height: 3, backgroundColor: cores.destaque },
  abas: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: cores.borda,
  },
  aba: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  abaAtiva: { borderBottomColor: cores.destaque },
  grade: { flexDirection: "row", flexWrap: "wrap" },
  miniatura: { width: "33.333333%", aspectRatio: 1, padding: 1 },
  foto: { width: "100%", height: "100%", backgroundColor: cores.superficie },
  revisao: {
    position: "absolute",
    bottom: 1,
    left: 1,
    right: 1,
    backgroundColor: "#050510D9",
    padding: 5,
  },
  revisaoTexto: { color: cores.texto, fontSize: 9, textAlign: "center" },
  pendente: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  vazio: { alignItems: "center", padding: 28, gap: 12 },
  conquista: {
    width: "48%",
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  conquistaNome: { color: cores.texto, fontSize: 13, fontWeight: "600" },
});
