import { GoogleGenAI } from "@google/genai"
import * as fs from "fs"

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })

async function main() {
  console.log("Loading individual team reference photos...")
  const gabe = fs.readFileSync("reference/Team Pictures/Team/Gabe.jpeg")
  const kristen = fs.readFileSync("reference/Team Pictures/Team/Kristen.jpeg")
  const bob = fs.readFileSync("reference/Team Pictures/Team/Bob.jpeg")
  const dave = fs.readFileSync("reference/Team Pictures/Team/Dave.jpeg")
  const ryan = fs.readFileSync("reference/Team Pictures/Team/Ryan.jpeg")

  console.log("Generating team worksite photo...")
  const response = await genai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: gabe.toString("base64"), mimeType: "image/jpeg" } },
          { text: "This is Gabe (owner)." },
          { inlineData: { data: kristen.toString("base64"), mimeType: "image/jpeg" } },
          { text: "This is Kristen (co-owner)." },
          { inlineData: { data: bob.toString("base64"), mimeType: "image/jpeg" } },
          { text: "This is Bob (team member)." },
          { inlineData: { data: dave.toString("base64"), mimeType: "image/jpeg" } },
          { text: "This is Dave (team member)." },
          { inlineData: { data: ryan.toString("base64"), mimeType: "image/jpeg" } },
          { text: "This is Ryan (team member)." },
          { text: `Generate a professional worksite photo of these 5 people together. CRITICAL COMPOSITION: Use an ultra-wide 16:9 aspect ratio. The setting is inside an EXTREMELY WIDE commercial freezer structure under construction. The structure is over 100 feet wide — the two side walls should be very far apart with vast open floor space between them. The structure is 200 feet deep and 40 feet high. The camera should emphasize the extreme width with a wide-angle lens perspective.

WALLS: The side walls are made entirely of vertical insulated metal panels (white/light gray, smooth flat panels with visible vertical seams). NO racking, NO steel girts, NO exposed structural framing — ONLY smooth vertical insulated panels. One section of the right wall is incomplete — panels stop partway and there is a visible gap where the next panel is being erected.

BACKGROUND: A lull (telehandler) with an AutoMak Cool Boy vacuum panel lifter is lifting a full-length panel into the incomplete section of the wall. No person is on the lull. Bundles of insulated metal panels are stacked flat on the concrete floor.

TEAM: All 5 people are grouped together in the center-foreground of the frame, relatively close to the camera. Gabe is in the center holding blueprints/schematics open. Kristen and Ryan are looking at the plans with him. Bob and Dave are engaged in conversation with each other off to the side. Everyone is wearing orange high-visibility safety vests with RSNE logo, white hard hats with RSNE logo, and brown steel-toe work boots.

LIGHTING: Strong natural daylight from a large opening behind the camera illuminates the team. The deep interior of the structure fades to darker industrial lighting, creating a sense of depth.

Style: Professional construction photography, wide-angle, sharp focus, editorial quality.` },
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
      const outPath = "outputs/team-worksite-photo.jpg"
      fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, "base64"))
      console.log("Team photo saved to:", outPath)
      return
    }
    if (part.text) console.log("Model response:", part.text)
  }
  console.error("No image was generated in the response")
}

main().catch(console.error)
