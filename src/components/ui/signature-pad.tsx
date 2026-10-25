"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";

type Props = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  helperText?: string;
};

export default function SignaturePad({
  value,
  onChange,
  label = "Firma del contratista",
  helperText = "Firma con el mouse o el dedo, o escribe tu nombre como firma. Se incorporará al contrato PDF.",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = Math.max(parent.clientWidth || 280, 240);
      const height = 180;
      const ratio = window.devicePixelRatio || 1;
      const previous = canvas.toDataURL("image/png");
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#111827";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      if (hasStrokeRef.current || value) {
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 0, 0, width, height);
        };
        image.src = value || previous;
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [value]);

  function renderTypedSignature(nameText: string) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = canvas.clientWidth || 280;
    const height = canvas.clientHeight || 180;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const trimmed = nameText.trim();
    if (!trimmed) {
      hasStrokeRef.current = false;
      setHasStroke(false);
      onChange(null);
      return;
    }

    ctx.save();
    ctx.fillStyle = "#111827";
    ctx.font = "italic 600 32px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(trimmed, width / 2, height / 2, width - 32);

    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, height * 0.72);
    ctx.lineTo(width - 32, height * 0.72);
    ctx.stroke();
    ctx.restore();

    hasStrokeRef.current = true;
    setHasStroke(true);
    onChange(canvas.toDataURL("image/png"));
  }

  function getPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function emitChange() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokeRef.current) {
      onChange(null);
      return;
    }
    onChange(canvas.toDataURL("image/png"));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = getPoint(event);
    if (!canvas || !ctx || !point) return;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw" || !drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const point = getPoint(event);
    if (!ctx || !point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      setHasStroke(true);
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (mode !== "draw" || !drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture(event.pointerId);
    emitChange();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    hasStrokeRef.current = false;
    setHasStroke(false);
    setTypedName("");
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-default-500 mt-1">{helperText}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            radius="lg"
            onPress={() => {
              const nextMode = mode === "draw" ? "type" : "draw";
              setMode(nextMode);
            }}
            startContent={
              <Icon
                icon={mode === "draw" ? "lucide:keyboard" : "lucide:pen-tool"}
                width={16}
              />
            }
          >
            {mode === "draw" ? "Escribir con teclado" : "Dibujar trazo"}
          </Button>
          <Button
            size="sm"
            variant="flat"
            radius="lg"
            onPress={clear}
            isDisabled={!hasStroke && !value && !typedName}
            startContent={<Icon icon="material-symbols:ink-eraser" width={18} />}
          >
            Limpiar
          </Button>
        </div>
      </div>

      {mode === "type" && (
        <Input
          label="Escribe tu nombre completo para firmar"
          placeholder="Ej. Carlos Mendoza"
          variant="bordered"
          value={typedName}
          onValueChange={(val) => {
            setTypedName(val);
            renderTypedSignature(val);
          }}
          classNames={{
            input: "text-base sm:text-sm italic font-serif",
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-default-300 bg-white touch-none">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          className={`block w-full ${mode === "draw" ? "cursor-crosshair" : "cursor-default"}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      {!hasStroke && !value ? (
        <p className="text-xs text-warning">
          Firma requerida para aceptar el contrato.
        </p>
      ) : null}
    </div>
  );
}
