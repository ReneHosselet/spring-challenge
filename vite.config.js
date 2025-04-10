import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // This is the default value for development
  publicDir: 'public', // This is also the default, can be omitted if using 'public'
})