const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    if (file.fieldname === 'avatar') uploadPath += 'avatars/';
    else if (file.fieldname === 'logo') uploadPath += 'logos/';
    else if (file.fieldname === 'document') uploadPath += 'documents/';
    else if (file.fieldname === 'attachment') uploadPath += 'attachments/';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new AppError('File type not supported. Allowed: jpeg, jpg, png, gif, pdf, doc, docx', 400));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  }
});

module.exports = upload;