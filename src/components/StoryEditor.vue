<template>
  <div class="story-editor">
    <div class="story-canvas" ref="canvas">
      <div class="canvas-toolbar">
        <div class="toolbar-left">
          <slot name="toolbar"></slot>
        </div>
        <div class="toolbar-center">
          <button
            v-if="Object.keys(adventure.Branches).length === 0"
            @click="addBranch"
            class="btn"
          >
            Add Root Branch
          </button>
          <button class="btn" @click="addBranchAtMouse">Add Branch</button>
          <button @click="saveStory" class="btn" :class="{ 'btn-success': !hasUnsavedChanges }">
            {{ hasUnsavedChanges ? 'Save' : 'Story Saved' }}
          </button>
          <button @click="importStory" class="btn">Import</button>
          <button
            v-if="Object.keys(adventure.Branches).length > 0"
            @click="openExportModal"
            class="btn"
          >
            Export
          </button>
          <button @click="clearStory" class="btn btn-danger">Clear</button>
          <input
            type="file"
            ref="fileInput"
            @change="handleFileImport"
            accept=".json"
            style="display: none"
          />
        </div>
        <div class="toolbar-right">
          <button
            v-if="Object.keys(adventure.Branches).length > 0"
            @click="openConverter"
            class="btn"
          >
            Convert old Story
          </button>
        </div>
      </div>

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
            <template v-if="branch.Choices && branch.Choices.length > 0">
              <line
                v-for="(choice, index) in branch.Choices"
                :key="'line-' + branch.ID + '-' + choice.Target"
                :x1="
                  getBranchCoordinates(branch).x +
                  125 +
                  (index - (branch.Choices.length - 1) / 2) * 20
                "
                :y1="getBranchCoordinates(branch).y + 100"
                :x2="
                  getTargetBranchCoordinates(choice.Target).x +
                  125 +
                  (index - (branch.Choices.length - 1) / 2) * 20
                "
                :y2="getTargetBranchCoordinates(choice.Target).y + 20"
                :stroke="getConnectionColor(choice.Type)"
                :stroke-width="2 / zoomLevel"
                class="connection-line"
                @click="removeConnection(branch, choice)"
                :title="`Click to remove connection: ${choice.Label} (${choice.Type})`"
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
            'loop-branch': isInLoop(branch.ID),
          }"
          :style="{
            left: getBranchCoordinates(branch).x + 'px',
            top: getBranchCoordinates(branch).y + 'px',
          }"
          :data-branch-id="branch.ID"
        >
          <div class="branch-connectors">
            <div
              class="connector left-connector"
              @mousedown="startConnection($event, branch)"
              :class="{ disabled: branch.Choices.length >= 3 }"
              :title="branch.Choices.length >= 3 ? 'Maximum 3 choices per branch' : 'Connector'"
            ></div>
            <div
              class="connector right-connector"
              @mousedown="startConnection($event, branch)"
              :class="{ disabled: branch.Choices.length >= 3 }"
              :title="branch.Choices.length >= 3 ? 'Maximum 3 choices per branch' : 'Connector'"
            ></div>
          </div>
          <div class="branch-content" @mousedown="startDrag($event, branch)">
            <div class="branch-header">
              <h3>{{ branch.Title }}</h3>
              <div class="branch-actions">
                <button @click="editBranch(branch)" class="btn-small" title="Edit branch">
                  ✏️
                </button>
                <button @click="deleteBranch(branch)" class="btn-small" title="Delete branch">
                  🗑️
                </button>
              </div>
            </div>
            <div class="branch-text">
              <p :class="{ truncated: branch.Text.length > 100 }">
                {{ truncateText(branch.Text) }}
              </p>
              <div v-if="branch.Choices.length > 0" class="branch-choices">
                <div
                  v-for="choice in branch.Choices"
                  :key="choice.Target"
                  class="choice-label"
                  :style="{ color: getConnectionColor(choice.Type) }"
                >
                  {{ choice.Label }} ({{ choice.Type }})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="canvas-warnings"
        v-if="hasUnendedBranches || hasInfiniteLoops || hasUnsavedChanges"
      >
        <div v-if="hasUnendedBranches" class="warning-banner">
          ⚠️ Warning: Some branches do not have endings! Please ensure all story paths lead to an
          ending.
        </div>

        <div v-if="hasInfiniteLoops" class="warning-banner">
          ⚠️ Warning: Infinite loops detected! Some branches create cycles that could lead to
          endless repetition.
        </div>

        <div v-if="hasUnsavedChanges" class="warning-banner">
          ⚠️ You have unsaved changes. Please save your story to preserve your progress.
        </div>
      </div>
    </div>

    <ExportModal
      v-if="isExportModalOpen"
      :is-open="isExportModalOpen"
      :adventure="adventure"
      @close="closeExportModal"
    />

    <StoryConverter
      v-if="isConverterOpen"
      :is-open="isConverterOpen"
      :adventure="adventure"
      @close="closeConverter"
      @update:story="handleStoryUpdate"
    />

    <BranchEditor
      v-if="isBranchEditorOpen"
      :is-open="isBranchEditorOpen"
      :branch="selectedBranch"
      :is-first-branch="isFirstBranch(selectedBranch)"
      :adventure="adventure"
      @update:branch="handleBranchUpdate"
      @close="closeBranchEditor"
    />

    <ChoiceModal
      v-if="isChoiceModalOpen"
      :is-open="isChoiceModalOpen"
      :target-branch-id="targetBranch?.ID ?? ''"
      @save="handleChoiceSave"
      @close="isChoiceModalOpen = false"
    />

    <ImportChoiceModal
      v-if="isImportChoiceModalOpen"
      @choice="handleImportChoice"
      @close="isImportChoiceModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import type { Adventure } from '@/types/adventure'
