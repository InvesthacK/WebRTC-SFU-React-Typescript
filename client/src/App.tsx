import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { io } from "socket.io-client";
import { v1 } from "uuid";
import { toast } from "react-toastify";
import Call from "./Call";

export const socket = io("http://localhost:5050");

interface User {
  username: string;
  peer: RTCPeerConnection;
}

function App() {
  const queuedAnswer = useRef<RTCIceCandidate[]>([]);
  const localRef = useRef<HTMLVideoElement>(null);
  const [media, setMedia] = useState<MediaStream | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const remoteMedia = useMemo(() => new MediaStream(), []);
  const remoteRef = useRef<HTMLVideoElement>(null);

  const localConnection = useMemo(() => {
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
  }, []);
  const [username, _] = useState(v1());

  const createOffer = async () => {
    const offer = await localConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    });
    await localConnection.setLocalDescription(offer);
    return offer;
  };

  const getUserVideo = async () => {
    return navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((media) => {
        if (localRef.current) {
          localRef.current.srcObject = media;
        } else {
          toast("No LocalRef", { type: "error" });
        }
        media.getTracks().forEach((track) => {
          console.log("send track");
          localConnection.addTrack(track, media);
        });
      });
  };

  useEffect(() => {
    if (remoteRef.current) {
      remoteRef.current.srcObject = remoteMedia;
    }
  }, [remoteRef.current]);

  useEffect(() => {
    getUserVideo().then(() => {
      createOffer().then((offer) => {
        socket.emit("join", { username, offer });
      });
      socket.on("answer", ({ answer }) => {
        console.log("have answer");
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
          socket.emit("add-offer-candidate", {
            candidate: event.candidate,
            username,
          });
        }
      };

      socket.on("add-answer-candidate", ({ candidate }) => {
        console.log(
          "%c had answer candidate",
          "background: green; color:white"
        );
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
      socket.emit("get-media");
    });

    return () => {
      socket.off("answer");
    };
  }, []);

  useEffect(() => {
    socket.on("all-user", ({ users }) => {
      console.log(users);
      setUsers(users);
    });
  }, []);

  return (
    <div className="App">
      <div>
        <h3>Username: {username}</h3>
      </div>
      <video ref={localRef} autoPlay></video>

      <div>
        <button onClick={() => {}}>GET Users</button>
      </div>
      {users.map((user) => (
        <React.Fragment key={user.username}>
          <h3>User: {user.username}</h3>
          <video autoPlay ref={remoteRef}></video>
        </React.Fragment>
      ))}
    </div>
  );
}

export default App;
