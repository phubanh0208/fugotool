document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Hiển thị màn hình loading khi bắt đầu chuyển đổi ảnh
    document.getElementById('loading').style.display = 'flex';

    // Gửi yêu cầu POST lên máy chủ
    fetch('/convert', {
        method: 'POST',
        body: new FormData(this)
    })
    .then(response => {
        // Ẩn màn hình loading sau khi file zip được gửi về
        document.getElementById('loading').style.display = 'none';
        
        // Kiểm tra xem có lỗi không
        if (!response.ok) {
            throw new Error('Something went wrong');
        }
        // Tạo một URL cho file zip nhận được từ máy chủ
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        
        // Tạo một thẻ a ẩn để tải file zip về
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'converted_images.zip';
        document.body.appendChild(a);
        
        // Kích hoạt sự kiện click để tải file zip về
        a.click();
        
        // Xóa thẻ a sau khi đã tải file zip về
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    })
    .catch(error => {
        console.error('Error:', error);
        // Xử lý lỗi
    });
});
