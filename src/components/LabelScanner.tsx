"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Camera, XCircle, Loader2, ScanLine, PenLine } from "lucide-react"
import { Button } from "@/components/ui"
import { parseLabelText, type LabelData } from "@/lib/label-ocr"

interface LabelScannerProps {
  onResult: (data: LabelData) => void
  active?: boolean
}

type Phase = "IDLE" | "LOADING" | "SCANNING" | "FOUND"

export default function LabelScanner({ onResult, active = true }: LabelScannerProps) {
  const [phase, setPhase] = useState<Phase>("IDLE")
  const [errorDesc, setErrorDesc] = useState("")
  const [showManualFallback, setShowManualFallback] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)
  const scanningRef = useRef(false)
  const lastScanRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const stopScanLoop = useCallback(() => {
    scanningRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  /** Capture frame from video, convert to base64, POST to /api/ocr */
  const callOcr = useCallback(async (canvas: HTMLCanvasElement, video: HTMLVideoElement): Promise<string | null> => {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0)

    // Convert to base64 (strip data:image/...;base64, prefix)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
    const base64 = dataUrl.split(",")[1]

    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    })

    if (!res.ok) return null
    const { text } = await res.json()
    return text || null
  }, [])

  // Scan loop
  const runScanLoop = useCallback(async () => {
    if (!scanningRef.current || !mountedRef.current) return

    const now = Date.now()
    if (now - lastScanRef.current < 2000) {
      rafRef.current = requestAnimationFrame(() => runScanLoop())
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => runScanLoop())
      return
    }

    lastScanRef.current = now

    try {
      const text = await callOcr(canvas, video)
      if (!scanningRef.current || !mountedRef.current) return

      if (text) {
        const parsed = parseLabelText(text)
        if (parsed.confidence !== "none") {
          scanningRef.current = false
          setPhase("FOUND")
          onResultRef.current(parsed)
          return
        }
      }
    } catch (err) {
      console.error("OCR scan error:", err)
    }

    if (scanningRef.current && mountedRef.current) {
      rafRef.current = requestAnimationFrame(() => runScanLoop())
    }
  }, [callOcr])

  // Start/stop based on active prop
  useEffect(() => {
    mountedRef.current = true
    setShowManualFallback(false)

    if (!active) {
      stopScanLoop()
      stopStream()
      setPhase("IDLE")
      return
    }

    const start = async () => {
      setErrorDesc("")
      setPhase("LOADING")

      const stream = await navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        .catch(() => null)

      if (!mountedRef.current) {
        stream?.getTracks().forEach((t) => t.stop())
        return
      }

      if (!stream) {
        setErrorDesc("Câmera não autorizada ou indisponível.")
        return
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setPhase("SCANNING")
      scanningRef.current = true
      lastScanRef.current = 0
      rafRef.current = requestAnimationFrame(() => runScanLoop())

      fallbackTimerRef.current = setTimeout(() => {
        if (mountedRef.current && scanningRef.current) {
          setShowManualFallback(true)
        }
      }, 15000)
    }

    start()

    return () => {
      mountedRef.current = false
      stopScanLoop()
      stopStream()
    }
  }, [active, stopStream, stopScanLoop, runScanLoop])

  const handleRetry = () => {
    setErrorDesc("")
    setShowManualFallback(false)
    const restart = async () => {
      setPhase("LOADING")
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setPhase("SCANNING")
        scanningRef.current = true
        lastScanRef.current = 0
        rafRef.current = requestAnimationFrame(() => runScanLoop())
        fallbackTimerRef.current = setTimeout(() => {
          if (mountedRef.current && scanningRef.current) {
            setShowManualFallback(true)
          }
        }, 15000)
      } catch {
        setErrorDesc("Câmera não autorizada ou indisponível.")
      }
    }
    restart()
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden relative rounded-xl"
        style={{ minHeight: "280px", background: "#000" }}
      >
        {/* Video preview */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            minHeight: "280px",
            objectFit: "cover",
            display: phase === "IDLE" && !errorDesc ? "none" : "block",
          }}
        />

        {/* Offscreen canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Scanning overlay */}
        {phase === "SCANNING" && (
          <>
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div
                style={{
                  width: "85%",
                  height: "45%",
                  border: "2px solid rgba(255,255,255,0.5)",
                  borderRadius: "12px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: "linear-gradient(90deg, transparent, #22c55e, transparent)",
                    boxShadow: "0 0 8px #22c55e",
                    animation: "scanline 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            <div className="absolute top-3 left-0 right-0 flex justify-center z-10">
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-full animate-pulse"
                style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
              >
                Aponte para a etiqueta...
              </span>
            </div>
          </>
        )}

        {/* Loading overlay */}
        {phase === "LOADING" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
            style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
          >
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm font-medium m-0">Iniciando câmera...</p>
          </div>
        )}

        {/* Idle overlay */}
        {phase === "IDLE" && !errorDesc && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
            style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
          >
            <Camera className="w-12 h-12 mb-3 opacity-60 animate-pulse" />
            <p className="text-sm font-medium m-0">Iniciando câmera...</p>
          </div>
        )}

        {/* Found overlay */}
        {phase === "FOUND" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-20"
            style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
          >
            <ScanLine className="w-10 h-10 mb-3" style={{ color: "#22c55e" }} />
            <p className="text-sm font-medium m-0">Etiqueta detectada!</p>
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

      {/* Manual fallback after 15s */}
      {showManualFallback && phase === "SCANNING" && (
        <div className="flex justify-center animate-in">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stopScanLoop()
              stopStream()
              onResultRef.current({
                shipmentNumber: null,
                boxInfo: null,
                boxNumber: null,
                totalBoxes: null,
                quantity: null,
                pubCode: null,
                langCode: null,
                confidence: "none",
              })
            }}
            icon={<PenLine className="w-4 h-4" />}
          >
            Preencher manualmente
          </Button>
        </div>
      )}

      {/* CSS for scan line animation */}
      <style jsx>{`
        @keyframes scanline {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
      `}</style>
    </div>
  )
}
