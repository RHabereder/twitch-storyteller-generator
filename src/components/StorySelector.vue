<template>
  <div class="story-selector">
    <div class="controls">
      <select v-model="selectedStory" @change="handleStorySelect">
        <option value="">Select a story...</option>
        <option v-for="name in storyNames" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
      <button class="btn" @click="handleNewStory">New</button>
      <button class="btn" @click="openAdventureEditor">Edit Adventure</button>
    </div>
    <AdventureEditor
      v-if="showAdventureEditor"
      :is-open="showAdventureEditor"
      :adventure="currentStory"
      @update:adventure="handleAdventureUpdate"
      @close="showAdventureEditor = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Adventure } from '@/types/adventure'
import AdventureEditor from './AdventureEditor.vue'

const props = defineProps<{
  currentStory: Adventure
  storyCount?: number
}>()

const emit = defineEmits<{
  (e: 'update:story', value: Adventure): void
  (e: 'story-selected'): void
  (e: 'modal-state-change', value: boolean): void
  (e: 'request-new-story'): void
}>()

const showAdventureEditor = ref(false)
const storyNames = ref<string[]>([])
const selectedStory = ref('')
const currentStoryKey = ref('')
const isUserChange = ref(false)

const handleNewStory = () => {
  emit('request-new-story')
  emit('modal-state-change', true)
}

// Load all story names from local storage
const loadStoryNames = () => {
  const stories: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('twitch-storyteller-story-')) {
      // Extract the story name, removing the timestamp if present
      const storyName = key.replace('twitch-storyteller-story-', '').replace(/-\d+$/, '')
      if (!stories.includes(storyName)) {
        stories.push(storyName)
      }
    }
  }
  storyNames.value = stories
  return stories
}

// Handle story selection
const handleStorySelect = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const storyName = target.value
  if (!storyName) return

  // Find the most recent story key for this story name
  let storyKey = ''
  let latestTimestamp = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(`twitch-storyteller-story-${storyName}`)) {
      // Extract timestamp if present
      const match = key.match(/-(\d+)$/)
      const timestamp = match ? parseInt(match[1]) : 0

      if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp
        storyKey = key
      }
    }
  }

  // If no timestamped key found, try the basic key
  if (!storyKey) {
    storyKey = `twitch-storyteller-story-${storyName}`
  }

  const storyData = localStorage.getItem(storyKey)
  if (storyData) {
    const story = JSON.parse(storyData)
    emit('update:story', story)
  }
}

const openAdventureEditor = () => {
  showAdventureEditor.value = true
}

const handleAdventureUpdate = (updatedAdventure: Adventure) => {
  emit('update:story', updatedAdventure)
  showAdventureEditor.value = false
}

// Save current story
const saveCurrentStory = () => {
  if (!currentStoryKey.value) return
  const storyKey = currentStoryKey.value
  localStorage.setItem(storyKey, JSON.stringify(props.currentStory))
}

// Watch for changes to the current story and save it
watch(
  () => props.currentStory,
  (newStory) => {
    if (isUserChange.value) {
      // Always save to the current story key
      saveCurrentStory()

      // Only handle title changes if the title actually changed
      if (newStory.Title !== selectedStory.value) {
        // Check if new title already exists
        if (storyNames.value.includes(newStory.Title)) {
          alert('A story with this name already exists. Please choose a different name.')
          return
        }

        // Update story names list
        const index = storyNames.value.indexOf(selectedStory.value)
        if (index !== -1) {
          storyNames.value[index] = newStory.Title
        }

        // Update current values
        selectedStory.value = newStory.Title
      }
    }
  },
  { deep: true },
)

// Watch for story count changes to refresh the list
watch(
  () => props.storyCount,
  () => {
    loadStoryNames()
  },
)

// Watch for current story title changes
watch(
  () => props.currentStory.Title,
  (newTitle) => {
    if (newTitle && !storyNames.value.includes(newTitle)) {
      loadStoryNames()
      selectedStory.value = newTitle
    }
  },
)

onMounted(() => {
  const stories = loadStoryNames()

  // If there's a current story, use it
  if (props.currentStory.Title) {
    selectedStory.value = props.currentStory.Title

    // Find the most recent story key for this story name
    let storyKey = ''
    let latestTimestamp = 0

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`twitch-storyteller-story-${props.currentStory.Title}`)) {
        // Extract timestamp if present
        const match = key.match(/-(\d+)$/)
        const timestamp = match ? parseInt(match[1]) : 0

        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp
          storyKey = key
        }
      }
    }

    // If no timestamped key found, try the basic key
    if (!storyKey) {
      storyKey = `twitch-storyteller-story-${props.currentStory.Title}`
    }

    currentStoryKey.value = storyKey
  }
  // Otherwise, select the first story if available
  else if (stories.length > 0) {
    selectedStory.value = stories[0]

    // Find the most recent story key for this story name
    let storyKey = ''
    let latestTimestamp = 0

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`twitch-storyteller-story-${stories[0]}`)) {
        // Extract timestamp if present
        const match = key.match(/-(\d+)$/)
        const timestamp = match ? parseInt(match[1]) : 0

        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp
          storyKey = key
        }
      }
    }

    // If no timestamped key found, try the basic key
    if (!storyKey) {
      storyKey = `twitch-storyteller-story-${stories[0]}`
    }

    currentStoryKey.value = storyKey

    // Load and emit the first story
    const storyJson = localStorage.getItem(storyKey)
    if (storyJson) {
      try {
        const story = JSON.parse(storyJson)
        emit('update:story', story)
      } catch (error) {
        console.error('Error loading story:', error)
      }
    }
  }

  // Set flag to allow title changes after initial load
  setTimeout(() => {
    isUserChange.value = true
  }, 100)
})
</script>

<style scoped>
.story-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  min-width: 200px;
  font-size: 0.9rem;
  color: #333;
}

select:focus {
  outline: none;
  border-color: #4caf50;
}

.btn {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
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

.btn-danger {
  background-color: #f44336;
}

.btn-danger:hover {
  background-color: #d32f2f;
}

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>
