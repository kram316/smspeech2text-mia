import React, { useEffect, useRef } from "react";
import "./App.css";
import { HubConnectionBuilder, Subject, HttpTransportType } from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const connectionRef = useRef(null);
  // const [selectedDevice, setSelectedDevice] = useState(null);
  let IsRecordingStarted = false;
  var stopRecord_Subject = false;
  let objsubject = null;
  let audioContext = null;
  let audioSource = null;
  let scriptProcessor = null;
  useEffect(() => {
    if (!connectionRef.current) {
      const connection = new HubConnectionBuilder()
            .withUrl("https://localhost:7066/transcriptionHub",
                {
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets
                })
            .build();

      connection.on("ReceiveTranscribedText", (transcribedText) => {
        console.log("Received transcribed text:", transcribedText);
      });

      connection.on("messageFromServer", (transcribedText) => {
        console.log("messageFromServer:", transcribedText);
      });

      connection.onclose((error) => {
        console.error("WebSocket connection closed:", error);
      });

      connection.onreconnected((connectionId) => {
        console.log("Reconnected with connection ID:", connectionId);
      });

      connection.onreconnecting((error) => {
        console.log("Reconnecting due to error:", error);
      });

      connectionRef.current = connection;
    }

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  async function openConnection() {
    if (connectionRef.current && connectionRef.current.state !== "Connected") {
      try {
        await connectionRef.current.start();
        console.log("SignalR connection established.");
        await connectionRef.current.invoke("OpenConnection");
      } catch (err) {
        console.error("Error establishing SignalR connection:", err);
      }
    }
  }

  async function closeSpeechConnection() {
    if (connectionRef.current) {
      await connectionRef.current.invoke("CloseWebSocketConnection");
    }
  }

  async function startRecognition() {
    if (connectionRef.current) {
      await connectionRef.current.invoke("StartRecognition");
      InitializeStream();
    }
  }
  const initAudio = async (stream) => {
    audioContext = new AudioContext();
    audioSource = audioContext.createMediaStreamSource(stream);
    scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1); // bufferSize, numInputChannels, numOutputChannels
    scriptProcessor.onaudioprocess = (event) => {
        if (IsRecordingStarted) {
            const audioBuffer = event.inputBuffer;
            var inputData = downsampleBuffer(audioBuffer.getChannelData(0),
                audioContext.sampleRate,
                8000);
            var base64String = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(inputData))));
            objsubject.next(base64String);
        }
        if (stopRecord_Subject) {
          objsubject.next("END_OF_VOICE_STREAM");
          objsubject.complete();
          stopRecord_Subject = false;
        }
    };
    audioSource.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
}
  const InitializeStream = async () => {
    try {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(initAudio)
            .catch((error) => {
                console.error('Error accessing microphone:', error);
            });
    }
    catch (err) {
        console.log(err);
    }
};
  const downsampleBuffer = (buffer, sampleRate, outSampleRate) => {
    var sampleRateRatio = sampleRate / outSampleRate;
    var newLength = Math.round(buffer.length / sampleRateRatio);
    var result = new Int16Array(newLength);

    if (outSampleRate == sampleRate) {
        // convert float32 to int16
        for (var i = 0; i < buffer.length; i++) {
            result[i] = Math.round(buffer[i] * 32768);
        }
        return result.buffer;
    }
    if (outSampleRate > sampleRate) {
        throw "downsampling rate should be smaller than original sample rate";
    }
    var offsetResult = 0;
    var offsetBuffer = 0;
    while (offsetResult < result.length) {
        var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        var accum = 0, count = 0;
        for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = Math.min(1, accum / count) * 0x7FFF;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result.buffer;
  }

async function startRecording() {
  try {
    objsubject = new Subject();
    connectionRef.current.stream("SendAudioStream", objsubject);
    IsRecordingStarted = true;        
    stopRecord_Subject = false;
    
    console.log("Recording started...");
  } catch (err) {
      console.error("Error accessing microphone:", err);
  }
}

async function stopRecording() {
  try {
    IsRecordingStarted = false;
    stopRecord_Subject = true;
    console.log("Recording started...");
  } catch (err) {
      console.error("Error accessing microphone:", err);
  }
}
  

  return (
    <div className="App">
      <h1>Mic - Real-time Audio Transcription</h1>
      <div id="transcription"></div>
      <button onClick={openConnection}>Open Speech Connection</button>
      <button onClick={startRecognition}>Start Recognition</button>
      <button onClick={startRecording}>Start Recording</button>
      <button onClick={stopRecording}>Stop Recording</button>
      <button onClick={closeSpeechConnection}>Close Speech Connection</button>
    </div>
  );
}

export default App;
