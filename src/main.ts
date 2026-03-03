/**
 * Easy Terminal - Main entry point
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import naive from 'naive-ui';
import App from './App.vue';
import i18n from './locales';

// Import styles
import './assets/styles/variables.css';
import './assets/styles/reset.css';
import './assets/styles/themes/dark.css';
import './assets/styles/animations.css';

// Create app
const app = createApp(App);

// Create Pinia store
const pinia = createPinia();
app.use(pinia);

// Use Naive UI
app.use(naive);

// Use i18n
app.use(i18n);

// Mount app
app.mount('#app');
