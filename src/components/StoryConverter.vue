<!-- StoryConverter.vue -->
<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Convert Story Format</h3>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="old-story">Paste your old story JSON here:</label>
          <textarea
            id="old-story"
            v-model="oldStoryJson"
            class="form-control"
            rows="10"
            placeholder="Paste your old story JSON here..."
          ></textarea>
        </div>

        <div v-if="conversionError" class="error-message">
          {{ conversionError }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="convertStory" :disabled="!oldStoryJson">Convert</button>
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Adventure } from '@/types/adventure'
import type { AdventureBranch, Choice } from '@/types/adventureBranch'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:adventure', value: Adventure): void
  (e: 'close'): void
}>()

const oldStoryJson = ref('')
const conversionError = ref('')

interface OldAdventureBranch {
  ID: number
  Title: string
  Text: string
  IsEnd: boolean
  Branches: OldAdventureBranch[]
  x: number
  y: number
}

interface OldAdventure {
  Title: string
  UsesTTS: boolean
  UsesVoicefiles: boolean
  HasSubtitles: boolean
  SubtitleExtension: string
  VoiceFileExtension: string
  Branches: OldAdventureBranch[]
}

const convertBranch = (
  oldBranch: OldAdventureBranch,
  branchMap: { [key: string]: AdventureBranch },
): void => {
  const newBranch: AdventureBranch = {
    ID: oldBranch.ID.toString(),
    Title: oldBranch.Title,
    Text: oldBranch.Text,
    IsEnd: oldBranch.IsEnd,
    Choices: oldBranch.Branches.map(
      (subBranch): Choice => ({
        Label: subBranch.Title,
        Target: subBranch.ID.toString(),
        Type: 'direct',
      }),
    ),
    x: oldBranch.x,
    y: oldBranch.y,
  }

  branchMap[newBranch.ID] = newBranch

  // Convert sub-branches recursively
  oldBranch.Branches.forEach((subBranch) => {
    convertBranch(subBranch, branchMap)
  })
}

const convertStory = () => {
  try {
    const oldStory = JSON.parse(oldStoryJson.value) as OldAdventure
    const newBranches: { [key: string]: AdventureBranch } = {}

    // Convert each branch and its sub-branches
    oldStory.Branches.forEach((branch) => {
      convertBranch(branch, newBranches)
    })

    const newStory: Adventure = {
      Title: oldStory.Title,
      UsesTTS: oldStory.UsesTTS,
      UsesVoicefiles: oldStory.UsesVoicefiles,
      HasSubtitles: oldStory.HasSubtitles,
      SubtitleExtension: oldStory.SubtitleExtension,
      VoiceFileExtension: oldStory.VoiceFileExtension,
      Branches: newBranches,
    }

    emit('update:adventure', newStory)
    closeModal()
  } catch (error) {
    conversionError.value = 'Error converting story: ' + (error as Error).message
  }
}

const closeModal = () => {
  oldStoryJson.value = ''
  conversionError.value = ''
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
  width: 600px;
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
  resize: vertical;
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

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.error-message {
  color: #dc3545;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #dc3545;
  border-radius: 4px;
  background-color: #f8d7da;
}
</style>
