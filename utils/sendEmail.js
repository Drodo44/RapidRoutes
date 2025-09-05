// utils/sendEmail.js
import { createTransport } from 'nodemailer';

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendApprovalEmail(userEmail) {
  const message = {
    from: process.env.SMTP_FROM,
    to: userEmail,
    subject: 'RapidRoutes Account Approved',
    html: `
      <div style="background: #0f1115; color: #ffffff; padding: 20px; border-radius: 8px;">
        <img src="${process.env.NEXT_PUBLIC_BASE_URL}/logo.png" alt="RapidRoutes Logo" style="height: 60px; margin-bottom: 20px;">
        <h1 style="color: #60a5fa; margin-bottom: 16px;">Account Approved! 🎉</h1>
        <p style="color: #e5e7eb; margin-bottom: 16px;">
          Your RapidRoutes account has been approved. You can now log in and start managing your freight lanes.
        </p>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" 
           style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          Sign In Now
        </a>
      </div>
    `
  };

  await transporter.sendMail(message);
}

export async function sendRejectionEmail(userEmail, reason = '') {
  const message = {
    from: process.env.SMTP_FROM,
    to: userEmail,
    subject: 'RapidRoutes Account Status Update',
    html: `
      <div style="background: #0f1115; color: #ffffff; padding: 20px; border-radius: 8px;">
        <img src="${process.env.NEXT_PUBLIC_BASE_URL}/logo.png" alt="RapidRoutes Logo" style="height: 60px; margin-bottom: 20px;">
        <h1 style="color: #dc2626; margin-bottom: 16px;">Account Status Update</h1>
        <p style="color: #e5e7eb; margin-bottom: 16px;">
          We regret to inform you that your RapidRoutes account application has been declined.
          ${reason ? `<br><br>Reason: ${reason}` : ''}
        </p>
        <p style="color: #e5e7eb; margin-bottom: 16px;">
          If you believe this is an error, please contact support.
        </p>
      </div>
    `
  };

  await transporter.sendMail(message);
}
