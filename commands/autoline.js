const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');

const DATA_PATH = './autoline_config.json';
const ADMIN_ROLE_ID = "1465551578793771039"; // الرتبة المسؤولة التي حددتها

module.exports = {
    data: [
        new SlashCommandBuilder()
            .setName('autoline')
            .setDescription('إعداد نظام الخط التلقائي')
            .addSubcommand(sub => 
                sub.setName('setup')
                .setDescription('إضافة روم لنظام الخط التلقائي وتحديد رابط الخط')
                .addChannelOption(opt => opt.setName('channel').setDescription('الروم المراد تفعيل الخط فيها').setRequired(true))
                .addStringOption(opt => opt.setName('line_url').setDescription('رابط صورة الخط').setRequired(true)))
            .addSubcommand(sub => 
                sub.setName('status')
                .setDescription('تفعيل أو تعطيل الخط في روم معينة')
                .addChannelOption(opt => opt.setName('channel').setDescription('الروم').setRequired(true))
                .addStringOption(opt => opt.setName('toggle').setDescription('الحالة').setRequired(true)
                    .addChoices({ name: 'تفعيل ✅', value: 'on' }, { name: 'تعطيل ❌', value: 'off' })))
    ],

    async execute(interaction) {
        // --- التحقق من رتبة الإدارة المسموح لها ---
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({ 
                content: '❌ هذا الأمر مخصص للإدارة فقط (رتبة التحكم المطلوبة غير متوفرة لديك).', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        let allData = fs.existsSync(DATA_PATH) ? JSON.parse(fs.readFileSync(DATA_PATH)) : {};
        let guildData = allData[interaction.guild.id] || { channels: {} };

        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const lineUrl = interaction.options.getString('line_url');

            // حفظ الإعدادات للروم المحددة
            guildData.channels[channel.id] = { enabled: true, line: lineUrl };
            
            allData[interaction.guild.id] = guildData;
            fs.writeFileSync(DATA_PATH, JSON.stringify(allData, null, 2));

            return await interaction.reply({ 
                content: `✅ تم تفعيل الخط التلقائي بنجاح!\n**الروم:** ${channel}\n**رابط الخط:** ${lineUrl}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (sub === 'status') {
            const channel = interaction.options.getChannel('channel');
            const toggle = interaction.options.getString('toggle') === 'on';

            if (!guildData.channels[channel.id]) {
                return await interaction.reply({ 
                    content: '❌ هذه الروم لم يتم إعدادها مسبقاً، استخدم `/autoline setup` أولاً.', 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            guildData.channels[channel.id].enabled = toggle;
            allData[interaction.guild.id] = guildData;
            fs.writeFileSync(DATA_PATH, JSON.stringify(allData, null, 2));

            return await interaction.reply({ 
                content: `🛡️ تم **${toggle ? 'تفعيل ✅' : 'تعطيل ❌'}** الخط التلقائي في ${channel}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    },

    // وظيفة إرسال الخط تلقائياً عند الكتابة
    async handleMessage(message) {
        if (message.author.bot || !message.guild) return;

        const allData = fs.existsSync(DATA_PATH) ? JSON.parse(fs.readFileSync(DATA_PATH)) : {};
        const guildData = allData[message.guild.id];

        if (guildData && guildData.channels[message.channel.id]) {
            const config = guildData.channels[message.channel.id];
            // إذا كان النظام مفعلاً لهذه الروم والرابط موجود
            if (config.enabled && config.line) {
                await message.channel.send({ content: config.line }).catch(() => null);
            }
        }
    }
};