import React, { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "./App";

interface Props {
    media: MediaStream;
}

// const answerCandidate: any[] = [];
const Test: React.FC<Props> = ({ media }) => {
    const mediaRef = useRef<HTMLVideoElement>(null);
    const answerCandidateRef = useRef<any[]>([]);

    useEffect(() => {
        mediaRef.current!.srcObject = media;
    }, []);

    const connection = useMemo(() => {
        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302",
                },
                {
                    urls: "turn:192.158.29.39:3478?transport=udp",
                    credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
                    username: "28224511:1379330808",
                },
                {
                    urls: "turn:192.158.29.39:3478?transport=tcp",
                    credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
                    username: "28224511:1379330808",
                },
            ],
            iceCandidatePoolSize: 10,
        });

        pc.onconnectionstatechange = () => {
            console.log(
                "%c connection status: " + pc.connectionState,
                "background: red; color:white"
            );
        };
        // pc.onnegotiationneeded = () => {
        //   console.log("%c Negotiation needed", "background: grey; color:white");
        // };

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                socket.emit("t-offer-candidate", {
                    candidate: ev.candidate,
                });
            }
        };
        return pc;
    }, []);

    useEffect(() => {
        const sendTest = async () => {
            const offer = await connection?.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await connection?.setLocalDescription(offer);
            socket.emit("test-ting", { offer });
        };
        sendTest();
        socket.on("t-answer", async ({ answer }) => {
            console.log("got answer from server", answer);
            await connection?.setRemoteDescription(
                new RTCSessionDescription(answer)
            );
            console.log(
                "%c setted remote connection",
                "background: red; color:white",
                answerCandidateRef.current
            );
            answerCandidateRef.current.forEach((can) => {
                connection?.addIceCandidate(new RTCIceCandidate(can));
            });
        });

        socket.on("t-answer-candidate", ({ candidate }) => {
            if (!connection?.currentLocalDescription) {
                console.log("got answer candidate", answerCandidateRef.current);
                answerCandidateRef.current.push(candidate);
            } else {
                console.log("adding candidate to connection");
                connection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        return () => {
            socket.off("t-answer");
            socket.off("t-answer-candidate");
        };
    }, []);

    return (
        <>
            <div style={{ width: 500, height: 500 }}>
                <video ref={mediaRef} autoPlay />
            </div>
        </>
    );
};

export default Test;
