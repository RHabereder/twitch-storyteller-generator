<template>
  <div class="story-editor">
    <div class="editor-header">
      <h2>{{ adventure.Title }}</h2>
      <div class="editor-controls">
        <button v-if="adventure.Branches.length === 0" @click="addBranch" class="btn">
          Add Root Branch
        </button>
        <button v-if="adventure.Branches.length > 0" @click="openExportModal" class="btn">
          Export
        </button>
        <button @click="saveStory" class="btn" :class="{ 'btn-success': !hasUnsavedChanges }">
          {{ hasUnsavedChanges ? 'Save' : 'Story Saved' }}
        </button>
        <button @click="importStory" class="btn">Import</button>
        <button @click="clearStory" class="btn btn-danger">Clear</button>
        <input
          type="file"
          ref="fileInput"
          @change="handleFileImport"
          accept=".json"
          style="display: none"
        />
      </div>
    </div>

    <div v-if="hasUnendedBranches" class="warning-banner">
      ⚠️ Warning: Some branches do not have endings! Please ensure all story paths lead to an
      ending.
    </div>

    <div v-if="hasUnsavedChanges" class="unsaved-changes-banner">
      ⚠️ You have unsaved changes. Please save your story to preserve your progress.
    </div>

    <div class="story-canvas" ref="canvas">
      <div
        class="canvas-content"
        :style="{
          transform: `scale(${zoomLevel})`,
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
        }"
      >
        <!-- SVG for connections -->
        <svg
          class="connections-layer"
          :width="canvasWidth"
          :height="canvasHeight"
          :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
          preserveAspectRatio="xMidYMid meet"
        >
          <template v-for="branch in allBranches" :key="'conn-' + branch.ID">
            <template v-if="branch.Branches && branch.Branches.length > 0">
              <line
                v-for="child in branch.Branches"
                :key="'line-' + branch.ID + '-' + child.ID"
                :x1="branch.x + 125"
                :y1="branch.y + 100"
                :x2="child.x + 125"
                :y2="child.y + 20"
                stroke="#4caf50"
                :stroke-width="2 / zoomLevel"
              />
            </template>
          </template>
        </svg>

        <!-- Branch nodes -->
        <div
          v-for="branch in allBranches"
          :key="'node-' + branch.ID"
          class="branch-node"
          :class="{
            'ending-branch': branch.IsEnd,
            'warning-branch': isWarningBranch(branch),
          }"
          :style="{ left: branch.x + 'px', top: branch.y + 'px' }"
          @mousedown="startDrag($event, branch)"
        >
          <div class="branch-header">
            <h3>{{ branch.Title }}</h3>
            <div class="branch-actions">
              <button @click="editBranch(branch)" class="btn-small" title="Edit branch">✏️</button>
              <button
                v-if="!branch.IsEnd"
                @click="addSubBranch(branch)"
                class="btn-small"
                title="Add sub-branch"
              >
                ➕
              </button>
              <button @click="deleteBranch(branch)" class="btn-small" title="Delete branch">
                🗑️
              </button>
            </div>
          </div>
          <div class="branch-content">
            <p :class="{ truncated: branch.Text.length > 100 }">{{ truncateText(branch.Text) }}</p>
          </div>
        </div>
      </div>
    </div>

    <ExportModal
      v-if="isExportModalOpen"
      :is-open="isExportModalOpen"
      :adventure="adventure"
      @close="closeExportModal"
    />

    <BranchEditor
      v-if="isBranchEditorOpen"
      :is-open="isBranchEditorOpen"
      :branch="selectedBranch"
      :is-first-branch="isFirstBranch(selectedBranch)"
      @update:branch="handleBranchUpdate"
      @close="closeBranchEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import type { Adventure } from '@/types/adventure'
import type { AdventureBranch } from '@/types/adventureBranch'
import ExportModal from './ExportModal.vue'
import BranchEditor from './BranchEditor.vue'

const props = defineProps<{
  adventure: Adventure
}>()

const emit = defineEmits<{
  (e: 'update:adventure', value: Adventure): void
  (e: 'edit-branch', value: AdventureBranch): void
}>()

const canvas = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const canvasWidth = ref(2000)
const canvasHeight = ref(2000)
const zoomLevel = ref(1)
let isDragging = false
let currentBranch: AdventureBranch | null = null
let startX = 0
let startY = 0

const isExportModalOpen = ref(false)
const isBranchEditorOpen = ref(false)
const selectedBranch = ref({} as AdventureBranch)

