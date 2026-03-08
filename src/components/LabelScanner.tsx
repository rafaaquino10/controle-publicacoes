"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Camera, XCircle, Loader2 } from "lucide-react"
import { parseLabelText, type LabelData } from "@/lib/label-ocr"

type WorkerRef = import("tesseract.js").Worker

interface LabelScannerProps {
  onResult: (data: LabelData) => void
  active?: boolean
}

type Phase = "IDLE" | "PREVIEW" | "PROCESSING"

export default function LabelScanner({ onResult, active = true }: LabelScannerProps) {
  const [phase, setPhase] = useState<Phase>("IDLE")
  const [errorDesc, setErrorDesc] = useState("")
  const [progress, setProgress] = useState("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<WorkerRef | null>(null)
  const mountedRef = useRef(true)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // Start/stop camera based on active prop
  useEffect(() => {
    mountedRef.current = true

    if (!active) {
      stopStream()
      setPhase("IDLE")
      return
    }

    const startCamera = async () => {
      setErrorDesc("")
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setPhase("PREVIEW")
      } catch {
        if (mountedRef.current) {
          setErrorDesc("Câmera não autorizada ou indisponível.")
        }
      }
    }

    startCamera()

    return () => {
      mountedRef.current = false
      stopStream()
    }
  }, [active, stopStream])

  // Terminate worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {})
        workerRef.current = null
      }
    }
  }, [])

  const handleCapture = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setPhase("PROCESSING")
    setProgress("Capturando imagem...")

    // Draw frame to canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    )
    if (!blob || !mountedRef.current) {
      setPhase("PREVIEW")
      return
    }

    try {
      // Lazy-load tesseract
      if (!workerRef.current) {
        setProgress("Carregando motor de leitura...")
        const { createWorker } = await import("tesseract.js")
        const worker = await createWorker("eng", undefined, {
          logger: (m) => {
            if (mountedRef.current && m.status) {
              if (m.status === "recognizing text") {
                setProgress(`Lendo etiqueta... ${Math.round((m.progress || 0) * 100)}%`)
              }
            }
          },
        })
        workerRef.current = worker
      }

      setProgress("Lendo etiqueta...")
      const { data } = await workerRef.current.recognize(blob)
      if (!mountedRef.current) return

      const labelData = parseLabelText(data.text)
      onResultRef.current(labelData)

      // Stay in PREVIEW so user can capture again if needed
      setPhase("PREVIEW")
      setProgress("")
    } catch (err) {
      console.error("OCR error:", err)
      if (mountedRef.current) {
        setErrorDesc("Erro ao processar imagem. Tente novamente.")
        setPhase("PREVIEW")
      }
    }
  }

  const handleRetry = () => {
    setErrorDesc("")
    // Re-trigger camera start
    mountedRef.current = true
    const restart = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setPhase("PREVIEW")
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

        {/* Offscreen canvas for capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Guide overlay — dashed rectangle */}
        {phase === "PREVIEW" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div
              style={{
                width: "80%",
                height: "40%",
                border: "2px dashed rgba(255,255,255,0.6)",
                borderRadius: "12px",
              }}
            />
          </div>
        )}

        {/* Hint text */}
        {phase === "PREVIEW" && (
          <div className="absolute top-3 left-0 right-0 flex justify-center z-10">
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            >
              Enquadre a etiqueta e toque no botão
            </span>
          </div>
        )}

        {/* Capture button */}
        {phase === "PREVIEW" && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
            <button
              onClick={handleCapture}
              className="w-16 h-16 rounded-full flex items-center justify-center border-none cursor-pointer active:scale-90 transition-transform"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            >
              <Camera className="w-7 h-7" style={{ color: "#111" }} />
            </button>
          </div>
        )}

        {/* Processing overlay */}
        {phase === "PROCESSING" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-20"
            style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
          >
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm font-medium m-0">{progress}</p>
          </div>
        )}

        {/* Loading / idle overlay */}
        {phase === "IDLE" && !errorDesc && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
            style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
          >
            <Camera className="w-12 h-12 mb-3 opacity-60 animate-pulse" />
            <p className="text-sm font-medium m-0">Iniciando câmera...</p>
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
