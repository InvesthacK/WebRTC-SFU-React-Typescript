import { Server, Socket } from "socket.io";
// @ts-ignore
// import * as webrtc from "wrtc";
const webrtc = require("wrtc");

let users: {
  username: string;
  peer: RTCPeerConnection;
  stream?: MediaStream;
  dataChannel?: RTCDataChannel;
}[] = [];

let consumers: {
  username: string;
  peer: RTCPeerConnection;
  streamName: string;
}[] = [];

const queuedOffers: {
  username: string;
  offers: RTCIceCandidate[];
}[] = [];

const queuedConsumerOffers: {
  username: string;
  offers: RTCIceCandidate[];
}[] = [];

// const streams: MediaStream[] = [];

export const socketController = (socket: Socket, _io: Server) => {
  socket.on("test-ting", async ({ offer }) => {
    let stream: MediaStream | undefined = undefined;
    const offerCandidate: any[] = [];
    const pc: RTCPeerConnection = new webrtc.RTCPeerConnection({
      iceServers: [
        // { urls: process.env.STUNSERVER_1 },
        // {
        //   urls: process.env.STUNSERVER_2,
        //   username: process.env.XIRSYS_USERNAME,
        //   credential: process.env.XIRSYS_CREDENTIAL,
        // },
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

    pc.onicecandidate = (ev) => {
      console.log("have candidate");
      if (ev.candidate) {
        socket.emit("t-answer-candidate", { candidate: ev.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("connection state change: ", pc.connectionState);
    };

    pc.ontrack = (e) => {
      console.log("---------------- on track");
      if (e.streams && e.streams[0]) {
        stream = e.streams[0];
      }
    };

    await pc.setRemoteDescription(new webrtc.RTCSessionDescription(offer));
    console.log("set remote description");

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log("answer created, sending to client");
    socket.emit("t-answer", { answer });
    offerCandidate.forEach((offer) => {
      pc.addIceCandidate(new webrtc.RTCIceCandidate(offer));
    });

    socket.on("t-offer-candidate", ({ candidate }) => {
      console.log("offer candidate come");
      if (!pc.currentLocalDescription) {
        offerCandidate.push(candidate);
      } else {
        pc.addIceCandidate(new webrtc.RTCIceCandidate(candidate));
      }
    });
  });

  socket.on(
    "join",
    async ({
      username,
      offer,
    }: {
      username: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log("join request: ", { username });
      let stream: MediaStream | undefined;
      let dataChannel: RTCDataChannel | undefined;
      const peer: RTCPeerConnection = new webrtc.RTCPeerConnection({
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
      });
      peer.ontrack = (e) => {
        console.log("---------------- on track");
        if (e.streams && e.streams[0]) {
          if (!stream) {
            stream = e.streams[0];
          }
        } else {
          console.log("--------------- NOOOOOOOOOOO");
        }
      };

      peer.ondatachannel = (e) => {
        console.log("ohh data channel :)");
        // dataChannel = e.channel;
        users.forEach((u) => {
          if (u.username === username) {
            u.dataChannel = e.channel;
          }
        });
        e.channel.onmessage = (_e) => {
          console.log(_e.data);
          // e.channel.send(_e.data);
          users.map((u) => {
            if (u.dataChannel) {
              u.dataChannel.send(_e.data);
            } else {
              console.log("no data channel");
            }
          });
        };
      };

      await peer.setRemoteDescription(new webrtc.RTCSessionDescription(offer));

      users.push({
        username: username,
        peer,
        stream,
        dataChannel,
      });

      socket.broadcast.emit("new-user", { username, peer });

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      // Check if have offer queued
      const offers = queuedOffers.find((o) => o.username === username);
      if (offers) {
        offers.offers.forEach((offer) => {
          console.log("adding line 98");
          peer.addIceCandidate(new webrtc.RTCIceCandidate(offer));
        });
      }

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") {
        }
      };

      peer.onicecandidate = (e) => {
        console.log("have ANSWER candidate");
        if (e.candidate) {
          socket.emit("add-answer-candidate", { candidate: e.candidate });
        }
      };

      socket.emit("answer", { answer, to: username });
      socket.on("disconnect", () => {
        users = users.filter((u) => u.username !== username);
        consumers = consumers.filter((u) => u.username === username);
        socket.broadcast.emit("user-leave", { users });
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
      console.log("add line 138");
      try {
        user.peer.addIceCandidate(candidate);
      } catch (error) {
        console.log("error line 143");
      }
    }
  });

  socket.on("get-media", () => {
    socket.emit("all-user", { users });
  });

  socket.on("consumer", async ({ offer, username, streamName }) => {
    const peer: RTCPeerConnection = new webrtc.RTCPeerConnection({
      iceServers: [
        { urls: process.env.STUNSERVER_1 },
        {
          urls: process.env.STUNSERVER_2,
          username: process.env.XIRSYS_USERNAME,
          credential: process.env.XIRSYS_CREDENTIAL,
        },
      ],
    });
    users.map((u) => {
      if (u.username == streamName) {
        console.log("sending stream ");
        u.stream?.getTracks().forEach((track) => {
          peer.addTrack(track, u.stream!);
        });
      }
    });

    await peer.setRemoteDescription(new webrtc.RTCSessionDescription(offer));

    consumers.push({
      username,
      peer,
      streamName,
    });

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    // Check if have offer queued
    const offers = queuedConsumerOffers.find((o) => o.username === username);
    if (offers) {
      offers.offers.forEach((offer) => {
        console.log("add line 181");
        peer.addIceCandidate(new webrtc.RTCIceCandidate(offer));
      });
    }
    peer.onconnectionstatechange = () => {
      console.log(
        "consumer: " + username + " connection state: ",
        peer.connectionState
      );
    };
    peer.onicecandidate = (e) => {
      console.log("have answer candidate");
      if (e.candidate) {
        socket.emit("consumer-add-answer-candidate", {
          candidate: e.candidate,
          to: username,
          streamName,
        });
      }
    };

    socket.emit("consumer-answer", { answer, to: username, streamName });
  });

  socket.on(
    "consumer-add-offer-candidate",
    ({ candidate, username, streamName }) => {
      console.log("had offer candidate");
      // Check if user is in users object
      const consumer = consumers.find(
        (u) => u.username === username && streamName === streamName
      );
      if (!consumer) {
        // No user => Queu Offer Candidate
        // check if already have offer queued
        const queued = queuedConsumerOffers.find(
          (qo) => qo.username === username
        );
        if (!queued) {
          queuedConsumerOffers.push({ username, offers: [candidate] });
        } else {
          queued.offers.push(candidate);
        }
      } else {
        // Have User in UsersObject => add candidate to peer

        console.log("add line 228");
        consumer.peer.addIceCandidate(new webrtc.RTCIceCandidate(candidate));
      }
    }
  );

  socket.on("log", () => {
    socket.emit("logging", { users, consumers });
  });

  socket.on("clear", () => {
    users = [];
    consumers = [];
    console.log("clearing users---");
  });
};
