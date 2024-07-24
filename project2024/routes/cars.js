const express = require('express');
const router = express.Router();
const Profile = require('../models/profile'); // Import model Profile
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Contract = require('../models/Contract'); // Đảm bảo import đúng đường dẫn đến model Contract
const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: 'deisagk2t', 
  api_key: '441393585675462', 
  api_secret: 'DDHjIuLKY5ISh5igu9R4tecRKXg'
});

// Cấu hình Multer để lưu trữ hình ảnh tạm thời trong thư mục uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Hàm middleware upload file
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Giới hạn kích thước file 5MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).array('documentImages', 10); // Lưu trữ nhiều hình ảnh (tối đa 10 hình)

// Hàm kiểm tra loại file
function checkFileType(file, cb) {
  // Định nghĩa các loại file ảnh cho phép
  const filetypes = /jpeg|jpg|png/;
  // Kiểm tra đuôi file
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Kiểm tra kiểu file
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Chỉ được upload các file ảnh có định dạng JPEG, JPG hoặc PNG');
  }
}

router.get('/', (req, res) => {
  res.render('dashboard', {
    pageTitle: 'Dashboard',
  });
});

// Route for dashboard
router.get('/dashboard', (req, res) => {
  const { success } = req.query;
  res.render('dashboard', {
    pageTitle: 'Dashboard',
    success: success === 'true' // Chuyển đổi thành boolean
  });
});

// Route for adding profile (GET request)
router.get('/add-profile', (req, res) => {
  res.render('addProfile', {
    pageTitle: 'Thêm hồ sơ'
  });
});

// Route for adding profile (POST request)
router.post('/add-profile', async (req, res) => {
  // Lấy dữ liệu từ form submission
  const { cccd, fullname, dob } = req.body;

  // Kiểm tra nhập rỗng
  if (!cccd || !fullname || !dob) {
    res.render('addProfile', { errorMessage: 'Vui lòng điền đầy đủ thông tin.' });
    return;
  }

  try {
    // Kiểm tra xem CCCD đã tồn tại trong cơ sở dữ liệu hay chưa
    const existingProfile = await Profile.findOne({ cccd: cccd });

    if (existingProfile) {
      // Nếu CCCD đã tồn tại, hiển thị template addProfile với dữ liệu existingProfile
      res.render('addProfile', { existingProfile: existingProfile });
      return;
    }

    // Nếu CCCD chưa tồn tại và dữ liệu hợp lệ, tạo mã hợp đồng bằng số và lưu vào cơ sở dữ liệu
    const contractNumber = Math.floor(100000 + Math.random() * 900000); // Tạo số hợp đồng ngẫu nhiên
    const newProfile = new Profile({
      contractNumber: contractNumber,
      cccd: cccd,
      fullname: fullname,
      dob: dob
    });

    await newProfile.save(); // Lưu profile mới vào cơ sở dữ liệu

    // Chuyển sang màn hình nhập thông tin theo mã hợp đồng
    res.redirect(`/input-info/${contractNumber}`); // Điều hướng đến route /input-info/{contractNumber}

  } catch (err) {
    console.error('Lỗi khi thêm hồ sơ:', err);
    res.status(500).send('Lỗi Server');
  }
});

// Route for managing profiles
router.get('/manage-profiles', async (req, res) => {
  try {
    // Lấy tất cả các profile từ MongoDB
    const profiles = await Profile.find().lean(); // Sử dụng lean() để chuyển đổi thành plain object

    // Duyệt qua từng profile và lấy thông tin hợp đồng tương ứng
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const contract = await Contract.findOne({ contractNumber: profile.contractNumber }).lean();

      if (contract) {
        profile.rentalStartDate = contract.rentalStartDate;
        profile.rentalEndDate = contract.rentalEndDate;
        profile.contractStatus = contract.status;
        profile.statusColor = getStatusColor(contract.status); // Thêm màu cho từng trạng thái
      } else {
        // Xử lý trường hợp không tìm thấy hợp đồng nếu cần
        profile.rentalStartDate = 'N/A';
        profile.rentalEndDate = 'N/A';
        profile.contractStatus = 'N/A';
        profile.statusColor = 'black'; // Mặc định màu đen cho trạng thái không có hợp đồng
      }
    }

    res.render('manageProfiles', {
      pageTitle: 'Quản lý hồ sơ',
      profiles: profiles
    });
  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu từ MongoDB:', err);
    res.status(500).send('Lỗi Server');
  }
});

function getStatusColor(status) {
  switch (status) {
    case 'Đã Đóng':
      return 'black'; // Màu đen cho Đã Đóng
    case 'Đang thuê':
      return 'blue'; // Màu xanh cho Đang thuê
    case 'Quá hạn hợp đồng':
      return 'red'; // Màu đỏ cho Quá hạn hợp đồng
    default:
      return 'black'; // Mặc định màu đen cho trạng thái khác
  }
}


// Route hiển thị form nhập thông tin theo mã hợp đồng
router.get('/input-info/:contractNumber', async (req, res) => {
  const contractNumber = req.params.contractNumber;

  try {
    // Tìm thông tin profile dựa trên contractNumber từ hợp đồng
    const profile = await Profile.findOne({ contractNumber: contractNumber });

    if (!profile) {
      return res.status(404).send('Không tìm thấy thông tin profile.');
    }

    // Tìm thông tin hợp đồng dựa trên contractNumber
    const contract = await Contract.findOne({ contractNumber: contractNumber });

    // Hiển thị form nhập thông tin với thông tin từ profile và contract
    res.render('inputInfo', { contract: profile.contractNumber, profile: profile });

  } catch (err) {
    console.error('Lỗi khi lấy thông tin hợp đồng:', err);
    res.status(500).send('Lỗi Server');
  }
});

