const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');

const DATA_PATH = './autorole_config.json';
const ADMIN_ROLE_ID = "1465551578793771039"; // الرتبة التي حددتها

module.exports = {
    data: [
        new SlashCommandBuilder()
            .setName('autorole-setup')
            .setDescription('إعداد الرتب التلقائية للأعضاء والبوتات')
            .addRoleOption(opt => opt.setName('member_role').setDescription('رتبة الأعضاء الجدد'))
            .addRoleOption(opt => opt.setName('bot_role').setDescription('رتبة البوتات الجديدة')),
        
        new SlashCommandBuilder()
            .setName('autorole-status')
            .setDescription('تفعيل أو تعطيل الرتبة التلقائية')
            .addStringOption(opt => opt.setName('status').setDescription('الحالة').setRequired(true)
                .addChoices({ name: 'تفعيل ✅', value: 'on' }, { name: 'تعطيل ❌', value: 'off' }))
    ],

    async execute(interaction) {
        // التحقق من الرتبة المسموح لها بالتحكم
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({ 
                content: '❌ ليس لديك صلاحية الوصول لهذه الأوامر (تحتاج رتبة الإدارة الخاصة).', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        let allData = fs.existsSync(DATA_PATH) ? JSON.parse(fs.readFileSync(DATA_PATH)) : {};
        let guildData = allData[interaction.guild.id] || { status: false, memberRole: null, botRole: null };

        if (interaction.commandName === 'autorole-setup') {
            const mRole = interaction.options.getRole('member_role');
            const bRole = interaction.options.getRole('bot_role');

            if (mRole) guildData.memberRole = mRole.id;
            if (bRole) guildData.botRole = bRole.id;

            allData[interaction.guild.id] = guildData;
            fs.writeFileSync(DATA_PATH, JSON.stringify(allData, null, 2));

            return await interaction.reply({ 
                content: `✅ تم تحديث الإعدادات:\n- رتبة الأعضاء: ${mRole ? `<@&${mRole.id}>` : 'لم تتغير'}\n- رتبة البوتات: ${bRole ? `<@&${bRole.id}>` : 'لم تتغير'}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (interaction.commandName === 'autorole-status') {
            guildData.status = interaction.options.getString('status') === 'on';
            allData[interaction.guild.id] = guildData;
            fs.writeFileSync(DATA_PATH, JSON.stringify(allData, null, 2));

            return await interaction.reply({ 
                content: `🛡️ الرتبة التلقائية الآن: **${guildData.status ? 'مفعلة ✅' : 'معطلة ❌'}**`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    },

    async handleMemberJoin(member) {
        const allData = fs.existsSync(DATA_PATH) ? JSON.parse(fs.readFileSync(DATA_PATH)) : {};
        const guildConfig = allData[member.guild.id];

        if (!guildConfig || !guildConfig.status) return;

        try {
            if (member.user.bot) {
                if (guildConfig.botRole) await member.roles.add(guildConfig.botRole);
            } else {
                if (guildConfig.memberRole) await member.roles.add(guildConfig.memberRole);
            }
        } catch (e) {
            console.error(`❌ فشل إعطاء رتبة تلقائية:`, e.message);
        }
    }
};