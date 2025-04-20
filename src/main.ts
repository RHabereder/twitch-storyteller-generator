import './assets/main.css'
import PrimeVue from 'primevue/config'
import Lara from '@primeuix/themes/lara'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(PrimeVue, {
  // Default theme configuration
  theme: {
    preset: Lara,
    options: {
      darkModeSelector: false || 'none',
    },
  },
})
app.mount('#app')
