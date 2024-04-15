const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const JSZip = require('jszip');

const app = express();
const port = (process.env.PORT ||3000);

app.use(express.static('public'));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/convert', upload.array('img', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        const convertedImages = await Promise.all(req.files.map(async (file) => {
            const buffer = file.buffer;
            let quality = 100; // Khởi tạo chất lượng ảnh là 100

            let webPImage, webPFileName;
            do {
                // Giảm chất lượng của ảnh
                webPImage = await sharp(buffer)
                    .webp({ quality: quality })
                    .toBuffer();

                // Kiểm tra dung lượng của ảnh
                const sizeInKB = webPImage.length / 1024;

                // Kiểm tra dung lượng ảnh đã chuyển đổi có dưới 100KB chưa
                if (sizeInKB <= 100) {
                    const originalFileName = file.originalname;
                    webPFileName = path.parse(originalFileName).name + '.webp';
                    return { name: webPFileName, data: webPImage };
                }

                // Giảm chất lượng ảnh
                if (sizeInKB >= 200) {
                    quality -= 10; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                } else
                if (sizeInKB >= 150) {
                    quality -= 7; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                } else {
                    quality -= 1; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                }
               
            } while (quality >= 5); // Lặp lại cho đến khi chất lượng giảm đến mức tối thiểu là 5

            return null;
        }));

        const zip = new JSZip();
        convertedImages.forEach((image) => {
            if (image) {
                zip.file(image.name, image.data);
            }
        });

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        res.set('Content-Disposition', 'attachment; filename="converted_images.zip"');
        res.set('Content-Type', 'application/zip');
        res.send(zipBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Đã xảy ra lỗi khi chuyển đổi ảnh.');
    }
});



app.listen(process.env.PORT || 3000, () => {
    console.log(`Ứng dụng đang chạy tại http://localhost:${port}`);
});
