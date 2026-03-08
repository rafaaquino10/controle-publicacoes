"use client"

import { useEffect, useState, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { ScanLine, ImageUp, XCircle, CheckCircle2 } from "lucide-react"

interface SmartScannerProps {
  onScanSuccess: (code: string) => void
  onShipmentDetected?: (data: { shipmentNumber: string; boxInfo?: string }) => void
}

export default function SmartScanner({ onScanSuccess, onShipmentDetected }: SmartScannerProps) {
  const [activeMode, setActiveMode] = useState<"CAMERA" | "FILE" | null>(null)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [errorDesc, setErrorDesc] = useState("")

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  function parseBarcode(code: string) {
    const shipmentMatch = code.match(/(?:ENVIO|ENV|SHIPMENT)\s*[:#]?\s*(\d+)/i)
    const boxMatch = code.match(/(?:Box|Caixa|CX)\s*(\d+)\s*(?:of|de)\s*(\d+)/i)

    if (shipmentMatch && onShipmentDetected) {
      onShipmentDetected({
        shipmentNumber: shipmentMatch[1],
        boxInfo: boxMatch ? `Caixa ${boxMatch[1]} de ${boxMatch[2]}` : undefined,
      })
    }

    onScanSuccess(code)
  }

  const startCamera = async () => {
    setActiveMode("CAMERA")
    setErrorDesc("")
    setScanResult(null)

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("reader")
    }

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          setScanResult(decodedText)
          if (scannerRef.current?.isScanning) scannerRef.current.stop()
          parseBarcode(decodedText)
        },
        () => {}
      )
    } catch {
      setErrorDesc("Câmera não autorizada ou indisponível.")
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setActiveMode("FILE")
    setErrorDesc("")
    setScanResult(null)

    const html5qrCode = new Html5Qrcode("reader-hidden")
    try {
      const decodedText = await html5qrCode.scanFileV2(file, true)
      setScanResult(decodedText.decodedText)
      parseBarcode(decodedText.decodedText)
    } catch {
      setErrorDesc("Nenhum código legível encontrado na imagem.")
    }
  }

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(console.error)
    }
    setActiveMode(null)
  }

  const resetScanner = () => {
    setScanResult(null)
    setErrorDesc("")
    setActiveMode(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card overflow-hidden relative min-h-[260px] flex items-center justify-center">
        {!activeMode && !scanResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10" style={{ color: "var(--text-muted)" }}>
            <ScanLine className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-bold text-lg m-0" style={{ color: "var(--text-secondary)" }}>Hub Scanner</p>
            <p className="text-sm m-0 mt-1" style={{ color: "var(--text-muted)" }}>Centralize o código de barras da Nota de Envio na tela.</p>
          </div>
        )}

        <div id="reader" className={`w-full ${activeMode === "CAMERA" && !scanResult ? "block" : "hidden"}`}></div>
        <div id="reader-hidden" className="hidden"></div>

        {scanResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 animate-in cursor-pointer"
            style={{ background: "rgba(5, 150, 105, 0.9)" }}
            onClick={resetScanner}
          >
            <CheckCircle2 className="w-16 h-16 mb-2" />
            <p className="text-xl font-black m-0">{scanResult}</p>
            <p className="font-medium text-sm m-0 mt-1" style={{ opacity: 0.8 }}>Código Capturado - Toque para escanear novamente</p>
          </div>
        )}

        {errorDesc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20 animate-in" style={{ background: "rgba(220, 38, 38, 0.9)" }}>
            <XCircle className="w-14 h-14 mb-2" />
            <p className="font-bold m-0">{errorDesc}</p>
            <button
              onClick={() => { setErrorDesc(""); setActiveMode(null) }}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={activeMode === "CAMERA" ? stopScanner : startCamera}
          className="btn w-full"
          style={{
            height: "48px",
            borderRadius: "10px",
            background: activeMode === "CAMERA" ? "var(--color-error)" : "var(--color-primary)",
            color: "white",
          }}
        >
          {activeMode === "CAMERA" ? <XCircle className="w-5 h-5" /> : <ScanLine className="w-5 h-5" />}
          {activeMode === "CAMERA" ? "Cancelar" : "Câmera ao Vivo"}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-outline w-full"
          style={{ height: "48px", borderRadius: "10px" }}
        >
          <ImageUp className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          Usar Galeria
        </button>
        <input
          type="file" ref={fileInputRef} onChange={handleFileUpload}
          accept="image/*" className="hidden"
        />
      </div>
    </div>
  )
}
