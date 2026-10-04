import Mailgen from 'mailgen';
import nodemailer from 'nodemailer';
import 'dotenv/config';

/* =========================================================
   TRANSPORTER (lazy singleton)
   ---------------------------------------------------------
   Priority:
     1. Generic SMTP_* env vars (any provider — Gmail, Resend,
        Brevo, Mailgun, your company SMTP, etc.)
     2. Ethereal (https://ethereal.email) — zero-config test
        account auto-created on first send. Mail never really
        lands in an inbox; instead a preview URL is logged to
        the console. Perfect for local development.
   ========================================================= */

let cachedTransporter = null;
let usingEthereal = false;

const buildSmtpTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.MAILTRAP_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.MAILTRAP_SMTP_PORT);
  const user = process.env.SMTP_USER || process.env.MAILTRAP_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.MAILTRAP_SMTP_PASS;

  if (host && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port: Number.isFinite(port) && port > 0 ? port : 587,
        secure: port === 465,
        auth: { user, pass },
      }),
      usingEthereal: false,
    };
  }

  // No SMTP configured — fall back to Ethereal (dev-friendly).
  usingEthereal = true;
  return { transporter: null, usingEthereal: true };
};

const getTransporter = async () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const built = buildSmtpTransporter();
  usingEthereal = built.usingEthereal;

  if (built.transporter) {
    cachedTransporter = built.transporter;
    return cachedTransporter;
  }

  // Truly zero-config: nodemailer generates a throwaway Ethereal
  // account on the fly. Mails are previewable via a logged URL.
  const testAccount = await nodemailer.createTestAccount();

  cachedTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log(
    `📧 Dev mail via Ethereal — inbox preview: https://ethereal.email/login | user: ${testAccount.user}`
  );

  return cachedTransporter;
};

/* =========================================================
   SEND EMAIL
   ========================================================= */

const sendEmail = async (options) => {
  const { email, subject, mailgenContent } = options;

  if (!email || !subject || !mailgenContent) {
    throw new Error('Email, subject and mail content are required');
  }

  try {
    const mailGenerator = new Mailgen({
      theme: 'default',
      product: {
        name: 'Project Camp',
        link: process.env.FRONTEND_URL || 'http://localhost:5173',
      },
    });

    const emailText = mailGenerator.generatePlaintext(mailgenContent);
    const emailHtml = mailGenerator.generate(mailgenContent);

    const transporter = await getTransporter();

    const mail = {
      // MAIL_FROM is canonical (documented in .ENV.SAMPLE). EMAIL_FROM is
      // accepted as an alias so older .env files that used that name still
      // resolve instead of silently falling back to the default.
      from:
        process.env.MAIL_FROM ||
        process.env.EMAIL_FROM ||
        'Project Camp <noreply@projectcamp.dev>',
      to: email,
      subject,
      text: emailText,
      html: emailHtml,
    };

    const response = await transporter.sendMail(mail);

    // With Ethereal, surface the browser preview URL so devs can
    // "open" the email without any real inbox.
    if (usingEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(response);
      if (previewUrl) {
        console.log(`📧 Dev mail preview: ${previewUrl}`);
      }
    }

    return response;
  } catch (error) {
    console.error('Email service error:', error);

    throw new Error(error?.message || 'Failed to send email', { cause: error });
  }
};

/* =========================================================
   FORGOT PASSWORD TEMPLATE
   ========================================================= */

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,

      intro: 'We received a request to reset your Project Camp password.',

      action: {
        instructions: 'Click the button below to reset your password:',

        button: {
          color: '#9511A9',
          text: 'Reset Password',
          link: passwordResetUrl,
        },
      },

      outro:
        'If you did not request this, you can safely ignore this email. The link expires in 20 minutes.',
    },
  };
};

/* =========================================================
   EMAIL VERIFICATION OTP TEMPLATE
   ========================================================= */

const emailVerificationOtpMailgenContent = (username, otp, verifyUrl) => {
  return {
    body: {
      name: username,

      intro:
        'Thanks for signing up for Project Camp. Use the code below to verify your email address.',

      action: {
        instructions: `Your verification code is: ${otp}`,

        button: {
          color: '#9511A9',
          text: otp,
          link: verifyUrl,
        },
      },

      outro:
        'The code expires in 10 minutes and can only be used once. If you did not create an account, you can safely ignore this email.',
    },
  };
};

export { sendEmail, forgotPasswordMailgenContent, emailVerificationOtpMailgenContent };
