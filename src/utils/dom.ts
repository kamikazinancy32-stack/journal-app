/**
 * GENERIC element lookup with a constraint: T must be some kind of Element.
 * getElement('#entry-form', HTMLFormElement) returns an HTMLFormElement, so we
 * get autocomplete for .reset(), .elements, etc. without any casting.
 */
export function getElement<T extends Element>(
  selector: string,
  type: { new (): T; prototype: T },
  root: ParentNode = document,
): T {
  const element: Element | null = root.querySelector(selector)
  if (!(element instanceof type)) {
    throw new Error(`Expected ${selector} to exist and be a ${type.name}`)
  }
  return element
}

/** Makes user text safe to put inside innerHTML (prevents HTML injection). */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
