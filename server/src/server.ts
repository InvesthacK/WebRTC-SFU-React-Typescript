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
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3030",
      "https://subtle-strudel-a68d20.netlify.app",
      process.env.CLIENT!,
      "https://investhack.tech",
      "https://www.investhack.tech",
      "https://azerbaijan-hp-qld-blade.trycloudflare.com",
    ],
  },
});

import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 5050;
app.use(cors());

io.on("connection", (socket) => {
  socketController(socket, io);
});

app.get("*", (_, res) => {
  res.json({ ok: true });
});

httpServer.listen(port, () => {
  console.log("app listening on port: " + port);
});
