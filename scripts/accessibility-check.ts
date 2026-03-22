/**
 * Accessibility & Touch Target Checker
 * Scans .tsx files for accessibility issues that affect mobile UX.
 *
 * Usage: npx tsx scripts/accessibility-check.ts
 */

import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

const SRC_DIR = join(__dirname, "..", "src")

interface Finding {
  file: string
  line: number
  check: string
  message: string
  severity: "error" | "warn"
}

function getAllTsxFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === "node_modules" || entry === ".next" || entry === "ui") continue
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...getAllTsxFiles(full))
    } else if (entry.endsWith(".tsx")) {
      files.push(full)
    }
  }
  return files
}

function auditFile(filePath: string): Finding[] {
  const content = readFileSync(filePath, "utf-8")
  const lines = content.split("\n")
  const findings: Finding[] = []
  const rel = relative(join(__dirname, ".."), filePath)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()

    // Skip imports and comments
    if (trimmed.startsWith("import ") || trimmed.startsWith("//") || trimmed.startsWith("*")) continue

    // A11Y-002: Images without alt text
    if (/<img\s/.test(line) && !line.includes("alt=")) {
      findings.push({
        file: rel,
        line: i + 1,
        check: "A11Y-002",
        message: "<img> without alt attribute. Add alt text for screen readers.",
        severity: "error",
      })
    }

    // A11Y-004: Icon-only buttons without aria-label
    // Detect: <Button size="icon" or <button with only an icon child and no aria-label
    if ((/size="icon"/.test(line) || /size=\{?"icon"/.test(line)) && !line.includes("aria-label")) {
      // Check next few lines for aria-label
      const chunk = lines.slice(i, Math.min(i + 3, lines.length)).join(" ")
      if (!chunk.includes("aria-label")) {
        findings.push({
          file: rel,
          line: i + 1,
          check: "A11Y-004",
          message: "Icon-only button without aria-label. Screen readers cannot describe this button.",
          severity: "warn",
        })
      }
    }

    // A11Y-006: Very small touch targets
    // Look for interactive elements with h-6, h-7, h-8 (24-32px, below 44px iOS minimum)
    if ((trimmed.includes("<button") || trimmed.includes("onClick")) && !trimmed.includes("//")) {
      const tinyMatch = line.match(/\bh-([67])\b/)
      if (tinyMatch) {
        const px = parseInt(tinyMatch[1]) * 4
        findings.push({
          file: rel,
          line: i + 1,
          check: "A11Y-006",
          message: `Touch target h-${tinyMatch[1]} (${px}px) is well below the 44px iOS minimum. Use h-10 or h-11.`,
          severity: "error",
        })
      }
    }

    // A11Y-001: Empty buttons (no text content, no aria-label, no sr-only)
    if (/<button[^>]*>\s*<\/button>/.test(line) && !line.includes("aria-label")) {
      findings.push({
        file: rel,
        line: i + 1,
        check: "A11Y-001",
        message: "Empty button with no accessible text. Add aria-label or visible text.",
        severity: "error",
      })
    }

    // A11Y-003: Inputs without associated labels
    if (/<input\s/.test(trimmed) || /<Input\s/.test(trimmed)) {
      const chunk = lines.slice(Math.max(0, i - 3), Math.min(i + 3, lines.length)).join(" ")
      if (!chunk.includes("<label") && !chunk.includes("<Label") && !chunk.includes("aria-label") && !chunk.includes("placeholder")) {
        findings.push({
          file: rel,
          line: i + 1,
          check: "A11Y-003",
          message: "Input without label, aria-label, or placeholder. Add accessible labeling.",
          severity: "warn",
        })
      }
    }
  }

  return findings
}

// ─── Main ───

const files = getAllTsxFiles(SRC_DIR)
let allFindings: Finding[] = []

for (const file of files) {
  allFindings.push(...auditFile(file))
}

allFindings.sort((a, b) => {
  if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1
  return a.file.localeCompare(b.file)
})

const errors = allFindings.filter((f) => f.severity === "error")
const warnings = allFindings.filter((f) => f.severity === "warn")

console.log(`\n${"=".repeat(60)}`)
console.log(`  Accessibility Check — ${new Date().toISOString().split("T")[0]}`)
console.log(`${"=".repeat(60)}`)
console.log(`  Files scanned: ${files.length}`)
console.log(`  ERRORS: ${errors.length}  |  WARNINGS: ${warnings.length}`)
console.log(`${"=".repeat(60)}\n`)

if (allFindings.length === 0) {
  console.log("✓ All clear — no accessibility issues found.\n")
  process.exit(0)
}

for (const f of allFindings) {
  const tag = f.severity === "error" ? "\x1b[31m[ERROR]\x1b[0m" : "\x1b[33m[WARN]\x1b[0m"
  console.log(`${tag}  ${f.check}  ${f.file}:${f.line}`)
  console.log(`         ${f.message}\n`)
}

console.log(`Total: ${errors.length} errors, ${warnings.length} warnings across ${files.length} files.`)
process.exit(errors.length > 0 ? 1 : 0)
