import { defineConfig } from "vite";

console.log("Hello from Vite Config!");

export default defineConfig({
  server: {
    allowedHosts: [
      ".ngrok-free.app"
    ]
  }
});