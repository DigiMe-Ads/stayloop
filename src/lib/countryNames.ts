export const countryNames: Record<string, string> = {
  LK: 'Sri Lanka',
  ID: 'Indonesia',
  JP: 'Japan',
  NP: 'Nepal',
}

export function countryName(code: string) {
  return countryNames[code] ?? code
}