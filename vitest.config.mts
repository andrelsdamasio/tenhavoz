import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mesmo alias "@/..." do tsconfig, pra os testes poderem importar módulos
// de lib/ que usam imports com "@/". O tsconfig usa jsx "preserve" (o Next
// compila o JSX), então aqui o esbuild do Vitest precisa do transform JSX.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
