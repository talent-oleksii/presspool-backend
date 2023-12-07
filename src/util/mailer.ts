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

const generateWelcomeHTML = (userName: string, payload: any) => {
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
  <div style="width: 640px; padding: 39px 30px; position: relative; background-image: url('https://presspool-images.s3.amazonaws.com/welcome_email_white_back.png');
    background-size: cover; background-repeat: no-repeat;">

    <img src="https://presspool-images.s3.amazonaws.com/logo_black_small.png" style="width:62px; height: 62px;"
      alt="logo" />
    <p style="margin-top: 50px; margin-bottom: 0; letter-spacing: -0.72px; font-size: 24px;">Hello ${userName}, 👋</p>
    <h2 style="font-size: 62px; font-weight: 700; letter-spacing: -1.86px; margin-top: 42px; margin-bottom: 0;">
      Welcome to <br />
      Presspool!
    </h2>
    <a href='https://presspool-frontend.onrender.com/#/verify/${payload.token}'
      style="color: #6c63ff; font-size: 20px; text-decoration:underline;">Click here to verify your email</a>
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
    <div style="padding-right: 35px; margin-top: 48px; text-align: right;">
      <div style="display: inline-flex;">
        <div style="text-align: left;">
          <img src="https://presspool-images.s3.amazonaws.com/rica.png" />
          <p style="font-size: 20px; letter-spacing: -0.6px; margin-bottom: 0;">Warmly,</p>
          <p style="font-size: 20px; letter-spacing: -0.6px; margin-bottom: 0; font-weight: 600;">Rica</p>
          <p style="margin-top: 62px; letter-spacing: -0.54px; font-size: 18px;">Follow Us on Our Social Media</p>
          <div>
            <a href="https://www.linkedin.com/company/presspoolai" target="_blank"
              style="cursor: pointer; margin-right: 24px; width: 0; color: white;">
              <img src="https://presspool-images.s3.amazonaws.com/facebook.png" alt="facebook" />
            </a>
            <a href="https://twitter.com/presspoolai" target="_blank"
              style="cursor: pointer; margin-right: 24px; width: 0; color: white;">
              <img src="https://presspool-images.s3.amazonaws.com/twitter.png" alt="twitter" />
            </a>
            <a href="https://instagram.com/presspoolai" target="_blank"
              style="cursor: pointer; margin-right: 24px; width: 0; color: white;">
              <img src="https://presspool-images.s3.amazonaws.com/instagram.png" alt="instagram" />
            </a>
          </div>

        </div>
      </div>
    </div>
  </div>
</body>

</html>
  `;

  return html;
};

const sendWelcomeEmail = async (emailAddress: string, userName: string, payload: any) => {
  try {
    const html = generateWelcomeHTML(userName, payload);
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
    const raw = Buffer.from(message).toString('base64');

    await gmail.users.messages.send({
      userId: 'rica@presspool.ai',
      requestBody: {
        raw,
      }
    });
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendTutorialEmail = async (emailAddress: string, userName: string) => {
  try {
    const html = `
      <p>Dear ${userName}</p>
      <p>You have not created any campaign yet. I will try to explain how to create a new campaign.</p>
    `;
    const mailComposer = new MailComposer({
      from: 'PressPool Support Team',
      to: emailAddress,
      subject: 'Tutorial',
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
    const raw = Buffer.from(message).toString('base64');

    await gmail.users.messages.send({
      userId: 'rica@presspool.ai',
      requestBody: {
        raw,
      }
    });
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendPublishEmail = async (emailAddress: string, campaignName: string) => {
  try {
    const html = `
      <p>You have successfully launched a campaign: ${campaignName}</p>
    `;
    const mailComposer = new MailComposer({
      from: 'PressPool Support Team',
      to: emailAddress,
      subject: 'Published Campaign',
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
    const raw = Buffer.from(message).toString('base64');

    await gmail.users.messages.send({
      userId: 'rica@presspool.ai',
      requestBody: {
        raw,
      }
    });
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendBudgetIncreaseEmail = async (emailAddress: string, campaignName: string) => {
  try {
    const html = `
      <p>You campaign: ${campaignName} has reached the budget and now it has paused, Please Increase your budget</p>
    `;
    const mailComposer = new MailComposer({
      from: 'PressPool Support Team',
      to: emailAddress,
      subject: 'Your Campaign Budget has reached an end',
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
    const raw = Buffer.from(message).toString('base64');

    await gmail.users.messages.send({
      userId: 'rica@presspool.ai',
      requestBody: {
        raw,
      }
    });
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};


const sendBudgetReachEmail = async (emailAddress: string, campaignName: string, percentage: string) => {
  try {
    const html = `
      <p>You campaign: ${campaignName} has reached ${percentage} of the the total budget</p>
    `;
    const mailComposer = new MailComposer({
      from: 'PressPool Support Team',
      to: emailAddress,
      subject: `Campaign Budget reached ${percentage}`,
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
    const raw = Buffer.from(message).toString('base64');

    await gmail.users.messages.send({
      userId: 'rica@presspool.ai',
      requestBody: {
        raw,
      }
    });
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const mailer = {
  sendWelcomeEmail,
  sendTutorialEmail,
  sendPublishEmail,
  sendBudgetIncreaseEmail,
  sendBudgetReachEmail,
}

export default mailer;