import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, RemoteParticipant, Track } from "livekit-client";

export interface LiveKitViewerProps {
  livekitUrl?: string | null;
  accessToken?: string | null;
}

const LiveKitViewer = ({
  livekitUrl,
  accessToken
}: LiveKitViewerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStream = useMemo(() => new MediaStream(), []);
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState("Not connected");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = mediaStream;
      video.muted = false;
    }
  }, [mediaStream]);

  const ensurePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.muted = false;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch((err) => {
        console.warn("Autoplay failed, waiting for user interaction", err);
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  useEffect(() => {
    if (livekitUrl && accessToken) {
      connect();
    }
  }, [livekitUrl, accessToken]);

  const attachTrack = useCallback(
    (track: Track, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        mediaStream.addTrack(track.mediaStreamTrack);
        ensurePlayback();
        setStatus(`Receiving media from ${participant.identity || "avatar"}`);
      }
    },
    [ensurePlayback, mediaStream]
  );

  const connect = useCallback(async () => {
    if (!livekitUrl || !accessToken) {
      setStatus("Session not ready. Create a session first.");
      return;
    }

    if (room) {
      setStatus("Already connected.");
      return;
    }

    setConnecting(true);
    try {
      const nextRoom = new Room();

      nextRoom.on(
        RoomEvent.TrackSubscribed,
        (track, _publication, participant) => attachTrack(track, participant)
      );

      nextRoom.on(RoomEvent.Disconnected, () => {
        setStatus("Disconnected");
        setRoom(null);
      });

      await nextRoom.connect(livekitUrl, accessToken);
      setRoom(nextRoom);
      setStatus("Connected. Waiting for avatar media…");
    } catch (err) {
      console.error(err);
      setStatus(`Connection error: ${(err as Error).message}`);
    } finally {
      setConnecting(false);
    }
  }, [accessToken, attachTrack, livekitUrl, room]);

  return (
    <div className="card video-wrapper">
      <h2>LiveKit Viewer</h2>
      <video ref={videoRef} autoPlay playsInline />
      <div className="status-pill">{status}</div>
    </div>
  );
};

export default LiveKitViewer;