const STORAGE_KEY = 'twitch-storyteller-state'
const LAST_EXPORT_KEY = 'twitch-storyteller-last-export'

// Track if there are unsaved changes
const hasUnsavedChanges = ref(false)

onMounted(() => {
  const savedState = loadState()
  if (savedState) {
    emit('update:adventure', savedState)
  }

  // Initialize branch positions if not set
  props.adventure.Branches.forEach((branch, index) => {
    if (!branch.x || !branch.y) {
      branch.x = 100 + index * 300
      branch.y = 100
    }
  })

  // Add beforeunload event listener
  window.addEventListener('beforeunload', handleBeforeUnload)
  // Add wheel event listener
  if (canvas.value) {
    canvas.value.addEventListener('wheel', handleWheel, { passive: false })
  }

  // Check initial unsaved state
  checkForUnsavedChanges(props.adventure)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (canvas.value) {
    canvas.value.removeEventListener('wheel', handleWheel)
  }
})

// Flatten all branches for rendering
const allBranches = computed(() => {
  const flattenBranches = (branches: AdventureBranch[]): AdventureBranch[] => {
    return branches.reduce((acc: AdventureBranch[], branch) => {
      return [...acc, branch, ...flattenBranches(branch.Branches || [])]
    }, [])
  }
  return flattenBranches(props.adventure.Branches)
})

const generateBranchId = (parentId: number | null = null, level: number = 0): number => {
  if (level === 0) {
    // For top-level branches, just use the next number
    const topLevelBranches = props.adventure.Branches
    return topLevelBranches.length + 1
  } else {
    // For sub-branches, use parent ID * 10 + next number
    const parentBranch = findBranchById(parentId!, props.adventure.Branches)
    if (!parentBranch) return 0

    const subBranches = parentBranch.Branches || []
    if (parentId === null) return subBranches.length + 1

    return parentId * 10 + (subBranches.length + 1)
  }
}

const findBranchById = (id: number, branches: AdventureBranch[]): AdventureBranch | null => {
  for (const branch of branches) {
    if (branch.ID === id) return branch
    if (branch.Branches && branch.Branches.length > 0) {
      const found = findBranchById(id, branch.Branches)
      if (found) return found
    }
  }
  return null
}

const addBranch = () => {
  const newBranch: AdventureBranch = {
    ID: generateBranchId(),
    Title: 'New Branch',
    Text: 'Enter your story text here...',
    IsEnd: false,
    Branches: [],
    x: 100 + props.adventure.Branches.length * 300,
    y: 100,
  }

  const updatedAdventure = {
    ...props.adventure,
    Branches: [...props.adventure.Branches, newBranch],
  }

  emit('update:adventure', updatedAdventure)
}

const addSubBranch = (parentBranch: AdventureBranch) => {
  const newBranch: AdventureBranch = {
    ID: generateBranchId(parentBranch.ID, 1),
    Title: 'New Sub-branch',
    Text: 'Enter your story text here...',
    IsEnd: false,
    Branches: [],
    x: parentBranch.x + 300,
    y: parentBranch.y + 150,
  }

  const addBranchToParent = (branches: AdventureBranch[]): AdventureBranch[] => {
    return branches.map((branch) => {
      if (branch.ID === parentBranch.ID) {
        const updatedBranch = {
          ...branch,
          Branches: [...(branch.Branches || []), newBranch],
        }
        return updatedBranch
      }
      if (branch.Branches && branch.Branches.length > 0) {
        return {
          ...branch,
          Branches: addBranchToParent(branch.Branches),
        }
      }
      return branch
    })
  }

  const updatedAdventure = {
    ...props.adventure,
    Branches: addBranchToParent(props.adventure.Branches),
  }

  // Update the parent component with the new adventure structure
  emit('update:adventure', updatedAdventure)
}

const editBranch = (branch: AdventureBranch) => {
  selectedBranch.value = branch
  isBranchEditorOpen.value = true
}

const deleteBranch = (branchToDelete: AdventureBranch) => {
  const removeBranch = (branches: AdventureBranch[]): AdventureBranch[] => {
    return branches.filter((branch) => {
      if (branch.ID === branchToDelete.ID) {
        return false
      }
      if (branch.Branches && branch.Branches.length > 0) {
        branch.Branches = removeBranch(branch.Branches)
      }
      return true
    })
  }

  const updatedAdventure = {
    ...props.adventure,
    Branches: removeBranch(props.adventure.Branches),
  }

  emit('update:adventure', updatedAdventure)
}

