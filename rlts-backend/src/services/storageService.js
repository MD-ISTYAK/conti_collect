const logger = require('../utils/logger');

/**
 * Process a file (now just returning its Cloudinary URL).
 * With multer-storage-cloudinary, the URL is passed instead of a temp path.
 */
const moveFile = async (fileUrl, category, complaintId) => {
  return fileUrl;
};

/**
 * Process multiple uploaded files.
 */
const processUploads = async (files, category, complaintId) => {
  if (!files || files.length === 0) return [];
  
  return files.map(file => file.path);
};

/**
 * Save a profile image.
 */
const saveProfileImage = async (file, userId) => {
  return file.path;
};

/**
 * Return url path as is, no longer mapping to local file system.
 */
const getFilePath = (urlPath) => {
  return urlPath;
};

module.exports = {
  moveFile,
  processUploads,
  saveProfileImage,
  getFilePath,
};