import type { AdventureBranch, Choice } from '@/types/adventureBranch'
import ExportModal from './ExportModal.vue'
import BranchEditor from './BranchEditor.vue'
import ChoiceModal from './ChoiceModal.vue'
import StoryConverter from './StoryConverter.vue'
import ImportChoiceModal from './ImportChoiceModal.vue'

const props = defineProps<{
  adventure: Adventure
  isModalOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:adventure', value: Adventure): void
  (e: 'edit-branch', value: AdventureBranch): void
  (e: 'story-imported'): void
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
const isConverterOpen = ref(false)
const isBranchEditorOpen = ref(false)
const selectedBranch = ref({} as AdventureBranch)
const isChoiceModalOpen = ref(false)
const sourceBranch = ref<AdventureBranch | null>(null)
const targetBranch = ref<AdventureBranch | null>(null)
const isOutputConnection = ref(false)

const STORAGE_KEY = 'twitch-storyteller-state'
const LAST_EXPORT_KEY = 'twitch-storyteller-last-export'

// Track if there are unsaved changes
const hasUnsavedChanges = ref(false)

const floatingPanel = ref<HTMLElement | null>(null)
let isPanelDragging = false
let panelStartX = 0
let panelStartY = 0

const isImportChoiceModalOpen = ref(false)
const importedStory = ref<Adventure | null>(null)

onMounted(() => {
  const savedState = loadState()
  if (savedState) {
    emit('update:adventure', savedState)
  }

  // Initialize branch positions if not set
  Object.entries(props.adventure.Branches).forEach(([id, branch]) => {
    if (!branch.x || !branch.y) {
      const index = parseInt(id)
      branch.x = 100 + (isNaN(index) ? 0 : index * 300)
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
  return Object.values(props.adventure.Branches)
})

const generateBranchId = (): string => {
  const existingIds = Object.keys(props.adventure.Branches).map((id) => parseInt(id))
  const maxId = Math.max(0, ...existingIds)
  return (maxId + 1).toString()
}

// Add helper function to get branch coordinates
const getBranchCoordinates = (branch: AdventureBranch) => {
  return {
    x: branch.x ?? 0,
    y: branch.y ?? 0,
  }
}

// Add helper function to get target branch coordinates
const getTargetBranchCoordinates = (targetId: string) => {
  const targetBranch = props.adventure.Branches[targetId]
  return targetBranch
    ? {
        x: targetBranch.x ?? 0,
        y: targetBranch.y ?? 0,
      }
    : {
        x: 0,
        y: 0,
      }
}

const addBranch = () => {
  const newBranch: AdventureBranch = {
    ID: 'start',
    Title: 'New Branch',
    Text: 'Enter your story text here...',
    IsEnd: false,
    Choices: [],
    x: 100 + Object.keys(props.adventure.Branches).length * 300,
    y: 100,
  }

  const updatedAdventure = {
    ...props.adventure,
    Branches: {
      ...props.adventure.Branches,
      [newBranch.ID]: newBranch,
    },
  }

  emit('update:adventure', updatedAdventure)
}

const editBranch = (branch: AdventureBranch) => {
  selectedBranch.value = branch
  isBranchEditorOpen.value = true
}

const deleteBranch = (branchToDelete: AdventureBranch) => {
  // Create a copy of branches without the deleted branch
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [branchToDelete.ID]: removed, ...remainingBranches } = props.adventure.Branches

  // Remove references to the deleted branch from other branches' choices
  const updatedBranches = Object.entries(remainingBranches).reduce<{
    [key: string]: AdventureBranch
  }>((acc, [id, branch]) => {
    const updatedChoices = branch.Choices.filter((choice) => choice.Target !== branchToDelete.ID)
    acc[id] = {
      ...branch,
      Choices: updatedChoices,
    }
    return acc
  }, {})

  const updatedAdventure = {
    ...props.adventure,
    Branches: updatedBranches,
  }

  emit('update:adventure', updatedAdventure)
}

const startDrag = (event: MouseEvent, branch: AdventureBranch) => {
  event.preventDefault()
  isDragging = true
  currentBranch = branch
  startX = event.clientX - (branch.x ?? 0)
  startY = event.clientY - (branch.y ?? 0)

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
      const parsedStory = JSON.parse(content)

      // Validate the imported story structure
      if (!isValidStory(parsedStory)) {
        alert('Invalid story format. Please check the JSON file.')
        return
      }

      // Convert the imported story to the new format
      const convertedStory = convertImportedStory(parsedStory)
      importedStory.value = convertedStory
      isImportChoiceModalOpen.value = true

      // Reset file input
      if (input) {
        input.value = ''
      }
    } catch (error) {
      console.error('Error parsing JSON:', error)
      alert('Error parsing JSON file. Please check the file format.')
    }
  }

  reader.readAsText(file)
}

const isValidStory = (story: unknown): story is Adventure => {
  return (
    typeof story === 'object' &&
    story !== null &&
    typeof (story as Adventure).Title === 'string' &&
    typeof (story as Adventure).UsesTTS === 'boolean' &&
    typeof (story as Adventure).UsesVoicefiles === 'boolean' &&
    typeof (story as Adventure).HasSubtitles === 'boolean' &&
    typeof (story as Adventure).SubtitleExtension === 'string' &&
    typeof (story as Adventure).VoiceFileExtension === 'string' &&
    (Array.isArray((story as Adventure).Branches) ||
      typeof (story as Adventure).Branches === 'object')
  )
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
      Branches: {},
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
  const firstBranchId = Object.keys(props.adventure.Branches)[0]
  return firstBranchId === branch.ID
}

const handleBranchUpdate = (updatedBranch: AdventureBranch) => {
  // Create a copy of branches without the old branch (if ID changed)
  const remainingBranches = { ...props.adventure.Branches }
  delete remainingBranches[selectedBranch.value.ID]

  // Create updated branches with the new branch
  const updatedBranches = {
    ...remainingBranches,
    [updatedBranch.ID]: updatedBranch,
  }

  // Update any choices that reference the old ID
  Object.values(updatedBranches).forEach((branch) => {
    if (branch.Choices) {
      branch.Choices.forEach((choice) => {
        if (choice.Target === selectedBranch.value.ID) {
          choice.Target = updatedBranch.ID
        }
      })
    }
  })

  const updatedAdventure = {
    ...props.adventure,
    Branches: updatedBranches,
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
  return Object.values(props.adventure.Branches).some((branch) => {
    if (branch.IsEnd) return false
    if (!branch.Choices || branch.Choices.length === 0) return true
    return false
  })
})

const isWarningBranch = (branch: AdventureBranch): boolean => {
  return !branch.IsEnd && (!branch.Choices || branch.Choices.length === 0)
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

// Save last exported state
const saveLastExport = (adventure: Adventure) => {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(adventure))
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('Error saving last export to local storage:', error)
  }
}

