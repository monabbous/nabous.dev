import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@nabous.dev": path.resolve(__dirname, "./src"),
    },
  },
  ssr: {
    noExternal: ["@react-three/fiber", "@react-three/drei", "@react-three/postprocessing"],
  },
});
