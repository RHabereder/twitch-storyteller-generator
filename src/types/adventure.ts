import type { AdventureBranch } from '@/types/adventureBranch'

export interface Adventure {
  Title: string
  UsesTTS: boolean
  UsesVoicefiles: boolean
  HasSubtitles: boolean
  SubtitleExtension: string
  VoiceFileExtension: string
  Branches: { [key: string]: AdventureBranch }
  exportDate?: string
}
