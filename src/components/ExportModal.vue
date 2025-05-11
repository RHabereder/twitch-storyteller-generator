<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Export Story</h3>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="hasUnendedBranches" class="warning-banner">
          ⚠️ Warning: This story contains branches without endings. The storyteller might not work
          correctly with this story.
        </div>

        <div v-if="hasInfiniteLoops" class="warning-banner">
          ⚠️ Warning: This story contains infinite loops. The storyteller might get stuck in these
          loops.
        </div>

        <div v-if="hasUnendedBranches || hasInfiniteLoops" class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="confirmExport" />
            I understand that this story might not work correctly in the storyteller and want to
            proceed anyway
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="includeSubtitles" />
            Generate subtitle files
          </label>
        </div>

        <div class="form-group" v-if="includeSubtitles">
          <label for="subtitle-format">Subtitle Format</label>
          <select id="subtitle-format" v-model="subtitleFormat" class="form-control">
            <option value="txt">Plain Text (.txt)</option>
            <option value="srt">SubRip (.srt)</option>
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn"
          @click="handleExport"
          :disabled="(hasUnendedBranches || hasInfiniteLoops) && !confirmExport"
        >
          Export
        </button>
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Adventure } from '@/types/adventure'
import type { AdventureBranch } from '@/types/adventureBranch'
import JSZip from 'jszip'

const props = defineProps<{
  isOpen: boolean
  adventure: Adventure
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const includeSubtitles = ref(false)
const subtitleFormat = ref('txt')
const confirmExport = ref(false)

const hasUnendedBranches = computed(() => {
  return Object.values(props.adventure.Branches).some((branch) => {
    if (branch.IsEnd) return false
    if (!branch.Choices || branch.Choices.length === 0) return true
    return false
  })
})

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

const closeModal = () => {
  emit('close')
}

const handleExport = async () => {
  try {
    // Create a directory name from the adventure title
    const dirName = props.adventure.Title.toLowerCase().replace(/\s+/g, '-')

    if (includeSubtitles.value) {
      // Create a new JSZip instance
      const zip = new JSZip()

      // Add story.json to the root of the zip
      zip.file('story.json', JSON.stringify(props.adventure, null, 2))

      // Generate subtitles for each branch
      Object.entries(props.adventure.Branches).forEach(([id, branch]) => {
        const subtitleContent = generateSubtitleContent(branch)
        const fileName = `${id}${props.adventure.SubtitleExtension}`
        zip.file(fileName, subtitleContent)
      })

      // Generate the zip file
      const content = await zip.generateAsync({ type: 'blob' })

      // Create a download link
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `${dirName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } else {
      // Export as JSON file
      const storyJson = JSON.stringify(props.adventure, null, 2)
      const blob = new Blob([storyJson], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${dirName}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    }

    // Close the modal
    emit('close')
  } catch (error) {
    console.error('Error exporting story:', error)
    alert('Error exporting story. Please try again.')
  }
}

const generateSubtitleContent = (branch: AdventureBranch) => {
  let content = branch.Text.replace(/\./g, '.\n')
  if (subtitleFormat.value === 'srt') {
    content = `1\n00:00:00,000 --> 00:00:05,000\n${content}\n\n`
  }
  return content
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

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.warning-banner {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.75rem;
  text-align: center;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-weight: 500;
}
</style>
