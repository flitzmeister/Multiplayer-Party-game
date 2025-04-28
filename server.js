// Server-Einstellungen
const express = require("express");
const socketIO = require("socket.io");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Datenbank (simplifiziert)
const lobbies = new Map();

// Statische Dateien (HTML/CSS/JS)
app.use(express.static("public"));

// Socket.io-Logik
io.on("connection", (socket) => {
  // Neue Lobby erstellen
  socket.on("createLobby", (playerName) => {
    const lobbyCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    lobbies.set(lobbyCode, {
      players: [{ id: socket.id, name: playerName }],
      chains: [],
      phase: "waiting"
    });
    socket.join(lobbyCode);
    socket.emit("lobbyCreated", lobbyCode);
  });

  // Lobby beitreten
  socket.on("joinLobby", (data) => {
    const lobby = lobbies.get(data.lobbyCode);
    if (lobby) {
      lobby.players.push({ id: socket.id, name: data.playerName });
      socket.join(data.lobbyCode);
      io.to(data.lobbyCode).emit("updatePlayers", lobby.players);
    }
  });

  // Spielphasen (Frage → Antwort → Reaktion)
  socket.on("submitQuestion", (data) => {
    const lobby = lobbies.get(data.lobbyCode);
    if (lobby) {
      lobby.questions = lobby.questions || [];
      lobby.questions.push(data.question);
      checkPhaseCompletion(lobby);
    }
  });

  // Disconnect-Handler
  socket.on("disconnect", () => {
    lobbies.forEach((lobby, code) => {
      lobby.players = lobby.players.filter(p => p.id !== socket.id);
      if (lobby.players.length === 0) lobbies.delete(code);
    });
  });
});

function checkPhaseCompletion(lobby) {
  // Logik für Phasen-Übergänge
  if (lobby.players.every(p => lobby.questions?.length >= lobby.players.length)) {
    startAnswerPhase(lobby);
  }
}

server.listen(3000, () => console.log("Server läuft auf http://localhost:3000"));
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multiplayer Party Game</title>
  <style>
    :root {
      --primary: #6A8EAE;
      --secondary: #EE6C4D;
      --bg: #F4F1DE;
    }
    body {
      font-family: 'Comic Neue', cursive;
      background: var(--bg);
      text-align: center;
      padding: 20px;
    }
    .lobby-card {
      background: white;
      border-radius: 15px;
      padding: 20px;
      max-width: 500px;
      margin: 0 auto;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 1.2rem;
      margin: 10px;
      cursor: pointer;
    }
    h1 {
      color: var(--secondary);
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="lobbyScreen" class="lobby-card">
      <h1>🎉 Multiplayer Party Game</h1>
      <input id="playerName" placeholder="Dein Name" />
      <button id="createLobbyBtn">Neue Lobby</button>
      <div id="joinSection" style="margin-top: 20px;">
        <input id="lobbyCodeInput" placeholder="Lobby-Code" />
        <button id="joinLobbyBtn">Beitreten</button>
      </div>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Client-Logik
    const socket = io();
    let currentLobby = null;

    document.getElementById("createLobbyBtn").addEventListener("click", () => {
      const playerName = document.getElementById("playerName").value;
      if (playerName) {
        socket.emit("createLobby", playerName);
      }
    });

    socket.on("lobbyCreated", (lobbyCode) => {
      currentLobby = lobbyCode;
      alert(`Dein Lobby-Code: ${lobbyCode}\nTeile ihn mit Freunden!`);
      loadGameScreen();
    });

    function loadGameScreen() {
      document.getElementById("lobbyScreen").innerHTML = `
        <h2>Lobby: ${currentLobby}</h2>
        <div id="playersList"></div>
        <div id="gameContent"></div>
      `;
    }
  </script>
</body>
</html>
{
  "name": "multiplayer-party-game",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2"
  }
}
