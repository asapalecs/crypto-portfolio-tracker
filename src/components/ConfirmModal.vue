<template>
  <AnimatePresence>
    <motion.div
      v-if="open"
      class="modal-backdrop"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      :exit="{ opacity: 0 }"
      @click.self="$emit('cancel')"
    >
      <motion.div
        class="modal"
        :initial="{ opacity: 0, y: 12, scale: 0.98 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 12, scale: 0.98 }"
      >
        <h3 class="modal__title">{{ title }}</h3>
        <p class="modal__text">{{ message }}</p>

        <div class="modal__actions">
          <button class="btn btn--ghost" @click="$emit('cancel')">{{ cancelText }}</button>
          <button class="btn btn--danger" @click="$emit('confirm')">{{ confirmText }}</button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
</template>

<script setup>
import { AnimatePresence, motion } from 'motion-v'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Confirmare' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirma' },
  cancelText: { type: String, default: 'Renunta' }
})

defineEmits(['confirm', 'cancel'])
</script>
