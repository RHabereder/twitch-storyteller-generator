<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Edit Adventure</h3>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="adventure-title">Title</label>
          <input
            id="adventure-title"
            v-model="editedAdventure.Title"
            type="text"
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="editedAdventure.UsesTTS" />
            Use Text-to-Speech
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="editedAdventure.UsesVoicefiles" />
            Use Voice Files
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="editedAdventure.HasSubtitles" />
            Has Subtitles
          </label>
        </div>

        <div class="form-group" v-if="editedAdventure.HasSubtitles">
          <label for="subtitle-extension">Subtitle Extension</label>
          <input
            id="subtitle-extension"
            v-model="editedAdventure.SubtitleExtension"
            type="text"
            class="form-control"
            placeholder="e.g., .srt"
          />
        </div>

        <div class="form-group" v-if="editedAdventure.UsesVoicefiles">
          <label for="voice-extension">Voice File Extension</label>
          <input
            id="voice-extension"
            v-model="editedAdventure.VoiceFileExtension"
            type="text"
            class="form-control"
            placeholder="e.g., .mp3"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="saveAdventure">Save</button>
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Adventure } from '@/types/adventure'

const props = defineProps<{
  isOpen: boolean
  adventure: Adventure
}>()

const emit = defineEmits<{
  (e: 'update:adventure', value: Adventure): void
  (e: 'close'): void
}>()

const editedAdventure = ref<Adventure>({ ...props.adventure })

watch(
  () => props.adventure,
  (newAdventure) => {
    editedAdventure.value = { ...newAdventure }
  },
  { immediate: true },
)

const saveAdventure = () => {
  emit('update:adventure', editedAdventure.value)
  closeModal()
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
</style>
