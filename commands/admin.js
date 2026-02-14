const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const fs = require('fs');
const config = require('../config.json');

let currentStatus = { text: 'يعمل بكفاءة ✅', color: 'Green' };

// دوال حفظ الإعدادات
function getSettings() {
    if (!fs.existsSync('./settings.json')) {
        fs.writeFileSync('./settings.json', JSON.stringify({ shortcuts: {}, line: "" }));
    }
    return JSON.parse(fs.readFileSync('./settings.json'));
}
function saveSettings(data) {
    fs.writeFileSync('./settings.json', JSON.stringify(data, null, 2));
}

module.exports = {
    data: [
        new SlashCommandBuilder().setName('help').setDescription('عرض جميع الأوامر الإدارية'),
        new SlashCommandBuilder().setName('set-line').setDescription('حفظ رابط الخط').addStringOption(o => o.setName('url').setDescription('رابط الصورة').setRequired(true)),
        new SlashCommandBuilder().setName('line').setDescription('إرسال الخط'),
        new SlashCommandBuilder().setName('lock').setDescription('قفل القناة'),
        new SlashCommandBuilder().setName('unlock').setDescription('فتح القناة'),
        new SlashCommandBuilder().setName('hide').setDescription('إخفاء القناة'),
        new SlashCommandBuilder().setName('show').setDescription('إظهار القناة'),
        new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(o => o.setName('num').setDescription('عدد الرسائل').setRequired(true)),
        new SlashCommandBuilder().setName('ban').setDescription('حظر عضو').addUserOption(o => o.setName('user').setDescription('العضو المراد حظره').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('سبب الحظر')),
        new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(o => o.setName('user').setDescription('العضو المراد طرده').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('سبب الطرد')),
        new SlashCommandBuilder().setName('timeout').setDescription('إسكات عضو').addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('المدة بالدقائق').setRequired(true)),
        new SlashCommandBuilder().setName('role').setDescription('إعطاء أو سحب رتبة').addUserOption(o => o.setName('user').setDescription('العضو المعني').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('الرتبة المعنية').setRequired(true)),
        new SlashCommandBuilder().setName('nick').setDescription('تغيير لقب عضو').addUserOption(o => o.setName('user').setDescription('العضو المعني').setRequired(true)).addStringOption(o => o.setName('name').setDescription('الاسم الجديد').setRequired(true)),
        new SlashCommandBuilder().setName('pre').setDescription('ضبط اختصار لأمر').addStringOption(o => o.setName('command').setDescription('الأمر الأصلي').setRequired(true).addChoices(
            {name:'Lock', value:'lock'}, {name:'Unlock', value:'unlock'}, {name:'Hide', value:'hide'}, {name:'Show', value:'show'}
        )).addStringOption(o => o.setName('shortcut').setDescription('حرف الاختصار').setRequired(true)),
        new SlashCommandBuilder().setName('say').setDescription('إرسال رسالة باسم البوت').addStringOption(o => o.setName('msg').setDescription('النص').setRequired(true)),
        new SlashCommandBuilder().setName('emd').setDescription('إرسال إيمبد عبر نافذة نصية'),
        new SlashCommandBuilder().setName('set-rules').setDescription('إرسال منيو إعداد القوانين'),
        new SlashCommandBuilder().setName('ping').setDescription('سرعة استجابة البوت'),
        new SlashCommandBuilder().setName('system').setDescription('إدارة النظام').addStringOption(o => o.setName('action').setDescription('الإجراء المطلوب').setRequired(true).addChoices({name:'Status', value:'status'}, {name:'Restart', value:'restart'}))
    ].map(c => c.toJSON()),

    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) return interaction.reply({ content: '❌ للأدمن فقط', ephemeral: true });
        
        const { commandName, options, channel, guild } = interaction;
        let settings = getSettings();

        // تنفيذ أمر القوانين
        if (commandName === 'set-rules') {
            const embed = new EmbedBuilder()
                .setTitle('📜 إعداد قوانين السيرفر')
                .setDescription('اختر من القائمة أدناه لتعديل القوانين وإرسالها في هذه القناة.')
                .setColor('#2b2d31');

            const select = new StringSelectMenuBuilder()
                .setCustomId('rules_menu')
                .setPlaceholder('اختر إجراءً...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('تغيير القوانين')
                        .setDescription('فتح نافذة لكتابة نص القوانين بالكامل')
                        .setEmoji('📝')
                        .setValue('edit_rules'),
                );

            const row = new ActionRowBuilder().addComponents(select);
            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // أمر الإيمبد (Modal) - تم التعديل هنا ليكون "بمحتوى فقط"
        if (commandName === 'emd') {
            const modal = new ModalBuilder().setCustomId('admin_embed_modal').setTitle('إنشاء إيمبد');
            
            const textInput = new TextInputBuilder()
                .setCustomId('embed_text_input')
                .setLabel("المحتوى")
                .setPlaceholder('اكتب ما تريد إرساله هنا...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            return await interaction.showModal(modal);
        }

        // باقي الأوامر الإدارية
        if (commandName === 'help') {
            const embed = new EmbedBuilder().setTitle('🛡️ لوحة التحكم').setColor('Blue')
                .addFields(
                    { name: '⚙️ الخط', value: '`/set-line`, `/line`', inline: true },
                    { name: '🔒 القنوات', value: '`/lock`, `/unlock`, `/hide`, `/show`', inline: true },
                    { name: '🔨 عقوبات', value: '`/ban`, `/kick`, `/timeout`, `/clear`', inline: true },
                    { name: '👤 أعضاء', value: '`/nick`, `/role`', inline: true },
                    { name: '⚡ نظام', value: '`/ping`, `/pre`, `/system`, `/set-rules`', inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'set-line') {
            settings.line = options.getString('url');
            saveSettings(settings);
            return interaction.reply('✅ تم حفظ رابط الخط.');
        }

        if (commandName === 'line') {
            if (!settings.line) return interaction.reply('❌ اضبط الخط بـ `/set-line` أولاً.');
            await channel.send({ files: [settings.line] });
            return interaction.reply({ content: '✅ تم الإرسال', ephemeral: true });
        }

        if (commandName === 'pre') {
            const cmd = options.getString('command');
            const sc = options.getString('shortcut').toLowerCase();
            settings.shortcuts[sc] = cmd;
            saveSettings(settings);
            return interaction.reply(`✅ تم ربط \`!${sc}\` بـ \`${cmd}\``);
        }

        if (commandName === 'lock') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            return interaction.reply('🔒 تم قفل القناة.');
        }

        if (commandName === 'unlock') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
            return interaction.reply('🔓 تم فتح القناة.');
        }

        if (commandName === 'hide') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
            return interaction.reply('👁️ تم إخفاء القناة.');
        }

        if (commandName === 'show') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
            return interaction.reply('👁️ تم إظهار القناة.');
        }

        if (commandName === 'clear') {
            const num = options.getInteger('num');
            await channel.bulkDelete(num > 100 ? 100 : num, true);
            return interaction.reply({ content: `🧹 تم مسح ${num} رسالة.`, ephemeral: true });
        }

        if (commandName === 'ban') {
            const user = options.getUser('user');
            await guild.members.ban(user);
            return interaction.reply(`🔨 تم حظر ${user.tag}`);
        }

        if (commandName === 'timeout') {
            const member = options.getMember('user');
            const min = options.getInteger('minutes');
            await member.timeout(min * 60 * 1000);
            return interaction.reply(`🔇 تم إسكات ${member.user.tag} لمدّة ${min} دقيقة.`);
        }

        if (commandName === 'role') {
            const member = options.getMember('user');
            const role = options.getRole('role');
            if (member.roles.cache.has(role.id)) await member.roles.remove(role);
            else await member.roles.add(role);
            return interaction.reply(`✅ تم تحديث رتبة العضو.`);
        }

        if (commandName === 'nick') {
            const member = options.getMember('user');
            await member.setNickname(options.getString('name'));
            return interaction.reply(`📝 تم تغيير لقب العضو.`);
        }

        if (commandName === 'ping') return interaction.reply(`🏓 الاستجابة: \`${client.ws.ping}ms\``);

        if (commandName === 'system') {
            const action = options.getString('action');
            if (action === 'status') {
                const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                return interaction.reply(`📊 الرام: ${mem}MB | الحالة: ${currentStatus.text}`);
            }
            if (action === 'restart') {
                await interaction.reply('🔄 يتم الآن إعادة التشغيل...');
                setTimeout(() => process.exit(), 2000);
            }
        }

        if (commandName === 'say') {
            await channel.send(options.getString('msg'));
            return interaction.reply({ content: '✅ تم الإرسال', ephemeral: true });
        }
    }
};