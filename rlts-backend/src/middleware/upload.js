const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configuration is automatically picked up from CLOUDINARY_URL in .env
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

// Allowed MIME types
const ALLOWED_MIMES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Configure storage (Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const userId = req.user && req.user._id ? req.user._id.toString() : 'unknown_user';
    let subfolder = 'images';
    let resource_type = 'auto'; // Handles both images and videos
    
    if (file.fieldname === 'profileImage') {
      subfolder = 'profiles';
    } else if (file.fieldname === 'signatureImage') {
      subfolder = 'signatures';
    } else if (file.fieldname === 'pickupPhotos') {
      subfolder = 'pickups';
    } else if (file.fieldname === 'warehousePhotos') {
      subfolder = 'warehouse';
    } else if (file.fieldname === 'images') {
      subfolder = 'complaints';
    }

    return {
      folder: `conti_collect/${userId}/${subfolder}`,
      resource_type: resource_type,
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: `${file.fieldname}-${Date.now()}-${uuidv4().slice(0, 6)}`,
    };
  },
});

// File filter - validate MIME type
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG and PNG images are allowed.'), false);
  }
};

// Upload configurations
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Middleware for different upload scenarios
const uploadComplaintImages = upload.array('images', 5);
const uploadPickupPhotos = upload.fields([
  { name: 'pickupPhotos', maxCount: 10 },
  { name: 'signatureImage', maxCount: 1 },
]);
const uploadWarehousePhotos = upload.array('warehousePhotos', 10);
const uploadProfileImage = upload.single('profileImage');

// Error handler for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

module.exports = {
  uploadComplaintImages,
  uploadPickupPhotos,
  uploadWarehousePhotos,
  uploadProfileImage,
  handleUploadError,
};
