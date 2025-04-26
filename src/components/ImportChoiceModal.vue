<template>
  <div class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Import Story</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="modal-body">
        <p>How would you like to handle the imported story?</p>
        <div class="choice-buttons">
          <button class="btn" @click="handleChoice('update')">Update Current Story</button>
          <button class="btn btn-secondary" @click="handleChoice('new')">Create New Story</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'choice', value: 'update' | 'new'): void
  (e: 'close'): void
}>()

const handleChoice = (choice: 'update' | 'new') => {
  emit('choice', choice)
  close()
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.modal-body p {
  margin-bottom: 1.5rem;
  color: #333;
}

.choice-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  min-width: 150px;
}

.btn:hover {
  background-color: #45a049;
}

.btn-secondary {
  background-color: #2196f3;
}

.btn-secondary:hover {
  background-color: #1976d2;
}
</style>
