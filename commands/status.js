const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-status')
        .setDescription('التحكم في حالة ونشاط البوت (للمطور فقط)')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('اختر حالة البوت (العلامة)')
                .setRequired(true)
                .addChoices(
                    { name: 'متصل (Online) 🟢', value: 'online' },
                    { name: 'خامل (Idle) 🌙', value: 'idle' },
                    { name: 'عدم الإزعاج (DND) ⛔', value: 'dnd' },
                    { name: 'مخفي (Invisible) ⚫', value: 'invisible' }
                ))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('نوع النشاط (يشاهد، يلعب...)')
                .setRequired(true)
                .addChoices(
                    { name: 'يلعب (Playing)', value: '0' },
                    { name: 'يبث (Streaming)', value: '1' },
                    { name: 'يستمع إلى (Listening)', value: '2' },
                    { name: 'يشاهد (Watching)', value: '3' },
                    { name: 'ينافس في (Competing)', value: '5' }
                ))
        .addStringOption(option =>
            option.setName('text')
                .setDescription('النص الذي سيظهر بجانب الحالة')
                .setRequired(true)),

    async execute(interaction) {
        const OWNER_ID = "1450317296227582044";

        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ هذا الأمر مخصص لمطور البوت فقط.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const status = interaction.options.getString('status');
        const activityType = parseInt(interaction.options.getString('type'));
        const activityText = interaction.options.getString('text');

        try {
            // بيانات الحالة الجديدة
            const statusData = {
                status: status,
                type: activityType,
                text: activityText
            };

            // 1. حفظ البيانات في ملف status.json لكي يتذكرها البوت عند الريستارت
            fs.writeFileSync('./status.json', JSON.stringify(statusData, null, 4));

            // 2. تطبيق الحالة فوراً
            await interaction.client.user.setPresence({
                status: status,
                activities: [{
                    name: activityText,
                    type: activityType,
                    url: activityType === 1 ? 'https://www.twitch.tv/discord' : undefined 
                }]
            });

            return interaction.editReply({ 
                content: `✅ **تم تحديث الحالة وحفظها للأبد!**\nحتى لو طفى البوت، سيعود لهذه الحالة تلقائياً.`
            });

        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ حدث خطأ أثناء الحفظ.' });
        }
    }
};