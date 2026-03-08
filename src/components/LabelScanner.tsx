"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Camera, XCircle, Loader2, ScanLine, PenLine } from "lucide-react"
import { parseLabelText, mergeLabelData, type LabelData } from "@/lib/label-ocr"

type WorkerRef = import("tesseract.js").Worker

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
  const rotatedCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<WorkerRef | null>(null)
  const workerLoadingRef = useRef(false)
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

  // Initialize worker eagerly
  const ensureWorker = useCallback(async (): Promise<WorkerRef | null> => {
    if (workerRef.current) return workerRef.current
    if (workerLoadingRef.current) {
      // Wait for ongoing load
      while (workerLoadingRef.current && mountedRef.current) {
        await new Promise((r) => setTimeout(r, 100))
      }
      return workerRef.current
    }

    workerLoadingRef.current = true
    try {
      const { createWorker } = await import("tesseract.js")
      const worker = await createWorker("por+eng")
      if (!mountedRef.current) {
        await worker.terminate()
        return null
      }
      workerRef.current = worker
      return worker
    } catch (err) {
      console.error("Failed to load Tesseract worker:", err)
      return null
    } finally {
      workerLoadingRef.current = false
    }
  }, [])

  /** Convert canvas to grayscale + binary threshold for cleaner OCR */
  const preprocessFrame = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      const bw = gray > 128 ? 255 : 0
      data[i] = data[i + 1] = data[i + 2] = bw
    }
    ctx.putImageData(imageData, 0, 0)
  }, [])

  /** Crop right 35% of source and rotate 90° CW so vertical text becomes horizontal */
  const cropAndRotate = useCallback((source: HTMLCanvasElement, target: HTMLCanvasElement) => {
    const sw = source.width
    const sh = source.height
    const cropX = Math.floor(sw * 0.65)
    const cropW = sw - cropX

    target.width = sh
    target.height = cropW
    const ctx = target.getContext("2d")
    if (!ctx) return
    ctx.save()
    ctx.translate(sh, 0)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(source, cropX, 0, cropW, sh, 0, 0, cropW, sh)
    ctx.restore()
  }, [])

  // Scan loop
  const runScanLoop = useCallback(async () => {
    if (!scanningRef.current || !mountedRef.current) return

    const now = Date.now()
    // Throttle: at least 2s between OCR attempts
    if (now - lastScanRef.current < 2000) {
      rafRef.current = requestAnimationFrame(() => runScanLoop())
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const rotatedCanvas = rotatedCanvasRef.current
    if (!video || !canvas || !rotatedCanvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => runScanLoop())
      return
    }

    const worker = workerRef.current
    if (!worker) {
      rafRef.current = requestAnimationFrame(() => runScanLoop())
      return
    }

    lastScanRef.current = now

    try {
      // Capture frame
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        rafRef.current = requestAnimationFrame(() => runScanLoop())
        return
      }
      ctx.drawImage(video, 0, 0)

      // Preprocess (grayscale + threshold)
      preprocessFrame(canvas)

      // Pass 1: Normal orientation
      const blob1 = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (!blob1 || !scanningRef.current || !mountedRef.current) {
        rafRef.current = requestAnimationFrame(() => runScanLoop())
        return
      }

      const { data: data1 } = await worker.recognize(blob1)
      if (!scanningRef.current || !mountedRef.current) return

      const pass1 = parseLabelText(data1.text)

      // Pass 2: Rotated right portion (for vertical text like [1440] mi26-T)
      let merged = pass1
      const needsPass2 = pass1.confidence !== "none" && (!pass1.pubCode || !pass1.quantity)

      if (needsPass2) {
        cropAndRotate(canvas, rotatedCanvas)
        preprocessFrame(rotatedCanvas)

        const blob2 = await new Promise<Blob | null>((resolve) =>
          rotatedCanvas.toBlob(resolve, "image/png")
        )
        if (blob2 && scanningRef.current && mountedRef.current) {
          const { data: data2 } = await worker.recognize(blob2)
          if (!scanningRef.current || !mountedRef.current) return
          const pass2 = parseLabelText(data2.text)
          merged = mergeLabelData(pass1, pass2)
        }
      }

      // Check result
      if (merged.confidence !== "none" && scanningRef.current && mountedRef.current) {
        scanningRef.current = false
        setPhase("FOUND")
        onResultRef.current(merged)
        return
      }
    } catch (err) {
      console.error("OCR scan error:", err)
    }

    // Continue loop
    if (scanningRef.current && mountedRef.current) {
      rafRef.current = requestAnimationFrame(() => runScanLoop())
    }
  }, [preprocessFrame, cropAndRotate])

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

      // Start camera + worker in parallel
      const [stream] = await Promise.all([
        navigator.mediaDevices
          .getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          })
          .catch(() => null),
        ensureWorker(),
      ])

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

      if (!workerRef.current) {
        setErrorDesc("Erro ao carregar leitor OCR. Tente novamente.")
        return
      }

      setPhase("SCANNING")
      scanningRef.current = true
      lastScanRef.current = 0
      rafRef.current = requestAnimationFrame(() => runScanLoop())

      // Fallback: show manual button after 15s
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
  }, [active, stopStream, stopScanLoop, ensureWorker, runScanLoop])

  // Terminate worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {})
        workerRef.current = null
      }
    }
  }, [])

  const handleRetry = () => {
    setErrorDesc("")
    setShowManualFallback(false)
    // Re-trigger by toggling phase
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
        await ensureWorker()
        if (!workerRef.current || !mountedRef.current) {
          setErrorDesc("Erro ao carregar leitor OCR.")
          return
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
        {/* Video preview — always rendered for camera feed */}
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

        {/* Offscreen canvases */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <canvas ref={rotatedCanvasRef} style={{ display: "none" }} />

        {/* Scanning overlay — animated scan line + guide */}
        {phase === "SCANNING" && (
          <>
            {/* Guide rectangle */}
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
                {/* Animated scan line */}
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

            {/* Hint text */}
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
            <p className="text-sm font-medium m-0">Carregando leitor...</p>
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
          <button
            onClick={() => {
              stopScanLoop()
              stopStream()
              // Signal "none" result so parent can switch to manual
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
            className="btn btn-outline btn-sm text-sm flex items-center gap-2"
          >
            <PenLine className="w-4 h-4" /> Preencher manualmente
          </button>
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
