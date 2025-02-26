import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faStop, faPlay, faPause, faUpload, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import coach from '~/images/coach.png';
import { useEffect, useMemo, useRef, useState } from 'react';
import enFlag from '~/images/gb.svg';
import vnFlag from '~/images/vn.svg';

function Test() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [currentText, setCurrentText] = useState('');
  const [pronunciationResponse, setPronunciationResponse] = useState(null);
  const [metricsResponse, setMetricsResponse] = useState(null);
  const [reportResponse, setReportResponse] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoadingAnalyze, setIsLoadingAnalyze] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [progress, setProgress] = useState(0);
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
      setIsLoadingAnalyze(true);
      setProgress(0);
      const formData = new FormData();
      formData.append('text', currentText);
      formData.append('audio', audioFile);

      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 10 : 100));
      }, 500);

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

        const listScore = Object.values(metricsResponse.data.measures).map((measure) => measure.score);

        localStorage.setItem('listScore', JSON.stringify(listScore));
      } catch (error) {
        console.error('Error analyzing and evaluating:', error);
      } finally {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setIsLoadingAnalyze(false);
          setProgress(0);
        }, 500);
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

    if (localStorage.getItem('currentKey') > 0) {
      setIsLoadingReport(true);
      setProgress(0);
      const combinedData = {
        pronunciationData,
        metricsData,
      };

      const formData = new FormData();
      formData.append('text', JSON.stringify(combinedData));

      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 10 : 100));
      }, 500);

      try {
        const response = await fetch(`${process.env.REACT_APP_API_DOMAIN}/api/v1/generate-speaking-report`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        setReportResponse(data);
      } catch (error) {
        console.error('Error generating report:', error);
      } finally {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setIsLoadingReport(false);
          setProgress(0);
        }, 500);
      }
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

  const switchLanguage = (lang) => {
    localStorage.setItem('language', lang);
    setLanguage(lang);
  };

  const textContent = {
    en: {
      title: 'Demo English Pronunciation Practice',
      newText: 'New Text',
      uploadAudio: 'Upload Audio',
      stop: 'Stop',
      record: 'Record',
      playAudio: 'Play Audio',
      pauseAudio: 'Pause Audio',
      analyzeAndEvaluate: 'Analyze and Evaluate',
      generateReport: 'Generate Speaking Report',
      averagePoint: 'Your average point:',
      speakingreport: 'Speaking Report:',
      overallAssessment: 'Overall Assessment:',
      commonErrors: 'Common Errors:',
      improvementSuggestions: 'Improvement Suggestions:',
      analysisResults: 'Analysis Results',
      pronunciationErrors: 'Pronunciation Errors:',
      word: 'Word:',
      yourPronunciation: 'Your Pronunciation:',
      correctPronunciation: 'Correct Pronunciation:',
      explanation: 'Explanation:',
      speechMetrics: 'Speech Metrics:',
      notes: 'Notes:',
      close: 'Close',
    },
    vn: {
      title: 'Demo thực hành phát âm tiếng Anh',
      newText: 'Văn bản mới',
      uploadAudio: 'Tải lên file',
      stop: 'Dừng lại',
      record: 'Ghi âm',
      playAudio: 'Phát lại',
      pauseAudio: 'Tạm dừng',
      analyzeAndEvaluate: 'Đánh giá và phân tích',
      generateReport: 'Tạo báo cáo phát âm',
      averagePoint: 'Điểm trung bình của bạn:',
      speakingreport: 'Báo cáo phát âm:',
      overallAssessment: 'Đánh giá tổng thể:',
      commonErrors: 'Lỗi phổ biến:',
      improvementSuggestions: 'Đề xuất cải thiện:',
      analysisResults: 'Kết quả phân tích',
      pronunciationErrors: 'Lỗi phát âm:',
      word: 'Từ:',
      yourPronunciation: 'Phát âm của bạn:',
      correctPronunciation: 'Phát âm đúng:',
      explanation: 'Giải thích:',
      speechMetrics: 'Chỉ số giọng nói:',
      notes: 'Ghi chú:',
      close: 'Đóng',
    },
  };

  return (
    <div className="bg-gradient-to-b from-blue-900 to-purple-900 text-white py-12 flex flex-col items-center min-h-screen">
      <div className="absolute top-4 right-4 flex space-x-1/2">
        <img
          src={enFlag}
          alt="English"
          className={`w-12 h-6 cursor-pointer ${language === 'en' ? 'opacity-100' : 'opacity-50'}`}
          onClick={() => switchLanguage('en')}
        />
        <img
          src={vnFlag}
          alt="Vietnamese"
          className={`w-12 h-6 cursor-pointer ${language === 'vn' ? 'opacity-100' : 'opacity-50'}`}
          onClick={() => switchLanguage('vn')}
        />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold">{textContent[language].title}</h1>
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
      <div className="mt-6">
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
      {metricsResponse && (
        <div className="mt-4">
          <p className="text-lg font-semibold text-center my-1">{textContent[language].averagePoint}</p>
          <h1 className="text-4xl font-semibold text-center my-1">
            <strong>
              {localStorage.getItem('listScore')
                ? Math.round(
                    (JSON.parse(localStorage.getItem('listScore')).reduce((a, b) => a + b, 0) /
                      JSON.parse(localStorage.getItem('listScore')).length) *
                      100,
                  ) / 100
                : 0}
            </strong>
          </h1>
        </div>
      )}
      <div className="mt-8 flex">
        <button
          onClick={handleNewText}
          className="bg-gradient-to-r from-purple-400 to-indigo-500 text-white font-semibold w-14 h-14 rounded-full text-lg flex items-center justify-center"
        >
          <FontAwesomeIcon icon={faSyncAlt} />
        </button>
        <input type="file" accept="audio/*" onChange={handleFileUpload} id="file-upload" className="hidden" />
        <label
          htmlFor="file-upload"
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold w-14 h-14 mx-5 rounded-full text-lg flex items-center justify-center cursor-pointer"
        >
          <FontAwesomeIcon icon={faUpload} />
        </label>
        <button
          onClick={handleRecord}
          className="bg-gradient-to-r from-red-400 to-pink-500 text-white font-semibold w-14 h-14 rounded-full text-lg"
        >
          <FontAwesomeIcon icon={isRecording ? faStop : faMicrophone} />
        </button>
        <button
          onClick={!isPlaying ? handleReplay : handleStopReplay}
          className={`bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold w-14 h-14 ml-5 rounded-full text-lg ${
            !audioFile ? 'disabled' : ''
          }`}
          disabled={!audioFile}
        >
          <FontAwesomeIcon icon={!isPlaying ? faPlay : faPause} />
        </button>
      </div>
      <div className="mt-4 flex">
        <p className="w-14 break-words text-sm text-center">{textContent[language].newText}</p>
        <p className="w-14 break-words text-sm text-center mx-5">{textContent[language].uploadAudio}</p>
        <p className="w-14 break-words text-sm text-center">
          {isRecording ? textContent[language].stop : textContent[language].record}
        </p>
        <p className="w-14 break-words text-sm text-center ml-5">
          {!isPlaying ? textContent[language].playAudio : textContent[language].pauseAudio}
        </p>
      </div>
      <div className="mt-8">
        <button
          onClick={handleAnalyzeAndEvaluate}
          className={`bg-gradient-to-r from-blue-400 to-green-500 text-white font-semibold py-2 px-12 rounded-full text-lg ${
            !audioFile ? 'disabled' : ''
          }`}
          disabled={!audioFile}
        >
          {textContent[language].analyzeAndEvaluate}
          {isLoadingAnalyze && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%`, transition: 'width 0.5s' }}
              ></div>
            </div>
          )}
        </button>
      </div>
      <div className="mt-4">
        <button
          onClick={handleGenerateReport}
          className={`bg-gradient-to-r from-red-400 to-orange-500 text-white font-semibold py-2 px-12 rounded-full text-lg ${
            localStorage.getItem('currentKey') < 1 ? 'disabled' : ''
          }`}
          disabled={localStorage.getItem('currentKey') < 1}
        >
          {textContent[language].generateReport}
          {isLoadingReport && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
              <div
                className="bg-red-600 h-2.5 rounded-full"
                style={{ width: `${progress}%`, transition: 'width 0.5s' }}
              ></div>
            </div>
          )}
        </button>
      </div>
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white text-black p-8 rounded-lg max-w-2xl w-full max-h-full overflow-y-auto">
            <h2 className="text-lg font-semibold">{textContent[language].analysisResults}</h2>
            {pronunciationResponse && (
              <div className="mt-4">
                <h3 className="text-md font-semibold">{textContent[language].pronunciationErrors}</h3>
                <ul>
                  {pronunciationResponse.data.errors.map((error, index) => (
                    <li key={index}>
                      <p>
                        - <strong>{textContent[language].word}</strong> {error.word}
                      </p>
                      <p>
                        <strong>{textContent[language].yourPronunciation}</strong> {error.your_pronunciation}
                      </p>
                      <p>
                        <strong>{textContent[language].correctPronunciation}</strong> {error.correct_pronunciation}
                      </p>
                      <p>
                        <strong>{textContent[language].explanation}</strong> {error.explanation}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {metricsResponse && (
              <div className="mt-4">
                <h3 className="text-md font-semibold">{textContent[language].speechMetrics}</h3>
                <ul>
                  {Object.keys(metricsResponse.data.measures).map((key) => (
                    <li key={key}>
                      <p>
                        - <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>{' '}
                        {metricsResponse.data.measures[key].score}
                      </p>
                      <p>
                        <strong>{textContent[language].notes}</strong> {metricsResponse.data.measures[key].notes}
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
              {textContent[language].close}
            </button>
          </div>
        </div>
      )}
      {reportResponse && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold my-1">{textContent[language].speakingreport}</h2>
          <p>
            <strong>{textContent[language].overallAssessment}</strong> {reportResponse.data.overall_assessment}
          </p>
          <h3 className="text-md font-semibold my-1">{textContent[language].commonErrors}</h3>
          <ul>
            {reportResponse.data.common_errors.map((error, index) => (
              <li key={index} className="my-1">
                {error}
              </li>
            ))}
          </ul>
          <h3 className="text-md font-semibold my-1">{textContent[language].improvementSuggestions}</h3>
          <ul>
            {reportResponse.data.improvement_suggestions.map((suggestion, index) => (
              <li key={index} className="my-1">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Test;
