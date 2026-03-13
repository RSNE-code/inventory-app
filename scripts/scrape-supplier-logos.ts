import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || ""
const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function scrapeLogoFromWebsite(domain: string): Promise<string | null> {
  try {
    const url = `https://${domain}`
    const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["html"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    })

    if (!res.ok) {
      console.log(`  ✗ Firecrawl error ${res.status} for ${domain}`)
      return null
    }

    const data = await res.json()
    const html: string = data?.data?.html || ""

    if (!html) {
      console.log(`  ✗ No HTML returned for ${domain}`)
      return null
    }

    // Extract logo from common patterns
    const logoUrl = extractLogoUrl(html, domain)
    return logoUrl
  } catch (err) {
    console.log(`  ✗ Error scraping ${domain}: ${(err as Error).message}`)
    return null
  }
}

function extractLogoUrl(html: string, domain: string): string | null {
  const baseUrl = `https://${domain}`

  // Priority-ordered patterns for finding logos
  const patterns: RegExp[] = [
    // Open Graph image (often the logo or brand image)
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    // Explicit logo in img tag
    /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*logo[^"']*["']/i,
    // Logo in alt text
    /<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]+alt=["'][^"']*logo[^"']*["']/i,
    // Logo in id attribute
    /<img[^>]+id=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]+id=["'][^"']*logo[^"']*["']/i,
    // Logo in header/nav area (common pattern)
    /<header[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    /<nav[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    // Link with logo class containing img
    /<a[^>]+class=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    // SVG in logo container (look for image within)
    /class=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    // Favicon as last resort
    /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      let imgUrl = match[1]

      // Skip data URIs, tiny tracking pixels, and SVG data
      if (imgUrl.startsWith("data:")) continue
      if (imgUrl.includes("1x1") || imgUrl.includes("pixel")) continue

      // Resolve relative URLs
      if (imgUrl.startsWith("//")) {
        imgUrl = `https:${imgUrl}`
      } else if (imgUrl.startsWith("/")) {
        imgUrl = `${baseUrl}${imgUrl}`
      } else if (!imgUrl.startsWith("http")) {
        imgUrl = `${baseUrl}/${imgUrl}`
      }

      return imgUrl
    }
  }

  return null
}

async function main() {
  console.log("🔥 Scraping supplier logos via Firecrawl...\n")

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true, website: true, logoUrl: true },
    orderBy: { name: "asc" },
  })

  console.log(`Found ${suppliers.length} active suppliers\n`)

  let found = 0
  let skipped = 0
  let failed = 0

  for (const supplier of suppliers) {
    if (!supplier.website) {
      console.log(`⊘ ${supplier.name} — no website, skipping`)
      skipped++
      continue
    }

    if (supplier.logoUrl) {
      console.log(`✓ ${supplier.name} — already has logo`)
      skipped++
      continue
    }

    console.log(`→ ${supplier.name} (${supplier.website})...`)
    const logoUrl = await scrapeLogoFromWebsite(supplier.website)

    if (logoUrl) {
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { logoUrl },
      })
      console.log(`  ✓ Found logo: ${logoUrl.substring(0, 80)}...`)
      found++
    } else {
      failed++
    }

    // Respect rate limits
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✓ Logos found: ${found}`)
  console.log(`⊘ Skipped: ${skipped}`)
  console.log(`✗ Failed: ${failed}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