// Add helper function to ensure branch coordinates
const ensureBranchCoordinates = (branch: AdventureBranch, index: number): AdventureBranch => {
  const defaultX = 100 + index * 300
  const defaultY = 100
  return {
    ...branch,
    x:
      branch.x !== undefined && typeof branch.x === 'number' && !isNaN(branch.x)
        ? branch.x
        : defaultX,
    y:
      branch.y !== undefined && typeof branch.y === 'number' && !isNaN(branch.y)
        ? branch.y
        : defaultY,
  }
}

// Add helper function to convert imported story
const convertImportedStory = (importedStory: Adventure): Adventure => {
  const branchesArray = Array.isArray(importedStory.Branches)
    ? (importedStory.Branches as AdventureBranch[])
    : (Object.values(importedStory.Branches) as AdventureBranch[])
  const branchesWithCoordinates = branchesArray.map((branch, index) =>
    ensureBranchCoordinates(branch, index),
  )
  return {
    ...importedStory,
    Branches: branchesWithCoordinates.reduce<{ [key: string]: AdventureBranch }>((acc, branch) => {
      acc[branch.ID] = branch
      return acc
    }, {}),
  }
}

// Update loadState and loadLastExport to use the new helper function
const loadState = (): Adventure | null => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      const parsed = JSON.parse(savedState)
      if (isValidStory(parsed)) {
        return convertImportedStory(parsed)
      }
    }
  } catch (error) {
    console.error('Error loading state from local storage:', error)
  }
  return null
}

