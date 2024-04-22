const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const JSZip = require('jszip');
const fs = require('fs');
const slugify = require('slugify');
const getSlug = require('speakingurl');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = (process.env.PORT ||3000);
app.set('view engine', 'ejs'); // Thay 'ejs' bằng tên của view engine bạn sử dụng
app.set('views', path.join(__dirname, 'views')); // Đường dẫn tới thư mục chứa các file view
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));
// Đường dẫn thư mục tạm thời để lưu trữ các ảnh tạm thời
const tmpDir = __dirname + '/tmp';

// Middleware để xử lý multipart/form-data cho tải ảnh lên
const upload2 = multer({ dest: tmpDir });

// Middleware để phân tích JSON từ yêu cầu
app.use(express.json())
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/convert', upload.array('img', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        const convertedImages = await Promise.all(req.files.map(async (file) => {
            const lowercaseInput = req.body.slug.toLowerCase(); 
            const slug = getSlug(lowercaseInput, { lang: 'vi' });

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
                    const index = req.files.indexOf(file);

                    webPFileName = `${slug}-${index + 1}.webp`;
                    return { name: webPFileName, data: webPImage };
                }

                // Giảm chất lượng ảnh
                if (sizeInKB >= 300) {
                    quality -= 15; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                } else
                if (sizeInKB >= 200) {
                    quality -= 10; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                } else
                if (sizeInKB >= 150) {
                    quality -= 5; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
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
app.post('/convert-single', upload.single('img'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        const lowercaseInput = req.body.slug2.toLowerCase(); 
        const slug = getSlug(lowercaseInput, { lang: 'vi' });

        const buffer = req.file.buffer;
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
                const originalFileName = req.file.originalname;
                webPFileName = `${slug}.webp`;

                res.set('Content-Disposition', `attachment; filename="${webPFileName}"`);
                res.set('Content-Type', 'image/webp');
                res.send(webPImage);
                return; // Kết thúc vòng lặp nếu dung lượng dưới 100KB
            }

            // Giảm chất lượng ảnh
           // Giảm chất lượng ảnh
                if (sizeInKB >= 300) {
                    quality -= 15; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                } else
                if (sizeInKB >= 200) {
                    quality -= 10; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                } else
                if (sizeInKB >= 150) {
                    quality -= 5; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                } else {
                    quality -= 1; // Giảm chất lượng xuống 5 đơn vị sau mỗi lần lặp
                }
        } while (quality >= 5); // Lặp lại cho đến khi chất lượng giảm đến mức tối thiểu là 5

        res.status(500).send('Không thể giảm dung lượng ảnh xuống dưới 100KB.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Đã xảy ra lỗi khi chuyển đổi ảnh.');
    }
});
// Route để xử lý yêu cầu POST từ máy khách để tải ảnh xuống và nén thành file zip
app.post('/download-images', upload.none(), async (req, res) => {
    try {
        // Lấy nội dung HTML từ yêu cầu
        const htmlContent = req.body.htmlContent;

        // Tạo một đối tượng JSZip để nén ảnh
        const zip = new JSZip();
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        let index = 0;

        // Lặp qua các thẻ ảnh và tải chúng xuống
        while ((match = imgRegex.exec(htmlContent)) !== null) {
            const imageUrl = match[1];
            const imageFilename = `image_${index}.png`; // Tên tệp ảnh tạm thời
            const imagePath = `${tmpDir}/${imageFilename}`;

            // Tải ảnh xuống
            const response = await fetch(imageUrl);
            const imageBuffer = await response.arrayBuffer();

            // Lưu ảnh vào thư mục tạm thời
            fs.writeFileSync(imagePath, Buffer.from(imageBuffer));

            // Thêm ảnh vào file zip
            zip.file(imageFilename, fs.readFileSync(imagePath));

            index++;
        }

        // Nén các ảnh thành file zip
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        // Gửi file zip về máy khách
        res.set('Content-Disposition', 'attachment; filename="images.zip"');
        res.set('Content-Type', 'application/zip');
        res.send(zipBuffer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Failed to download and compress images');
    }
});
app.post('/internal', async (req, res) => {
    const { url, keywords } = req.body;
    console.log(req.body);
    try {
        const results = await searchRelatedKeywords(url, keywords.split(','));
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function searchRelatedKeywords(url, keywords) {
    try {
        // Khởi tạo mảng kết quả để lưu trữ các trang có tiêu đề liên quan
        let results = [];
        const rooturl =url;
        // Khởi tạo tập hợp để lưu trữ các liên kết đã quét
        const visitedLinks = new Set();
        let links = [];
        // Hàm đệ quy để crawl và tìm kiếm trên mỗi trang
        async function crawlAndSearch(url) {
            try {
                // Kiểm tra xem liên kết đã được thăm trước đó chưa
                if (visitedLinks.has(url)) {
                    return;
                }

                // Thêm liên kết vào tập hợp đã thăm
                visitedLinks.add(url);

                // Lấy nội dung HTML của trang
                const response = await axios.get(url);
                if (response.status == 404) {
                    // Nếu là 404, bỏ qua trang và kết thúc hàm
                    console.log(`Page not found: ${url}`);
                    return;
                }
                const $ = cheerio.load(response.data);

                // Trích xuất tiêu đề từ trang hiện tại
                const pageTitle = $('title').text();
                if (!pageTitle) return;
                // Kiểm tra xem tiêu đề có chứa từ khóa không
                const foundKeywords = keywords.filter(keyword => new RegExp(keyword, 'i').test(pageTitle));

                // Nếu tiêu đề chứa từ khóa, thêm thông tin trang vào mảng kết quả
                if (foundKeywords.length > 0) {
                    results.push({
                        pageTitle: pageTitle,
                        url: url,
                        foundKeywords: foundKeywords
                    });
                }

                // Trích xuất tất cả các liên kết từ trang hiện tại
                
                $('a').each((index, element) => {
                    const link = $(element).attr('href');
                    if (link) {
                        // Kiểm tra nếu link bắt đầu bằng /
                        if (link.startsWith('/') ) {
                            let url2= rooturl.slice(0, -1);
                            
                            if (!visitedLinks.has(url2+link)) {
                                links.push(url2+ link);
                                console.log(url2+link);
                            }
                            
                            // Gắn URL gốc vào trước link
                            
                        }
                        // Kiểm tra xem liên kết có chứa URL gốc của trang web không
            
                    }
                });

                // Tìm kiếm trên mỗi liên kết thuộc cùng một trang web
                for (const link of links) {
                    // Tiếp tục quét các URL con
                    await crawlAndSearch(link);
                }
            } catch (error) {
                console.error('Error crawling page:', error);
            }
        }

        // Bắt đầu crawl từ URL được cung cấp
        await crawlAndSearch(url);

        return results;
    } catch (error) {
        throw new Error('Failed to fetch page data');
    }
}

app.get('/outline', (req, res) => {
    res.render('outline');
});
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/internal', (req, res) => {
    res.render('internal');
});
app.listen(process.env.PORT || 3000, () => {
    console.log(`Ứng dụng đang chạy tại http://localhost:${port}`);
});
