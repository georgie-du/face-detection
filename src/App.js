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
          // console.log('Got MediaStream:', stream);
          window.stream = stream;
          videoRef.current.srcObject = stream;
          //load coco detaset model and assign to reference
          const model = await cocoSsd.load();
          modelRef.current = model;
          startButton.current.removeAttribute("disabled");
        } catch (error) {
          console.error('Error accessing media devices.', error);
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
    //detect person in the video
    const predictions = await modelRef.current.detect(videoRef.current);

    let foundPerson = false;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].class === "person") {
        foundPerson = true;
        // console.log(predictions[i].class);
      }
      console.log(predictions[i].class);
    }
    //start/stop recording if person detected
    if (foundPerson) {
      startRec();
      lastDetectionsRec.current.push(true);
    } else if (lastDetectionsRec.current.filter(Boolean).length) {
      startRec();
      lastDetectionsRec.current.push(false);
    } else {
      stopRec();
    }
    // console.log(lastDetectionsRec.current);
    lastDetectionsRec.current = lastDetectionsRec.current.slice(
      Math.max(lastDetectionsRec.current.length - 9, 0)
    );
    //update animation frame before next repaint(60 frames/sec)
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
      const href = URL.createObjectURL(e.data);
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
        <video style={{ width: "550px", height: "350px" }} className="rounded" autoPlay playsInline muted ref={videoRef} />
      </div>
      <div class="btn-toolbar d-flex justify-content-center p-3" role="toolbar">
        <div className="btn-group mr-2" role="group">
          <button
            className="btn btn-warning"
            onClick={() => {
              startRecRef.current = true;
              stopButton.current.removeAttribute("disabled");
              startButton.current.setAttribute("disabled", "disabled");
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
              stopButton.current.setAttribute("disabled", "disabled");
              stopRec();
            }}
            ref={stopButton}
          >
            Stop
          </button>
        </div>
      </div>

      <div className="card-header text-center my-5 h3 w-100 ">Video recordings:</div>
      <div className="row container-fluid m-0 w-100 d-flex justify-content-center">
        {!recordings.length
          ? null
          : recordings.map(record => {
            return (
              <div className="card m-3 " key={record.dateTitle} style={{ backgroundColor: "#282c34" }}>
                <div className="card-body p-3 m-0 justify-content-center">
                  <p className="card-dateTitle text-muted small">{record.dateTitle}</p>
                  <video style={{ width: "500px", height: "350px" }} className="rounded d-flex justify-content-center m-auto" poster="https://www.israel21c.org/wp-content/uploads/2020/04/shutterstock_731158624-768x432.jpg" controls src={record.href} download={record.href} ></video>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default App;
