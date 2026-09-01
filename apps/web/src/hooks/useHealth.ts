import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<{ message: string }>("/api/health"),
  });
}
