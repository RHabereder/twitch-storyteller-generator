<script setup lang="ts">
import { ref } from 'vue'
import StoryEditor from './components/StoryEditor.vue'
import BranchEditor from './components/BranchEditor.vue'
import AdventureEditor from './components/AdventureEditor.vue'
import StoryConverter from './components/StoryConverter.vue'
import type { Adventure } from './types/adventure'
import type { AdventureBranch } from './types/adventureBranch'

const adventure = ref<Adventure>({
  Title: 'My Adventure Story',
  UsesTTS: false,
  UsesVoicefiles: false,
  HasSubtitles: false,
  SubtitleExtension: '',
  VoiceFileExtension: '',
  Branches: {},
})

const selectedBranch = ref<AdventureBranch | null>(null)
const isBranchEditorOpen = ref(false)
const isAdventureEditorOpen = ref(false)
const isStoryConverterOpen = ref(false)

const handleBranchUpdate = (updatedBranch: AdventureBranch) => {
  const updatedAdventure = {
    ...adventure.value,
    Branches: {
      ...adventure.value.Branches,
      [updatedBranch.ID]: updatedBranch,
    },
  }

  adventure.value = updatedAdventure
}

const openBranchEditor = (branch: AdventureBranch) => {
  selectedBranch.value = branch
  isBranchEditorOpen.value = true
}

const closeBranchEditor = () => {
  isBranchEditorOpen.value = false
  selectedBranch.value = null
}

const openAdventureEditor = () => {
  isAdventureEditorOpen.value = true
}

const closeAdventureEditor = () => {
  isAdventureEditorOpen.value = false
}

const openStoryConverter = () => {
  isStoryConverterOpen.value = true
}

const closeStoryConverter = () => {
  isStoryConverterOpen.value = false
}
</script>

<template>
  <div class="app-container">
    <header>
      <h1>NLith's Twitch Storytelling Editor</h1>
      <div class="header-controls">
        <button class="btn" @click="openStoryConverter">Convert Story</button>
        <button class="btn" @click="openAdventureEditor">Edit Adventure</button>
      </div>
    </header>

    <main>
      <StoryEditor
        :adventure="adventure"
        @update:adventure="adventure = $event"
        @edit-branch="openBranchEditor"
      />
    </main>

    <BranchEditor
      v-if="isBranchEditorOpen"
      :is-open="isBranchEditorOpen"
      :branch="selectedBranch"
      :adventure="adventure"
      @update:branch="handleBranchUpdate"
      @close="closeBranchEditor"
    />

    <AdventureEditor
      v-if="isAdventureEditorOpen"
      :is-open="isAdventureEditorOpen"
      :adventure="adventure"
      @update:adventure="adventure = $event"
      @close="closeAdventureEditor"
    />

    <StoryConverter
      v-if="isStoryConverterOpen"
      :is-open="isStoryConverterOpen"
      @update:adventure="adventure = $event"
      @close="closeStoryConverter"
    />
  </div>
</template>

<style scoped>
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

header {
  padding: 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.btn {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn:hover {
  background-color: #45a049;
}

.header-controls {
  display: flex;
  gap: 0.5rem;
}
</style>
