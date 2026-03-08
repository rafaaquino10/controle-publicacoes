import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { image } = await req.json() // base64 string (sem prefixo data:image/...)

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OCR not configured" }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error("Google Vision API error:", err)
      return NextResponse.json(
        { error: "OCR request failed" },
        { status: 502 }
      )
    }

    const data = await response.json()
    const text = data.responses?.[0]?.fullTextAnnotation?.text || ""

    return NextResponse.json({ text })
  } catch (err) {
    console.error("OCR API error:", err)
    return NextResponse.json({ error: "OCR request failed" }, { status: 500 })
  }
}
