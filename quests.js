const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Parser = require('rss-parser');
const parser = new Parser();

const QUESTS_ROOM_ID = "1471832606743199755"; 
const CHECK_INTERVAL = 60 * 60 * 1000; 
let lastQuestTitle = "";

async function startQuestMonitor(client) {
    console.log("🕵️ نظام مراقبة القويستات الذكي يعمل الآن...");

    setInterval(async () => {
        try {
            const feed = await parser.parseURL('https://discord.com/blog/rss.xml');
            
            // البحث عن أول مقال يخص القويستات
            const latestQuest = feed.items.find(item => 
                item.title.toLowerCase().includes('quest')
            );

            if (latestQuest && latestQuest.title !== lastQuestTitle) {
                lastQuestTitle = latestQuest.title;

                const channel = client.channels.cache.get(QUESTS_ROOM_ID);
                if (!channel) return;

                // --- استخراج البيانات ديناميكياً ---
                // نأخذ أول 200 حرف من الوصف لنضعها كمهمة
                const questDescription = latestQuest.contentSnippet ? 
                    latestQuest.contentSnippet.split('.')[0] + '.' : "Check Discord for details.";

                const embed = new EmbedBuilder()
                    .setAuthor({ name: `⭐ | Discord Quest` })
                    // نستخدم صورة المقال إذا وجدت، أو صورة افتراضية للقويستات
                    .setImage(latestQuest.enclosure?.url || 'https://i.imgur.com/E0n9B9O.png') 
                    .addFields(
                        { 
                            name: 'Quest', 
                            value: `**${latestQuest.title}**\n${questDescription}`, 
                            inline: false 
                        },
                        { 
                            name: 'Duration', 
                            value: `\`Started:\` ${new Date(latestQuest.pubDate).toLocaleDateString()}\n\`Ends:\` Check Blog Link`, 
                            inline: false 
                        },
                        { 
                            name: 'Reward', 
                            value: `Exclusive In-game Rewards / Badges\n*(See details via link)*`, 
                            inline: false 
                        }
                    )
                    .setThumbnail('https://i.imgur.com/zW6u1T6.png') 
                    .setColor('#2b2d31')
                    .setTimestamp()
                    .setFooter({ text: 'تحديث تلقائي من مدونة ديسكورد الرسمية' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Quest Link')
                        .setEmoji('🔗')
                        .setStyle(ButtonStyle.Link)
                        .setURL(latestQuest.link),
                    new ButtonBuilder()
                        .setCustomId('lang_ar')
                        .setLabel('العربية')
                        .setEmoji('🌐')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('studio_credit')
                        .setLabel('Wick Studio')
                        .setEmoji('🦅')
                        .setStyle(ButtonStyle.Secondary)
                );

                await channel.send({ 
                    content: '📢 @everyone **تم اكتشاف قويست رسمي جديد!**', 
                    embeds: [embed], 
                    components: [row] 
                });
            }
        } catch (error) {
            console.error("❌ فشل فحص القويستات:", error.message);
        }
    }, CHECK_INTERVAL);
}

module.exports = { startQuestMonitor };