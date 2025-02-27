const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const axios = require("axios");
const express = require("express");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Express Server for Bot Status
const app = express();
app.get("/status", (req, res) => {
    res.json({ status: client.isReady() ? "online" : "offline" });
});
app.listen(3000, () => console.log("Status server running on port 3000"));

const GITHUB_REPO = "yourusername/roblox-flagged-users";
const GITHUB_FILE = "flagged_users.json";

// Fetch flagged users from GitHub
async function fetchFlaggedUsers() {
    try {
        const response = await axios.get(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching flagged users:", error);
        return [];
    }
}

// !scan command - Finds flagged users in the server
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!scan") || message.author.bot) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You need the 'Kick Members' permission to use this command.");
    }

    const flaggedUsers = await fetchFlaggedUsers();
    let foundUsers = [];

    for (const member of message.guild.members.cache.values()) {
        if (flaggedUsers.includes(member.user.username)) {
            foundUsers.push(`${member.user.tag} (${member.id})`);
        }
    }

    if (foundUsers.length === 0) {
        return message.reply("No flagged users found.");
    }

    message.reply(`🚨 **Flagged Users in Server:**\n${foundUsers.join("\n")}`);
});

// !banflagged command - Bans flagged users in the server
client.on("messageCreate", async (message) => {
    if (message.content !== "!banflagged" || message.author.bot) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("You need the 'Administrator' permission to use this command.");
    }

    const flaggedUsers = await fetchFlaggedUsers();
    let bannedUsers = [];

    for (const member of message.guild.members.cache.values()) {
        if (flaggedUsers.includes(member.user.username)) {
            try {
                await member.ban({ reason: "Flagged for condo/NSFW activity" });
                bannedUsers.push(member.user.tag);
            } catch (err) {
                console.error(`Failed to ban ${member.user.tag}:`, err);
            }
        }
    }

    if (bannedUsers.length > 0) {
        return message.reply(`🚨 **Banned Users:**\n${bannedUsers.join("\n")}`);
    } else {
        return message.reply("No flagged users were found in this server.");
    }
});

client.once("ready", () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
