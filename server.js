require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const OpenAI = require("openai");
const { Readable } = require("stream");
const fs = require("fs");

const openai = new OpenAI();

const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Server is running!");
});

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  socket.on("message", async (arrayBuffer) => {
    const path = __dirname + `/files/audio-${new Date().getTime()}.webm`;
    fs.appendFile(path, Buffer.from(await arrayBuffer), (err) => {
      if (err) socket.emit("server-error", `Error occured: ${err}`);
    });

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(path),
        model: "gpt-4o-transcribe",
        prompt:
          "Client sends audio file in Uzbek language, make a transcription correctly",
      });

      const translate = await openai.responses.create({
        model: "gpt-5.2",
        input: `Translate Uzbek words, sentences into English language: ${transcription.text}. Please send only translated text, don't add any text from yourself`,
      });

      socket.emit("server-message", translate.output_text);
    } catch (error) {
      if (error) socket.emit("server-error", `Error occured: ${error}`);
    }
  });
});

server.listen(4000, () => {
  console.log("Server is running on http://localhost:4000");
});
