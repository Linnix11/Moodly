/** Accès au localStorage qui ne plante jamais (navigation privée, stockage bloqué). */
export function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // stockage indisponible : on continue sans mémoriser
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // idem
  }
}
