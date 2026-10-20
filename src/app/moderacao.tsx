import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { servicos } from "@/services/servicos";
import { useSessao } from "@/stores/useSessao";
import { useAcao } from "@/hooks/usePublicacoes";
import { FotoCarro } from "@/components/FotoCarro";
import { Campo } from "@/components/Campo";
import { Estado } from "@/components/Estado";
import { Botao } from "@/components/Botao";
import { Filtros } from "@/components/Filtros";
import { Confirmacao } from "@/components/Confirmacao";
import { Raridade as SeloRaridade } from "@/components/Raridade";
import { nomesRaridade } from "@/utils/pontuacao";
import { estilos } from "@/utils/tema";
import type { Publicacao, Carro, Raridade } from "@/types/spot";
function Revisao({ publicacao }: { publicacao: Publicacao }) {
  const [marca, definirMarca] = useState(publicacao.carro.marca);
  const [modelo, definirModelo] = useState(publicacao.carro.modelo);
  const [versao, definirVersao] = useState(publicacao.carro.versao ?? "");
  const moderar = useAcao(async (aprovado: boolean) => {
    if (aprovado && (!marca.trim() || !modelo.trim()))
      throw new Error("Informe a marca e o modelo antes de aprovar.");
    await servicos.moderar(
      publicacao.id,
      aprovado,
      aprovado ? marca : undefined,
      aprovado ? modelo : undefined,
      aprovado ? versao : undefined,
    );
  });
  return (
    <View style={estilos.card}>
      <FotoCarro
        foto={publicacao.foto}
        style={{ width: "100%", aspectRatio: 1.5, borderRadius: 12 }}
      />
      <Text style={estilos.subtitulo}>@{publicacao.autor.usuario}</Text>
      <SeloRaridade valor={publicacao.carro.raridade} />
      <Campo
        titulo="Marca"
        value={marca}
        onChangeText={definirMarca}
        maxLength={60}
      />
      <Campo
        titulo="Modelo"
        value={modelo}
        onChangeText={definirModelo}
        maxLength={80}
      />
      <Campo
        titulo="Versão"
        value={versao}
        onChangeText={definirVersao}
        maxLength={80}
      />
      <Text style={estilos.secundario}>{publicacao.carro.justificativa}</Text>
      <View style={estilos.linha}>
        <View style={{ flex: 1 }}>
          <Botao
            titulo="Aprovar"
            onPress={() => moderar.mutate(true)}
            carregando={moderar.isPending}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Botao
            titulo="Rejeitar"
            onPress={() => moderar.mutate(false)}
            secundario
            desabilitado={moderar.isPending}
          />
        </View>
      </View>
      <Estado erro={moderar.error} />
    </View>
  );
}
function EditarCatalogo({ carro }: { carro: Carro }) {
  const [raridade, definirRaridade] = useState(carro.raridade);
  const salvar = useAcao((valor: Raridade) =>
    servicos.editarRaridade(carro.id, valor),
  );
  return (
    <View style={estilos.card}>
      <Text style={estilos.texto}>
        {carro.marca} {carro.modelo} {carro.versao ?? ""}
      </Text>
      <Filtros
        opcoes={Object.entries(nomesRaridade).map(([valor, titulo]) => ({
          valor,
          titulo,
        }))}
        valor={raridade}
        selecionar={(valor) => {
          definirRaridade(valor as Raridade);
          salvar.reset();
        }}
      />
      <Botao
        titulo="Salvar raridade"
        onPress={() => salvar.mutate(raridade)}
        carregando={salvar.isPending}
        desabilitado={raridade === carro.raridade}
        secundario
      />
      <Estado erro={salvar.error} />
      {salvar.isSuccess && (
        <Text accessibilityLiveRegion="polite" style={estilos.destaque}>
          Raridade salva.
        </Text>
      )}
    </View>
  );
}
export default function Moderacao() {
  const admin = useSessao((s) => s.perfil?.administrador);
  const [aba, definirAba] = useState("pendentes");
  const [registroInvalidar, definirRegistroInvalidar] = useState<string | null>(
    null,
  );
  const consulta = useQuery({
    queryKey: ["moderacao"],
    queryFn: () => servicos.moderacao(),
    enabled: !!admin,
  });
  const invalidar = useAcao(async (id: string) => {
    await servicos.moderar(id, false);
    definirRegistroInvalidar(null);
  });
  const arquivar = useAcao((id: string) => servicos.resolverDenuncia(id));
  if (!admin)
    return (
      <View style={estilos.conteudo}>
        <Estado vazio="Acesso restrito à moderação." />
        <Botao
          titulo="Voltar ao início"
          onPress={() => router.replace("/feed")}
          secundario
        />
      </View>
    );
  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Text style={estilos.titulo}>Uma comunidade justa.</Text>
      <Text style={estilos.secundario}>
        Confirme a identificação e a raridade antes de aprovar pontos.
      </Text>
      <Filtros
        valor={aba}
        selecionar={definirAba}
        opcoes={[
          { valor: "pendentes", titulo: "Pendentes" },
          { valor: "denuncias", titulo: "Denúncias" },
          { valor: "catalogo", titulo: "Catálogo" },
          { valor: "historico", titulo: "Pontos" },
        ]}
      />
      <Estado
        carregando={consulta.isLoading}
        erro={consulta.error ?? arquivar.error}
        repetir={() => void consulta.refetch()}
      />
      {aba === "pendentes" && (
        <>
          {consulta.data?.pendentes.map((p) => (
            <Revisao key={p.id} publicacao={p} />
          ))}
          {consulta.data && !consulta.data.pendentes.length && (
            <Estado vazio="Nenhum registro pendente." />
          )}
        </>
      )}
      {aba === "denuncias" && (
        <>
          {consulta.data?.denuncias.map((d) => (
            <View key={d.id} style={estilos.card}>
              <Text style={estilos.texto}>{d.motivo}</Text>
              <Botao
                titulo="Ver publicação"
                onPress={() =>
                  router.push({
                    pathname: "/publicacao/[id]",
                    params: { id: d.publicacaoId },
                  })
                }
                secundario
              />
              <Botao
                titulo={
                  d.estadoPublicacao === "rejeitado"
                    ? "Registro invalidado"
                    : "Invalidar registro"
                }
                onPress={() => {
                  invalidar.reset();
                  definirRegistroInvalidar(d.publicacaoId);
                }}
                desabilitado={
                  d.estadoPublicacao === "rejeitado" || invalidar.isPending
                }
              />
              <Botao
                titulo="Arquivar denúncia"
                onPress={() => arquivar.mutate(d.id)}
                carregando={arquivar.isPending}
                secundario
              />
            </View>
          ))}
          {consulta.data && !consulta.data.denuncias.length && (
            <Estado vazio="Nenhuma denúncia recebida." />
          )}
        </>
      )}
      <Confirmacao
        aberta={!!registroInvalidar}
        titulo="Invalidar este registro?"
        texto="A publicação será rejeitada e seus pontos serão recalculados."
        confirmar={() =>
          registroInvalidar && invalidar.mutate(registroInvalidar)
        }
        cancelar={() => definirRegistroInvalidar(null)}
        carregando={invalidar.isPending}
        erro={invalidar.error}
      />
      {aba === "catalogo" &&
        consulta.data?.catalogo.map((c) => (
          <EditarCatalogo key={c.id} carro={c} />
        ))}
      {aba === "historico" && (
        <>
          {consulta.data?.movimentos.map((m) => (
            <View key={m.id} style={estilos.card}>
              <Text style={[estilos.subtitulo, estilos.destaque]}>
                {m.pontos > 0 ? "+" : ""}
                {m.pontos} pontos
              </Text>
              <Text style={estilos.texto}>{m.motivo}</Text>
              <Text style={estilos.secundario}>
                {m.usuarioId} · {new Date(m.criadoEm).toLocaleString("pt-BR")}
              </Text>
            </View>
          ))}
          {consulta.data && !consulta.data.movimentos.length && (
            <Estado vazio="Nenhuma movimentação após os dados iniciais." />
          )}
        </>
      )}
    </ScrollView>
  );
}
