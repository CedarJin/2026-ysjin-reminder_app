import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface SendEmailInput {
  to: string;
  cc?: string | string[];
  from: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export function createSmtpClient(config: SmtpConfig) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return {
    async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
      try {
        const info = await transporter.sendMail({
          from: input.from,
          to: input.to,
          cc: input.cc,
          subject: input.subject,
          text: input.body,
          html: input.html || input.body.replace(/\n/g, '<br>\n'),
        });

        return {
          success: true,
          messageId: info.messageId,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown SMTP error';
        return { success: false, error: message };
      }
    },
  };
}

export type SmtpClient = ReturnType<typeof createSmtpClient>;
