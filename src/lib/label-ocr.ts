export interface LabelData {
  shipmentNumber: string | null  // "3798373" (7 dígitos)
  boxInfo: string | null         // "Caixa 6 de 8"
  boxNumber: number | null       // 6
  totalBoxes: number | null      // 8
  quantity: number | null        // 1440
  pubCode: string | null         // "mi26"
  langCode: string | null        // "T"
  confidence: "full" | "partial" | "none"
}

export function parseLabelText(text: string): LabelData {
  const result: LabelData = {
    shipmentNumber: null,
    boxInfo: null,
    boxNumber: null,
    totalBoxes: null,
    quantity: null,
    pubCode: null,
    langCode: null,
    confidence: "none",
  }

  // Envio: primeiro número de 7 dígitos
  const shipmentMatch = text.match(/\b(\d{7})\b/)
  if (shipmentMatch) {
    result.shipmentNumber = shipmentMatch[1]
  }

  // Caixa: "Caixa 6 de 8"
  const boxMatch = text.match(/[Cc]aixa\s+(\d+)\s+de\s+(\d+)/i)
  if (boxMatch) {
    result.boxNumber = parseInt(boxMatch[1])
    result.totalBoxes = parseInt(boxMatch[2])
    result.boxInfo = `Caixa ${result.boxNumber} de ${result.totalBoxes}`
  }

  // Quantidade: número entre colchetes [1440] — tolerante a espaços e OCR
  const qtyMatch = text.match(/\[\s*(\d+)\s*\]/)
  if (qtyMatch) {
    result.quantity = parseInt(qtyMatch[1])
  }

  // Publicação: "mi26-T", "w24.01-T", etc. — tolerante a em-dash, espaço extra
  const pubMatch = text.match(/\b([a-zA-Z]+\d*(?:\.\d+)?)\s*[-—–]\s*([A-Z])\b/)
  if (pubMatch) {
    result.pubCode = pubMatch[1]
    result.langCode = pubMatch[2]
  }

  // Confiança
  const hasShipment = result.shipmentNumber !== null
  const hasPub = result.pubCode !== null
  const hasQty = result.quantity !== null

  if (hasShipment && hasPub && hasQty) {
    result.confidence = "full"
  } else if (hasShipment || hasPub || hasQty) {
    result.confidence = "partial"
  }

  return result
}

