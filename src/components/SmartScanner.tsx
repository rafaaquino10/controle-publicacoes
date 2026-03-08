"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { ScanLine, XCircle, CheckCircle2 } from "lucide-react"

interface SmartScannerProps {
  onScanResult: (data: { raw: string; shipmentNumber: string; boxHint?: number }) => void
  continuous?: boolean
  active?: boolean
}

function parseBarcode(raw: string): { shipmentNumber: string; boxHint?: number } {
  const trimmed = raw.trim()

  // Extract box hint from suffix like -6 (Caixa 6 de 8)
  const suffixMatch = trimmed.match(/-(\d+)$/)
  const boxHint = suffixMatch ? parseInt(suffixMatch[1]) : undefined

  // Clean shipment number: remove suffix
  const shipmentNumber = trimmed.replace(/-\d+$/, "").trim()

  return { shipmentNumber, boxHint }
}

export default function SmartScanner({ onScanResult, continuous = true, active = true }: SmartScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [errorDesc, setErrorDesc] = useState("")
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(true)
  const startingRef = useRef(false)

  const startCamera = useCallback(async () => {
    if (startingRef.current || !mountedRef.current) return
    startingRef.current = true
    setErrorDesc("")

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader")
      }

      // Stop if already scanning
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop()
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch(() => {})
          }
          setIsScanning(false)

          const parsed = parseBarcode(decodedText)
          onScanResult({ raw: decodedText, ...parsed })
        },
        () => {}
      )

      if (mountedRef.current) setIsScanning(true)
    } catch {
      if (mountedRef.current) setErrorDesc("Camera nao autorizada ou indisponivel.")
    } finally {
      startingRef.current = false
    }
  }, [onScanResult])

  const stopCamera = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {})
    }
    setIsScanning(false)
  }, [])

  // Auto-start on mount when active
  useEffect(() => {
    mountedRef.current = true
    if (active) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (mountedRef.current) startCamera()
      }, 300)
      return () => {
        clearTimeout(timer)
        mountedRef.current = false
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => {})
        }
      }
    } else {
      stopCamera()
    }
    return () => {
      mountedRef.current = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [active, startCamera, stopCamera])

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden relative rounded-xl" style={{ minHeight: "220px", background: "var(--surface-card)" }}>
        {!isScanning && !errorDesc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10" style={{ color: "var(--text-muted)" }}>
            <ScanLine className="w-12 h-12 mb-3 opacity-50 animate-pulse" />
            <p className="text-sm font-medium m-0">Iniciando camera...</p>
          </div>
        )}

        <div id="reader" className={`w-full ${isScanning ? "block" : "hidden"}`}></div>

        {isScanning && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            >
              Centralize o codigo de barras
            </span>
          </div>
        )}

        {errorDesc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20" style={{ background: "rgba(220, 38, 38, 0.9)" }}>
            <XCircle className="w-10 h-10 mb-2" />
            <p className="font-bold text-sm m-0">{errorDesc}</p>
            <button
              onClick={() => { setErrorDesc(""); startCamera() }}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>

      {isScanning && (
        <button
          onClick={stopCamera}
          className="btn w-full text-sm"
          style={{ height: "40px", borderRadius: "10px", background: "var(--color-error)", color: "white" }}
        >
          <XCircle className="w-4 h-4" />
          Parar Scanner
        </button>
      )}
    </div>
  )
}
