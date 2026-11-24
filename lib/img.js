// Resize and crop player photos into square, head-and-upper-chest profile portraits.
export async function shrink(file, max = 900) {
  let bmp;
  try {
    if (!file) return file;
    bmp = await createImageBitmap(file);
    const width = bmp.width;
    const height = bmp.height;
    const maxSide = Math.min(width, height);
    let sx = Math.max(0, (width - maxSide) / 2);
    let sy = height > width ? Math.max(0, (height - maxSide) * 0.06) : 0;
    let cropSide = maxSide;

    // Prefer a face-centred crop when the browser exposes native face detection.
    // Keep the face in the upper third so the shoulders and upper chest remain visible.
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(bmp);
        if (faces.length) {
          const face = faces[0].boundingBox;
          cropSide = Math.min(Math.max(face.width, face.height) * 3.4, width, height);
          const faceCenterX = face.x + face.width / 2;
          const faceCenterY = face.y + face.height / 2;
          sx = Math.max(0, Math.min(width - cropSide, faceCenterX - cropSide / 2));
          sy = Math.max(0, Math.min(height - cropSide, faceCenterY - cropSide * 0.30));
        }
      } catch (_) {
        // Use the upper-portrait fallback below if native detection is unavailable.
      }
    }

    const out = Math.max(1, Math.round(Math.min(max, cropSide)));
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, sx, sy, cropSide, cropSide, 0, 0, out, out);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    return blob || file;
  } catch (_) {
    return file;
  } finally {
    bmp?.close?.();
  }
}
