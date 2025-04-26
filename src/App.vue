<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Adventure } from '@/types/adventure'
import StoryEditor from './components/StoryEditor.vue'
import StorySelector from './components/StorySelector.vue'
import StoryNameModal from './components/StoryNameModal.vue'

const adventure = ref<Adventure>({
  Title: '',
  UsesTTS: false,
  UsesVoicefiles: false,
  HasSubtitles: false,
  SubtitleExtension: '.srt',
  VoiceFileExtension: '.mp3',
  Branches: {},
})

const storyCount = ref(0)
const showStoryNameModal = ref(false)
const isStoryNameModalOpen = ref(false)

const handleStoryUpdate = (newStory: Adventure) => {
  adventure.value = newStory
}

const handleAdventureUpdate = (newStory: Adventure) => {
  adventure.value = newStory
}

const handleStoryImported = () => {
  // Increment the story count to trigger a refresh of the story list
  storyCount.value++
}

const handleModalStateChange = (isOpen: boolean) => {
  isStoryNameModalOpen.value = isOpen
}

const handleNewStoryRequest = () => {
  showStoryNameModal.value = true
}

const handleNewStory = (storyName: string) => {
  // Create a new story
  const newStory: Adventure = {
    Title: storyName,
    UsesTTS: false,
    UsesVoicefiles: false,
    HasSubtitles: false,
    SubtitleExtension: '.srt',
    VoiceFileExtension: '.mp3',
    Branches: {},
  }

  // Save to local storage with a unique key
  const storyKey = `twitch-storyteller-story-${storyName}`
  localStorage.setItem(storyKey, JSON.stringify(newStory))

  // Update the adventure and close the modal
  adventure.value = newStory
  storyCount.value++
  closeStoryNameModal()
}

const closeStoryNameModal = () => {
  showStoryNameModal.value = false
  isStoryNameModalOpen.value = false
}

onMounted(() => {
  // Load story names from local storage
  const storyNames: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('twitch-storyteller-story-')) {
      storyNames.push(key.replace('twitch-storyteller-story-', ''))
    }
  }

  // If no stories exist, show the new story modal
  if (storyNames.length === 0) {
    showStoryNameModal.value = true
    isStoryNameModalOpen.value = true
  } else {
    // Load the first story if available
    const firstStoryKey = `twitch-storyteller-story-${storyNames[0]}`
    const savedStory = localStorage.getItem(firstStoryKey)
    if (savedStory) {
      try {
        const parsedStory = JSON.parse(savedStory)
        adventure.value = parsedStory
      } catch (error) {
        console.error('Error loading saved story:', error)
      }
    }
  }
})
</script>

<template>
  <div class="app-container">
    <header>
      <h1>NLith's Twitch Storytelling Editor</h1>
    </header>

    <main>
      <StoryEditor
        :adventure="adventure"
        :is-modal-open="isStoryNameModalOpen"
        @update:adventure="handleAdventureUpdate"
        @story-imported="handleStoryImported"
      >
        <template #toolbar>
          <StorySelector
            :current-story="adventure"
            :story-count="storyCount"
            @update:story="handleStoryUpdate"
            @modal-state-change="handleModalStateChange"
            @request-new-story="handleNewStoryRequest"
          />
        </template>
      </StoryEditor>
    </main>

    <StoryNameModal
      v-if="showStoryNameModal"
      :is-open="showStoryNameModal"
      :existing-names="[]"
      @save="handleNewStory"
      @close="closeStoryNameModal"
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

header {
  padding: 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  text-align: center;
  flex-shrink: 0;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.story-selector-row {
  display: none;
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
</style>
