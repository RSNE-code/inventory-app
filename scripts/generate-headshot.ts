import { GoogleGenAI } from "@google/genai"
import * as fs from "fs"

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })

async function main() {
  console.log("Loading reference photos...")
  const photo1 = fs.readFileSync("reference/Team Pictures/Gabe & Kristen (Owners)/IMG_6830.JPG")
  const photo2 = fs.readFileSync("reference/Team Pictures/Gabe & Kristen (Owners)/IMG_7389.JPG")

  console.log("Generating headshot...")
  const response = await genai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: photo1.toString("base64"), mimeType: "image/jpeg" } },
          { inlineData: { data: photo2.toString("base64"), mimeType: "image/jpeg" } },
          { text: "Using these reference photos of this couple (Gabe and Kristen, business owners), generate a professional headshot-style portrait of both of them together, suitable for a company 'About Us' page. They should be wearing business casual attire. Clean, neutral background with soft lighting. Professional photography style, warm and approachable expressions. Upper body/shoulders framing. High quality, sharp focus." },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) { console.error("No response from model"); process.exit(1) }

  for (const part of parts) {
    if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")) {
      const outPath = "outputs/headshot-gabe-kristen.jpg"
      fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, "base64"))
      console.log("Headshot saved to:", outPath)
      return
    }
    if (part.text) console.log("Model response:", part.text)
  }
  console.error("No image was generated in the response")
}

main().catch(console.error)
