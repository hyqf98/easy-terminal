<script setup lang="ts">
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';

const greetMsg = ref('');
const name = ref('');

async function greet() {
  greetMsg.value = await invoke('greet', { name: name.value });
}
</script>

<template>
  <div class="container">
    <h1>Welcome to Tauri!</h1>

    <form @submit.prevent="greet">
      <input v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>

    <p>{{ greetMsg }}</p>
  </div>
</template>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

input {
  padding: 8px 12px;
  margin: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

button {
  padding: 8px 16px;
  margin: 8px;
  border-radius: 4px;
  border: none;
  background-color: #0078d4;
  color: white;
  cursor: pointer;
}

button:hover {
  background-color: #106ebe;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  button {
    background-color: #0078d4;
  }

  button:hover {
    background-color: #106ebe;
  }
}
</style>
