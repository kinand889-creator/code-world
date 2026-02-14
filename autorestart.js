const { EmbedBuilder } = require('discord.js');

// إعدادات النظام
const RESTART_INTERVAL = 10 * 60 * 1000; // 10 دقائق بالميلي ثانية
const LOG_CHANNEL_ID = "1465551421129883749"; // ايدي الروم الخاص بك

module.exports = (client) => {
    console.log("✅ تم تفعيل نظام الريستارت التلقائي (كل 10 دقائق).");

    setInterval(async () => {
        try {
            const channel = client.channels.cache.get(LOG_CHANNEL_ID);
            
            if (channel) {
                const restartEmbed = new EmbedBuilder()
                    .setTitle('🔄 تحديث النظام التلقائي')
                    .setDescription('**تم إعادة تشغيل البوت**\n**تمت عملية ريستارت للسستم**')
                    .setColor('#f1c40f') // لون أصفر
                    .setTimestamp()
                    .setFooter({ text: 'نظام الاستقرار الملكي 🛡️' });

                await channel.send({ embeds: [restartEmbed] });
            }

            console.log("🔄 جاري عمل ريستارت الآن...");
            
            // تأخير بسيط 2 ثانية لضمان إرسال الإيمبد قبل الخروج
            setTimeout(() => {
                process.exit(); 
            }, 2000);

        } catch (error) {
            console.error("❌ خطأ في نظام الريستارت التلقائي:", error);
            // في حالة الخطأ، يرست البوت أيضاً لضمان الاستمرارية
            process.exit();
        }
    }, RESTART_INTERVAL);
};