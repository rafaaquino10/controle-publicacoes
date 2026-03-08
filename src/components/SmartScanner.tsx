"use client"

import { useEffect, useState, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { ScanLine, XCircle } from "lucide-react"

interface SmartScannerProps {
  onScanResult: (data: { raw: string; shipmentNumber: string; boxHint?: number }) => void
  continuous?: boolean
  active?: boolean
}

function parseBarcode(raw: string): { shipmentNumber: string; boxHint?: number } {
  const trimmed = raw.trim()
  const suffixMatch = trimmed.match(/-(\d+)$/)
  const boxHint = suffixMatch ? parseInt(suffixMatch[1]) : undefined
  const shipmentNumber = trimmed.replace(/-\d+$/, "").trim()
  return { shipmentNumber, boxHint }
}

export default function SmartScanner({ onScanResult, active = true }: SmartScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [errorDesc, setErrorDesc] = useState("")
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(true)
  const startingRef = useRef(false)
  // Store callback in ref to avoid re-triggering effect
  const onScanResultRef = useRef(onScanResult)
  onScanResultRef.current = onScanResult

  useEffect(() => {
    mountedRef.current = true

    if (!active) {
      // Stop camera if active becomes false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
      setIsScanning(false)
      startingRef.current = false
      return
    }

    // Start camera
    const startCamera = async () => {
      if (startingRef.current || !mountedRef.current) return
      startingRef.current = true
      setErrorDesc("")

      try {
        // Ensure DOM element exists
        const el = document.getElementById("smart-scanner-reader")
        if (!el) {
          startingRef.current = false
          return
        }

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("smart-scanner-reader")
        }

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
            if (mountedRef.current) {
              setIsScanning(false)
              const parsed = parseBarcode(decodedText)
              onScanResultRef.current({ raw: decodedText, ...parsed })
            }
          },
          () => {}
        )

        if (mountedRef.current) setIsScanning(true)
      } catch (err) {
        console.error("Scanner error:", err)
        if (mountedRef.current) {
          setErrorDesc("Câmera não autorizada ou indisponível.")
        }
      } finally {
        startingRef.current = false
      }
    }

    // Delay to ensure the DOM element is rendered
    const timer = setTimeout(startCamera, 500)

    return () => {
      clearTimeout(timer)
      mountedRef.current = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [active])

  const handleRetry = () => {
    setErrorDesc("")
    // Force re-mount by toggling — parent controls active prop
    // But we can also just retry here:
    startingRef.current = false
    mountedRef.current = true
    const startCamera = async () => {
      if (startingRef.current) return
      startingRef.current = true
      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("smart-scanner-reader")
        }
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 100 } },
          (decodedText) => {
            if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {})
            setIsScanning(false)
            const parsed = parseBarcode(decodedText)
            onScanResultRef.current({ raw: decodedText, ...parsed })
          },
          () => {}
        )
        setIsScanning(true)
      } catch {
        setErrorDesc("Câmera não autorizada ou indisponível.")
      } finally {
        startingRef.current = false
      }
    }
    startCamera()
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden relative rounded-xl"
        style={{ minHeight: "260px", background: "#000" }}
      >
        {/* Reader container — ALWAYS visible so html5-qrcode can inject <video> */}
        <div
          id="smart-scanner-reader"
          style={{ width: "100%", minHeight: "260px" }}
        />

        {/* Loading overlay — on top of reader while starting */}
        {!isScanning && !errorDesc && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
            style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
          >
            <ScanLine className="w-12 h-12 mb-3 opacity-60 animate-pulse" />
            <p className="text-sm font-medium m-0">Iniciando câmera...</p>
          </div>
        )}

        {/* Hint overlay when scanning */}
        {isScanning && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            >
              Centralize o código de barras
            </span>
          </div>
        )}

        {/* Error overlay */}
        {errorDesc && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20"
            style={{ background: "rgba(220, 38, 38, 0.9)" }}
          >
            <XCircle className="w-10 h-10 mb-2" />
            <p className="font-bold text-sm m-0">{errorDesc}</p>
            <button
              onClick={handleRetry}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.25)", color: "white" }}
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
