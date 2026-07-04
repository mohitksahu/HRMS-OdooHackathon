const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"HRMS System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('Email send failed:', error.message);
    // Don't throw - email failure shouldn't break the flow
  }
};

const sendWelcomeEmail = async (email, loginId, password, name) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
      <h2 style="color: #2563eb;">Welcome to HRMS!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your account has been created successfully. Here are your login credentials:</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Login ID:</strong> ${loginId}</p>
        <p><strong>Password:</strong> ${password}</p>
      </div>
      <p style="color: #ef4444;"><strong>Important:</strong> Please change your password after first login.</p>
      <p>Login at: <a href="${process.env.CLIENT_URL}">${process.env.CLIENT_URL}</a></p>
      <hr style="margin: 20px 0;">
      <p style="color: #6b7280; font-size: 12px;">This is an automated message from HRMS.</p>
    </div>
  `;
  
  await sendEmail({ to: email, subject: 'Welcome to HRMS - Your Login Credentials', html });
};

const sendLeaveStatusEmail = async (email, name, status, leaveType, startDate, endDate) => {
  const statusColor = status === 'approved' ? '#10b981' : '#ef4444';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
      <h2 style="color: #2563eb;">Leave Request Update</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your leave request has been <span style="color: ${statusColor}; font-weight: bold;">${status.toUpperCase()}</span>.</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Leave Type:</strong> ${leaveType}</p>
        <p><strong>From:</strong> ${new Date(startDate).toLocaleDateString()}</p>
        <p><strong>To:</strong> ${new Date(endDate).toLocaleDateString()}</p>
      </div>
    </div>
  `;
  
  await sendEmail({ to: email, subject: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`, html });
};

module.exports = { sendEmail, sendWelcomeEmail, sendLeaveStatusEmail };