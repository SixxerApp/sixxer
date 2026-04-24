import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackStart(),
    nitro({
      serverDir: "server",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  server: {
    host: true,
    strictPort: true,
    // Explicitly exclude build artifacts, native scaffolding, and test
    // output from the watcher. Without this, vite tries to watch every
    // file in these directories and hits macOS's per-process kqueue
    // descriptor ceiling (EMFILE: too many open files, watch).
    //
    // `CHOKIDAR_USEPOLLING=1` flips the watcher into polling mode, which is
    // slightly CPU-heavier but avoids kqueue entirely — useful when running
    // under Playwright / CI where `ulimit` isn't reliably inherited and the
    // descriptor limit crashes the dev server during a run.
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === "1",
      interval: 300,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/.output/**",
        "**/.vercel/**",
        "**/.wrangler/**",
        "**/ios/**",
        "**/android/**",
        "**/supabase/.temp/**",
        "**/supabase/.branches/**",
        "**/playwright-report/**",
        "**/test-results/**",
        "**/blob-report/**",
        "**/playwright/.cache/**",
        "**/coverage/**",
      ],
    },
  },
});
