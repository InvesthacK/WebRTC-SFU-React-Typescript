import { Server, Socket } from "socket.io";
// @ts-ignore
// import * as webrtc from "wrtc";
const webrtc = require("wrtc");

let users: {
  username: string;
  peer: RTCPeerConnection;
  stream?: MediaStream;
}[] = [];

const queuedOffers: {
  username: string;
  offers: RTCIceCandidate[];
}[] = [];

// const streams: any[] = [];

export const socketController = (socket: Socket, _io: Server) => {
  socket.on(
    "join",
    async ({
      username,
      offer,
    }: {
      username: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      let stream: MediaStream | undefined;
      const peer: RTCPeerConnection = new webrtc.RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.stunprotocol.org:3478" },
          { urls: "stun:stun.l.google.com:19302" },
        ],
      });
      users.map((u) => {
        if (u.username !== username) {
          // stream!.getTracks().forEach((track) => {
          //   u.peer.addTrack(track, stream!);
          // });
          console.log("have stream sending ");
          u.stream?.getTracks().forEach((track) => {
            peer.addTrack(track, u.stream!);
          });
        }
      });
      peer.ontrack = (e) => {
        console.log("---------------- on track");
        console.log({ username, users });
        if (e.streams && e.streams[0]) {
          console.log(e.streams[0].getTracks());
          stream = e.streams[0];
        } else {
          console.log("--------------- NOOOOOOOOOOO");
        }
      };

      await peer
        .setRemoteDescription(new webrtc.RTCSessionDescription(offer))
        .then(() => {
          // console.log("set remote description");
          // users.map((u) => {
          //   if (u.username !== username) {
          //     if (stream) {
          //       console.log("have stream");
          //       stream.getTracks().forEach((track) => {
          //         u.peer.addTrack(track);
          //       });
          //     } else {
          //       console.log("no stream");
          //     }
          //   }
          // });
        });
      users.push({
        username: username,
        peer,
        stream,
      });

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      // Check if have offer queued
      const offers = queuedOffers.find((o) => o.username === username);
      if (offers) {
        offers.offers.forEach((offer) => {
          peer.addIceCandidate(new webrtc.RTCIceCandidate(offer));
        });
      }

      peer.onconnectionstatechange = () => {
        // console.log(
        //   "user: " + username + " connection state: ",
        //   peer.connectionState
        // );
        if (peer.connectionState === "connected") {
        }
      };

      peer.onicecandidate = (e) => {
        // console.log("have answer candidate");
        if (e.candidate) {
          socket.emit("add-answer-candidate", { candidate: e.candidate });
        }
      };

      socket.emit("answer", { answer });
      socket.on("disconnect", () => {
        users = users.filter((u) => u.username !== username);
      });
    }
  );

  socket.on("add-offer-candidate", ({ candidate, username }) => {
    // console.log("had offer candidate");
    // Check if user is in users object
    const user = users.find((u) => u.username === username);
    if (!user) {
      // No user => Queu Offer Candidate
      // check if already have offer queued
      const queued = queuedOffers.find((qo) => qo.username === username);
      if (!queued) {
        queuedOffers.push({ username, offers: [candidate] });
      } else {
        queued.offers.push(candidate);
      }
    } else {
      // Have User in UsersObject => add candidate to peer
      user.peer.addIceCandidate(new webrtc.RTCIceCandidate(candidate));
    }
  });

  socket.on("get-media", () => {
    // console.log("on media");
    socket.emit("all-user", { users });
  });
};
