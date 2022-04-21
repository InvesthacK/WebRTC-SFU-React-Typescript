import React, { useEffect, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { socket } from "./App";

interface CallProps {
  children?: React.ReactNode;
  user: {
    username: string;
    peer: RTCPeerConnection;
  };
  username: string;
}

const Call: React.FC<CallProps> = ({ user, username }) => {
  // const remoteMedia = useMemo(() => new MediaStream(), []);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const queuedAnswer = useRef<RTCIceCandidate[]>([]);

  const localConnection = useMemo(() => {
    console.log("create connection");
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.stunprotocol.org:3478" },
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });
    pc.ontrack = (e) => {
      console.log("%c On Track", "background: blue; color:white");
      if (e.streams && e.streams[0]) {
        if (remoteRef.current) {
          remoteRef.current.srcObject = e.streams[0];
        }
      }
    };
    // pc.addTransceiver("video", { direction: "recvonly" });
    return pc;
  }, [user]);

  const createOffer = async () => {
    const offer = await localConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    });
    await localConnection.setLocalDescription(offer);
    return offer;
  };

  useEffect(() => {
    createOffer().then((offer) => {
      // socket.emit("join", { username, offer });
      socket.emit("consumer", { offer, username });
    });
    socket.on("consumer-answer", ({ answer }) => {
      console.log("%c comsumber have answer", "background: grey; color:white");
      localConnection
        .setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
          if (queuedAnswer.current.length > 0) {
            queuedAnswer.current.forEach((a) => {
              localConnection.addIceCandidate(new RTCIceCandidate(a));
            });
          }
        });
    });

    localConnection.onicecandidate = (event) => {
      console.log("send offer candidate");
      if (event.candidate) {
        socket.emit("consumer-add-offer-candidate", {
          candidate: event.candidate,
        });
      }
    };

    socket.on("consumer-add-answer-candidate", ({ candidate }) => {
      console.log("%c had answer candidate", "background: green; color:white");
      if (localConnection.currentLocalDescription) {
        localConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        queuedAnswer.current.push(candidate);
      }
    });

    localConnection.onconnectionstatechange = () => {
      console.log(
        "%c Connection State: " + localConnection.connectionState,
        "background: red; color:white"
      );
    };

    return () => {
      socket.off("consumer-answer");
      socket.off("consumer-add-answer-candidate");
    };
  }, []);

  return (
    <span>
      <video ref={remoteRef} autoPlay></video>
      <h3>User: {user.username}</h3>
    </span>
  );
};
export default Call;
