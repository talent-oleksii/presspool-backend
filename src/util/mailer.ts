import MailComposer from 'nodemailer/lib/mail-composer';
import { google } from 'googleapis';

import log from './logger';


const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SCRET, 'https://presspool-backend.onrender.com');

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  access_token: process.env.GMAIL_ACCESS_TOKEN,
  token_type: process.env.GMAIL_TOKEN_TYPE,
  scope: process.env.GMAIL_SCOPE,
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

const sendEmail = async (mailComposer: MailComposer) => {
  const message = await mailComposer.compile().build();
  const raw = Buffer.from(message).toString('base64');

  await gmail.users.messages.send({
    userId: 'rica@presspool.ai',
    requestBody: {
      raw,
    }
  });
};

const sendWelcomeEmail = async (emailAddress: string, userName: string, payload: any) => {
  try {
    const firstName = userName.split(' ')[0];
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: emailAddress,
      subject: `Welcome Aboard, ${firstName}! Let's Drive In 🚀`,
      // text: content,
      html: `
      <p>Hello ${firstName}</p>
      <p>Welcome to Presspool!</p>
      <pThrilled to have you at PressPool! Ready to get started? Your personalized campaign management platform awaits.</p>
      <a href='https://go.presspool.ai/verify/${payload.token}'
      style="color: #6c63ff; text-decoration:underline;" target="_blank">Click here to activate your account</a>
      <p>If you need any support or have questions, reach out anytime.</p>
      <p style="margin-top: 15px;">Warmly,<p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendForgotPasswordEmail = async (emailAddress: string, code: string, userName: string) => {
  const mailComposer = new MailComposer({
    from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
    to: emailAddress,
    subject: 'Important: Reset your password',
    // text: content,
    html: `
    <p>Hey ${userName}</p>
    <p>Here is your code to reset your password:</p>
    <p>${code}</p>
    <p style="margin-top: 30px;">Best,</p>
    <p>Rica</p>
    `,
    // attachments: fileAttachments,
    textEncoding: 'base64',
    headers: [{
      key: 'X-Application-Developer', value: 'Oleksii Karavanov'
    }, {
      key: 'X-Application-Version', value: 'v1.0.0'
    }]
  });

  await sendEmail(mailComposer);
};

const sendTutorialEmail = async (emailAddress: string, userName: string) => {
  try {
    const firstName = userName.split(' ')[0];
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: emailAddress,
      subject: `Hey ${firstName}, ready to start your campaign?`,
      // text: content,
      html: `
      <div>Hello ${firstName}, <br/>

      Ready to kickstart your campaign on the Presspool portal? Whether you're aiming to boost brand visibility, engage with your audience, or announce a groundbreaking product, Presspool provides the ideal platform to make your campaign a success. <br/>
      
      <div style="font-weight: 700; margin-top:20px;">Step 1: Login to Your Presspool Account</div>
      Visit <a href="https://go.presspool.ai" target="_blank"">Presspool Portal URL</a> and log in to your account using your credentials. <br/>
      
      <div style="font-weight: 700; margin-top: 10px;">Step 2: Navigate to the Campaign Section</div>
      Once logged in, locate the "Campaigns" section on the dashboard. This is where you can initiate and manage all your campaigns. <br/>
      
      <div style="font-weight: 700; margin-top: 10px;">Step 3: Create a New Campaign</div>
      Click on the "Create New Campaign" button. This will prompt you to fill in essential details such as campaign title, objective, and target audience. Make sure to provide clear and concise information to attract the right attention.<br/>
      
      <div style="font-weight: 700; margin-top: 10px;">Step 4: Craft Your Campaign Content</div>
      Compose a compelling campaign message and attach your campaign hero image. We recommend a high resolution logo or an image that encapsulates your brand to make your campaign visually appealing.<br/>
      
      <div style="font-weight: 700; margin-top: 10px;">Step 5: Set Campaign Parameters</div>
      Specify the duration, geographical reach, and other relevant parameters for your campaign. This ensures that your message reaches the intended audience at the right time and place.<br/>
      
      <div style="font-weight: 700; margin-top: 10px;">Step 6: Review and Confirm</div>
      Take a moment to review all the information you've entered. Once satisfied, click on the "Submit" button to initiate your campaign.
      
      
      <div style="margin-top:30px;">If you have any further questions, we’re here to assist you. </div>
      
      <div style="margin-top:15px;">Warmly, </div>
      Rica
      </div>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendPublishEmail = async (emailAddress: string, userName: string, campaignName: string) => {
  try {
    // const firstName = userName.split(' ')[0];
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: emailAddress,
      subject: `Your Campaign "${campaignName}" is Under Review`,
      // text: content,
      html: `
      <p>Hi ${userName},</p>
      <p style="margin-top: 15px;">Just a heads-up: your campaign "${campaignName}" is now in review. We'll give it a quick check and get it live within 24-48 hours.</p>
      <p style="margin-top: 15px;">Got any questions or need to make changes? Just hit reply or head to your dashboard.</p>
      <p style="margin-top: 15px;">We'll be in touch soon!</p>
      <p style="margin-top: 15px;">Cheers,</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendBudgetIncreaseEmail = async (emailAddress: string, campaignName: string, budget: string, userName: string) => {
  try {
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: emailAddress,
      subject: 'Your Campaign Budget Has Been Fully Utilized',
      // text: content,
      html: `
      <p>Hey ${userName}</p>
      <p style="margin-top: 15px">Your campaign on Presspool has reached its allocated budget limit and is now complete</p>
      <p style="margin-top: 30px">Campaign Name: ${campaignName}</p>
      <p>Budget: $${budget}</p>
      <p>Status: Budget consumed</p>
      <p style="margin-top: 30px;">If you have additional messages or would like to explore further opportunities, please don't hesitate to get in touch. Our team is available to discuss options for extending your campaign or planning future initiatives.</p>
      <p style="margin-top: 15px;">In the meantime, if you wish to increase the budget of your campaign,simply:</p>
      <p style="margin-left: 20px;">1. <a href="https://go.presspool.ai/campaign/all">Go to your campaigns</a></p>
      <p style="margin-left: 20px;">2. Edit your campaign’s budget by increasing the amount; and</p>
      <p style="margin-left: 20px;">3. Click submit to save</p>
      <p style="margin-top: 30px;">Warmly,</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};


const sendBudgetReachEmail = async (emailAddress: string, campaignName: string, percentage: string, userName: string) => {
  try {
    // const html = `
    //   <p>You campaign: ${campaignName} has reached ${percentage} of the the total budget</p>
    // `;
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: emailAddress,
      subject: `Your Campaign ${campaignName} Budget is ${percentage}% Consumed`,
      // text: content,
      html: `
      <p>Hey ${userName},</p>
      <p style="margin-top: 15px;">We wanted to bring to your attention that your current campaign on Presspool has reached the halfway point of its allocated budget. As of now, ${percentage} of your budget has been consumed.</p>
      <p style="margin-top: 15px;">Keeping you informed about your campaign's progress is essential to ensure its success.</p>
      <p>If you wish to incrase your budget, simply:</p>
      <p style="margin-left: 20px;">1. <a href="https://go.presspool.ai/campaign/all">Go to your campaigns</a></p>
      <p style="margin-left: 20px;">2. Edit your campaign’s budget by increasing the amount; and</p>
      <p style="margin-left: 20px;">3. Click submit to save.</p>
      <p style="margin-top: 15px;">If you have any questions or would like to discuss optimizing your remaining budget for maximum impact, please feel free to reach out!</p>
      <p style="margin-top: 20px;">Warmly,</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendPurchaseEmail = async (emailAddress: string, userName: string, description: string) => {
  try {
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: emailAddress,
      subject: `${description} Weekly Reporting is Available - Stay Informed!`,
      // text: content,
      html: `
      <p>Hey ${userName}</p>
      <p style="margin-top: 15px;">Happy Friday! We hope this message finds you well. We're excited to share that our latest weekly report is now available.</p> 
      <p style="margin-top: 15px; font-weight: 700;">How to Access the Report:</p>
      <p>Simply go to your dashboard to review your live reporting data: <a href="https://go.presspool.ai/campaign/all" target="_blank">To your dashboard</a></p>
      <p style="margin-top: 15px; font-weight: 700;">Your Feedback Matters:</p>
      <p>We value your feedback! If you have any questions, suggestions, or topics you'd like us to cover in future reports, please don't hesitate to reach out or <a href="https://forms.gle/XYZbSEzVwUf4dAam8" target="_blank">submit here.</a></p>
      <p style="margin-top: 15px;">We appreciate your continued partnership and look forward to keeping you informed.</p>
      <p style="margin-top: 15px;">Note: We continually optimize your campaigns as our system continues to learn from the campaign data, so expect better and better results as time goes on.</p>
      <p style="margin-top: 15px;">Have a fantastic weekend!</p>
      <p style="margin-top: 15px;">Warmly,</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`email seinding error: ${error}`);
  }
};

const sendAddTemmateEmail = async (ownerName: string, companyName: string, email: string) => {
  try {
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: email,
      subject: `${ownerName} invited you to join the ${companyName} team`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">${ownerName} invited you to join the ${companyName} team on Presspool.ai Platform</p>
      <a style="margin-top: 15px;" href="https://go.presspool.ai" target="_blank">Join Presspool</a>
      <p style="margin-top: 20px;">Warmly,</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send add teammate dialog error: ${error}`);
  }
};

// (Math.round((req.body.currentPrice / ((4 * (1 + 0.10)) / (1 - 0.50))) * 4) - 2).toString(),
const sendSuperAdminNotificationEmail = async (email: string, adminName: string, campaignName: string, company: string, userName: string, price: string, uid: string, heroImage: string, additional: Array<string>) => {
  console.log('send super admin notification emails');
  try {
    let additionalFiles = '';
    for (const fileName of additional) {
      const parts = fileName.split('/');
      additionalFiles += `<p><a href="${fileName}" download="${parts[parts.length - 1]}">${parts[parts.length - 1]}</a></p>`;
    }
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: email,
      subject: `Review Needed: ${userName}'s "${campaignName}" Submitted`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">Hi ${adminName}</p>
      <p>${userName}'s "${campaignName}" has been submitted for review. Expected turnaround is 24-48 hours. Please be ready for any client queries or changes.</p>
      <p>Company: ${company}</p>
      <p>Our Tracking url: https://track.presspool.ai/${uid} </p>
      <p>Beehiiv Budget: ${(Math.round((Number(price) / ((4 * (1 + 0.10)) / (1 - 0.50))) * 4) - 2).toString()}</p>
      <div>
        <p>Hero Image:</p>
        <p><a href="${heroImage}" download="hero-image.png">Hero Image</a></p>
        <p>Additional Files:</p>
        ${additionalFiles}
      </div>
      <p>Thanks,</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send admin notification email error: ${error}`);
  }
};

const sendAdminNotificationEmail = async (email: string, adminName: string, campaignName: string, company: string, userName: string, price: string, uid: string) => {
  console.log('send admin notification emails');
  try {
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: email,
      subject: `Review Needed: ${userName}'s "${campaignName}" Submitted`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">Hi ${adminName}</p>
      <p>${userName}'s "${campaignName}" has been submitted for review. Expected turnaround is 24-48 hours. Please be ready for any client queries or changes.</p>
      <p>Thanks,</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send admin notification email error: ${error}`);
  }
};

const sendInviteEmail = async (adminName: string, email: string, link: string) => {
  console.log('send invite emails');
  try {
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: email,
      subject: `Exclusive Invitation to Join PressPool!`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">${adminName} has invited you to PressPool, where AI meets precision marketing. </p>
      <p>Join us for targeted audience reach and campaign success.</p>
      <p>Click <a href='${link}' target='_blank'>here</a> to get started!</p>
      <p>Cheers</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send invite email error: ${error}`);
  }
};

const sendInviteAccountManagerEmail = async (email: string) => {
  console.log('send invite account maanger emails');
  try {
    const mailComposer = new MailComposer({
      from: 'Rica Mae-PressPool Support Team<rica@presspool.ai>',
      to: email,
      subject: `Welcome Aboard, Let's Dive In 🚀`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">Hi Welcome to Presspool! </p>
      <p>Your dashboard is all set up - you're ready to track campaigns, manage clients, and grow our network</p>
      <p>To drive in, simply use this link to set your password and unlock your Account Manager portal: <a href='https://go.presspool.ai/admin/signup'
      style="color: #6c63ff; text-decoration:underline;" target="_blank">Presspool Admin Portal</a></p>
      <p>Lets get started!</p>
      <p>Cheers,</p>
      <p>Rica</p>
      `,
      // attachments: fileAttachments,
      textEncoding: 'base64',
      headers: [{
        key: 'X-Application-Developer', value: 'Oleksii Karavanov'
      }, {
        key: 'X-Application-Version', value: 'v1.0.0'
      }]
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send invite email error: ${error}`);
  }
};

const mailer = {
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendTutorialEmail,
  sendPublishEmail,
  sendBudgetIncreaseEmail,
  sendBudgetReachEmail,
  sendPurchaseEmail,
  sendAddTemmateEmail,

  sendAdminNotificationEmail,
  sendSuperAdminNotificationEmail,

  sendInviteEmail,
  sendInviteAccountManagerEmail,
}

export default mailer;