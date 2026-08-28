// Audio Recorder — MediaRecorder integration
// ponytail: native MediaRecorder, no libraries

/**
 * Create a recorder that captures audio from a gain node.
 * @param {AudioContext} audioContext
 * @param {GainNode} sourceNode - Node to record from
 * @returns {{ start, stop, isRecording }}
 */
export function createRecorder(audioContext, sourceNode) {
  let mediaRecorder = null;
  let chunks = [];
  let recording = false;

  const dest = audioContext.createMediaStreamDestination();
  sourceNode.connect(dest);

  function start() {
    if (recording) return;

    chunks = [];
    mediaRecorder = new MediaRecorder(dest.stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
      downloadBlob(blob);
      chunks = [];
    };

    mediaRecorder.start();
    recording = true;
  }

  function stop() {
    if (!recording || !mediaRecorder) return;
    mediaRecorder.stop();
    recording = false;
  }

  function isRecording() {
    return recording;
  }

  return { start, stop, isRecording };
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flow-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
