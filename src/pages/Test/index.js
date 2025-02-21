import coach from '~/images/coach.png';
import { useEffect, useMemo, useRef, useState } from 'react';

function Test() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [currentText, setCurrentText] = useState('');
  const [pronunciationResponse, setPronunciationResponse] = useState(null);
  const [metricsResponse, setMetricsResponse] = useState(null);
  const [reportResponse, setReportResponse] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const texts = useMemo(
    () => [
      'The quick brown fox jumps over the lazy dog.',
      'How much wood would a woodchuck chuck if a woodchuck could chuck wood?',
      'She sells seashells by the seashore.',
      'Peter Piper picked a peck of pickled peppers.',
      'A big black bug bit a big black bear.',
      'I scream, you scream, we all scream for ice cream.',
      'How can a clam cram in a clean cream can?',
      'Six slippery snails slid slowly seaward.',
      'Fred fed Ted bread and Ted fed Fred bread.',
      'A skunk sat on a stump and thunk the stump stunk, but the stump thunk the skunk stunk.',
      'If I put it in my batter, it will make my batter bitter.',
      'But a bit of better butter will make my batter better.',
      'Can you can a can as a canner can can a can?',
      'I saw Susie sitting in a shoeshine shop.',
      'Near an ear, a nearer ear, a nearly eerie ear.',
      'We surely shall see the sun shine soon.',
      'Which wristwatches are Swiss wristwatches?',
    ],
    [],
  );

  useEffect(() => {
    setCurrentText(texts[Math.floor(Math.random() * texts.length)]);
  }, [texts]);

  const handleRecord = async () => {
    if (!isRecording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        setAudioFile(audioFile);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } else {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleAnalyzeAndEvaluate = async () => {
    if (audioFile) {
      const formData = new FormData();
      formData.append('text', currentText);
      formData.append('audio', audioFile);

      try {
        const [pronunciationResponse, metricsResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_DOMAIN}/api/v1/analyze-pronunciation-error`, {
            method: 'POST',
            body: formData,
          }).then((res) => res.json()),
          fetch(`${process.env.REACT_APP_API_DOMAIN}/api/v1/evaluate-speech-metrics`, {
            method: 'POST',
            body: formData,
          }).then((res) => res.json()),
        ]);

        setPronunciationResponse(pronunciationResponse);
        setMetricsResponse(metricsResponse);

        let currentKey = localStorage.getItem('currentKey');
        if (!currentKey) {
          currentKey = 0;
        } else {
          currentKey = parseInt(currentKey, 10);
        }

        const newKey = currentKey + 1;

        localStorage.setItem(`pronunciationResponse_${newKey}`, JSON.stringify(pronunciationResponse));
        localStorage.setItem(`metricsResponse_${newKey}`, JSON.stringify(metricsResponse));

        localStorage.setItem('currentKey', newKey);
      } catch (error) {
        console.error('Error analyzing and evaluating:', error);
      }
    }
  };

  const handleGenerateReport = async () => {
    const pronunciationData = [];
    const metricsData = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key.startsWith('pronunciationResponse_')) {
        const data = JSON.parse(localStorage.getItem(key));
        pronunciationData.push(data);
      } else if (key.startsWith('metricsResponse_')) {
        const data = JSON.parse(localStorage.getItem(key));
        metricsData.push(data);
      }
    }

    if (pronunciationData.length > 4 && metricsData.length > 4) {
      const combinedData = {
        pronunciationData,
        metricsData,
      };

      const formData = new FormData();
      formData.append('text', JSON.stringify(combinedData));

      const response = await fetch(`${process.env.REACT_APP_API_DOMAIN}/api/v1/generate-speaking-report`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setReportResponse(data);
    }
  };

  const handleReplay = () => {
    if (audioFile) {
      const audioURL = URL.createObjectURL(audioFile);
      const audio = new Audio(audioURL);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioURL);
        setIsPlaying(false);
      });

      audio.play();
      setIsPlaying(true);
    }
  };

  const handleStopReplay = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleNewText = () => {
    setCurrentText(texts[Math.floor(Math.random() * texts.length)]);
    setPronunciationResponse(null);
    setMetricsResponse(null);
  };

  const openPopup = () => {
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="bg-gradient-to-b from-blue-900 to-purple-900 text-white py-12 flex flex-col justify-center items-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Demo Pronunciation Practice Website</h1>
      </div>
      <div className="mt-8">
        <img
          alt="Cartoon illustration of a coach with glasses and a yellow shirt labeled 'COACH'"
          className="rounded-full"
          height="150"
          src={coach}
          width="150"
        />
      </div>
      <div className="mt-8">
        <b>
          <p>{currentText}</p>
          {pronunciationResponse && (
            <div className="flex items-center">
              <div dangerouslySetInnerHTML={{ __html: pronunciationResponse.data.html_output }} />
              <button
                onClick={openPopup}
                className="bg-gradient-to-r from-blue-400 to-green-500 text-white font-semibold w-6 h-6 mx-1 rounded-full text-lg flex items-center justify-center"
                disabled={!pronunciationResponse || !metricsResponse}
              >
                !
              </button>
            </div>
          )}
        </b>
      </div>
      <div className="mt-8">
        <button
          onClick={handleNewText}
          className="bg-gradient-to-r from-purple-400 to-indigo-500 text-white font-semibold py-2 px-12 rounded-full text-lg"
        >
          Change Text
        </button>
      </div>
      <div className="mt-8">
        <button
          onClick={handleRecord}
          className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-semibold py-2 px-12 mx-2 rounded-full text-lg"
        >
          {isRecording ? 'Stop Recording' : 'Record'}
        </button>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold py-2 px-12 mx-2 rounded-full text-lg"
        />
        <button
          onClick={!isPlaying ? handleReplay : handleStopReplay}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold py-2 px-12 mx-2 rounded-full text-lg"
          disabled={!audioFile}
        >
          {!isPlaying ? `Replay` : `Stop`}
        </button>
      </div>
      <div className="mt-8">
        <button
          onClick={handleAnalyzeAndEvaluate}
          className="bg-gradient-to-r from-blue-400 to-green-500 text-white font-semibold py-2 px-12 rounded-full text-lg"
          disabled={!audioFile}
        >
          Analyze and Evaluate
        </button>
      </div>
      <div className="mt-8">
        <button
          onClick={handleGenerateReport}
          className="bg-gradient-to-r from-gray-400 to-gray-500 text-white font-semibold py-2 px-12 rounded-full text-lg"
          disabled={localStorage.length < 10}
        >
          Generate Speaking Report
        </button>
      </div>
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white text-black p-8 rounded-lg max-w-lg w-full max-h-full overflow-y-auto">
            <h2 className="text-lg font-semibold">Analysis Results</h2>
            {pronunciationResponse && (
              <div className="mt-4">
                <h3 className="text-md font-semibold">Pronunciation Errors:</h3>
                <ul>
                  {pronunciationResponse.data.errors.map((error, index) => (
                    <li key={index}>
                      <p>
                        <strong>Word:</strong> {error.word}
                      </p>
                      <p>
                        <strong>Your Pronunciation:</strong> {error.your_pronunciation}
                      </p>
                      <p>
                        <strong>Correct Pronunciation:</strong> {error.correct_pronunciation}
                      </p>
                      <p>
                        <strong>Explanation:</strong> {error.explanation}
                      </p>
                    </li>
                  ))}
                </ul>
                <div dangerouslySetInnerHTML={{ __html: pronunciationResponse.data.html_output }} />
              </div>
            )}
            {metricsResponse && (
              <div className="mt-4">
                <h3 className="text-md font-semibold">Speech Metrics:</h3>
                <ul>
                  {Object.keys(metricsResponse.data.measures).map((key) => (
                    <li key={key}>
                      <p>
                        <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>{' '}
                        {metricsResponse.data.measures[key].score}
                      </p>
                      <p>
                        <strong>Notes:</strong> {metricsResponse.data.measures[key].notes}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={closePopup}
              className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-semibold py-2 px-12 mt-4 rounded-full text-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {reportResponse && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Speaking Report:</h2>
          <p>
            <strong>Overall Assessment:</strong> {reportResponse.data.overall_assessment}
          </p>
          <h3 className="text-md font-semibold">Common Errors:</h3>
          <ul>
            {reportResponse.data.common_errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          <h3 className="text-md font-semibold">Improvement Suggestions:</h3>
          <ul>
            {reportResponse.data.improvement_suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Test;
