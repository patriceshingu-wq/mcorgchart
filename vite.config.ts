import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // listen on all network interfaces
    port: 5173,        // your port of choice
    strictPort: false, // try next port if in use
    // https: false,   // optional, if you need HTTPS
  },
});
