import axe from 'axe-core'

/**
 * Runs axe-core against rendered markup and returns readable violations.
 * Colour contrast can't be measured in jsdom (no layout or computed colours),
 * so it's checked separately in contrast.test.ts.
 */
export async function accessibilityViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  )
}
