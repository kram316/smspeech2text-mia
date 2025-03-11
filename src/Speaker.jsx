import React, { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";
import { HubConnectionBuilder, Subject, HttpTransportType, LogLevel, HubConnectionState } from "@microsoft/signalr";
import { MessagePackHubProtocol } from "@microsoft/signalr-protocol-msgpack";

function Speaker() {
  const connectionRef = useRef(null);
  const connectionRefspeak = useRef(null);
  const [conversation, setConversation] = useState([]);
  const nullValues = [null, undefined, "null", "undefined"];
  const [partialTranscriptAgent, setPartialTranscriptAgent] = useState(""); // Stores the current speech
  const [partialTranscriptProspect, setPartialTranscriptProspect] = useState(""); // Stores the current speech
  const [showMessage, setshowMessage] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en"); // State to store selected language
  const conversationRef = useRef(null);
  const isRecordingStartedRef = useRef(false);
  const stopRecordSubjectRef = useRef(false);
  const objsubject = useRef(null);
  const objsubjectspeak = useRef(null);

  let audioContext = null;
  let audioSource = null;
  let scriptProcessor = null;
  let mediaStream = null;
  let mediaStreamSpeak = null;

  let audioContextspeak = null;
  let audioSourcespeak = null;
  let scriptProcessorspeak = null;

  useEffect(() => {
    //.withUrl("https://localhost:7066/signalr",
      //  .withUrl("wss://apigatewayus-gcp-test.accenture.com/ogteldev/socket/signalr",
      // .withUrl("https://dev-tel-oneglass.accenture.com/signalr",
      // .withUrl("wss://dev-oneglass.accenture.com/transcriptionHub",
      //  .withUrl("wss://apigatewayus-gcp-test.accenture.com/nextgenog/socket/signalr",
    if (!connectionRef.current) {
      const connection = new HubConnectionBuilder()
        .withUrl("https://dev-tel-oneglass.accenture.com/signalr", {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets
        })
        .build();

      connection.serverTimeoutInMilliseconds = 120000; // Increase to 2 minutes
      connection.keepAliveIntervalInMilliseconds = 15000; // Send pings every 15 seconds

      connection.on("ReceiveTranscribedText", (transcribedText) => {
        console.log("TranscriptionHub:Received transcribed text:", transcribedText);
        handelMicrophoneTranscription(transcribedText);
      });

      connection.on("PartialTranscript", (transcribedText) => {
        console.log("TranscriptionHub:PartialTranscript:", transcribedText);
        setPartialTranscriptAgent(transcribedText);
      });

      connection.on("messageFromServer", (transcribedText) => {
        console.log("TranscriptionHub:messageFromServer:", transcribedText);
        setshowMessage("TranscriptionHub:" + transcribedText);
      });

      connection.on("ErrorMessageFromServer", (transcribedText) => {
        console.log("TranscriptionHub:ErrorMessageFromServer:", transcribedText);
        setshowMessage("TranscriptionHub:" + transcribedText);
      });

      connection.onclose((error) => {
        console.warn("TranscriptionHub:WebSocket connection closed:", error);
      });

      connection.onreconnected((connectionId) => {
        console.log("TranscriptionHub:Reconnected with connection ID:", connectionId);
      });

      connection.onreconnecting((error) => {
        console.log("TranscriptionHub:Reconnecting due to error:", error);
      });

      connectionRef.current = connection;
    }

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    //.withUrl("https://localhost:7066/signalr",
      //  .withUrl("wss://apigatewayus-gcp-test.accenture.com/ogteldev/socket/signalr",
      // .withUrl("https://dev-tel-oneglass.accenture.com/signalr",
      // .withUrl("wss://dev-oneglass.accenture.com/transcriptionHub",
      //  .withUrl("wss://apigatewayus-gcp-test.accenture.com/nextgenog/socket/signalr",
    if (!connectionRefspeak.current) {
      const connectionspeak = new HubConnectionBuilder()
        .withUrl("https://dev-tel-oneglass.accenture.com/transcriptionforspeakerhub", {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets
        })
        .build();

      connectionspeak.serverTimeoutInMilliseconds = 120000; // Increase to 2 minutes
      connectionspeak.keepAliveIntervalInMilliseconds = 15000; // Send pings every 15 seconds

      connectionspeak.on("ReceiveTranscribedText", (transcribedText) => {
        console.log("Transcriptionforspeakerhub:Received transcribed text:", transcribedText);
        handelScreenTranscription(transcribedText);
      });

      connectionspeak.on("PartialTranscript", (transcribedText) => {
        console.log("Transcriptionforspeakerhub:PartialTranscript:", transcribedText);
        setPartialTranscriptProspect(transcribedText);
      });

      connectionspeak.on("messageFromServer", (transcribedText) => {
        console.log("Transcriptionforspeakerhub:messageFromServer:", transcribedText);
        setshowMessage("Transcriptionforspeakerhub:" + transcribedText);
      });

      connectionspeak.on("ErrorMessageFromServer", (transcribedText) => {
        console.log("Transcriptionforspeakerhub:ErrorMessageFromServer:", transcribedText);
        setshowMessage("Transcriptionforspeakerhub:" + transcribedText);
      });

      connectionspeak.onclose((error) => {
        console.error("Transcriptionforspeakerhub:WebSocket connection closed:", error);
      });

      connectionspeak.onreconnected((connectionId) => {
        console.log("Transcriptionforspeakerhub:Reconnected with connection ID:", connectionId);
      });

      connectionspeak.onreconnecting((error) => {
        console.log("Transcriptionforspeakerhub:Reconnecting due to error:", error);
      });

      connectionRefspeak.current = connectionspeak;
    }

    return () => {
      if (connectionRefspeak.current) {
        connectionRefspeak.current.stop();
      }
    };
  }, []);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleMessage = useCallback((type, text) => {
    console.log({ type, text });
    setConversation((prevConversation) => {
      const lastMessageIndex = prevConversation.length - 1;
      let lastMessageFrom = prevConversation[lastMessageIndex]?.type ?? "";

      if (lastMessageFrom === "") {
        return [...prevConversation, { type, text }];
      } else {
        if (lastMessageFrom === type) {
          let lastMessage = { ...prevConversation[lastMessageIndex] };
          lastMessage.text += text;
          let newConversation = [...prevConversation];
          newConversation[lastMessageIndex] = lastMessage;
          return newConversation;
        } else {
          return [...prevConversation, { type, text }];
        }
      }
    });
  }, []);

  const handelMicrophoneTranscription = (micMessage) => {
    if (
      !nullValues.includes(micMessage) &&
      !["", "."].includes(micMessage.trim())
    ) {
      handleMessage("Agent", micMessage);
    }
  };

  const handelScreenTranscription = (speakerMessage) => {
    if (
      !nullValues.includes(speakerMessage) &&
      !["", "."].includes(speakerMessage.trim())
    ) {
      handleMessage("Prospect", speakerMessage);
    }
  };

  async function clear() {
    if (connectionRef.current) {
      connectionRef.current.stop();
      connectionRef.current = null;
    }
    if (connectionRefspeak.current) {
      connectionRefspeak.current.stop();
      connectionRefspeak.current = null;
    }

    setConversation([]);
    setPartialTranscriptAgent("");
    setPartialTranscriptProspect("");
    setshowMessage("");
    isRecordingStartedRef.current = false;
    stopRecordSubjectRef.current = false;
    objsubject.current = null;
    objsubjectspeak.current = null;
    audioContext = null;
    audioSource = null;
    scriptProcessor = null;

    audioContextspeak = null;
    audioSourcespeak = null;
    scriptProcessorspeak = null;
  }

  async function openConnection() {
    if (
      connectionRef.current &&
      connectionRef.current.state === HubConnectionState.Disconnected &&
      connectionRefspeak.current &&
      connectionRefspeak.current.state === HubConnectionState.Disconnected
    ) {
      try {
        // Start first connection
        await connectionRef.current.start();
        console.log("SignalR connection (connectionRef) established.");
        await connectionRef.current.invoke("OpenConnection", selectedLanguage);
        await connectionRef.current.invoke("Ping");
        //await connectionRef.current.invoke("StartRecognition", selectedLanguage);
        

        // Start second connection
        await connectionRefspeak.current.start();
        console.log("SignalR connection (connectionRefspeak) established.");
        await connectionRefspeak.current.invoke("OpenConnection", selectedLanguage);
        //await connectionRefspeak.current.invoke("StartRecognition", selectedLanguage);
        
      } catch (err) {
        console.error("Error establishing SignalR connection:", err);
      }
    }
  }

  async function closeSpeechConnection() {
    if (connectionRef.current &&
      connectionRef.current.state === HubConnectionState.Connected) {
      await connectionRef.current.invoke("CloseConnection");
    }
    if (connectionRefspeak.current &&
      connectionRefspeak.current.state === HubConnectionState.Connected) {
      await connectionRefspeak.current.invoke("CloseConnection");
    }
    clear();
  }

  async function startRecognition() {
    if (connectionRef.current && connectionRefspeak.current) {
      await connectionRef.current.invoke("Ping");
      await connectionRef.current.invoke("StartRecognition");
      await connectionRefspeak.current.invoke("StartRecognition");
      InitializeStream();
      InitializeStreamspeak();
    }
  }

  const initAudio = async (stream) => {
    mediaStream = stream; // Store the media stream
    audioContext = new AudioContext();
    audioSource = audioContext.createMediaStreamSource(stream);
    scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1); // bufferSize, numInputChannels, numOutputChannels
    scriptProcessor.onaudioprocess = (event) => {
        if (isRecordingStartedRef.current) {
            const audioBuffer = event.inputBuffer;
            var inputData = downsampleBuffer(audioBuffer.getChannelData(0),
                audioContext.sampleRate,
                16000);
            var base64String = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(inputData))));
            objsubject.current.next(base64String);
        }
        if (stopRecordSubjectRef.current) {
            objsubject.current.next("END_OF_VOICE_STREAM");
            objsubject.current.complete();
            stopRecordSubjectRef.current = false;
        }
    };
    audioSource.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
}

