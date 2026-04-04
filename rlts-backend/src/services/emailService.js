const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

const initTransporter = () => {
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: log emails to console
    transporter = {
      sendMail: async (options) => {
        logger.info(`📧 EMAIL (dev mode - not sent):\n  To: ${options.to}\n  Subject: ${options.subject}\n  Body: ${options.text || options.html?.substring(0, 200)}`);
        return { messageId: 'dev-mode' };
      },
    };
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) initTransporter();

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@conticollect.com',
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
    return result;
  } catch (error) {
    logger.error(`Email send failed to ${to}: ${error.message}`);
    // Don't throw - email failures shouldn't break main flow
  }
};

// Email templates
const sendComplaintCreatedEmail = async (adminEmails, complaint, dealerName) => {
  await sendEmail({
    to: adminEmails.join(','),
    subject: `New Return Complaint: ${complaint.complaintId}`,
    html: `
      <h2>New Complaint Submitted</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>Dealer:</strong> ${dealerName}</p>
      <p><strong>Product:</strong> ${complaint.productName} (${complaint.productType})</p>
      <p><strong>Quantity:</strong> ${complaint.quantity}</p>
      <p><strong>Reason:</strong> ${complaint.reason}</p>
      <p>Please review and approve/reject this complaint in the admin panel.</p>
    `,
  });
};

const sendComplaintApprovedEmail = async (dealerEmail, complaint) => {
  await sendEmail({
    to: dealerEmail,
    subject: `Complaint ${complaint.complaintId} Approved`,
    html: `
      <h2>Your Complaint Has Been Approved</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p>Your return complaint has been approved. A pickup will be scheduled shortly.</p>
    `,
  });
};

const sendComplaintRejectedEmail = async (dealerEmail, complaint) => {
  await sendEmail({
    to: dealerEmail,
    subject: `Complaint ${complaint.complaintId} Rejected`,
    html: `
      <h2>Your Complaint Has Been Rejected</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>Reason:</strong> ${complaint.rejectionReason}</p>
      <p>If you believe this is an error, please contact support.</p>
    `,
  });
};

const sendCfaAssignedEmail = async (dealerEmail, cfaEmail, complaint, cfaName, pickupDate) => {
  // Notify dealer
  await sendEmail({
    to: dealerEmail,
    subject: `Pickup Scheduled: ${complaint.complaintId}`,
    html: `
      <h2>Pickup Scheduled</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>CFA Agent:</strong> ${cfaName}</p>
      <p><strong>Expected Pickup Date:</strong> ${new Date(pickupDate).toLocaleDateString('en-IN')}</p>
    `,
  });
  // Notify CFA
  await sendEmail({
    to: cfaEmail,
    subject: `New Pickup Assigned: ${complaint.complaintId}`,
    html: `
      <h2>New Pickup Assignment</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>Product:</strong> ${complaint.productName} x ${complaint.quantity}</p>
      <p><strong>Expected Pickup Date:</strong> ${new Date(pickupDate).toLocaleDateString('en-IN')}</p>
      <p>Please complete the pickup before the scheduled date.</p>
    `,
  });
};

const sendPickupCompletedEmail = async (dealerEmail, adminEmails, complaint) => {
  await sendEmail({
    to: dealerEmail,
    subject: `Product Collected: ${complaint.complaintId}`,
    html: `
      <h2>Product Collected</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p>Your product has been collected by the CFA agent. You can view the pickup proof in the app.</p>
    `,
  });
  await sendEmail({
    to: adminEmails.join(','),
    subject: `Pickup Completed: ${complaint.complaintId}`,
    html: `<p>Pickup completed for complaint ${complaint.complaintId}. View proof in admin panel.</p>`,
  });
};

const sendRefundProcessedEmail = async (dealerEmail, complaint) => {
  await sendEmail({
    to: dealerEmail,
    subject: `Refund Processed: ${complaint.complaintId}`,
    html: `
      <h2>Refund Processed</h2>
      <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
      <p><strong>Refund Amount:</strong> ₹${complaint.refundAmount?.toLocaleString('en-IN')}</p>
      <p><strong>Reference:</strong> ${complaint.refundReference}</p>
      <p><strong>Date:</strong> ${new Date(complaint.refundDate).toLocaleDateString('en-IN')}</p>
    `,
  });
};

const sendWelcomeEmail = async (email, name, role, tempPassword) => {
  await sendEmail({
    to: email,
    subject: 'Welcome to RLTS - Conti Collect',
    html: `
      <h2>Welcome to the Return Logistics Tracking System</h2>
      <p>Hello ${name},</p>
      <p>Your ${role} account has been created.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p>Please change your password after your first login.</p>
    `,
  });
};

module.exports = {
  sendEmail,
  sendComplaintCreatedEmail,
  sendComplaintApprovedEmail,
  sendComplaintRejectedEmail,
  sendCfaAssignedEmail,
  sendPickupCompletedEmail,
  sendRefundProcessedEmail,
  sendWelcomeEmail,
};
