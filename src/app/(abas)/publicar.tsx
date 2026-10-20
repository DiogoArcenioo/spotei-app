import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { isAxiosError } from "axios";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RevelacaoCarro } from "@/components/RevelacaoCarro";
import { Botao } from "@/components/Botao";
import { Campo } from "@/components/Campo";
import { Estado } from "@/components/Estado";
import { FotoCarro } from "@/components/FotoCarro";
import { FotoPublicacao } from "@/components/FotoPublicacao";
import { ScanFotografia } from "@/components/ScanFotografia";
import { Filtros } from "@/components/Filtros";
import { catalogoDemo } from "@/db/dadosDemo";
import { lerLocal, salvarLocal } from "@/db/database";
import { escolherFotografia } from "@/services/fotografia";
import { servicos } from "@/services/servicos";
import { filaSincronizacao } from "@/utils/filaSincronizacao";
import { useSincronizacao } from "@/stores/useSincronizacao";
import { useSessao } from "@/stores/useSessao";
import { cores, estilos } from "@/utils/tema";
import { modoDemo, analiseSimulada } from "@/utils/configuracao";
import { mensagemErro } from "@/utils/erro";
import type {
  Enquadramento,
  Identificacao,
  NovaPublicacao,
} from "@/types/spot";
interface Rascunho {
  foto: string;
  hash: string;
  identificacao: Identificacao | null;
  marca: string;
  modelo: string;
  versao: string;
  cidade: string;
  descricao: string;
  enquadramento: Enquadramento;
}
const vazio: Rascunho = {
  foto: "",
  hash: "",
  identificacao: null,
  marca: "",
  modelo: "",
  versao: "",
  cidade: "",
  descricao: "",
  enquadramento: "inteira",
};
export default function Publicar() {
  const rolagem = useRef<ScrollView>(null);
  const analiseAtual = useRef(0);
  const { height: alturaTela } = useWindowDimensions();
  const { bottom: espacoInferior } = useSafeAreaInsets();
  const perfil = useSessao((s) => s.perfil)!;
  const consultas = useQueryClient();
  const raridades = useQuery({
    queryKey: ["raridades"],
    queryFn: () => servicos.raridades(),
  });
  const [rascunho, definirRascunho] = useState<Rascunho>(vazio);
  const [pronto, definirPronto] = useState(false);
  const [cenario, definirCenario] = useState("carro-2");
  const [direitos, definirDireitos] = useState(false);
  const [enviado, definirEnviado] = useState(false);
  const [erroFoto, definirErroFoto] = useState("");
  const [analisando, definirAnalisando] = useState(false);
  const [erroAnalise, definirErroAnalise] = useState("");
  const [mostrarDemo, definirMostrarDemo] = useState(false);
  const [corrigir, definirCorrigir] = useState(false);
  const [revelando, definirRevelando] = useState(false);
  const concluirRevelacao = useCallback(() => definirRevelando(false), []);
  const chave = `rascunho-${modoDemo ? "demo" : "real"}-${perfil.id}-${analiseSimulada ? "simulada" : "gemini"}`;
  useEffect(
    () => () => {
      analiseAtual.current++;
    },
    [],
  );
  useEffect(() => {
    let ativo = true;
    void lerLocal<Rascunho>(chave)
      .then((dados) => {
        if (ativo) {
          if (dados) definirRascunho({ ...vazio, ...dados });
          definirPronto(true);
        }
      })
      .catch((erro) => {
        if (ativo) {
          definirErroFoto(mensagemErro(erro));
          definirPronto(true);
        }
      });
    return () => {
      ativo = false;
    };
  }, [chave]);
  useEffect(() => {
    if (pronto)
      void salvarLocal(chave, rascunho).catch((erro) =>
        definirErroFoto(mensagemErro(erro)),
      );
  }, [rascunho, pronto, chave]);
  function atualizar(campo: keyof Rascunho, valor: string) {
    definirRascunho((atual) => ({ ...atual, [campo]: valor }));
    publicar.reset();
  }
  const foto = useMutation({
    mutationFn: async (camera: boolean) => {
      definirErroFoto("");
      const escolhida = await escolherFotografia(camera);
      if (escolhida) {
        definirRascunho({
          ...vazio,
          cidade: perfil.cidade,
          foto: escolhida.uri,
          hash: escolhida.hash,
        });
        definirErroAnalise("");
        definirCorrigir(false);
        definirRevelando(false);
        definirMostrarDemo(false);
        definirDireitos(false);
        definirEnviado(false);
        publicar.reset();
        void analisar(escolhida.uri, escolhida.hash);
      }
    },
  });
  async function analisar(fotografia: string, hash: string) {
    const numero = ++analiseAtual.current;
    definirAnalisando(true);
    definirErroAnalise("");
    try {
      const [identificacao] = await Promise.all([
        servicos.analisar(cenario, fotografia, hash),
        new Promise((resolver) => setTimeout(resolver, 1200)),
      ]);
      // Uma resposta atrasada não pode substituir outra foto ou uma análise cancelada.
      if (numero !== analiseAtual.current) return;
      definirRascunho((atual) => ({
        ...atual,
        identificacao,
        marca: identificacao.marca,
        modelo: identificacao.modelo,
        versao: identificacao.versao ?? "",
      }));
      definirMostrarDemo(false);
      definirRevelando(true);
    } catch (erro) {
      if (numero === analiseAtual.current)
        definirErroAnalise(mensagemErro(erro));
    } finally {
      if (numero === analiseAtual.current) definirAnalisando(false);
    }
  }
  function cancelarAnalise() {
    analiseAtual.current++;
    definirAnalisando(false);
  }
  const publicar = useMutation({
    mutationFn: async () => {
      definirEnviado(true);
      if (!rascunho.marca.trim() || !rascunho.modelo.trim())
        definirCorrigir(true);
      if (
        !rascunho.identificacao ||
        !rascunho.marca.trim() ||
        !rascunho.modelo.trim() ||
        !rascunho.descricao.trim() ||
        !direitos
      )
        throw new Error(
          "Confira a identificação, a legenda e confirme o direito de uso da foto.",
        );
      const nova: NovaPublicacao = {
        id: randomUUID(),
        foto: rascunho.foto,
        identificacao: rascunho.identificacao,
        marca: rascunho.marca.trim(),
        modelo: rascunho.modelo.trim(),
        versao: rascunho.versao.trim(),
        cidade: rascunho.cidade.trim(),
        descricao: rascunho.descricao.trim(),
        enquadramento: rascunho.enquadramento,
      };
      try {
        return await servicos.publicar(nova);
      } catch (erro) {
        if (!modoDemo && isAxiosError(erro) && !erro.response) {
          await filaSincronizacao.incluir(nova);
          await useSincronizacao.getState().atualizarPendencias();
          return null;
        }
        throw erro;
      }
    },
    onSuccess: async () => {
      definirRascunho(vazio);
      definirDireitos(false);
      definirEnviado(false);
      definirErroAnalise("");
      await salvarLocal(chave, vazio);
      await consultas.invalidateQueries();
      router.navigate("/perfil");
    },
  });
  const ocupada =
    foto.isPending || analisando || revelando || publicar.isPending;
  // Retomar o rascunho também retoma a etapa em que a pessoa parou.
  const etapa = !rascunho.foto ? 1 : !rascunho.identificacao ? 2 : 3;
  useEffect(() => {
    rolagem.current?.scrollTo({ y: 0, animated: false });
  }, [etapa]);

  function descartar() {
    definirRascunho(vazio);
    definirDireitos(false);
    definirEnviado(false);
    definirCorrigir(false);
    definirRevelando(false);
    definirMostrarDemo(false);
    cancelarAnalise();
    definirErroAnalise("");
    publicar.reset();
    foto.reset();
    definirErroFoto("");
  }

  if (!pronto) {
    return (
      <View style={estilos.tela}>
        <Text style={[visual.titulo, { padding: 20 }]}>Novo spot</Text>
        <Estado carregando />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={estilos.tela}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[visual.cabecalho, revelando && { opacity: 0 }]}
        pointerEvents={revelando ? "none" : "auto"}
        accessibilityElementsHidden={revelando}
        importantForAccessibility={revelando ? "no-hide-descendants" : "auto"}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Voltar ao início"
          onPress={() => router.navigate("/feed")}
          style={visual.icone}
          disabled={publicar.isPending}
        >
          <Ionicons name="chevron-back" size={25} color={cores.texto} />
        </TouchableOpacity>
        <Text style={visual.tituloCabecalho}>Novo spot</Text>
        {!!rascunho.foto ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Descartar rascunho"
            onPress={descartar}
            style={visual.icone}
            disabled={ocupada}
          >
            <Ionicons name="close-outline" size={25} color={cores.secundario} />
          </TouchableOpacity>
        ) : (
          <View style={visual.icone} />
        )}
      </View>
      <ScrollView
        ref={rolagem}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!revelando}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={visual.conteudo}
      >
        {etapa !== 3 && (
          <>
            <View
              style={visual.etapas}
              accessibilityLabel={`Etapa ${etapa} de 3`}
            >
              {["Foto", "Scan", "Conferir"].map((titulo, indice) => (
                <View key={titulo} style={visual.etapa}>
                  <View
                    style={[
                      visual.indicador,
                      etapa >= indice + 1 && {
                        backgroundColor: cores.destaque,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      visual.rotulo,
                      etapa === indice + 1 && { color: cores.texto },
                    ]}
                  >
                    {indice + 1}. {titulo}
                  </Text>
                </View>
              ))}
            </View>
            <View style={estilos.entre}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={visual.titulo}>
                  {etapa === 1 ? "Comece pela foto" : "Análise da foto"}
                </Text>
                <Text style={estilos.secundario}>
                  {etapa === 1
                    ? "Encontrou um carro interessante? Registre."
                    : "Retome a análise ou escolha outra foto."}
                </Text>
              </View>
            </View>
          </>
        )}

        {!rascunho.foto ? (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Abrir câmera"
              disabled={ocupada}
              onPress={() => foto.mutate(true)}
              style={[visual.camera, alturaTela < 740 && { minHeight: 180 }]}
            >
              <View style={visual.lente}>
                <Ionicons
                  name="camera-outline"
                  size={42}
                  color={cores.destaque}
                />
              </View>
              <Text style={visual.cameraTitulo}>O próximo spot é seu</Text>
              <Text style={visual.legendaCamera}>
                Toque para abrir a câmera
              </Text>
            </TouchableOpacity>
            <Botao
              titulo="Fotografar"
              icone="camera-outline"
              onPress={() => foto.mutate(true)}
              carregando={foto.isPending && foto.variables === true}
              desabilitado={ocupada}
            />
            <Botao
              titulo="Galeria"
              icone="images-outline"
              onPress={() => foto.mutate(false)}
              carregando={foto.isPending && foto.variables === false}
              desabilitado={ocupada}
              secundario
            />
            <Text style={visual.dica}>
              Enquadre o carro inteiro e procure uma boa iluminação.
              {!analiseSimulada && " A foto será analisada pelo Google Gemini."}
            </Text>
          </>
        ) : etapa === 2 ? (
          <>
            <View style={visual.previa}>
              <FotoCarro
                foto={rascunho.foto}
                contentFit="contain"
                style={{ width: "100%", aspectRatio: 4 / 3 }}
              />
            </View>
            <View style={[estilos.linha, { gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <Botao
                  titulo="Fotografar"
                  icone="camera-outline"
                  onPress={() => foto.mutate(true)}
                  desabilitado={ocupada}
                  secundario
                  compacto
                />
              </View>
              <View style={{ flex: 1 }}>
                <Botao
                  titulo="Galeria"
                  icone="images-outline"
                  onPress={() => foto.mutate(false)}
                  desabilitado={ocupada}
                  secundario
                  compacto
                />
              </View>
            </View>
          </>
        ) : null}

        <Estado
          erro={foto.error ?? (erroFoto || undefined)}
          carregando={foto.isPending}
        />

        {analiseSimulada && etapa !== 3 && (
          <View style={visual.demonstracao}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Opções da demonstração"
              accessibilityState={{ expanded: mostrarDemo }}
              onPress={() => definirMostrarDemo(!mostrarDemo)}
              disabled={ocupada}
              style={visual.demoCabecalho}
            >
              <Ionicons
                name="flask-outline"
                size={17}
                color={cores.secundario}
              />
              <Text style={[visual.rotulo, { flex: 1 }]}>
                Modo demo · análise simulada
              </Text>
              <Ionicons
                name={mostrarDemo ? "chevron-up" : "chevron-down"}
                size={16}
                color={cores.secundario}
              />
            </TouchableOpacity>
            {mostrarDemo && (
              <View style={visual.demoConteudo}>
                <Text style={estilos.secundario}>
                  Escolha um resultado de teste. A demonstração não reconhece o
                  conteúdo da foto.
                </Text>
                <Filtros
                  opcoes={catalogoDemo.map((c) => ({
                    valor: c.id,
                    titulo: `${c.marca} ${c.modelo}`,
                  }))}
                  valor={cenario}
                  selecionar={(valor) => {
                    definirCenario(valor);
                    definirRascunho((atual) => ({
                      ...atual,
                      identificacao: null,
                    }));
                    definirErroAnalise("");
                    publicar.reset();
                    definirDireitos(false);
                    definirEnviado(false);
                  }}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Usar foto de teste"
                  disabled={ocupada}
                  style={{ minHeight: 44, justifyContent: "center" }}
                  onPress={() => {
                    definirRascunho({
                      ...vazio,
                      foto: "amostra:2",
                      hash: "foto-teste-bmw",
                      cidade: perfil.cidade,
                    });
                    definirErroAnalise("");
                    definirDireitos(false);
                    definirEnviado(false);
                    definirCorrigir(false);
                    definirMostrarDemo(false);
                    definirErroFoto("");
                    publicar.reset();
                    void analisar("amostra:2", "foto-teste-bmw");
                  }}
                >
                  <Text style={[estilos.texto, estilos.destaque]}>
                    Usar foto de teste →
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <Estado erro={erroAnalise || undefined} />
        {rascunho.identificacao && (
          <RevelacaoCarro
            nome={`${rascunho.marca} ${rascunho.modelo}`}
            raridade={rascunho.identificacao.raridade}
            pontos={raridades.data?.[rascunho.identificacao.raridade]}
            animar={revelando}
            aoConcluir={concluirRevelacao}
          >
            <View style={visual.fotoResultado}>
              <FotoPublicacao
                foto={rascunho.foto}
                enquadramento={rascunho.enquadramento}
                desabilitado={ocupada}
                ajustar={() => {
                  definirRascunho((atual) => ({
                    ...atual,
                    enquadramento:
                      atual.enquadramento === "inteira"
                        ? "preencher"
                        : "inteira",
                  }));
                  publicar.reset();
                }}
              />
            </View>
            <View style={visual.dados}>
              <View style={estilos.entre}>
                <Text style={visual.subtitulo}>Informações</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Corrigir identificação"
                  accessibilityState={{ expanded: corrigir }}
                  onPress={() => definirCorrigir(!corrigir)}
                  style={visual.editar}
                >
                  <Ionicons
                    name={corrigir ? "chevron-up" : "create-outline"}
                    size={17}
                    color={cores.destaque}
                  />
                  <Text style={visual.link}>
                    {corrigir ? "Fechar" : "Editar"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={visual.gradeDados}>
                {[
                  ["Versão", rascunho.versao],
                  ["Ano", rascunho.identificacao.ano],
                  ["Geração", rascunho.identificacao.geracao],
                ]
                  .filter(([, valor]) => !!valor)
                  .map(([titulo, valor]) => (
                    <View key={String(titulo)} style={visual.dado}>
                      <Text style={visual.rotulo}>{titulo}</Text>
                      <Text style={visual.valorDado}>{valor}</Text>
                    </View>
                  ))}
              </View>
              {!!rascunho.identificacao.caracteristicas.length && (
                <Text style={visual.caracteristicas} numberOfLines={2}>
                  {rascunho.identificacao.caracteristicas
                    .slice(0, 3)
                    .join(" · ")}
                </Text>
              )}
              {rascunho.identificacao.simulada && (
                <Text style={visual.rotulo}>Resultado simulado</Text>
              )}
            </View>
            {corrigir && (
              <View style={{ gap: 14 }}>
                {(rascunho.identificacao.candidatos?.length ?? 0) > 1 && (
                  <>
                    <Text style={visual.rotulo}>Carros na foto</Text>
                    <Filtros
                      opcoes={rascunho.identificacao.candidatos!.map((c) => ({
                        valor: c.identificacaoId,
                        titulo: `${c.marca} ${c.modelo}`,
                      }))}
                      valor={rascunho.identificacao.identificacaoId}
                      selecionar={(valor) => {
                        const candidatos = rascunho.identificacao!.candidatos!;
                        const escolhido = candidatos.find(
                          (c) => c.identificacaoId === valor,
                        )!;
                        definirRascunho((atual) => ({
                          ...atual,
                          identificacao: { ...escolhido, candidatos },
                          marca: escolhido.marca,
                          modelo: escolhido.modelo,
                          versao: escolhido.versao ?? "",
                        }));
                        definirDireitos(false);
                        definirEnviado(false);
                        publicar.reset();
                      }}
                    />
                  </>
                )}

                <Campo
                  titulo="Marca"
                  value={rascunho.marca}
                  onChangeText={(texto) => atualizar("marca", texto)}
                  maxLength={60}
                  erro={
                    enviado && !rascunho.marca.trim()
                      ? "Informe a marca."
                      : undefined
                  }
                />
                <Campo
                  titulo="Modelo"
                  value={rascunho.modelo}
                  onChangeText={(texto) => atualizar("modelo", texto)}
                  maxLength={80}
                  erro={
                    enviado && !rascunho.modelo.trim()
                      ? "Informe o modelo."
                      : undefined
                  }
                />
                <Campo
                  titulo="Versão (opcional)"
                  value={rascunho.versao}
                  onChangeText={(texto) => atualizar("versao", texto)}
                  maxLength={80}
                  placeholder="Deixe vazia se não puder confirmar"
                />
                <Campo
                  titulo="Cidade (opcional)"
                  value={rascunho.cidade}
                  onChangeText={(texto) => atualizar("cidade", texto)}
                  maxLength={80}
                  placeholder="Ex.: Criciúma, SC"
                />
              </View>
            )}
            <Campo
              titulo="Legenda"
              value={rascunho.descricao}
              onChangeText={(texto) => atualizar("descricao", texto)}
              maxLength={500}
              multiline
              placeholder="Sobre esse spot…"
              style={{ minHeight: 68 }}
              erro={
                enviado && !rascunho.descricao.trim()
                  ? "Escreva uma legenda."
                  : undefined
              }
            />
            <View style={visual.direitos}>
              <Switch
                accessibilityLabel="Confirmar direito de uso da foto"
                value={direitos}
                onValueChange={(valor) => {
                  definirDireitos(valor);
                  publicar.reset();
                }}
                trackColor={{ true: cores.destaque, false: cores.borda }}
              />
              <Text style={[visual.rotulo, { flex: 1 }]}>
                Conferi os dados e posso usar esta foto.
              </Text>
            </View>
            {enviado && !direitos && (
              <Text style={estilos.erro}>
                Confirme o direito de uso da foto.
              </Text>
            )}
          </RevelacaoCarro>
        )}
      </ScrollView>
      {!!rascunho.foto && !revelando && (
        <View
          style={[
            visual.rodape,
            { paddingBottom: Math.max(12, espacoInferior) },
          ]}
        >
          {publicar.error && (
            <Text accessibilityLiveRegion="polite" style={estilos.erro}>
              {mensagemErro(publicar.error)}
            </Text>
          )}
          {etapa === 2 ? (
            <Botao
              titulo={
                erroAnalise ? "Tentar análise novamente" : "Analisar foto"
              }
              icone="scan-outline"
              onPress={() => void analisar(rascunho.foto, rascunho.hash)}
              carregando={analisando}
              desabilitado={ocupada}
            />
          ) : (
            <Botao
              titulo="Salvar e publicar"
              icone="arrow-up-outline"
              onPress={() => publicar.mutate()}
              carregando={publicar.isPending}
              desabilitado={ocupada}
            />
          )}
        </View>
      )}
      {analisando && (
        <ScanFotografia foto={rascunho.foto} cancelar={cancelarAnalise} />
      )}
    </KeyboardAvoidingView>
  );
}

const visual = StyleSheet.create({
  conteudo: { padding: 20, gap: 14, paddingBottom: 24 },
  cabecalho: {
    height: 60,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tituloCabecalho: { fontSize: 15, fontWeight: "600", color: cores.texto },
  fotoResultado: {
    marginHorizontal: -20,
  },
  dados: { gap: 12 },
  subtitulo: { color: cores.texto, fontSize: 14, fontWeight: "600" },
  editar: {
    minHeight: 36,
    paddingLeft: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  gradeDados: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  dado: { minWidth: 66, gap: 4, flexShrink: 1 },
  valorDado: { color: cores.texto, fontSize: 14, fontWeight: "600" },
  caracteristicas: { color: cores.secundario, fontSize: 12, lineHeight: 18 },
  titulo: {
    color: cores.texto,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  etapas: { flexDirection: "row", gap: 8, marginBottom: 8 },
  etapa: { flex: 1, gap: 8 },
  indicador: { height: 2, backgroundColor: cores.borda, borderRadius: 2 },
  rotulo: { color: cores.secundario, fontSize: 12, lineHeight: 18 },
  icone: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    minHeight: 224,
    borderRadius: 16,
    backgroundColor: cores.superficie,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  lente: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#18E7FF0C",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraTitulo: { color: cores.texto, fontWeight: "600", fontSize: 17 },
  legendaCamera: { color: cores.secundario, fontSize: 12 },
  dica: {
    color: cores.secundario,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  previa: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: cores.superficie,
  },
  demonstracao: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    marginTop: 4,
  },
  demoCabecalho: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demoConteudo: { gap: 12, paddingBottom: 4 },
  link: { color: cores.destaque, fontSize: 13, fontWeight: "600" },
  direitos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  rodape: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: cores.fundo,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    gap: 8,
  },
});
