export interface AdventureBranch {
  ID: number,
  Title: string,
  Text: string,
  IsEnd: boolean,
  Branches: AdventureBranch[]
  y: number,
  x: number,
}
