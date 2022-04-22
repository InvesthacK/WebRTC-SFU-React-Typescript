import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { v1 } from "uuid";
import { GlobalContext, socket } from "./App";

interface ShareScreenProps {
  children?: React.ReactNode;
}

const ShareScreen: React.FC<ShareScreenProps> = ({}) => {
  const queuedAnswer = useRef<RTCIceCandidate[]>([]);
  const { setScreenId } = useContext(GlobalContext);

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
  const screenRef = useRef<HTMLVideoElement>(null);

  const createOffer = async () => {
    const offer = await localConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    });
    await localConnection.setLocalDescription(offer);
    return offer;
  };

  const getUserScreen = async () => {
    return navigator.mediaDevices.getDisplayMedia().then((media) => {
      if (screenRef.current) {
        screenRef.current.srcObject = media;
      } else {
        console.log("no current");
      }
      media.getTracks().forEach((track) => {
        console.log("send track");
        localConnection.addTrack(track, media);
      });
    });
  };

  useEffect(() => {
    getUserScreen().then(() => {
      createOffer().then((offer) => {
        socket.emit("join", { username, offer });
      });
      socket.on("answer", ({ answer, to }) => {
        console.log("have answer");
        if (to === username) {
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
        }
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
    setScreenId(username);
  }, [username]);

  return (
    <>
      <div className="screen-container">
        <video ref={screenRef} autoPlay></video>
      </div>
    </>
  );
};
export default ShareScreen;