const startDrag = (event: MouseEvent, branch: AdventureBranch) => {
  event.preventDefault()
  isDragging = true
  currentBranch = branch
  startX = event.clientX - branch.x
  startY = event.clientY - branch.y

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging || !currentBranch) return
  event.preventDefault()
  currentBranch.x = event.clientX - startX
  currentBranch.y = event.clientY - startY
}

const stopDrag = () => {
  isDragging = false
  currentBranch = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const importStory = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFileImport = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || !input.files[0]) return

  const file = input.files[0]
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const importedStory = JSON.parse(content) as Adventure

      // Validate the imported story structure
      if (!isValidStory(importedStory)) {
        alert('Invalid story format. Please check the JSON file.')
        return
      }

      // Ensure all branches have coordinates
      const storyWithCoordinates = {
        ...importedStory,
        Branches: ensureBranchCoordinates(importedStory.Branches),
      }

      // Reset file input
      if (input) {
        input.value = ''
      }

      emit('update:adventure', storyWithCoordinates)
    } catch (error) {
      console.error('Error parsing JSON:', error)
      alert('Error parsing JSON file. Please check the file format.')
    }
  }

  reader.readAsText(file)
}

const isValidStory = (story: any): story is Adventure => {
  return (
    typeof story === 'object' &&
    story !== null &&
    typeof story.Title === 'string' &&
    typeof story.UsesTTS === 'boolean' &&
    typeof story.UsesVoicefiles === 'boolean' &&
    typeof story.HasSubtitles === 'boolean' &&
    typeof story.SubtitleExtension === 'string' &&
    typeof story.VoiceFileExtension === 'string' &&
    Array.isArray(story.Branches)
  )
}

// Add helper function to ensure branches have coordinates
const ensureBranchCoordinates = (branches: AdventureBranch[]): AdventureBranch[] => {
  return branches.map((branch, index) => ({
    ...branch,
    x: branch.x ?? 100 + index * 300,
    y: branch.y ?? 100,
    Branches: branch.Branches ? ensureBranchCoordinates(branch.Branches) : [],
  }))
}

const clearStory = () => {
  if (confirm('Are you sure you want to clear the entire story? This action cannot be undone.')) {
    const emptyAdventure: Adventure = {
      Title: props.adventure.Title,
      UsesTTS: props.adventure.UsesTTS,
      UsesVoicefiles: props.adventure.UsesVoicefiles,
      HasSubtitles: props.adventure.HasSubtitles,
      SubtitleExtension: props.adventure.SubtitleExtension,
      VoiceFileExtension: props.adventure.VoiceFileExtension,
      Branches: [],
    }
    emit('update:adventure', emptyAdventure)
  }
}

const openExportModal = () => {
  isExportModalOpen.value = true
}

const closeExportModal = () => {
  isExportModalOpen.value = false
}

const isFirstBranch = (branch: AdventureBranch | null): boolean => {
  if (!branch) return false
  return props.adventure.Branches.length > 0 && props.adventure.Branches[0].ID === branch.ID
}

const handleBranchUpdate = (updatedBranch: AdventureBranch) => {
  const updateBranchInTree = (branches: AdventureBranch[]): AdventureBranch[] => {
    return branches.map((branch) => {
      if (branch.ID === updatedBranch.ID) {
        return updatedBranch
      }
      if (branch.Branches && branch.Branches.length > 0) {
        return {
          ...branch,
          Branches: updateBranchInTree(branch.Branches),
        }
      }
      return branch
    })
  }

  const updatedAdventure = {
    ...props.adventure,
    Branches: updateBranchInTree(props.adventure.Branches),
  }

  emit('update:adventure', updatedAdventure)
  selectedBranch.value = {} as AdventureBranch
  isBranchEditorOpen.value = false
}

const closeBranchEditor = () => {
  selectedBranch.value = {} as AdventureBranch
  isBranchEditorOpen.value = false
}

const hasUnendedBranches = computed(() => {
  const checkBranch = (branch: AdventureBranch): boolean => {
    if (branch.IsEnd) return false
    if (!branch.Branches || branch.Branches.length === 0) return true
    return branch.Branches.some(checkBranch)
  }
  return props.adventure.Branches.some(checkBranch)
})

const isWarningBranch = (branch: AdventureBranch): boolean => {
  return !branch.IsEnd && (!branch.Branches || branch.Branches.length === 0)
}