const loadLastExport = (): Adventure | null => {
  try {
    const savedState = localStorage.getItem(LAST_EXPORT_KEY)
    if (savedState) {
      const parsed = JSON.parse(savedState)
      if (isValidStory(parsed)) {
        return convertImportedStory(parsed)
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

const startConnection = (event: MouseEvent, branch: AdventureBranch) => {
  event.preventDefault()
  event.stopPropagation()

  if (branch.Choices.length >= 3) return // Don't allow more than 3 choices

  sourceBranch.value = branch
  isOutputConnection.value = true // Always treat as output connection

  document.addEventListener('mousemove', drawConnection)
  document.addEventListener('mouseup', endConnection)
}

const drawConnection = (event: MouseEvent) => {
  if (!sourceBranch.value) return

  // Clear any existing temporary line
  const existingLine = document.querySelector('.temporary-connection')
  if (existingLine) {
    existingLine.remove()
  }

  // Get source branch coordinates
  const sourceCoords = getBranchCoordinates(sourceBranch.value)
  const sourceX = sourceCoords.x + (isOutputConnection.value ? 250 : 0)
  const sourceY = sourceCoords.y + 50

  // Get canvas position and scroll
  const canvas = document.querySelector('.story-canvas')
  if (!canvas) return

  const scrollLeft = canvas.scrollLeft
  const scrollTop = canvas.scrollTop

  // Get the canvas content element to account for padding
  const canvasContent = document.querySelector('.canvas-content')
  if (!canvasContent) return

  const contentRect = canvasContent.getBoundingClientRect()

  // Calculate target coordinates relative to canvas, accounting for padding and zoom
  const targetX = (event.clientX - contentRect.left + scrollLeft) / zoomLevel.value
  const targetY = (event.clientY - contentRect.top + scrollTop) / zoomLevel.value

  // Create temporary line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', sourceX.toString())
  line.setAttribute('y1', sourceY.toString())
  line.setAttribute('x2', targetX.toString())
  line.setAttribute('y2', targetY.toString())
  line.setAttribute('stroke', '#4caf50')
  line.setAttribute('stroke-width', '2')
  line.classList.add('temporary-connection')

  const svg = document.querySelector('.connections-layer')
  if (svg) {
    svg.appendChild(line)
  }
}

const endConnection = (event: MouseEvent) => {
  if (!sourceBranch.value) return

  // Remove temporary line
  const existingLine = document.querySelector('.temporary-connection')
  if (existingLine) {
    existingLine.remove()
  }

  // Find target branch under cursor
  const targetElement = document.elementFromPoint(event.clientX, event.clientY)
  const targetNode = targetElement?.closest('.branch-node')
  if (targetNode) {
    const targetId = targetNode.getAttribute('data-branch-id')
    if (targetId && targetId !== sourceBranch.value.ID) {
      targetBranch.value = props.adventure.Branches[targetId]
      if (!targetBranch.value.IsEnd) {
        isChoiceModalOpen.value = true
      } else {
        // Only clear if we're not opening the modal
        sourceBranch.value = null
        targetBranch.value = null
      }
    } else {
      // Clear if target is invalid
      sourceBranch.value = null
      targetBranch.value = null
    }
  } else {
    // Clear if no target found
    sourceBranch.value = null
    targetBranch.value = null
  }

  document.removeEventListener('mousemove', drawConnection)
  document.removeEventListener('mouseup', endConnection)
}

const handleChoiceSave = (choice: Choice) => {
  console.log('handleChoiceSave called with:', {
    choice,
    sourceBranch: sourceBranch.value,
    targetBranch: targetBranch.value,
  })

  if (!sourceBranch.value || !targetBranch.value) {
    console.log('Missing source or target branch')
    return
  }

  // Only allow output connections to create choices
  if (isOutputConnection.value) {
    // Create a new choice with the target branch ID
    const newChoice: Choice = {
      Label: choice.Label,
      Target: targetBranch.value.ID,
      Type: choice.Type,
    }

    console.log('Creating new choice:', newChoice)

    // Create a new branch with the updated choices array
    const updatedBranch = {
      ...sourceBranch.value,
      Choices: [...(sourceBranch.value.Choices || []), newChoice],
    }

    console.log('Updated branch:', updatedBranch)

    // Create a new adventure with the updated branch
    const updatedAdventure = {
      ...props.adventure,
      Branches: {
        ...props.adventure.Branches,
        [sourceBranch.value.ID]: updatedBranch,
      },
    }

    console.log('Emitting updated adventure:', updatedAdventure)
    // Emit the update
    emit('update:adventure', updatedAdventure)
  } else {
    console.log('Not an output connection, skipping choice creation')
  }

  // Clean up after the modal is closed
  isChoiceModalOpen.value = false
  // Don't clear sourceBranch and targetBranch here, let the modal close event handle it
}

const removeConnection = (branch: AdventureBranch, choice: Choice) => {
  if (!confirm(`Are you sure you want to remove the connection "${choice.Label}"?`)) {
    return
  }

  // Create a new branch with the choice removed
  const updatedBranch = {
    ...branch,
    Choices: branch.Choices.filter((c) => c.Target !== choice.Target),
  }

  // Create a new adventure with the updated branch
  const updatedAdventure = {
    ...props.adventure,
    Branches: {
      ...props.adventure.Branches,
      [branch.ID]: updatedBranch,
    },
  }

  // Emit the update
  emit('update:adventure', updatedAdventure)
}

const getConnectionColor = (type: string): string => {
  switch (type) {
    case 'loop':
      return '#1565c0' // Darker blue
    case 'jump':
      return '#f57f17' // Darker yellow/orange
    default:
      return '#2e7d32' // Darker green (direct)
  }
}

const hasInfiniteLoops = computed(() => {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  const hasCycle = (branchId: string): boolean => {
    if (recursionStack.has(branchId)) {
      return true // Cycle detected
    }
    if (visited.has(branchId)) {
      return false // Already checked this branch
    }

    visited.add(branchId)
    recursionStack.add(branchId)

    const branch = props.adventure.Branches[branchId]
    if (branch && branch.Choices) {
      for (const choice of branch.Choices) {
        if (hasCycle(choice.Target)) {
          return true
        }
      }
    }

    recursionStack.delete(branchId)
    return false
  }

  // Check each branch for cycles
  for (const branchId of Object.keys(props.adventure.Branches)) {
    if (hasCycle(branchId)) {
      return true
    }
  }

  return false
})

const isInLoop = (branchId: string): boolean => {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  const hasCycle = (currentId: string): boolean => {
    if (recursionStack.has(currentId)) {
      return currentId === branchId // Only return true if the cycle includes our target branch
    }
    if (visited.has(currentId)) {
      return false
    }

    visited.add(currentId)
    recursionStack.add(currentId)

    const branch = props.adventure.Branches[currentId]
    if (branch && branch.Choices) {
      for (const choice of branch.Choices) {
        if (hasCycle(choice.Target)) {
          return true
        }
      }
    }

    recursionStack.delete(currentId)
    return false
  }

  return hasCycle(branchId)
}

const startPanelDrag = (event: MouseEvent) => {
  if (!floatingPanel.value) return
  isPanelDragging = true
  panelStartX = event.clientX - floatingPanel.value.offsetLeft
  panelStartY = event.clientY - floatingPanel.value.offsetTop

  document.addEventListener('mousemove', onPanelDrag)
  document.addEventListener('mouseup', stopPanelDrag)
}

const onPanelDrag = (event: MouseEvent) => {
  if (!isPanelDragging || !floatingPanel.value) return
  event.preventDefault()
  floatingPanel.value.style.left = `${event.clientX - panelStartX}px`
  floatingPanel.value.style.top = `${event.clientY - panelStartY}px`
}

const stopPanelDrag = () => {
  isPanelDragging = false
  document.removeEventListener('mousemove', onPanelDrag)
  document.removeEventListener('mouseup', stopPanelDrag)
}

const addBranchAtMouse = (event: MouseEvent) => {
  if (!canvas.value) return

  // Get canvas position and scroll
  const scrollLeft = canvas.value.scrollLeft
  const scrollTop = canvas.value.scrollTop

  // Get the canvas content element to account for padding
  const canvasContent = document.querySelector('.canvas-content')
  if (!canvasContent) return

  const contentRect = canvasContent.getBoundingClientRect()

  // Calculate position relative to canvas, accounting for padding and zoom
  const x = (event.clientX - contentRect.left + scrollLeft) / zoomLevel.value
  const y = (event.clientY - contentRect.top + scrollTop) / zoomLevel.value

  const newBranch: AdventureBranch = {
    ID: generateBranchId(),
    Title: 'New Branch',
    Text: 'Enter your story text here...',
    IsEnd: false,
    Choices: [],
    x,
    y,
  }

  const updatedAdventure = {
    ...props.adventure,
    Branches: {
      ...props.adventure.Branches,
      [newBranch.ID]: newBranch,
    },
  }

  emit('update:adventure', updatedAdventure)
}

const handleStoryUpdate = (newStory: Adventure) => {
  emit('update:adventure', newStory)
}

const openConverter = () => {
  isConverterOpen.value = true
}

const closeConverter = () => {
  isConverterOpen.value = false
}

const handleImportChoice = (choice: 'update' | 'new') => {
  if (!importedStory.value) return

  if (choice === 'update') {
    emit('update:adventure', importedStory.value)
  } else {
    // Create a new story with the imported data
    const newStory: Adventure = {
      ...importedStory.value,
      Title: `${importedStory.value.Title} (Imported)`,
    }

    // Save the new story to local storage with a unique key that includes a timestamp
    const timestamp = new Date().getTime()
    const storyKey = `twitch-storyteller-story-${newStory.Title}-${timestamp}`
    localStorage.setItem(storyKey, JSON.stringify(newStory))

    emit('update:adventure', newStory)
    // Emit an event to notify that a story was imported
    emit('story-imported')
  }

  isImportChoiceModalOpen.value = false
  importedStory.value = null
}
</script>

<style scoped>
.story-editor {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  color: #333;
  display: flex;
  flex-direction: column;
}

.story-canvas {
  width: 100%;
  flex: 1;
  position: relative;
  background-color: #fff;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.canvas-toolbar {
  position: sticky;
  top: 0;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  padding: 0.75rem;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  min-width: 300px;
}

.toolbar-center {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  min-width: 300px;
  justify-content: flex-end;
}

.canvas-content {
  flex: 1;
  position: relative;
  margin: 2rem 0;
  height: 100%;
  width: 100%;
  transform-origin: 0 0;
  transition: transform 0.1s ease-out;
  padding: 0 2rem;
}

.canvas-warnings {
  position: sticky;
  bottom: 0;
  background-color: white;
  margin: 0 -2rem -2rem -2rem;
  border-top: 1px solid #ddd;
}

.warning-banner {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.75rem;
  text-align: center;
  border-bottom: 1px solid #ffeeba;
  font-weight: 500;
}

.warning-banner:last-child {
  border-bottom: none;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
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
  z-index: 1;
  transition: background-color 0.3s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.branch-node.ending-branch {
  background-color: #e8f5e9;
  border-color: #2e7d32;
}

.branch-node.ending-branch .branch-header h3 {
  color: #1b5e20;
}

.branch-node.loop-branch {
  background-color: #ffebee;
  border-color: #c62828;
}

.branch-node.loop-branch .branch-header h3 {
  color: #b71c1c;
}

.branch-node.warning-branch {
  background-color: #fff3cd;
  border-color: #ffeeba;
}

.branch-node.warning-branch .branch-header h3 {
  color: #856404;
}

.branch-connectors {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.connector {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: #4caf50;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
  top: 50%;
  transform: translateY(-50%);
}

.left-connector {
  left: -6px;
}

.right-connector {
  right: -6px;
}

.connector:hover:not(.disabled) {
  transform: translateY(-50%) scale(1.2);
  background-color: #45a049;
}

.connector.disabled {
  background-color: #ccc;
  cursor: not-allowed;
  pointer-events: none;
}

.branch-content {
  position: relative;
  z-index: 1;
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

.branch-text {
  margin: 0.5rem 0;
  color: #333;
  font-size: 0.9rem;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.branch-text p {
  margin: 0;
  color: #333;
  line-height: 1.3;
}

.branch-text p.truncated::after {
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

.btn-success {
  background-color: #4caf50;
  color: white;
}

.btn-success:hover {
  background-color: #388e3c;
}

.branch-choices {
  margin-top: 0.5rem;
  border-top: 1px solid #eee;
  padding-top: 0.5rem;
}

.choice-label {
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.branch-node:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.temporary-connection {
  pointer-events: none;
}

.connection-line {
  cursor: pointer;
  transition: stroke-width 0.2s ease;
}

.connection-line:hover {
  stroke-width: 4px !important;
  stroke: #f44336;
}

.floating-panel {
  display: none;
}
</style>
