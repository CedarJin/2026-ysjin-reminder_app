import sendgrid from '@sendgrid/mail';

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

export function createSendGridClient(apiKey: string) {
  sendgrid.setApiKey(apiKey);

  return {
    async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
      try {
        const [response] = await sendgrid.send({
          to: input.to,
          cc: input.cc,
          from: input.from,
          subject: input.subject,
          text: input.body,
          html: input.html || input.body.replace(/\n/g, '<br>\n'),
        });

        return {
          success: true,
          messageId: response.headers['x-message-id'] || undefined,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown SendGrid error';
        return { success: false, error: message };
      }
    },
  };
}

export type SendGridClient = ReturnType<typeof createSendGridClient>;
