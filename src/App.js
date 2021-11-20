import './App.css';
import React, { useRef, useEffect, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

function App() {
  const [recordings, setRecordings] = useState([]);
  const videoRef = useRef(null);
  const startButton = useRef(null);
  const stopButton = useRef(null);
  const startRecRef = useRef(false);
  const modelRef = useRef(null);
  const recordingRef = useRef(false);
  const lastDetectionsRec = useRef([]);
  const recorderRef = useRef(null);

  useEffect(() => {
    async function setup() {
      startButton.current.setAttribute("disabled", true);
      stopButton.current.setAttribute("disabled", true);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });
          window.stream = stream;
          videoRef.current.srcObject = stream;
          const model = await cocoSsd.load();

          modelRef.current = model;
          startButton.current.removeAttribute("disabled");
        } catch (error) {
          console.error(error);
        }
      }
    }
    setup();
  }, []);

  async function detectFrame() {
    if (!startRecRef.current) {
      stopRec();
      return;
    }

    const predictions = await modelRef.current.detect(videoRef.current);

    let foundPerson = false;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].class === "person") {
        foundPerson = true;
      }
    }

    if (foundPerson) {
      startRec();
      lastDetectionsRec.current.push(true);
    } else if (lastDetectionsRec.current.filter(Boolean).length) {
      startRec();
      lastDetectionsRec.current.push(false);
    } else {
      stopRec();
    }

    lastDetectionsRec.current = lastDetectionsRec.current.slice(
      Math.max(lastDetectionsRec.current.length - 10, 0)
    );
    //update animation before next repaint(60 times/sec)
    requestAnimationFrame(() => {
      detectFrame();
    });
  }

  function startRec() {
    if (recordingRef.current) {
      return;
    }

    recordingRef.current = true;
    console.log("start recording");

    recorderRef.current = new MediaRecorder(window.stream);
    // timestamp
    recorderRef.current.ondataavailable = function (e) {
      const dateTitle = (new Date().toUTCString());
      console.log(dateTitle);
      const href = URL.createObjectURL(e.data);
      console.log(href);
      setRecordings(previousRecords => {
        return [...previousRecords, { href, dateTitle }];
      });
    };

    recorderRef.current.start();
  }

  function stopRec() {
    if (!recordingRef.current) {
      return;
    }

    recordingRef.current = false;
    recorderRef.current.stop();
    console.log("stopped recording");
    lastDetectionsRec.current = [];
  }

  return (
    <div className="py-3 App-header">
      <h3 className="card-header p-3 my-4 w-100 text-center h3">Face detection surveillance camera</h3>
      <div>
        <video className="rounded" autoPlay playsInline muted ref={videoRef} />
      </div>
      <div>
        <div class="btn-toolbar d-flex justify-content-center p-3" role="toolbar">
          <div className="btn-group mr-2" role="group">
            <button
              className="btn btn-warning"
              onClick={() => {
                startRecRef.current = true;
                stopButton.current.removeAttribute("disabled");
                startButton.current.setAttribute("disabled", true);
                detectFrame();
              }}
              ref={startButton}
            >
              Start
            </button>
          </div>
          <div className="btn-group mr-2" role="group">
            <button
              className="btn btn-danger"
              onClick={() => {
                startRecRef.current = false;
                startButton.current.removeAttribute("disabled");
                stopButton.current.setAttribute("disabled", true);
                stopRec();
              }}
              ref={stopButton}
            >
              Stop
            </button>
          </div>
        </div>

        <div className="card-header text-center my-5 h3 ">Video recordings:</div>
        <div className="row container m-0 p-3 w-100 d-flex justify-content-center">
          {!recordings.length
            ? null
            : recordings.map(record => {
              return (
                <div className="card mt-3 w-70" key={record.dateTitle} style={{ backgroundColor: "#282c34" }}>
                  <div className="card-body p-3 w-100">
                    <p className="card-dateTitle text-muted small">{record.dateTitle}</p>
                    <video width="630" className="rounded d-flex justify-content-center m-auto" controls src={record.href} download={record.href} ></video>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default App;
