import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";
import cors from "cors";
import { socketController } from "./socketController";
import fs from "fs";
import * as path from "path";
const app = express();

const options = {
  key: fs.readFileSync(path.join(__dirname, "..", "/keys/privkey.pem")),
  cert: fs.readFileSync(path.join(__dirname, "..", "/keys/fullchain.pem")),
};

const httpServer = createServer(options, app);

const io = new Server(httpServer, {
  cors: {},
});

import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 5050;
app.use(cors());

io.on("connection", (socket) => {
  console.log("get connection");
  socketController(socket, io);
});

app.get("*", (_, res) => {
  res.json({ ok: true });
});

httpServer.listen(port, () => {
  console.log("app listening on port: " + port);
});