const initAudiospeak = async (stream) => {
    mediaStreamSpeak = stream; // Store the media stream
    audioContextspeak = new AudioContext();
    audioSourcespeak = audioContextspeak.createMediaStreamSource(stream);
    scriptProcessorspeak = audioContextspeak.createScriptProcessor(1024, 1, 1); // bufferSize, numInputChannels, numOutputChannels
    scriptProcessorspeak.onaudioprocess = (event) => {
        if (isRecordingStartedRef.current) {
            const audioBuffer = event.inputBuffer;
            var inputData = downsampleBuffer(audioBuffer.getChannelData(0),
                audioContextspeak.sampleRate,
                16000);
            var base64String = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(inputData))));
            objsubjectspeak.current.next(base64String);
        }
        if (stopRecordSubjectRef.current) {
            objsubjectspeak.current.next("END_OF_VOICE_STREAM");
            objsubjectspeak.current.complete();
            stopRecordSubjectRef.current = false;
        }
    };
    audioSourcespeak.connect(scriptProcessorspeak);
    scriptProcessorspeak.connect(audioContextspeak.destination);
}

  const InitializeStream = async () => {
    try {
      navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
        .then(initAudio)
        .catch((error) => {
          console.error('Error accessing microphone:', error);
        });
    } catch (error) {
      console.error("Error capturing screen:", error);
    }
  };

  const InitializeStreamspeak = async () => {
    try {
      navigator.mediaDevices.getDisplayMedia({
        video: true, audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
        .then(initAudiospeak)
        .catch((error) => {
          console.error('Error accessing microphone:', error);
        });
    } catch (error) {
      console.error("Error capturing screen:", error);
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
      await openConnection();
      await connectionRef.current.invoke("StartRecognition", selectedLanguage);
      await connectionRefspeak.current.invoke("StartRecognition", selectedLanguage);
      InitializeStream();
      InitializeStreamspeak();
      objsubject.current = new Subject();
      objsubjectspeak.current = new Subject();
      connectionRef.current.stream("SendAudioStream", objsubject.current);
      connectionRefspeak.current.stream("SendAudioStream", objsubjectspeak.current);
      isRecordingStartedRef.current = true;
      stopRecordSubjectRef.current = false;
      console.log("Recording started...");
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }

    const closeAudioContext = async () => {
      if (audioContext) {
          await audioContext.close();
          audioContext = null;
      }
      if (audioContextspeak) {
          await audioContextspeak.close();
          audioContextspeak = null;
      }
  };

  const stopMediaStream = () => {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (mediaStreamSpeak) {
        mediaStreamSpeak.getTracks().forEach(track => track.stop());
        mediaStreamSpeak = null;
    }
};

  async function stopRecording() {
    try {
      isRecordingStartedRef.current = false;
      stopRecordSubjectRef.current = true;
      await closeAudioContext(); // Close the AudioContext
      await closeSpeechConnection(); // Close the SignalR connection
      stopMediaStream(); // Stop the media stream tracks
      console.log("Recording Stopped...");
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }

  // useEffect(() => {
  //   setTimeout(() => {
      
  //   }, 2000);
  //   return () => {
      
  //   };
  // }, []);

  return (
    <div className="App container-fluid">
      <h3>Real-time Audio Transcription</h3>

      <div className="row">
        <div className="col-2 d-flex flex-column mt-4">
          <select
            className="form-select mb-2"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिन्दी)</option>
          </select>
          <button className="btn btn-dark mb-2" onClick={startRecording}>Start Recording</button>
          <button className="btn btn-dark mb-2" onClick={stopRecording}>Stop Recording</button>
        </div>
        <div className="col-10">
          <div className="container">
            {/* Left Side: Conversation History */}
            <div className="conversation-container" ref={conversationRef}>
              {conversation.map((message, index) => (
                <div key={index} className={message.type}>
                  <strong>{message.type}: </strong>
                  <span>{message.text}</span>
                </div>
              ))}
            </div>

            {/* Right Side: Current Speech (Live Partial Transcript) */}
            <div className="current-speech">
              <p><strong>Agent:</strong> <span>{partialTranscriptAgent ? partialTranscriptAgent : "Listening..."}</span></p>
              <p><strong>Prospect:</strong> <span>{partialTranscriptProspect ? partialTranscriptProspect : "Listening..."}</span></p>
            </div>
            <div className="messagewindow">
              <p style={{ fontSize: "x-small" }}>Message : {showMessage}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Speaker;