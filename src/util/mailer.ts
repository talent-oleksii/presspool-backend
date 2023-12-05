import MailComposer from 'nodemailer/lib/mail-composer';
import { google } from 'googleapis';

import log from './logger';


const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SCRET, 'http://localhost:5000');

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  access_token: process.env.GMAIL_ACCESS_TOKEN,
  token_type: process.env.GMAIL_TOKEN_TYPE,
  scope: process.env.GMAIL_SCOPE,
  // expiry_date: process.env.EXPIRY_DATE,
});
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

const fileAttachments = [
  {
    filename: 'attachment1.txt',
    content: 'This is a plain text file sent as an attachment',
  },
  // {
  //   path: path.join(__dirname, './attachment2.txt'),
  // },
  {
    filename: 'websites.pdf',
    path: 'https://www.labnol.org/files/cool-websites.pdf',
  },

  // {
  //   filename: 'image.png',
  //   content: fs.createReadStream(path.join(__dirname, './attach.png')),
  // },
];

const sendEmail = async (emailAddress: string, content: any) => {
  try {
    const mailComposer = new MailComposer({
      from: 'rica@presspool.ai',
      to: emailAddress,
      text: content,
      // html: `<p>🙋🏻‍♀️  &mdash; This is a <b>test email</b> from <a href="https://digitalinspiration.com">Digital Inspiration</a>.</p>`,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Versio', value: 'v1.0.0'
      }]
    });

    const message = await mailComposer.compile().build();
    const raw = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'rica@presspool.ai',
      requestBody: {
        raw,
      }
    });
  } catch (error) {
    log.error(`email seinding error: ${error}`);
  }
};

export default sendEmail;