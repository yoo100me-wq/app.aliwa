// Config temporal solo para previsualizar en HTTP (sin el cert autofirmado).
// El vite.config.js normal usa basicSsl() y Chrome no puede tomar capturas
// sobre ese certificado. Mismo patrón que vite.config.nohttps.mjs de aliwa-ui,
// en otro puerto para poder correr los dos a la vez.
//
//   npx vite --config vite.config.nohttps.mjs
//
// NO sustituye al config normal: el Embedded Signup de Meta exige https.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5181,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
