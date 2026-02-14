const { AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const config = require('./config.json');

const DATA_PATH = './welcome_config.json';

// --- تسجيل الأوامر ---
const welcomeCommands = [
    new SlashCommandBuilder()
        .setName('welcome-title')
        .setDescription('تحديد نص الترحيب')
        .addStringOption(opt => opt.setName('text').setDescription('استخدم [user]').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('set-welcome')
        .setDescription('تشغيل أو إيقاف الترحيب')
        .addStringOption(opt => opt.setName('status').setDescription('الحالة').setRequired(true)
            .addChoices({ name: 'On', value: 'on' }, { name: 'Off', value: 'off' }))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

// --- التعامل مع الأوامر ---
async function handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    let allData = fs.existsSync(DATA_PATH) ? JSON.parse(fs.readFileSync(DATA_PATH)) : {};
    let guildData = allData[interaction.guild.id] || { status: true, title: "نورت [user]" };

    if (interaction.commandName === 'welcome-title') {
        guildData.title = interaction.options.getString('text');
        allData[interaction.guild.id] = guildData;
        fs.writeFileSync(DATA_PATH, JSON.stringify(allData, null, 2));
        await interaction.reply({ content: "✅ تم تحديث النص!", ephemeral: true });
    }

    if (interaction.commandName === 'set-welcome') {
        guildData.status = interaction.options.getString('status') === 'on';
        allData[interaction.guild.id] = guildData;
        fs.writeFileSync(DATA_PATH, JSON.stringify(allData, null, 2));
        await interaction.reply({ content: `✅ الترحيب الآن: ${guildData.status ? 'On' : 'Off'}`, ephemeral: true });
    }
}

// --- وظيفة الترحيب ورسم الصورة ---
async function handleMemberJoin(member) {
    const allData = fs.existsSync(DATA_PATH) ? JSON.parse(fs.readFileSync(DATA_PATH)) : {};
    const guildConfig = allData[member.guild.id] || { status: true, title: "نورت [user]" };

    if (!guildConfig.status) return;

    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel) return;

    try {
        const canvas = createCanvas(1024, 683);
        const ctx = canvas.getContext('2d');

        // رسم الخلفية
        const background = await loadImage(config.logoUrl);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // 🔥 مركز دائرة YOUR PHOTO (مضبوط على التصميم)
        const centerX = 703;
        const centerY = 377;
        const radius = 148;

        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));

        ctx.save();

        // قص دائري تلقائي
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // رسم الأفاتار في النص PERFECT
        ctx.drawImage(
            avatar,
            centerX - radius,
            centerY - radius,
            radius * 2,
            radius * 2
        );

        ctx.restore();

        // إطار توهج
        ctx.strokeStyle = '#00fbff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });

        channel.send({
            content: guildConfig.title.replace('[user]', `<@${member.id}>`),
            files: [attachment]
        });

    } catch (e) {
        console.error("خطأ في نظام الترحيب:", e);
    }
}

module.exports = { welcomeCommands, handleInteraction, handleMemberJoin };