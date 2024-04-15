const sharp = require('sharp');

// Hàm xử lý chuyển đổi ảnh sang định dạng WebP
async function convertToWebP(imagePath) {
    // Chuyển đổi ảnh sang định dạng WebP
    const webPImage = await sharp(imagePath).toFormat('webp').toBuffer();
    return webPImage;
}

module.exports = {
    convertToWebP
};
