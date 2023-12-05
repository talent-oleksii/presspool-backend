import MailComposer from 'nodemailer/lib/mail-composer';
import { google } from 'googleapis';

import log from './logger';


const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SCRET, 'https://presspool-backend.onrender.com');

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

const generateHTML = (userName: string, payload: any) => {
  const html = `
  <html>
    <head>
      <link href='https://fonts.googleapis.com/css?family=Inter' rel='stylesheet'>
      <style>
        body {
          font-family: 'Inter';
          margin: 0;
        }
      </style>
    </head>

    <body>
      <div style="width: 640px; padding: 30px; height: 1261px;">
        <img src="https://presspool-backend.onrender.com/image?image=logo_black.png" style="width:62px; height: 62px;" alt="logo" />
        <p style="margin-top: 50px; margin-bottom: 0; letter-spacing: -0.72px; font-size: 24px;">Hello ${userName}, 👋</p>
        <h2 style="font-size: 62px; font-weight: 700; letter-spacing: -1.86px; margin-top: 42px; margin-bottom: 0;">
          Welcome to <br />
          Presspool!
        </h2>
        <a href='https://presspool-frontend.onrender.com/#/verify/token=${payload.token}' style="color: #6c63ff; font-size: 20px; text-decoration:underline;">Click here to verify your email</a>
        <p style="margin-top: 54px; margin-bottom: 0; letter-spacing: -0.72px; font-weight: 500; font-size: 24px;">
          We are glad to have you here. <br />To kick things off (if you haven't already):
        </p>
        <p style="font-size: 22px; letter-spacing: -0.66px; margin-bottom: 0;">
          1. Join Our Slack Channel - It's the hub for instant answers, our expert team's insights, and real-time updates.
        </p>
        <p style="font-size: 22px; letter-spacing: -0.66px; margin-top: 32px; margin-bottom: 0;">
          2. Bookmark Your Platform Dashboard - Your one-stop shop to create, track, and manage all campaigns.
        </p>
        <p style="margin-top: 56px; margin-bottom: 0; font-size: 20px; letter-spacing: -0.6px;">Need assistance? Remember,
          we're just a message away.
        </p>
        <div style="flex-direction:column; display:flex; align-items: end; padding-right: 35px; margin-top: 48px;">
          <div style="text-align: left;">
            <img src="https://presspool-backend.onrender.com/image?image=rica.png" />
            <p style="font-size: 20px; letter-spacing: -0.6px; margin-bottom: 0;">Warmly,</p>
            <p style="font-size: 20px; letter-spacing: -0.6px; margin-bottom: 0; font-weight: 600;">Rica</p>
            <p style="margin-top: 62px; letter-spacing: -0.54px; font-size: 18px;">Follow Us on Our Social Media</p>
            <div>
              <a href="https://www.linkedin.com/company/presspoolai" target="_blank"
                style="cursor: pointer; border: 1px solid #b7b7b7; background-color: #f1f1f1; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 24px; width: 40px; height: 40px;">
                <svg width="15" height="22" viewBox="0 0 15 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1.48047 8.79609V13.1104H4.71618V20.6604H9.03047V13.1104H12.2662L13.3448 8.79609H9.03047V6.63895C9.03047 6.3529 9.1441 6.07856 9.34638 5.87629C9.54865 5.67401 9.82299 5.56038 10.109 5.56038H13.3448V1.24609H10.109C8.67877 1.24609 7.30707 1.81427 6.29571 2.82563C5.28436 3.83698 4.71618 5.20868 4.71618 6.63895V8.79609H1.48047Z"
                    stroke="black" stroke-width="2.15714" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
              <a href="https://twitter.com/presspoolai" target="_blank"
                style="cursor: pointer;  border: 1px solid #b7b7b7; background-color: #f1f1f1; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 24px; width: 40px; height: 40px;">
                <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.61328 1.86328L14.2682 19.1204H18.8704L6.21555 1.86328H1.61328Z" stroke="black"
                    stroke-width="2.15714" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M1.61328 19.1204L8.91305 11.8207M11.5663 9.16737L18.8704 1.86328" stroke="black"
                    stroke-width="2.15714" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
              <a href="https://instagram.com/presspoolai" target="_blank"
                style="cursor: pointer; border: 1px solid #b7b7b7; background-color: #f1f1f1; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 24px; width: 40px; height: 40px;">
                <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1.44141 6.17757C1.44141 5.03335 1.89595 3.93599 2.70503 3.12691C3.51412 2.31782 4.61147 1.86328 5.75569 1.86328H14.3843C15.5285 1.86328 16.6258 2.31782 17.4349 3.12691C18.244 3.93599 18.6985 5.03335 18.6985 6.17757V14.8061C18.6985 15.9504 18.244 17.0477 17.4349 17.8568C16.6258 18.6659 15.5285 19.1204 14.3843 19.1204H5.75569C4.61147 19.1204 3.51412 18.6659 2.70503 17.8568C1.89595 17.0477 1.44141 15.9504 1.44141 14.8061V6.17757Z"
                    stroke="black" stroke-width="2.15714" stroke-linecap="round" stroke-linejoin="round" />
                  <path
                    d="M6.83594 10.4916C6.83594 11.3497 7.17684 12.1728 7.78366 12.7796C8.39047 13.3864 9.21349 13.7273 10.0717 13.7273C10.9298 13.7273 11.7528 13.3864 12.3596 12.7796C12.9665 12.1728 13.3074 11.3497 13.3074 10.4916C13.3074 9.63341 12.9665 8.81039 12.3596 8.20358C11.7528 7.59676 10.9298 7.25586 10.0717 7.25586C9.21349 7.25586 8.39047 7.59676 7.78366 8.20358C7.17684 8.81039 6.83594 9.63341 6.83594 10.4916Z"
                    stroke="black" stroke-width="2.15714" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M14.9219 5.63867V5.64867" stroke="black" stroke-width="2.15714" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </a>
            </div>

          </div>
        </div>
      </div>
    </body>

    </html>
  `;

  return html;
};

const sendEmail = async (emailAddress: string, userName: string, payload: any) => {
  try {
    const html = generateHTML(userName, payload);
    const mailComposer = new MailComposer({
      from: 'PressPool Support Team',
      to: emailAddress,
      subject: payload.subject,
      // text: content,
      html,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
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