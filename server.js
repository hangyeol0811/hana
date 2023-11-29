const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path'); 
const sqlite3 = require('sqlite3').verbose(); // SQLite3 모듈 추가

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SQLite 데이터베이스 생성 및 연결
const db = new sqlite3.Database('mydatabase.db'); // 파일로 데이터베이스 생성

// 대화 메시지 테이블 생성
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, message TEXT)');  
});

function loadMessages() {
  db.all('SELECT * FROM messages', (err, rows) => {
    if (err) {
      console.error(err.message);
    } else {
      rows.forEach((row) => {
        // 각 메시지를 클라이언트에 전달
        io.emit('chat message', { user: row.user, message: row.message });
      });
    }
  });
}

io.on('connection', (socket) => {
    console.log('New user connected');
  
    socket.on('chat message', (data) => {
      const { user, message } = data;
  
      io.emit('chat message', { user, message });
  
      db.run('INSERT INTO messages (user, message) VALUES (?, ?)', [user, message], (err) => {
        if (err) {
          console.error(err.message);
        }
      });
    });
  
socket.on('disconnect', () => {
    console.log('User disconnected');
});

// 클라이언트의 이전 메시지 요청 처리
socket.on('load messages', () => {
    db.all('SELECT * FROM messages', (err, rows) => {
    if (err) {
        console.error(err.message);
    } else {
        socket.emit('previous messages', rows); // 이전 메시지를 클라이언트에게 전송
    }
    });
});
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
  loadMessages(); // 서버 시작 시 이전 메시지를 불러옴
});
