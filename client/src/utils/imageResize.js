// Downscales an image in the browser before it is uploaded.
//
// Avatars render at 26-96px (see .avatar-* in global.css), but the file the
// browser hands us is whatever the phone camera produced - often 2-4 MB. Sending
// that over the network only to store and re-serve it at 40px is waste in both
// directions, so the resize happens here, on the device, where the pixels
// already are. It also means the server never needs an image library.
//
// Resizing client-side rather than server-side is the right way round: a
// server-side resize still has to accept the 2 MB upload first.

const MAX_EDGE = 400; // Comfortably above the 96px avatar-xl, for retina screens.
const QUALITY = 0.82;

// JPEG for everything. A photo of a face in a circle has no use for transparency,
// and JPEG is universally decodable - a canvas can emit webp, but Safari did not
// support doing so until relatively recently.
const OUTPUT_TYPE = "image/jpeg";

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That image could not be decoded"));
    img.src = src;
  });

const canvasToBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image"))),
      OUTPUT_TYPE,
      QUALITY
    );
  });

// Returns a new File ready for FormData. On any failure it returns the original
// file untouched: a slightly large photo is a far better outcome than a profile
// update that cannot save at all.
export async function resizeImageForUpload(file, maxEdge = MAX_EDGE) {
  if (!file || !file.type?.startsWith("image/")) return file;

  // Already small enough - do not re-encode it and lose quality for nothing.
  if (file.size <= 150 * 1024) return file;

  try {
    const img = await loadImage(await readAsDataUrl(file));
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return file;

    // Only ever shrink. Upscaling a small image produces a bigger, blurrier file.
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    if (scale === 1 && file.size <= 800 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    // JPEG has no alpha, so without this a transparent PNG turns into black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas);
    // If encoding somehow produced something larger, keep the original.
    if (blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: OUTPUT_TYPE, lastModified: Date.now() });
  } catch {
    return file;
  }
}