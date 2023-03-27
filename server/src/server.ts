import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { socketController } from "./socketController";
const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {},
});

import dotenv from "dotenv";

dotenv.config({
  path: __dirname + "/../.env",
});

let iceServers = [
  { urls: process.env.STUNSERVER_1 },
  {
    urls: process.env.STUNSERVER_2,
    username: process.env.XIRSYS_USERNAME,
    credential: process.env.XIRSYS_CREDENTIAL,
  },
];

const port = process.env.PORT || 5050;
app.use(cors());

io.on("connection", (socket) => {
  console.log("get connection");
  socketController(socket, io, iceServers);
});

app.get("*", (_, res) => {
  res.json({ ok: true });
});

httpServer.listen(port, () => {
  console.log("app listening on port: " + port);
});
