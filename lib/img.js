// Compresses and crops player photos into consistent square profile portraits.
export async function shrink(file, max = 900) {
  try {
    const bmp = await createImageBitmap(file);
    const side = Math.min(bmp.width, bmp.height);
    let sx = Math.round((bmp.width - side) / 2);
    let sy = Math.round((bmp.height - side) * 0.28);
    let sw = side, sh = side;

    // Use native face detection when the browser supports it.
    // On browsers without FaceDetector, use a centered upper-body portrait crop.
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(bmp);
        if (faces.length) {
          const box = faces[0].boundingBox;
          const cropSide = Math.min(Math.max(box.width, box.height) * 2.5, bmp.width, bmp.height);
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          sw = sh = cropSide;
          sx = Math.max(0, Math.min(bmp.width - cropSide, cx - cropSide / 2));
          sy = Math.max(0, Math.min(bmp.height - cropSide, cy - cropSide * 0.42));
        }
      } catch (_) {}
    }

    const scale = Math.min(1, max / side);
    const out = Math.round(side * scale);
    const canvas = document.createElement('canvas');
    canvas.width = out; canvas.height = out;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, out, out);
    bmp.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    return blob || file;
  } catch (_) { return file; }
}
