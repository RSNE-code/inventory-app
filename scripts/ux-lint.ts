/**
 * UX Anti-Pattern Linter
 * Scans all .tsx files for common UX anti-patterns that affect usability.
 *
 * Usage: npx tsx scripts/ux-lint.ts
 */

import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

const SRC_DIR = join(__dirname, "..", "src")

interface Finding {
  file: string
  line: number
  check: string
  message: string
  severity: "error" | "warn" | "info"
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

    // UX-001: Clickable button without visual affordance
    // Look for <button elements whose className lacks bg-, border-, shadow-, or underline
    if (trimmed.includes("<button") && !trimmed.includes("type=") && line.includes("className")) {
      const classMatch = line.match(/className[={"'\s]+"?([^"}>]+)/)
      if (classMatch) {
        const classes = classMatch[1]
        const hasAffordance = /\b(bg-|border-|shadow-|underline|ring-)/.test(classes)
        if (!hasAffordance) {
          findings.push({
            file: rel,
            line: i + 1,
            check: "UX-001",
            message: "Button lacks visual affordance (no bg, border, shadow, or underline). Users may not recognize it as clickable.",
            severity: "error",
          })
        }
      }
    }

    // UX-002: div/span with onClick (should be button or a)
    if (/<(div|span)\s[^>]*onClick/.test(line)) {
      // Exclude common patterns like overlay backdrops
      if (!line.includes("fixed inset-0") && !line.includes("backdrop")) {
        findings.push({
          file: rel,
          line: i + 1,
          check: "UX-002",
          message: `<${line.includes("<div") ? "div" : "span"}> with onClick — use <button> or <a> for keyboard accessibility and semantics.`,
          severity: "error",
        })
      }
    }

    // UX-005: Hardcoded pixel widths that could overflow 375px
    const widthMatch = line.match(/\bw-\[(\d+)px\]/)
    if (widthMatch && parseInt(widthMatch[1]) > 350) {
      findings.push({
        file: rel,
        line: i + 1,
        check: "UX-005",
        message: `Fixed width w-[${widthMatch[1]}px] may overflow on 375px mobile screens. Consider responsive sizing.`,
        severity: "warn",
      })
    }

    // UX-006: Interactive elements with small touch targets
    if (/<button/.test(trimmed) || /onClick/.test(trimmed)) {
      const heightMatch = line.match(/\bh-(\d+)\b/)
      if (heightMatch) {
        const h = parseInt(heightMatch[1])
        // Tailwind h-8 = 32px, h-9 = 36px — both below iOS 44px minimum
        if (h <= 8 && !line.includes("w-") && !line.includes("items-center")) {
          findings.push({
            file: rel,
            line: i + 1,
            check: "UX-006",
            message: `Touch target h-${h} (${h * 4}px) is below iOS minimum of 44px (h-11). Consider h-10 or h-11.`,
            severity: "warn",
          })
        }
      }
    }
  }

  // UX-004: Check for flex rows with many children (heuristic: count flex usage)
  // This is a simplified check — looks for flex containers where we can detect many items
  const flexOverflowPattern = /className[^"]*"[^"]*\bflex\b(?!.*flex-wrap)[^"]*"/g
  let match
  while ((match = flexOverflowPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length
    const surrounding = content.substring(match.index, match.index + 500)
    // Count immediate children markers (very rough heuristic)
    const childCount = (surrounding.match(/<(button|div|span|a|p|img)\b/g) || []).length
    if (childCount >= 6) {
      findings.push({
        file: rel,
        line: lineNum,
        check: "UX-004",
        message: `Flex container without flex-wrap has ~${childCount} children. May overflow on narrow screens.`,
        severity: "warn",
      })
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
  const sev = { error: 0, warn: 1, info: 2 }
  if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity]
  return a.file.localeCompare(b.file)
})

const errors = allFindings.filter((f) => f.severity === "error")
const warnings = allFindings.filter((f) => f.severity === "warn")
const infos = allFindings.filter((f) => f.severity === "info")

console.log(`\n${"=".repeat(60)}`)
console.log(`  UX Anti-Pattern Lint — ${new Date().toISOString().split("T")[0]}`)
console.log(`${"=".repeat(60)}`)
console.log(`  Files scanned: ${files.length}`)
console.log(`  ERRORS: ${errors.length}  |  WARNINGS: ${warnings.length}  |  INFO: ${infos.length}`)
console.log(`${"=".repeat(60)}\n`)

if (allFindings.length === 0) {
  console.log("✓ All clear — no UX anti-patterns found.\n")
  process.exit(0)
}

for (const f of allFindings) {
  const colors = { error: "\x1b[31m", warn: "\x1b[33m", info: "\x1b[36m" }
  const labels = { error: "[ERROR]", warn: "[WARN] ", info: "[INFO] " }
  console.log(`${colors[f.severity]}${labels[f.severity]}\x1b[0m  ${f.check}  ${f.file}:${f.line}`)
  console.log(`         ${f.message}\n`)
}

console.log(`Total: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info across ${files.length} files.`)
process.exit(errors.length > 0 ? 1 : 0)
