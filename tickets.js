const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags 
} = require('discord.js');
const fs = require('fs');

const DATA_PATH = './ticket_settings.json';
const OWNERS = ["1450317296227582044", "1454530978981875892"]; 

function getSettings() {
    try { 
        if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, '{}');
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch { return {}; }
}

function saveSettings(data) { fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2)); }

// دالة إرسال اللوجات
async function sendLog(guild, config, title, description, color = '#5865f2') {
    if (!config.logChannel) return;
    const logChannel = guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
        .setTitle(`📑 Ticket Log: ${title}`)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: guild.name, iconURL: guild.iconURL() });

    await logChannel.send({ embeds: [logEmbed] });
}

const ticketCommands = [
    new SlashCommandBuilder()
        .setName('ticket-config')
        .setDescription('Ticket system settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt => opt.setName('admin_role').setDescription('Admin Role').setRequired(true))
        .addChannelOption(opt => opt.setName('log_channel').setDescription('Logs Channel').setRequired(true))
        .addStringOption(opt => opt.setName('status').setDescription('System Status').addChoices({name:'ON', value:'on'}, {name:'OFF', value:'off'}).setRequired(true))
        .addStringOption(opt => opt.setName('outer_msg').setDescription('Outer Message').setRequired(true))
        .addStringOption(opt => opt.setName('inner_msg').setDescription('Inner Message').setRequired(true))
        .addStringOption(opt => opt.setName('outer_img').setDescription('Outer Image URL').setRequired(false))
        .addStringOption(opt => opt.setName('inner_img').setDescription('Inner Image URL').setRequired(false)),

    new SlashCommandBuilder()
        .setName('ticket-send')
        .setDescription('Send a new ticket message')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('type').setDescription('UI Type').addChoices({name:'Buttons', value:'btn'}, {name:'Menu', value:'menu'}).setRequired(true))
        .addStringOption(opt => opt.setName('options').setDescription('Options (comma separated)').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send').setRequired(true)),

    new SlashCommandBuilder()
        .setName('ticket-set')
        .setDescription('Enable or disable a specific ticket message')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the ticket message').setRequired(true))
        .addStringOption(opt => opt.setName('status').setDescription('Status').addChoices({name:'Enable', value:'on'}, {name:'Disable', value:'off'}).setRequired(true)),

    new SlashCommandBuilder()
        .setName('come')
        .setDescription('Call a user to the ticket')
        .addUserOption(opt => opt.setName('user').setDescription('User to call').setRequired(true))
].map(c => c.toJSON());

async function handleTicketInteraction(interaction) {
    const settings = getSettings();
    const config = settings[interaction.guildId];

    // --- معالجة الأوامر ---
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ticket-config') {
            settings[interaction.guildId] = {
                adminRole: interaction.options.getRole('admin_role').id,
                logChannel: interaction.options.getChannel('log_channel').id,
                status: interaction.options.getString('status') === 'on',
                outerMsg: interaction.options.getString('outer_msg'),
                innerMsg: interaction.options.getString('inner_msg'),
                outerImg: interaction.options.getString('outer_img') || null,
                innerImg: interaction.options.getString('inner_img') || null
            };
            saveSettings(settings);
            return interaction.reply({ content: '✅ System Configured Successfully!', flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.commandName === 'ticket-send') {
            if (!config) return interaction.reply({ content: '❌ Please use `/ticket-config` first!', flags: [MessageFlags.Ephemeral] });
            const type = interaction.options.getString('type');
            const options = interaction.options.getString('options').split(',');
            const channel = interaction.options.getChannel('channel');

            const embed = new EmbedBuilder().setTitle('Support Center').setDescription(config.outerMsg).setColor('#00fbff');
            if (config.outerImg) embed.setImage(config.outerImg);

            const row = new ActionRowBuilder();
            if (type === 'btn') {
                options.slice(0, 5).forEach((opt, i) => {
                    row.addComponents(new ButtonBuilder().setCustomId(`open_t_${i}`).setLabel(opt.trim()).setStyle(ButtonStyle.Primary).setEmoji('📩'));
                });
            } else {
                const menu = new StringSelectMenuBuilder().setCustomId('open_menu_t').setPlaceholder('Select Category...');
                options.forEach((opt, i) => menu.addOptions({ label: opt.trim(), value: `val_${i}`, emoji: '🎫' }));
                row.addComponents(menu);
            }
            await channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: '✅ Ticket Message Sent.', flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.commandName === 'ticket-set') {
            const msgId = interaction.options.getString('message_id');
            const status = interaction.options.getString('status');
            try {
                const msg = await interaction.channel.messages.fetch(msgId);
                const rows = msg.components.map(row => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach(c => c.setDisabled(status === 'off'));
                    return newRow;
                });
                await msg.edit({ components: rows });
                return interaction.reply({ content: `✅ Ticket message has been **${status === 'on' ? 'Enabled' : 'Disabled'}**.`, flags: [MessageFlags.Ephemeral] });
            } catch (e) {
                return interaction.reply({ content: '❌ Error: Message not found in this channel.', flags: [MessageFlags.Ephemeral] });
            }
        }

        if (interaction.commandName === 'come') {
            const user = interaction.options.getUser('user');
            await interaction.reply({ content: `⚠️ ${user}, you are requested in this ticket by ${interaction.user}!` });
            return user.send(`🔔 You have been called in **${interaction.guild.name}**`).catch(() => null);
        }
    }

    // --- فتح التذكرة ---
    const isOpening = (interaction.isButton() && interaction.customId.startsWith('open_t_')) || (interaction.isStringSelectMenu() && interaction.customId === 'open_menu_t');
    if (isOpening) {
        if (!config || !config.status) return interaction.reply({ content: '❌ Support is currently closed.', flags: [MessageFlags.Ephemeral] });

        const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
        if (existing) return interaction.reply({ content: `❌ You already have an open ticket: ${existing}`, flags: [MessageFlags.Ephemeral] });

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        try {
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: config.adminRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_t').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
                new ButtonBuilder().setCustomId('helper_t').setLabel('Helper').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('close_t').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            const innerEmbed = new EmbedBuilder().setDescription(config.innerMsg).setColor('#00fbff');
            if (config.innerImg) innerEmbed.setImage(config.innerImg);

            await channel.send({ content: `<@&${config.adminRole}> | <@${interaction.user.id}>`, embeds: [innerEmbed], components: [row] });
            await sendLog(interaction.guild, config, "Ticket Created", `**User:** ${interaction.user}\n**Channel:** ${channel}`, '#2ecc71');
            return interaction.editReply(`✅ Ticket Opened: ${channel}`);
        } catch (e) { return interaction.editReply(`❌ Failed: ${e.message}`); }
    }

    // --- تفاعلات الأزرار (Claim/Helper/Close) ---
    if (interaction.isButton()) {
        if (!config) return;

        if (interaction.customId === 'claim_t') {
            if (!interaction.member.roles.cache.has(config.adminRole)) return interaction.reply({ content: '❌ Admins Only', flags: [MessageFlags.Ephemeral] });
            await interaction.channel.setTopic(interaction.user.id);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('unclaim_t').setLabel('Unclaim').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
                new ButtonBuilder().setCustomId('helper_t').setLabel('Helper').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('close_t').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );
            await interaction.update({ components: [row] });
            await interaction.channel.send(`🙋‍♂️ Ticket claimed by ${interaction.user}`);
            await sendLog(interaction.guild, config, "Ticket Claimed", `**Admin:** ${interaction.user}\n**Channel:** ${interaction.channel}`, '#f1c40f');
        }

        if (interaction.customId === 'unclaim_t') {
            if (interaction.user.id !== interaction.channel.topic) return interaction.reply({ content: '❌ التذكره مستلمه من اداري اخر لا يمكنك استلامها!', flags: [MessageFlags.Ephemeral] });
            await interaction.channel.setTopic('');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_t').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
                new ButtonBuilder().setCustomId('helper_t').setLabel('Helper').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('close_t').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );
            await interaction.update({ components: [row] });
            await interaction.channel.send(`🔄 Ticket is now available for other admins.`);
            await sendLog(interaction.guild, config, "Ticket Unclaimed", `**Admin:** ${interaction.user}\n**Channel:** ${interaction.channel}`, '#e67e22');
        }

        if (interaction.customId === 'helper_t') {
            const claimer = interaction.channel.topic;
            if (claimer && interaction.user.id !== claimer) return interaction.reply({ content: `❌ Locked by <@${claimer}>`, flags: [MessageFlags.Ephemeral] });
            if (!interaction.member.roles.cache.has(config.adminRole)) return interaction.reply({ content: '❌ Admins Only', flags: [MessageFlags.Ephemeral] });
            
            const helperRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('helper_actions_t').setPlaceholder('Admin Tools...')
                .addOptions(
                    { label: 'Add User', value: 'add_user_t', emoji: '➕' },
                    { label: 'Remove User', value: 'rem_user_t', emoji: '➖' },
                    { label: 'Rename', value: 'rename_ticket_t', emoji: '✏️' },
                    { label: 'Call Owners', value: 'call_owners_t', emoji: '👑' }
                )
            );
            return interaction.reply({ content: '🛠️ Helper Menu:', components: [helperRow], flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.customId === 'close_t') {
            if (!interaction.member.roles.cache.has(config.adminRole)) return interaction.reply({ content: '❌ Admins Only', flags: [MessageFlags.Ephemeral] });
            await sendLog(interaction.guild, config, "Ticket Closed", `**By:** ${interaction.user}\n**Name:** ${interaction.channel.name}`, '#e74c3c');
            await interaction.reply('🔒 Closing in 5s...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }

    // --- المنيو والمودال ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'helper_actions_t') {
        const action = interaction.values[0];
        if (action === 'call_owners_t') {
            const mentions = OWNERS.map(id => `<@${id}>`).join(' ');
            await interaction.channel.send(`🚨 Calling Owners: ${mentions}`);
            OWNERS.forEach(async id => {
                const u = await interaction.client.users.fetch(id).catch(() => null);
                if (u) u.send(`🚨 **Urgent Call** in **${interaction.guild.name}**\nChannel: ${interaction.channel}`).catch(() => null);
            });
            return interaction.reply({ content: '✅ Owners Notified.', flags: [MessageFlags.Ephemeral] });
        }
        const modal = new ModalBuilder().setCustomId(action).setTitle('Ticket Management');
        const input = new TextInputBuilder().setCustomId('in_t').setLabel('Input Data (ID or Name)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit()) {
        const val = interaction.fields.getTextInputValue('in_t');
        if (interaction.customId === 'rename_ticket_t') {
            await interaction.channel.setName(val);
            return interaction.reply({ content: `✅ Ticket renamed to: **${val}**` });
        }
        const target = await interaction.guild.members.fetch(val).catch(() => null);
        if (!target) return interaction.reply({ content: '❌ User not found.', flags: [MessageFlags.Ephemeral] });

        if (interaction.customId === 'add_user_t') await interaction.channel.permissionOverwrites.edit(target, { ViewChannel: true });
        if (interaction.customId === 'rem_user_t') await interaction.channel.permissionOverwrites.edit(target, { ViewChannel: false });
        return interaction.reply({ content: `✅ Done with ${target}.` });
    }
}

module.exports = { ticketCommands, handleTicketInteraction };