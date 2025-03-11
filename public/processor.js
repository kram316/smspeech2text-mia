class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0]; // First audio input
        if (input && input.length > 0) {
            this.port.postMessage(input[0]); // Send audio data to the main thread
        }
        return true; // Keep processor alive
    }
}
registerProcessor("audio-processor", AudioProcessor);
