import { optimizeCloudinaryUrl } from "@/lib/cloudinaryUrl";

export interface LookbookPiece {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  zIndex: number;
  rotation: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = optimizeCloudinaryUrl(src);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export async function exportLookbookCard(options: {
  stageWidth: number;
  stageHeight: number;
  items: LookbookPiece[];
  title: string;
}): Promise<string> {
  const { stageWidth, stageHeight, items, title } = options;
  const outW = 900;
  const outH = 1140;
  const padX = 52;
  const padTop = 52;
  const padBottom = 168;
  const innerW = outW - padX * 2;
  const innerH = outH - padTop - padBottom;
  const scale = Math.min(innerW / Math.max(stageWidth, 1), innerH / Math.max(stageHeight, 1));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#f8f7f5";
  ctx.fillRect(0, 0, outW, outH);

  ctx.save();
  ctx.shadowColor = "rgba(28,25,23,0.12)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 28, 28, outW - 56, outH - 56, 8);
  ctx.fill();
  ctx.restore();

  const offsetX = padX + (innerW - stageWidth * scale) / 2;
  const offsetY = padTop + (innerH - stageHeight * scale) / 2;

  const sorted = [...items].sort((a, b) => a.zIndex - b.zIndex);
  for (const item of sorted) {
    const img = await loadImage(item.imageUrl);
    const w = item.width * scale;
    const h = item.width * 1.25 * scale;
    const cx = offsetX + (item.x + item.width / 2) * scale;
    const cy = offsetY + (item.y + (item.width * 1.25) / 2) * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  ctx.fillStyle = "#1c1917";
  ctx.font = "300 28px Geist, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(title || "Lookbook", padX + 8, outH - 88);
  ctx.fillStyle = "#78716c";
  ctx.font = "400 13px Geist, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("DIGITAL WARDROBE", padX + 8, outH - 62);

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
