const express = require('express');
const router = express.Router();
const imageModel = require('../models/imageModel');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Import multer module

const upload = multer({ dest: 'uploads/' });

router.get('/', (req, res) => {
    res.render('index');
});

router.post('/convert', upload.array('img'), async (req, res) => {
    try {
        const imagePaths = req.files.map(file => file.path);
        const downloadPromises = imagePaths.map(async imagePath => {
            const webPImage = await imageModel.convertToWebP(imagePath);
            const imageName = path.basename(imagePath);
            const webPFileName = imageName.replace(/\.[^/.]+$/, ".webp");
            res.set('Content-Disposition', `attachment; filename="${webPFileName}"`);
            res.set('Content-Type', 'image/webp');
            res.send(webPImage);
            fs.unlinkSync(imagePath); // Remove the original image after conversion
        });
        await Promise.all(downloadPromises);
    } catch (err) {
        console.error(err);
        res.status(500).send('Đã xảy ra lỗi khi chuyển đổi và nén ảnh.');
    }
});


module.exports = router;
