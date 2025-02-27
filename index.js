const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const axios = require("axios");
const { Octokit } = require("@octokit/rest");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// GitHub Setup
const GITHUB_REPO = "jdoaushfyaugf/roblox-flagged-users";
const GITHUB_FILE = "flagged_users.json";
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Fetch flagged users from GitHub
async function fetchFlaggedUsers() {
    try {
        const response = await axios.get(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE}`);
        return response.data.split("\n").filter(line => line.trim() !== ""); // Return as an array
    } catch (error) {
        console.error("Error fetching flagged users:", error);
        return [];
    }
}

// Update flagged_users.json in GitHub
async function updateFlaggedUsers(newUserURL) {
    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner: "yourusername",
            repo: "roblox-flagged-users",
            path: GITHUB_FILE,
        });

        // Decode existing file content
        const existingContent = Buffer.from(fileData.content, "base64").toString("utf-8");
        const flaggedUsers = existingContent.split("\n").map(user => user.trim());

        // Add new user if not already in the list
        if (!flaggedUsers.includes(newUserURL)) {
            flaggedUsers.push(newUserURL);

            // Update GitHub file
            await octokit.repos.createOrUpdateFileContents({
                owner: "yourusername",
                repo: "roblox-flagged-users",
                path: GITHUB_FILE,
                message: `Added flagged user: ${newUserURL}`,
                content: Buffer.from(flaggedUsers.join("\n")).toString("base64"),
                sha: fileData.sha,
            });

            console.log(`✅ Added ${newUserURL} to flagged users.`);
        }
    } catch (error) {
        console.error("Error updating flagged users list:", error);
    }
}

// !scan command - Finds flagged users and adds them to GitHub
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!scan") || message.author.bot) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You need the 'Kick Members' permission to use this command.");
    }

    const flaggedUsers = await fetchFlaggedUsers();
    let newFlagged = [];

    for (const member of message.guild.members.cache.values()) {
        const robloxURL = `https://roblox.com/users/${member.user.id}/profile`;

        if (!flaggedUsers.includes(robloxURL)) {
            await updateFlaggedUsers(robloxURL);
            newFlagged.push(robloxURL);
        }
    }

    if (newFlagged.length > 0) {
        message.reply(`🚨 **New Flagged Users Added:**\n${newFlagged.join("\n")}`);
    } else {
        message.reply("No new flagged users found.");
    }
});

// !banflagged command - Bans flagged users
client.on("messageCreate", async (message) => {
    if (message.content !== "!banflagged" || message.author.bot) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("You need the 'Administrator' permission to use this command.");
    }

    const flaggedUsers = await fetchFlaggedUsers();
    let bannedUsers = [];

    for (const member of message.guild.members.cache.values()) {
        const robloxURL = `https://roblox.com/users/${member.user.id}/profile`;

        if (flaggedUsers.includes(robloxURL)) {
            try {
                await member.ban({ reason: "Flagged for condo/NSFW activity" });
                bannedUsers.push(robloxURL);
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
