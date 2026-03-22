/**
 * Design Token Consistency Checker
 * Scans all .tsx files for off-brand Tailwind classes that should use RSNE design tokens.
 *
 * Usage: npx tsx scripts/token-audit.ts [--fix-report]
 */

import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

const SRC_DIR = join(__dirname, "..", "src")

interface Finding {
  file: string
  line: number
  check: string
  found: string
  replacement: string
  severity: "error" | "warn"
}

// Banned patterns → recommended replacements
const TEXT_COLOR_BANS: [RegExp, string][] = [
  [/\btext-gray-300\b/, "text-text-muted/60"],
  [/\btext-gray-400\b/, "text-text-muted"],
  [/\btext-gray-500\b/, "text-text-secondary"],
  [/\btext-gray-600\b/, "text-text-secondary"],
  [/\btext-gray-700\b/, "text-text-primary"],
  [/\btext-gray-800\b/, "text-text-primary"],
  [/\btext-gray-900\b/, "text-text-primary"],
  [/\btext-slate-\d+\b/, "text-text-{primary|secondary|muted}"],
  [/\btext-zinc-\d+\b/, "text-text-{primary|secondary|muted}"],
]

const BG_COLOR_BANS: [RegExp, string][] = [
  [/\bbg-gray-50\b/, "bg-surface-secondary"],
  [/\bbg-gray-100\b/, "bg-surface-secondary"],
  [/\bbg-gray-200\b/, "bg-border-custom"],
  [/\bbg-gray-[3-9]\d{2}\b/, "bg-navy or bg-surface-secondary"],
  [/\bbg-slate-\d+\b/, "bg-surface-secondary or bg-navy"],
  [/\bbg-zinc-\d+\b/, "bg-surface-secondary or bg-navy"],
]

const BORDER_BANS: [RegExp, string][] = [
  [/\bborder-gray-\d+\b/, "border-border-custom"],
  [/\bborder-slate-\d+\b/, "border-border-custom"],
]

const SHADOW_BANS: [RegExp, string][] = [
  [/\bshadow-sm\b(?!-)/, "shadow-brand"],
  [/\bshadow-md\b(?!-)/, "shadow-brand-md"],
  [/\bshadow-lg\b/, "shadow-brand-md"],
]

const RADIUS_BANS: [RegExp, string][] = [
  [/\brounded-md\b/, "rounded-xl (for cards/containers)"],
  [/\brounded-lg\b(?!-)/, "rounded-xl (for cards/containers)"],
]

function getAllTsxFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === "node_modules" || entry === ".next") continue
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...getAllTsxFiles(full))
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      // Skip non-component files like configs
      if (!entry.endsWith(".config.ts") && !entry.endsWith(".config.tsx")) {
        files.push(full)
      }
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

    // Skip imports, comments
    if (line.trimStart().startsWith("import ") || line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue

    const allBans: [string, [RegExp, string][]][] = [
      ["TK-001 Off-brand text color", TEXT_COLOR_BANS],
      ["TK-002 Off-brand background", BG_COLOR_BANS],
      ["TK-003 Off-brand border", BORDER_BANS],
      ["TK-004 Inconsistent shadow", SHADOW_BANS],
      ["TK-005 Inconsistent radius", RADIUS_BANS],
    ]

    for (const [check, bans] of allBans) {
      for (const [pattern, replacement] of bans) {
        const match = line.match(pattern)
        if (match) {
          findings.push({
            file: rel,
            line: i + 1,
            check,
            found: match[0],
            replacement,
            severity: check.startsWith("TK-001") || check.startsWith("TK-002") ? "error" : "warn",
          })
        }
      }
    }

    // TK-006: Raw hex colors in className
    const hexMatch = line.match(/className[^"]*["'][^"']*\b(?:bg|text|border)-\[#[0-9a-fA-F]{3,8}\]/)
    if (hexMatch) {
      findings.push({
        file: rel,
        line: i + 1,
        check: "TK-006 Raw hex color",
        found: hexMatch[0].substring(hexMatch[0].indexOf("[#")),
        replacement: "Use a design token from globals.css",
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

// Sort by severity then file
allFindings.sort((a, b) => {
  if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1
  return a.file.localeCompare(b.file)
})

const errors = allFindings.filter((f) => f.severity === "error")
const warnings = allFindings.filter((f) => f.severity === "warn")

console.log(`\n${"=".repeat(60)}`)
console.log(`  Design Token Audit — ${new Date().toISOString().split("T")[0]}`)
console.log(`${"=".repeat(60)}`)
console.log(`  Files scanned: ${files.length}`)
console.log(`  ERRORS: ${errors.length}  |  WARNINGS: ${warnings.length}`)
console.log(`${"=".repeat(60)}\n`)

if (allFindings.length === 0) {
  console.log("✓ All clear — no off-brand tokens found.\n")
  process.exit(0)
}

for (const f of allFindings) {
  const tag = f.severity === "error" ? "\x1b[31m[ERROR]\x1b[0m" : "\x1b[33m[WARN]\x1b[0m"
  console.log(`${tag}  ${f.check}`)
  console.log(`        ${f.file}:${f.line}`)
  console.log(`        Found: \x1b[4m${f.found}\x1b[0m  →  Use: \x1b[32m${f.replacement}\x1b[0m\n`)
}

console.log(`\nTotal: ${errors.length} errors, ${warnings.length} warnings across ${files.length} files.`)
process.exit(errors.length > 0 ? 1 : 0)
