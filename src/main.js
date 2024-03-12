import DropZone from 'dropzone-vue';
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App)
    .use(DropZone)
    .mount('#app');
