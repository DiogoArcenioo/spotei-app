import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  obterPaginaFeed,
  obterPublicacoesPerfil,
  servicos,
} from "@/services/servicos";
import { useSessao } from "@/stores/useSessao";
export function usePublicacoes() {
  const id = useSessao((s) => s.perfil?.id);
  return useInfiniteQuery({
    queryKey: ["publicacoes", id],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => obterPaginaFeed(pageParam),
    getNextPageParam: (pagina, paginas) =>
      pagina.length === 12 ? paginas.length : undefined,
    enabled: !!id,
  });
}
export function usePublicacoesPerfil(id: string) {
  return useQuery({
    queryKey: ["publicacoes-perfil", id],
    queryFn: () => obterPublicacoesPerfil(id),
    enabled: !!id,
  });
}
export function useAcao<T>(acao: (dados: T) => Promise<unknown>) {
  const consultas = useQueryClient();
  return useMutation({
    mutationFn: acao,
    onSuccess: async () => {
      await consultas.invalidateQueries();
    },
  });
}
export function usePerfil(id: string) {
  return useQuery({
    queryKey: ["perfil", id],
    queryFn: () => servicos.perfil(id),
    enabled: !!id,
  });
}
