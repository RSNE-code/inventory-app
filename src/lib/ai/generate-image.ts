import { GoogleGenAI } from "@google/genai"

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })

/**
 * Generate a product thumbnail image using Nano Banana 2 (Gemini 3.1 Flash Image).
 * Returns base64 image data and MIME type.
 */
export async function generateProductImage(
  productName: string,
  category?: string | null,
  dimensions?: string | null
): Promise<{ imageData: Buffer; mimeType: string }> {
  const details = [
    category && `Category: ${category}`,
    dimensions && `Dimensions: ${dimensions}`,
  ]
    .filter(Boolean)
    .join(". ")

  const prompt = `Product photo of "${productName}" for a construction/insulation supply inventory system.${
    details ? ` ${details}.` : ""
  } Clean white background, professional product photography style, well-lit, sharp focus, centered composition. No text overlays.`

  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: prompt,
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  })

  // Extract image from response parts
  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) {
    throw new Error("No response from image generation model")
  }

  for (const part of parts) {
    if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")) {
      return {
        imageData: Buffer.from(part.inlineData.data, "base64"),
        mimeType: part.inlineData.mimeType,
      }
    }
  }

  throw new Error("No image was generated. Try a different product description.")
}
