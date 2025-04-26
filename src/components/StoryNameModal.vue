<template>
  <div class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>New Story</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="storyName">Story Name</label>
          <input
            type="text"
            id="storyName"
            v-model="storyName"
            @keyup.enter="save"
            placeholder="Enter story name..."
          />
          <p v-if="error" class="error-message">{{ error }}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Cancel</button>
        <button class="btn" @click="save" :disabled="!storyName">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  existingNames: string[]
}>()

const emit = defineEmits<{
  (e: 'save', value: string): void
  (e: 'close'): void
}>()

const storyName = ref('')
const error = ref('')

const save = () => {
  if (!storyName.value.trim()) {
    error.value = 'Please enter a story name'
    return
  }

  if (props.existingNames.includes(storyName.value)) {
    error.value = 'A story with this name already exists'
    return
  }

  emit('save', storyName.value)
  close()
}

const close = () => {
  emit('close')
  storyName.value = ''
  error.value = ''
}

// Watch for modal open/close to reset state
watch(
  () => props.existingNames,
  () => {
    storyName.value = ''
    error.value = ''
  },
)
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
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #4caf50;
}

.error-message {
  color: #f44336;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #ddd;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn:hover {
  background-color: #45a049;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>
