<script setup lang="ts">
import TreeTable from '@/components/TreeTable.vue'
import { items } from '@/data/items'
</script>

<template>
  <main class="page">
    <TreeTable :items="items" />
  </main>
</template>
