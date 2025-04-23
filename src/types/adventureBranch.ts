export interface Choice {
  Label: string
  Target: string
  Type: 'direct' | 'loop' | 'jump'
}

export interface AdventureBranch {
  ID: string
  Title: string
  Text: string
  IsEnd: boolean
  Choices: Choice[]
  x?: number
  y?: number
}
