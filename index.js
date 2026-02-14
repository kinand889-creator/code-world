const { 
    Client, GatewayIntentBits, REST, Routes, EmbedBuilder, Events, 
    Partials, ModalBuilder, TextInputBuilder, TextInputStyle, 
    ActionRowBuilder, MessageFlags, ActivityType 
} = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

// --- استيراد الأنظمة ---
const welcomeSystem = require('./welcome.js');
const ticketSystem = require('./tickets.js');
const pingSystem = require('./ping.js');
const questSystem = require('./quests.js');
const adminFile = require('./commands/admin.js');
const autoRoleSystem = require('./commands/autorole.js'); 
const autoLineSystem = require('./commands/autoline.js'); 
const statusCommand = require('./commands/status.js'); 

// استدعاء نظام معالجة الملفات الجديد (تأكد أن اسم الملف مطابق لما صنعته)
const fileOrganizer = require('./commands/organizer.js'); 

const client = new Client({ 
    intents: Object.values(GatewayIntentBits),
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

const MY_ID = "1450317296227582044";
const RESTART_LOG_CHANNEL = "1465551421129883749";
const FILE_COMMAND_CHANNEL = "1472208582475911229"; // روم معالجة الملفات للأعضاء

// --- عند تشغيل البوت (Ready) ---
client.once(Events.ClientReady, async () => {
    console.log(`=================================`);
    console.log(`✅ تم تشغيل البوت بنجاح: ${client.user.tag}`);

    try {
        const channel = await client.channels.fetch(RESTART_LOG_CHANNEL);
        if (channel) {
            let statusTitle = '🔄 تم اعاده تشغيل النظام';
            let statusDescription = '⚙️**تمت اعاده تشغيل السيستيم**\n✅**السيستيم يعمل الان**';

            if (fs.existsSync('./restart_data.json')) {
                const data = JSON.parse(fs.readFileSync('./restart_data.json', 'utf8'));
                statusDescription = 
                    `**تم إعادة تشغيل البوت**\n` +           
                    `**تمت عملية ريستارت للسيستم**\n\n` +    
                    `👤 **بواسطة:** \`${data.user}\``;        
                
                fs.unlinkSync('./restart_data.json'); 
            }

            const restartEmbed = new EmbedBuilder()
                .setTitle(statusTitle)
                .setDescription(statusDescription)
                .setColor('#f1c40f') 
                .setFooter({ 
                    text: 'نظام الاستقرار الملكي • 🛡️', 
                    iconURL: client.user.displayAvatarURL() 
                })
                .setTimestamp();

            await channel.send({ embeds: [restartEmbed] });
            console.log('📌 تم إرسال الإشعار الملكي بنجاح.');
        }
    } catch (e) { console.error("❌ خطأ في إرسال إشعار التشغيل:", e); }

    // استعادة حالة البوت
    if (fs.existsSync('./status.json')) {
        try {
            const s = JSON.parse(fs.readFileSync('./status.json', 'utf8'));
            client.user.setPresence({
                status: s.status,
                activities: [{ name: s.text, type: s.type, url: s.type === 1 ? 'https://twitch.tv/discord' : undefined }]
            });
        } catch (e) { console.error(e); }
    }

    // تسجيل أوامر السلاش
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
        let rawCommands = [
            ...(welcomeSystem.welcomeCommands || []), 
            ...(ticketSystem.ticketCommands || []),
            ...(adminFile.data || []), 
            ...(pingSystem.allAdminCommands || []),
            ...(autoLineSystem.data || []), 
            ...(autoRoleSystem.data || []), 
            statusCommand.data
        ];
        const uniqueCommands = Array.from(new Map(rawCommands.map(cmd => [cmd.name, cmd])).values());
        await rest.put(Routes.applicationCommands(config.clientId), { body: uniqueCommands });
    } catch (e) { console.error(e); }

    if (questSystem?.startQuestMonitor) questSystem.startQuestMonitor(client);
    console.log(`=================================`);
});

// --- معالج التفاعلات (Interactions) ---
client.on(Events.InteractionCreate, async (i) => {
    try {
        if (i.isChatInputCommand()) {
            if (i.commandName === 'set-status') return await statusCommand.execute(i);
            if (['ping', 'host', 'system'].includes(i.commandName)) return await pingSystem.handlePingInteraction(i, client);
            if (i.commandName.startsWith('ticket-') || i.commandName === 'come') return await ticketSystem.handleTicketInteraction(i);
            if (i.commandName === 'autoline') return await autoLineSystem.execute(i);
            if (i.commandName.startsWith('autorole')) return await autoRoleSystem.execute(i);
            await adminFile.execute(i, client);
        }

        if (i.isButton() || i.isStringSelectMenu() || i.isModalSubmit()) {
            const ticketIds = ['open_menu_t', 'claim_t', 'unclaim_t', 'close_t', 'helper_t', 'add_user_t', 'rem_user_t', 'rename_ticket_t'];
            if (ticketIds.some(id => i.customId?.startsWith(id)) || i.customId?.includes('_t')) {
                return await ticketSystem.handleTicketInteraction(i);
            }
        }
    } catch (e) { console.error(e); }
});

// --- الأحداث (Events) ---
client.on(Events.GuildMemberAdd, async (member) => {
    if (welcomeSystem.handleMemberJoin) await welcomeSystem.handleMemberJoin(member);
    if (autoRoleSystem.handleMemberJoin) await autoRoleSystem.handleMemberJoin(member);
});

client.on(Events.MessageCreate, async (m) => {
    if (m.author.bot) return;
    if (autoLineSystem.handleMessage) await autoLineSystem.handleMessage(m);
    
    // 1. تشغيل نظام فك وترتيب الملفات للأعضاء
    if (m.content.startsWith('$file')) {
        // استدعاء الوظيفة من الملف المنفصل
        await fileOrganizer.handleFileCommand(m, FILE_COMMAND_CHANNEL);
    }
    
    // 2. أمر الريستارت الخاص بالمطور
    if (m.author.id === MY_ID && m.content === '!ريستارت') {
        fs.writeFileSync('./restart_data.json', JSON.stringify({ channelId: RESTART_LOG_CHANNEL, user: m.author.tag }));
        await m.reply("🔄 جاري إعادة تشغيل النظام... ترقب الإشعار الملكي.");
        process.exit();
    }
});

client.login(config.token);