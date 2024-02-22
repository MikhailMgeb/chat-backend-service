const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const { uid } = require('uid');

const app = express();

app.use(express.json());
app.use(cors());

const users = [];

app.get('/ping', (req, res) => {
    res.send('pong');
})

app.post('/register', (req, res) => {
    const { login } = req.body;

    const exists = users.some(user => user.login === login);

    if (exists) {
        res.sendStatus(401);
    }

    const token = uid(16);
    users.push({
        login, token
    })

    res.json({ login, token });
})

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

const chat = [];

wss.on('connection', (ws) => {
    let connectionUser;
    ws.on('message', (buffer) => {
        const json = buffer.toString();
        const data = JSON.parse(json);

        if (data.type === 'auth') {
            const token = data.token;

            const user = users.find(user => user.token === token);

            if (user === undefined) {
                ws.send(JSON.stringify({ type: 'auth-error' }));

                return;
            }

            connectionUser = user;

            ws.send(JSON.stringify({ type: 'user', user }));
            ws.send(JSON.stringify({ type: 'chat', chat }));

            return;
        }

        if (connectionUser === undefined) {
            ws.send(JSON.stringify({ type: 'auth-error' }));

            return;
        }

        if (data.type === 'message') {
            const message = data.message;

            chat.push(message);

            for (const client of wss.clients) {
                if (client === ws) {
                    client.send(JSON.stringify({ type: 'self-message', message }));
                } else {
                    client.send(JSON.stringify({ type: 'message', message, user: connectionUser.login }));
                }

            }
        }


    })


})

server.listen(3000, () => console.log('Сервер успешно запущен'));