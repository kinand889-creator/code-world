const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const pingCommand = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('فحص سرعة استجابة البوت');

const hostCommand = new SlashCommandBuilder()
    .setName('host')
    .setDescription('عرض حالة تشغيل البوت وعداد الوقت');

const systemControl = new SlashCommandBuilder()
    .setName('system')
    .setDescription('التحكم في كونسول البوت (للمسؤولين فقط)')
    .addStringOption(opt => 
        opt.setName('action')
        .setDescription('الإجراء المطلوب')
        .setRequired(true)
        .addChoices(
            { name: 'إعادة تشغيل (Restart)', value: 'restart' },
            { name: 'إيقاف التشغيل (Shutdown)', value: 'shutdown' },
            { name: 'حالة الموارد (Status)', value: 'status' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

let currentSystemStatus = { text: 'يعمل بكفاءة ✅', color: 'Green' };

async function handlePingInteraction(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    // --- أمر Ping ---
    if (interaction.commandName === 'ping') {
        const response = await interaction.reply({ content: '⏳ جاري الفحص...', withResponse: true });
        const sent = response.resource?.message || await interaction.fetchReply();
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiWeight = Math.round(client.ws.ping);
        await interaction.editReply({ content: `🏓 استجابة البوت: \`${latency}ms\` | الديسكورد: \`${apiWeight}ms\`` });
    }

    // --- أمر Host ---
    if (interaction.commandName === 'host') {
        const getUptime = () => {
            let s = (client.uptime / 1000);
            let d = Math.floor(s / 86400); s %= 86400;
            let h = Math.floor(s / 3600); s %= 3600;
            let m = Math.floor(s / 60);
            let sec = Math.floor(s % 60);
            return `\`${d}\` يوم، \`${h}\` ساعة، \`${m}\` دقيقة، \`${sec}\` ثانية`;
        };

        const hostEmbed = new EmbedBuilder()
            .setTitle('🖥️ حالة نظام المضيف (Host)')
            .setDescription('يتم مراقبة أداء النظام حالياً لضمان استقرار البقاء 24/7.')
            .addFields(
                { name: '⏰ وقت التشغيل (Uptime)', value: getUptime(), inline: false },
                { name: '📊 الذاكرة المستخدمة', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true }
            )
            .setColor('#0099ff')
            .setFooter({ text: 'تحديث تلقائي كل 10 ثوانٍ' })
            .setTimestamp();

        const response = await interaction.reply({ embeds: [hostEmbed], withResponse: true });
        const msg = response.resource?.message || await interaction.fetchReply();

        const interval = setInterval(async () => {
            try {
                const updatedEmbed = EmbedBuilder.from(hostEmbed).setFields(
                    { name: '⏰ وقت التشغيل (Uptime)', value: getUptime(), inline: false },
                    { name: '📊 الذاكرة المستخدمة', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true }
                );
                await msg.edit({ embeds: [updatedEmbed] });
            } catch (e) { clearInterval(interval); } 
        }, 10000);
    }

    // --- أمر System ---
    if (interaction.commandName === 'system') {
        const action = interaction.options.getString('action');

        if (action === 'status') {
            const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const uptimeMinutes = Math.floor(client.uptime / 60000);
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('📊 تقرير نظام التشغيل')
                    .addFields(
                        { name: '🔹 استهلاك الرام', value: `\`${memory} MB\``, inline: true },
                        { name: '🔹 وقت العمل', value: `\`${uptimeMinutes} دقيقة\``, inline: true },
                        { name: '🔹 حالة البوت الآن', value: `\`${currentSystemStatus.text}\``, inline: true }
                    )
                    .setColor(currentSystemStatus.color)
                    .setTimestamp()]
            });
        }

        if (action === 'restart') {
            const restartData = { channelId: interaction.channelId, user: interaction.user.tag };
            fs.writeFileSync('./restart_data.json', JSON.stringify(restartData));

            await interaction.reply({ 
                embeds: [new EmbedBuilder().setTitle('🔄 إعادة تشغيل').setDescription('جاري تنفيذ إعادة التشغيل... سأرسل إشعاراً هنا عند العودة.').setColor('Yellow')]
            });
            setTimeout(() => { process.exit(); }, 2000);
        }

        if (action === 'shutdown') {
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setTitle('🛑 إغلاق').setDescription('تم إيقاف تشغيل البوت بالكامل.').setColor('Red')] 
            });
            setTimeout(() => { client.destroy(); process.exit(); }, 2000);
        }
    }
}

module.exports = { 
    pingCommand, 
    hostCommand, 
    systemControl, 
    allAdminCommands: [pingCommand, hostCommand, systemControl], 
    handlePingInteraction 
};