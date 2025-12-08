import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import LiveKitViewer from "./components/LiveKitViewer";
import {
  CreateSessionPayload,
  SessionResponse,
  createSession,
  sendText,
  stopSession
} from "./services/heygenApi";

const demoTexts = {
  en: "Hello from the React HeyGen viewer. I am a streaming avatar reading the message you just submitted.",
  fa: "سلام! این یک پیام آزمایشی از برنامه React شماست.",
  zh: "你好，這是一條來自 React 應用程式的測試訊息。"
};

const COOKIE_KEY = "heygen-session";

const App = () => {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [text] = useState(demoTexts.en);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const sessionReady = Boolean(session?.sessionId);
  const canTalk = sessionReady && text.trim().length > 0 && !isTalking;

  useEffect(() => {
    const cachedSession = Cookies.get(COOKIE_KEY);
    if (cachedSession) {
      setSession(JSON.parse(cachedSession));
    } else {
      handleCreateSession();
    }
  }, []);

  const handleCreateSession = async () => {
    try {
      const data = await createSession({});
      setSession(data);
      Cookies.set(COOKIE_KEY, JSON.stringify(data));
      updateStatus("Session created and cached.");
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message || "Unable to create session. Check backend logs."
      );
    }
  };

  const updateStatus = (message: string) => {
    setStatus(message);
    setError(null);
  };

  const handleSendText = async () => {
    if (!session) {
      return;
    }
    setIsTalking(true);
    setError(null);
    try {
      await sendText(session.sessionId, text);
      updateStatus("Task submitted to HeyGen.");
    } catch (err) {
      console.error(err);
      setError("Failed to send text to avatar.");
    } finally {
      setIsTalking(false);
    }
  };

  const handleStop = async () => {
    if (!session) {
      return;
    }
    setIsStopping(true);
    try {
      await stopSession(session.sessionId);
      setSession(null);
      Cookies.remove(COOKIE_KEY);
      updateStatus("Session stopped.");
    } catch (err) {
      console.error(err);
      setError("Unable to stop session.");
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="app-shell">
      <header>
        <h1>HeyGen + LiveKit React Viewer</h1>
        <p>
          Use the controls below to request a streaming avatar session from your
          FastAPI backend and connect through LiveKit.
        </p>
      </header>

      <LiveKitViewer
        livekitUrl={session?.livekitUrl}
        accessToken={session?.accessToken}
      />
      <div className="row">
        <button onClick={handleSendText} disabled={!canTalk}>
          {isTalking ? "Sending…" : "Talk"}
        </button>
        <button
          className="secondary"
          onClick={handleStop}
          disabled={!session || isStopping}
        >
          {isStopping ? "Stopping…" : "Stop"}
        </button>
      </div>

      {(status || error) && (
        <div
          className={`status-pill ${error ? "error" : "success"}`}
          aria-live="polite"
        >
          {error || status}
        </div>
      )}
    </div>
  );
};

export default App;
