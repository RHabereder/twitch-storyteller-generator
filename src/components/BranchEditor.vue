<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Edit Branch</h3>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="branch-id">
            ID
            <span
              class="help-icon"
              title="The unique identifier for this branch. It will be automatically generated from the title in snake_case format."
              >❓</span
            >
          </label>
          <input
            id="branch-id"
            v-model="editedBranch.ID"
            type="text"
            class="form-control"
            :class="{ 'input-error': hasIdError }"
            :disabled="editedBranch.ID === 'start'"
            @input="validateId"
          />
          <div v-if="hasIdError" class="error-message">{{ idError }}</div>
          <div v-if="editedBranch.ID === 'start'" class="disabled-hint">
            Root branch ID cannot be changed
          </div>
        </div>

        <div class="form-group">
          <label for="branch-title">
            Title
            <span
              class="help-icon"
              title="The display name of this branch. This will be shown in the story canvas and used to generate the branch ID."
              >❓</span
            >
          </label>
          <input id="branch-title" v-model="editedBranch.Title" type="text" class="form-control" />
        </div>

        <div class="form-group">
          <label for="branch-text">
            Content
            <span
              class="help-icon"
              title="The main text content of this branch. This is what will be displayed to the reader when they reach this point in the story."
              >❓</span
            >
          </label>
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
            <span
              class="help-icon"
              title="Mark this branch as an ending. Ending branches cannot have connections to other branches and represent the conclusion of a story path."
              >❓</span
            >
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
  adventure?: {
    Branches: { [key: string]: AdventureBranch }
  }
}>()

const emit = defineEmits<{
  (e: 'update:branch', value: AdventureBranch): void
  (e: 'close'): void
}>()

const editedBranch = ref({} as AdventureBranch)
const hasIdError = ref(false)
const idError = ref('')

const isFirstBranch = computed(() => props.isFirstBranch || false)

const validateId = () => {
  const id = editedBranch.value.ID
  hasIdError.value = false
  idError.value = ''

  // Check if ID is empty
  if (!id) {
    hasIdError.value = true
    idError.value = 'ID cannot be empty'
    return
  }

  // Check if ID contains only allowed characters
  if (!/^[a-zA-Z0-9_]+$/.test(id)) {
    hasIdError.value = true
    idError.value = 'ID can only contain letters, numbers, and underscores'
    return
  }

  // Check for duplicate IDs
  if (props.adventure?.Branches) {
    const isDuplicate = Object.values(props.adventure.Branches).some(
      (b) => b.ID === id && b.ID !== props.branch?.ID,
    )
    if (isDuplicate) {
      hasIdError.value = true
      idError.value = 'This ID is already in use'
      return
    }
  }
}

watch(
  () => props.branch,
  (newBranch) => {
    if (newBranch) {
      editedBranch.value = { ...newBranch }
      // Ensure first branch is not an ending
      if (isFirstBranch.value) {
        editedBranch.value.IsEnd = false
      }
      // Validate the ID when branch changes
      validateId()
    }
  },
  { immediate: true },
)

const saveBranch = () => {
  if (editedBranch.value) {
    // Validate ID before saving
    validateId()
    if (hasIdError.value) {
      return
    }

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
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
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

.btn .icon {
  font-size: 1.2rem;
  line-height: 1;
}

.disabled-hint {
  color: #666;
  font-size: 0.9em;
  margin-left: 0.5rem;
  font-style: italic;
}

.input-error {
  border-color: #f44336;
}

.error-message {
  color: #f44336;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.help-icon {
  display: inline-block;
  margin-left: 0.5rem;
  color: #666;
  cursor: help;
  font-size: 0.9em;
  transition: color 0.2s ease;
}

.help-icon:hover {
  color: #333;
}

.checkbox-label .help-icon {
  margin-left: 0.25rem;
}
</style>
