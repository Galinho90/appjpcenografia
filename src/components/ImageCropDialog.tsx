import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { fileToDataUrl, getCroppedBlob, type Area } from "@/lib/imageCrop";
import { Loader2 } from "lucide-react";

type Props = {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Proporção do recorte. 1 = quadrado. */
  aspect?: number;
  /** Lado máximo (px) da imagem final. */
  maxSize?: number;
  /** Qualidade JPEG entre 0 e 1. */
  quality?: number;
  /** Título do diálogo. */
  title?: string;
  onCropped: (blob: Blob) => Promise<void> | void;
};

export function ImageCropDialog({
  file,
  open,
  onOpenChange,
  aspect = 1,
  maxSize = 512,
  quality = 0.85,
  title = "Ajustar imagem",
  onCropped,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (file && open) {
      fileToDataUrl(file).then((d) => active && setSrc(d));
    } else {
      setSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    }
    return () => { active = false; };
  }, [file, open]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!src || !croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(src, croppedArea, maxSize, quality);
      await onCropped(blob);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Arraste para posicionar e use o zoom para enquadrar. A imagem será comprimida ao salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-72 bg-muted rounded-md overflow-hidden">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid={false}
            />
          )}
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <Slider
            value={[zoom]}
            min={1}
            max={4}
            step={0.05}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !croppedArea}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : "Aplicar e enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
