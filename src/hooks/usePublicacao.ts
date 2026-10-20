import { useQuery } from "@tanstack/react-query";
import { servicos } from "@/services/servicos";
export function usePublicacao(id: string) {
  return useQuery({
    queryKey: ["publicacao", id],
    queryFn: () => servicos.publicacao(id),
    enabled: !!id,
  });
}