const truncateText = (text: string): string => {
  if (text.length <= 100) return text
  return text.substring(0, 97)
}

const saveStory = () => {
  saveState(props.adventure)
  saveLastExport(props.adventure)
}

// Handle beforeunload event
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// Add zoom handlers
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  const delta = event.deltaY
  const zoomFactor = 0.001
  const newZoom = Math.max(0.1, Math.min(2, zoomLevel.value - delta * zoomFactor))
  zoomLevel.value = newZoom
}

// Compare current state with last export
const checkForUnsavedChanges = (currentState: Adventure) => {
  const lastExport = loadLastExport()
  if (!lastExport) {
    hasUnsavedChanges.value = true
    return
  }

  // Simple deep comparison
  const currentStateStr = JSON.stringify(currentState)
  const lastExportStr = JSON.stringify(lastExport)
  hasUnsavedChanges.value = currentStateStr !== lastExportStr
}

// Save state to local storage
const saveState = (adventure: Adventure) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adventure))
  } catch (error) {
    console.error('Error saving state to local storage:', error)
  }
}

// Load state from local storage
const loadState = (): Adventure | null => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      const parsed = JSON.parse(savedState)
      if (isValidStory(parsed)) {
        return {
          ...parsed,
          Branches: ensureBranchCoordinates(parsed.Branches),
        }
      }
    }
  } catch (error) {
    console.error('Error loading state from local storage:', error)
  }
  return null
}

// Save last exported state
const saveLastExport = (adventure: Adventure) => {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(adventure))
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('Error saving last export to local storage:', error)
  }
}

// Load last exported state
const loadLastExport = (): Adventure | null => {
  try {
    const savedState = localStorage.getItem(LAST_EXPORT_KEY)
    if (savedState) {
      const parsed = JSON.parse(savedState)
      if (isValidStory(parsed)) {
        return {
          ...parsed,
          Branches: ensureBranchCoordinates(parsed.Branches),
        }
      }
    }
  } catch (error) {
    console.error('Error loading last export from local storage:', error)
  }
  return null
}

// Watch for changes to the adventure and update unsaved status
watch(
  () => props.adventure,
  (newAdventure) => {
    saveState(newAdventure)
    checkForUnsavedChanges(newAdventure)
  },
  { deep: true },
)
</script>

<style scoped>
.story-editor {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  color: #333;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  flex-shrink: 0;
}

.editor-header h2 {
  color: #333;
  margin: 0;
}

.story-canvas {
  width: 100%;
  height: calc(100% - 60px);
  position: relative;
  background-color: #fff;
  overflow: auto;
  padding: 2rem;
}

.canvas-content {
  transform-origin: 0 0;
  transition: transform 0.1s ease-out;
  position: relative;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
  transform-origin: 0 0;
}

.branch-node {
  position: absolute;
  width: 250px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: move;
  z-index: 1;
  transition: background-color 0.3s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.branch-node.ending-branch {
  background-color: #ffebee;
  border-color: #ef9a9a;
}

.branch-node.warning-branch {
  background-color: #fff3cd;
  border-color: #ffeeba;
}

.branch-node.warning-branch .branch-header h3 {
  color: #856404;
}

.branch-actions {
  display: flex;
  gap: 0.25rem;
}

.branch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.branch-header h3 {
  color: #333;
  margin: 0;
  font-size: 1.1rem;
  flex: 1;
  margin-right: 0.5rem;
}

.branch-content {
  margin: 0.5rem 0;
  color: #333;
  font-size: 0.9rem;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.branch-content p {
  margin: 0;
  color: #333;
  line-height: 1.3;
}

.branch-content p.truncated::after {
  content: '...';
  color: #666;
  font-weight: bold;
  margin-left: 2px;
}

.editor-controls {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-small {
  padding: 0.25rem;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.8rem;
  font-size: 1rem;
  line-height: 1;
}

.btn-danger {
  background-color: #f44336;
}

.btn-danger:hover {
  background-color: #d32f2f;
}

.warning-banner {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.75rem;
  text-align: center;
  border-bottom: 1px solid #ffeeba;
  font-weight: 500;
}

.unsaved-changes-banner {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.75rem;
  text-align: center;
  border-bottom: 1px solid #ffeeba;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 100;
}

.btn-success {
  background-color: #4caf50;
  color: white;
}

.btn-success:hover {
  background-color: #388e3c;
}
</style>
