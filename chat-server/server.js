const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://www.studypathportal.in", "https://studypathportal.in", "https://pathfinder-student-portal.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://www.studypathportal.in", "https://studypathportal.in", "https://pathfinder-student-portal.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB for Chat & Social Persistence'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// --- Schemas ---

const messageSchema = new mongoose.Schema({
    senderId: String,
    senderName: String,
    recipientId: String,
    message: String,
    type: { type: String, default: 'text' },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});

const postSchema = new mongoose.Schema({
    content: String,
    images: [String],
    videos: [String],
    author: {
        id: String,
        name: String,
        role: String,
        email: String,
        profileImage: String,
        designationName: String,
        departmentName: String
    },
    poll: {
        question: String,
        options: [{
            text: String,
            votes: [String] // Array of user IDs
        }]
    },
    tags: [{ type: String }], // Metadata
    likes: [{ type: String }], // User IDs
    views: [{ type: String }], // User IDs
    comments: [{
        user: {
            id: String,
            name: String,
            profileImage: String
        },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

const socialVisitSchema = new mongoose.Schema({
    userId: String,
    name: String,
    role: String,
    profileImage: String,
    lastVisit: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);
const Post = mongoose.model('Post', postSchema);
const SocialVisit = mongoose.model('SocialVisit', socialVisitSchema);

// Multer Configuration for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- Middleware ---

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid Session' });
        req.user = decoded;
        next();
    });
};

// --- Socket.io Logic ---

const onlineUsers = new Map();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error"));
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    const userId = String(socket.user.user_id);
    const username = socket.user.username;
    console.log(`User online: ${username}`);

    onlineUsers.set(userId, { socketId: socket.id, username: username });
    io.emit('user_online', { userId, username });

    socket.on('send_message', async (data) => {
        const { recipientId, message, type = 'text' } = data;
        const messageData = {
            senderId: userId,
            senderName: username,
            recipientId: String(recipientId),
            message: message,
            type: type,
            timestamp: new Date().toISOString()
        };
        try {
            await new Message(messageData).save();
            const recipient = onlineUsers.get(String(recipientId));
            if (recipient) io.to(recipient.socketId).emit('receive_message', messageData);
        } catch (e) { console.error('Socket Message Error:', e); }
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        io.emit('user_offline', { userId });
    });
});

// --- API Endpoints ---

// 1. Social Feed Routes
app.get('/api/posts', authenticate, async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
        res.json(posts);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/posts', authenticate, upload.array('images'), async (req, res) => {
    try {
        const { content, poll, tags } = req.body;
        const files = req.files || [];

        const images = files.filter(f => f.mimetype.startsWith('image')).map(f => `/uploads/${f.filename}`);
        const videos = files.filter(f => f.mimetype.startsWith('video')).map(f => `/uploads/${f.filename}`);

        const postData = {
            content,
            images,
            videos,
            author: {
                id: req.user.user_id,
                name: req.user.username,
                role: req.user.user_type || 'student',
                email: req.user.email,
                profileImage: req.user.profile_image || '',
                designationName: 'Student', // Fallback
                departmentName: 'Academy'    // Fallback
            },
            likes: [],
            views: [req.user.user_id],
            comments: []
        };

        if (poll) postData.poll = JSON.parse(poll);
        const newPost = new Post(postData);
        await newPost.save();
        res.status(201).json(newPost);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/posts/:id/like', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const index = post.likes.indexOf(String(req.user.user_id));
        if (index === -1) post.likes.push(String(req.user.user_id));
        else post.likes.splice(index, 1);
        await post.save();
        res.json(post);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/posts/:id/comment', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        post.comments.push({
            user: { id: req.user.user_id, name: req.user.username, profileImage: req.user.profile_image },
            text: req.body.text
        });
        await post.save();
        res.json(post);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/posts/:id/vote', authenticate, async (req, res) => {
    try {
        const { optionId } = req.body;
        const post = await Post.findById(req.params.id);

        post.poll.options.forEach(opt => {
            const idx = opt.votes.indexOf(String(req.user.user_id));
            if (idx > -1) opt.votes.splice(idx, 1);
        });

        const option = post.poll.options.id(optionId);
        if (option) option.votes.push(String(req.user.user_id));

        await post.save();
        res.json(post);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/posts/:id', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post.author.id !== String(req.user.user_id)) return res.status(403).json({ error: 'Access Denied' });
        await Post.deleteOne({ _id: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/posts/:id/view', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post.views.includes(String(req.user.user_id))) {
            post.views.push(String(req.user.user_id));
            await post.save();
        }
        res.json(post);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Activity & Visit Tracking
app.post('/api/posts/visit', authenticate, async (req, res) => {
    try {
        await SocialVisit.findOneAndUpdate(
            { userId: req.user.user_id },
            {
                userId: req.user.user_id,
                name: req.user.username,
                role: req.user.user_type,
                lastVisit: new Date()
            },
            { upsert: true }
        );
        res.json({ status: 'ok' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/posts/activity', authenticate, async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 3600000);
        const activeUsers = await SocialVisit.find({ lastVisit: { $gte: oneHourAgo } }).sort({ lastVisit: -1 });
        res.json(activeUsers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/posts/users', authenticate, async (req, res) => {
    try {
        const users = await SocialVisit.find().limit(20);
        res.json(users.map(u => ({ _id: u.userId, name: u.name, role: u.role })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Chat History
app.get('/api/chat/history/:otherId', authenticate, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { senderId: String(req.user.user_id), recipientId: req.params.otherId },
                { senderId: req.params.otherId, recipientId: String(req.user.user_id) }
            ]
        }).sort({ timestamp: 1 }).limit(100);
        res.json(messages);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chat/conversations', authenticate, async (req, res) => {
    try {
        const userId = String(req.user.user_id);
        const conversations = await Message.aggregate([
            { $match: { $or: [{ senderId: userId }, { recipientId: userId }] } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: { $cond: [{ $eq: ["$senderId", userId] }, "$recipientId", "$senderId"] },
                    lastMessage: { $first: "$message" },
                    lastTime: { $first: "$timestamp" },
                    senderName: { $first: "$senderName" }
                }
            },
            { $sort: { lastTime: -1 } }
        ]);
        res.json(conversations);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Chat & Social Server running on port ${PORT}`);
});
