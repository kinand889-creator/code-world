const AdmZip = require('adm-zip');
const fse = require('fs-extra');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

exports.handleFileCommand = async function(m, FILE_COMMAND_CHANNEL) {
    if (m.channel.id !== FILE_COMMAND_CHANNEL) return;

    const attachment = m.attachments.first();
    if (!attachment || !attachment.name.endsWith('.zip')) {
        return m.reply("❌ **رجاءً أرسل ملف البروجكت بصيغة ZIP مع الأمر.**");
    }

    const tempId = `temp_${m.author.id}_${Date.now()}`;
    const tempDir = path.join(process.cwd(), tempId);
    const extractPath = path.join(tempDir, 'extracted');
    const outputZipPath = path.join(process.cwd(), `fixed_${attachment.name}`);

    try {
        const statusMsg = await m.reply("⏳ **جاري تنظيف الملف وترتيب المسارات...**");
        
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        // 1. تحميل الملف
        const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
        const downloadPath = path.join(tempDir, 'input.zip');
        fs.writeFileSync(downloadPath, response.data);

        // 2. فك الضغط
        const zip = new AdmZip(downloadPath);
        zip.extractAllTo(extractPath, true);

        // 3. تحديد المجلد الفعلي للبروجكت
        let finalPath = extractPath;
        const items = fs.readdirSync(extractPath).filter(item => !item.startsWith('__MACOSX') && item !== '.DS_Store');

        // إذا وجدنا مجلد واحد فقط بداخله، ندخل إليه (هذا هو المجلد الزائد اللي نبي نحذفه)
        if (items.length === 1 && fs.lstatSync(path.join(extractPath, items[0])).isDirectory()) {
            finalPath = path.join(extractPath, items[0]);
            console.log(`✅ تم اكتشاف مجلد متداخل: ${items[0]}`);
        }

        // 4. إنشاء ملف ZIP جديد (إضافة المحتويات مباشرة للواجهة)
        const newZip = new AdmZip();
        const filesToZip = fs.readdirSync(finalPath);

        filesToZip.forEach(file => {
            const fullPath = path.join(finalPath, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                // إضافة المجلد بما فيه للواجهة
                newZip.addLocalFolder(fullPath, file);
            } else {
                // إضافة الملفات للواجهة
                newZip.addLocalFile(fullPath);
            }
        });

        newZip.writeZip(outputZipPath);

        // 5. إرسال الملف المعدل
        await m.author.send({
            content: `✅ **تم إصلاح ملفك!**\nالآن بمجرد فك ضغط هذا الملف، ستجد ملفات البوت (index.js, package.json) في الواجهة مباشرة بدون مجلدات داخلية.`,
            files: [outputZipPath]
        }).catch(() => m.reply("⚠️ **لا يمكنني إرسال رسالة خاصة لك، تأكد من فتح الخاص لإرسال الملف.**"));

        await statusMsg.edit("✅ **تمت العملية بنجاح! تفقد رسائلك الخاصة.**");

    } catch (err) {
        console.error(err);
        await m.reply("⚠️ **حدث خطأ أثناء معالجة الملف.**");
    } finally {
        // تنظيف الاستضافة
        setTimeout(() => {
            if (fs.existsSync(tempDir)) fse.removeSync(tempDir);
            if (fs.existsSync(outputZipPath)) fse.removeSync(outputZipPath);
        }, 5000); // ننتظر 5 ثواني للتأكد من إرسال الملف قبل الحذف
    }
};