// Route xử lý form nhập thông tin theo mã hợp đồng
router.post('/input-info/:contractNumber', upload, async (req, res) => {
  const contractNumber = req.params.contractNumber;
  const { phone, address, licensePlate,rentalStartDate, rentalEndDate, refereeName1, refereePhone1, refereeName2, refereePhone2, refereeName3, refereePhone3 } = req.body;

  // Kiểm tra các trường bắt buộc và hình ảnh
  if (!rentalEndDate||!rentalStartDate||!contractNumber || !phone || !address || !licensePlate ||
      !refereeName1 || !refereePhone1 || !refereeName2 || !refereePhone2 || !refereeName3 || !refereePhone3 ||
      !req.files || req.files.length === 0) {
    return res.status(400).send('Vui lòng điền đầy đủ thông tin và tải lên ít nhất một hình ảnh');
  }

  try {
    // Upload hình ảnh lên Cloudinary
    const images = [];
    const promises = [];

    // Upload từng hình ảnh
    req.files.forEach(file => {
      promises.push(
        new Promise((resolve, reject) => {
          cloudinary.uploader.upload(file.path, (error, result) => {
            if (error) {
              reject(error);
            } else {
              images.push(result.secure_url);
              // Xóa file tạm thời sau khi đã upload lên Cloudinary
              fs.unlinkSync(file.path);
              resolve();
            }
          });
        })
      );
    });

    // Chờ tất cả các promises hoàn thành
    await Promise.all(promises);

    // Tạo một document mới từ model Contract
    const newContract = new Contract({
      contractNumber: contractNumber,
      phone: phone,
      address: address,
      licensePlate: licensePlate,
      rentalStartDate,
      rentalEndDate,
      referees: [
        { name: refereeName1, phone: refereePhone1 },
        { name: refereeName2, phone: refereePhone2 },
        { name: refereeName3, phone: refereePhone3 }
      ],
      images: images // Gán mảng đường dẫn hình ảnh đã upload
    });

    // Lưu contract mới vào cơ sở dữ liệu
    await newContract.save();

    // Chuyển hướng người dùng đến màn nhập thông tin tiếp theo (nếu cần)
    res.redirect('/dashboard'); // Thay đổi đường dẫn theo yêu cầu của ứng dụng của bạn

  } catch (err) {
    console.error('Lỗi khi lưu hợp đồng:', err);
    res.status(500).send('Lỗi Server');
  }
});
// Route để hiển thị chi tiết hợp đồng
router.get('/detail/:contractNumber', async (req, res) => {
  const contractNumber = req.params.contractNumber;

  try {
    // Tìm profile dựa trên contractNumber
    const profile = await Profile.findOne({ contractNumber }).lean();

    if (!profile) {
      return res.status(404).send('Không tìm thấy thông tin profile liên quan đến hợp đồng.');
    }

    // Tìm hợp đồng dựa trên contractNumber từ profile
    const contract = await Contract.findOne({ contractNumber });

    if (!contract) {
      return res.status(404).send('Không tìm thấy hợp đồng.');
    }

    // Kiểm tra trạng thái hiện tại trong MongoDB và cập nhật nếu cần
    if (contract.status !== 'Đã Đóng') {
      const today = new Date();
      if (today > contract.rentalEndDate) {
        contract.status = 'Quá hạn hợp đồng';
      } else if (today >= contract.rentalStartDate && today <= contract.rentalEndDate) {
        contract.status = 'Đang thuê';
      } else {
        contract.status = 'Đã Đóng';
      }

      // Lưu thay đổi trạng thái vào cơ sở dữ liệu
      await contract.save();
    }

    // Xác định trạng thái hợp đồng để hiển thị nút thích hợp
    let isClosed = false; // Mặc định hợp đồng chưa đóng
    if (contract.status === 'Đã Đóng') {
      isClosed = true; // Đánh dấu hợp đồng đã đóng
    }

    // Hiển thị template chi tiết hợp đồng với dữ liệu hợp đồng và profile
    res.render('contractDetail', { contract: contract.toObject(), profile, isClosed });

  } catch (err) {
    console.error('Lỗi khi lấy thông tin hợp đồng:', err);
    res.status(500).send('Lỗi Server');
  }
});




// POST route để đóng hợp đồng
router.post('/close-contract/:contractNumber', async (req, res) => {
  const contractNumber = req.params.contractNumber;

  try {
    // Tìm hợp đồng dựa trên contractNumber
    const contract = await Contract.findOne({ contractNumber: contractNumber });

    if (!contract) {
      return res.status(404).send('Không tìm thấy hợp đồng.');
    }

    // Đặt trạng thái của hợp đồng thành "Đã đóng"
    contract.status = 'Đã Đóng';
    
    // Lưu thay đổi vào cơ sở dữ liệu
    await contract.save();

    // Chuyển hướng hoặc gửi phản hồi
    res.redirect("/manage-profiles");

  } catch (err) {
    console.error('Lỗi khi đóng hợp đồng:', err);
    res.status(500).send('Lỗi Server');
  }
});




module.exports = router;
