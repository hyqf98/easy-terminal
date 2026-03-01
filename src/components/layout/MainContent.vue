<script setup lang="ts">
/**
 * MainContent - Main content area component
 * Contains tabs bar and terminal/editor area
 */
import { TerminalContainer } from '@/components/terminal';

withDefaults(defineProps<{
  showTabs?: boolean;
}>(), {
  showTabs: true,
});

const emit = defineEmits<{
  (e: 'new-tab'): void;
  (e: 'tab-click', id: string): void;
  (e: 'tab-close', id: string): void;
}>();
</script>

<template>
  <div class="main-content">
    <!-- Terminal container handles tabs and terminal panes -->
    <TerminalContainer
      :show-tabs="showTabs"
      @session-created="() => {}"
      @session-closed="(id) => emit('tab-close', id)"
      @session-focus="(id) => emit('tab-click', id)"
    />
  </div>
</template>

<style scoped>
.main-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
