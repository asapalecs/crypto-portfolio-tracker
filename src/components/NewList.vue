<template>
    <div class="news">
      <div v-if="error" class="banner banner--error">{{ error }}</div>
  
      <div v-if="!items.length && !error" class="empty">Se incarca stirile…</div>
  
      <motion.a
        v-for="n in items"
        :key="n.url"
        class="news__item"
        :href="n.url"
        target="_blank"
        rel="noreferrer"
        :initial="{ opacity: 0, y: 8 }"
        :animate="{ opacity: 1, y: 0 }"
        :whileHover="{ scale: 1.01 }"
      >
        <div class="news__title">{{ n.title }}</div>
        <div class="news__meta">
          <span>{{ n.domain }}</span>
          <span>·</span>
          <span>{{ formatDate(n.publishedAt) }}</span>
        </div>
      </motion.a>
    </div>
  </template>
  
  <script setup>
  import { motion } from 'motion-v'
  
  defineProps({
    items: { type: Array, required: true },
    error: { type: String, default: '' }
  })
  
  function formatDate(s) {
    if (!s) return '—'
    // seendate de la GDELT e text, nu data
    return String(s).replace('T', ' ').slice(0, 16)
  }
  </script>
  
  <style scoped>
  .news{ display:flex; flex-direction:column; gap:10px; }
  .news__item{
    display:block;
    padding:10px 12px;
    border-radius:14px;
    border: 1px solid var(--line);
    background: rgba(0,0,0,0.14);
  }
  .news__title{ font-weight:800; line-height:1.25; }
  .news__meta{ margin-top:6px; font-size:12px; color: var(--muted); display:flex; gap:8px; flex-wrap:wrap; }
  </style>
  