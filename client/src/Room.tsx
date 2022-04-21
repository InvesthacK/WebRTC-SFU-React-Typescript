import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { v1 } from "uuid";
import { toast, ToastContainer } from "react-toastify";
import Call from "./Call";
import { socket } from "./App";

interface User {
  username: string;
  peer: RTCPeerConnection;
}

const Room: React.FC<{ media: MediaStream }> = ({ media }) => {
  const queuedAnswer = useRef<RTCIceCandidate[]>([]);
  const localRef = useRef<HTMLVideoElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [start, setStart] = useState(false);

  const localConnection = useMemo(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: import.meta.env.VITE_STUNSERVER_1 },
        {
          urls: import.meta.env.VITE_STUNSERVER_2,
          username: import.meta.env.VITE_XIRSYS_USERNAME,
          credential: import.meta.env.VITE_XIRSYS_CREDENTIAL,
        },
      ],
    });
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
    if (localRef.current) {
      localRef.current.srcObject = media;
    } else {
      toast("No LocalRef", { type: "error" });
    }
    media.getTracks().forEach((track) => {
      console.log("send track");
      localConnection.addTrack(track, media);
    });
  };

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
            socket.emit("get-media");
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
    });

    socket.on("logging", (logs) => {
      console.log(logs);
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
    socket.on("new-user", (user) => {
      console.log("new user");
      setUsers((prev) => [...prev, user]);
    });
    socket.on("user-leave", ({ users }) => {
      console.log("user leave");
      setUsers(users);
    });
  }, []);

  useEffect(() => {
    console.log({ users });
  }, [users]);

  return (
    <div className="App">
      <ToastContainer />
      <div>
        <h3>Username: {username}</h3>
      </div>
      <div>
        <button
          onClick={() => {
            setStart(true);
          }}
        >
          Start
        </button>
        <button
          onClick={() => {
            socket.emit("log");
          }}
        >
          LOG
        </button>
        <button
          onClick={() => {
            socket.emit("clear");
          }}
        >
          Clear
        </button>
      </div>
      <div>
        <span>
          <video ref={localRef} autoPlay></video>
          <h3>Local</h3>
        </span>
      </div>
      <div className="videos">
        {start &&
          users.map((user) => {
            if (user.username !== username) {
              return (
                <Call key={user.username} user={user} username={username} />
              );
            } else {
              return null;
            }
          })}
      </div>
    </div>
  );
};

export default Room;
