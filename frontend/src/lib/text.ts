export function decodeHtmlEntities(value: string | null | undefined): string {
  if (!value || !value.includes('&')) return value || ''
  const el = document.createElement('textarea')
  el.innerHTML = value
  return el.value
}
