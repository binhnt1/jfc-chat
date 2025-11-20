const fs = require('fs-extra');
const concat = require('concat');

(async function build() {
    // Tên dự án của bạn (thư mục bên trong /dist)
    const projectName = 'chat-system/browser';

    // Đường dẫn tới các file sau khi build
    const filesToConcat = [
        `./dist/${projectName}/polyfills.js`,
        `./dist/${projectName}/scripts.js`,
        `./dist/${projectName}/main.js`,
    ];

    // Tên file đầu ra
    const outputPath = `./dist/jfc.chat.js`;

    try {
        let concatenatedContent = '';

        for (const filePath of filesToConcat) {
            console.log(`file: ${filePath}`);
            if (await fs.pathExists(filePath)) {
                let content = await fs.readFile(filePath, 'utf8');
                
                // Chỉ xử lý main.js, các file khác giữ nguyên
                if (filePath.includes('main.js')) {
                    content = content.replace(/export /g, '');
                    content = content.replace(/default /g, '');
                }

                if (filePath.includes('polyfills.js')) {
                    content = content.replace(/export /g, '');
                    content = content.replace(/default /g, '');
                }
                
                // Bọc nội dung file trong một hàm tự gọi (IIFE) để tạo scope riêng, tránh xung đột biến
                concatenatedContent += `(function(){\n${content}\n})();\n`;

            } else {
                console.warn(`⚠️  Cảnh báo: Không tìm thấy file, bỏ qua: ${filePath}`);
            }
        }

        await fs.writeFile(outputPath, concatenatedContent);
        
        console.log(`✅ Đã tạo thành công file gộp tại: ${outputPath}`);

    } catch (err) {
        console.error('Lỗi trong quá trình gộp file:', err);
    }
})();