<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Edit Branch</h3>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="branch-id">ID</label>
          <input
            id="branch-id"
            v-model="editedBranch.ID"
            type="number"
            class="form-control"
            disabled
          />
        </div>

        <div class="form-group">
          <label for="branch-title">Title</label>
          <input id="branch-title" v-model="editedBranch.Title" type="text" class="form-control" />
        </div>

        <div class="form-group">
          <label for="branch-text">Content</label>
          <textarea
            id="branch-text"
            v-model="editedBranch.Text"
            class="form-control"
            rows="5"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="editedBranch.IsEnd" :disabled="isFirstBranch" />
            This is an ending branch
            <span v-if="isFirstBranch" class="disabled-hint"
              >(First branch cannot be an ending)</span
            >
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="saveBranch">Save</button>
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { AdventureBranch } from '@/types/adventureBranch'

const props = defineProps<{
  isOpen: boolean
  branch: AdventureBranch | null
  isFirstBranch?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:branch', value: AdventureBranch): void
  (e: 'close'): void
}>()

const editedBranch = ref({} as AdventureBranch)

const isFirstBranch = computed(() => props.isFirstBranch || false)

watch(
  () => props.branch,
  (newBranch) => {
    if (newBranch) {
      editedBranch.value = { ...newBranch }
      // Ensure first branch is not an ending
      if (isFirstBranch.value) {
        editedBranch.value.IsEnd = false
      }
    }
  },
  { immediate: true },
)

const saveBranch = () => {
  if (editedBranch.value) {
    // Ensure first branch is not an ending
    if (isFirstBranch.value) {
      editedBranch.value.IsEnd = false
    }
    emit('update:branch', editedBranch.value)
    closeModal()
  }
}

const closeModal = () => {
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
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  color: #333;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 1;
}

.modal-header h3 {
  color: #333;
  margin: 0;
}

.modal-body {
  padding: 1rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #ddd;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  position: sticky;
  bottom: 0;
  background-color: white;
  z-index: 1;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  color: #333;
}

.form-control:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #666;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  color: #333;
}

.btn {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn:hover {
  background-color: #45a049;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.disabled-hint {
  color: #666;
  font-size: 0.9em;
  margin-left: 0.5rem;
  font-style: italic;
}
</style>
