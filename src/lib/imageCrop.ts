// Utilitários para recorte e compressão de imagem antes do upload.

export type Area = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Recorta a área da imagem original e devolve como Blob JPEG comprimido,
 * redimensionando para no máximo `maxSize` (lado maior).
 */
export async function getCroppedBlob(
  imageSrc: string,
  cropArea: Area,
  maxSize = 512,
  quality = 0.85,
  mime: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  // Escala mantendo proporção dentro de maxSize
  const scale = Math.min(1, maxSize / Math.max(cropArea.width, cropArea.height));
  canvas.width = Math.round(cropArea.width * scale);
  canvas.height = Math.round(cropArea.height * scale);

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), mime, quality);
  });
}
