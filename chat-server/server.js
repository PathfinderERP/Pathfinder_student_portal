const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://pathfinder-student-portal.vercel.app"],
        methods: ["GET", "POST"]
    }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB for Chat Persistence'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
    senderId: String,
    senderName: String,
    recipientId: String,
    message: String,
    type: { type: String, default: 'text' },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

// Authentication Middleware for Socket.io
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error("Authentication error: Invalid token"));
        }
        // SimpleJWT typically puts user ID in 'user_id'
        socket.user = decoded;
        next();
    });
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
    const userId = String(socket.user.user_id);
    const username = socket.user.username;

    console.log(`User connected: ${username} (${userId})`);

    onlineUsers.set(userId, {
        socketId: socket.id,
        username: username
    });

    io.emit('user_online', { userId, username });

    // Handle Private Messages
    socket.on('send_message', async (data) => {
        const { recipientId, message, type = 'text' } = data;
        const recipient = onlineUsers.get(String(recipientId));

        const messageData = {
            senderId: userId,
            senderName: username,
            recipientId: String(recipientId),
            message: message,
            type: type,
            timestamp: new Date().toISOString()
        };

        // 1. Save to Database
        try {
            const newMessage = new Message(messageData);
            await newMessage.save();
            console.log(`Message saved from ${username} to ${recipientId}`);
        } catch (dbErr) {
            console.error('Error saving message:', dbErr);
        }

        // 2. Deliver to Recipient (if online)
        if (recipient) {
            io.to(recipient.socketId).emit('receive_message', messageData);
        }
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        io.emit('user_offline', { userId });
        console.log(`User disconnected: ${username}`);
    });
});

// API Endpoints for Chat History
app.get('/api/chat/history/:otherId', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = String(decoded.user_id);
        const otherId = String(req.params.otherId);

        const messages = await Message.find({
            $or: [
                { senderId: userId, recipientId: otherId },
                { senderId: otherId, recipientId: userId }
            ]
        }).sort({ timestamp: 1 }).limit(100);

        res.json(messages);
    } catch (err) {
        res.status(401).json({ error: 'Invalid session' });
    }
});

// API Endpoint for Recent Conversations (Inbox)
app.get('/api/chat/conversations', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = String(decoded.user_id);

        // Find all users this person has talked to
        const recentMessages = await Message.aggregate([
            { $match: { $or: [{ senderId: userId }, { recipientId: userId }] } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$senderId", userId] },
                            "$recipientId",
                            "$senderId"
                        ]
                    },
                    lastMessage: { $first: "$message" },
                    lastTime: { $first: "$timestamp" },
                    senderName: { $first: "$senderName" }
                }
            },
            { $sort: { lastTime: -1 } }
        ]);

        res.json(recentMessages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Chat Server running on port ${PORT}`);
});
