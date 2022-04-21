import React, { useEffect, useMemo, useRef } from "react";

interface CallProps {
  children?: React.ReactNode;
  user: {
    username: string;
    peer: RTCPeerConnection;
  };
}

const Call: React.FC<CallProps> = ({ user }) => {
  const remoteMedia = useMemo(() => new MediaStream(), []);
  const remoteRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (remoteRef.current) {
      remoteRef.current.srcObject = remoteMedia;
    }

    user.peer.ontrack = (e) => {
      console.log("on track");
      if (e.streams && e.streams[0]) {
        e.streams[0].getTracks().forEach((track) => {
          remoteMedia.addTrack(track);
        });
      }
    };
  }, []);
  return (
    <div>
      <h3>User: {user.username}</h3>
      <video autoPlay ref={remoteRef}></video>
    </div>
  );
};
export default Call;
