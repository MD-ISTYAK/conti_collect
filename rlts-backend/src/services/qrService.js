const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

/**
 * Generate a QR code for a complaint ID and save to disk.
 * Returns the URL path.
 */
const generateQRCode = async (complaintId) => {
  try {
    const targetDir = path.join(UPLOAD_DIR, 'complaints', complaintId, 'qr-code');
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, 'qr.png');

    await QRCode.toFile(filePath, complaintId, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#1E3A5F',
        light: '#FFFFFF',
      },
    });

    const relativePath = path.relative(UPLOAD_DIR, filePath).replace(/\\/g, '/');
    logger.info(`QR code generated for ${complaintId}`);
    return `/uploads/${relativePath}`;
  } catch (error) {
    logger.error(`QR code generation failed for ${complaintId}: ${error.message}`);
    throw error;
  }
};

module.exports = { generateQRCode };
