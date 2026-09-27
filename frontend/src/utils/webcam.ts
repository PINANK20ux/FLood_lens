/**
 * Isolated helper to capture a single frame from the user's webcam with
 * strict hardware stream teardown and timeout protection against hangs.
 */
export async function captureWebcamFrame(): Promise<Blob> {
  let stream: MediaStream | null = null;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Webcam access is not supported by your browser environment.');
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 360 } },
      audio: false,
    });

    video.srcObject = stream;

    // Wait for video to actually be ready to play with 4s timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Webcam timeout')), 4000);
      video.onloadedmetadata = () => {
        video
          .play()
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
      };
    });

    // Small delay to ensure sensor auto-exposure adjusts
    await new Promise((res) => setTimeout(res, 200));

    // Draw to offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
        'image/jpeg',
        0.75
      );
    });
  } finally {
    // ALWAYS stop all tracks and disconnect video element
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
    }
    video.srcObject = null;
    video.remove();
  }
}
