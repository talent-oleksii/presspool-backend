import MailComposer from "nodemailer/lib/mail-composer";
import { google } from "googleapis";

import log from "./logger";
import { sign } from "jsonwebtoken";

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SCRET,
  "https://presspool-backend.onrender.com"
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
});

const generateToken = async () => {
  const code =
    "4/0AeaYSHD-ZAzAfMypnHQXlgIpziMq9QRMOkAO5ELJ1dCXn3_VDN9Ni2lHW64FsOx1nedZIQ";
  const token = await oAuth2Client.getToken(code);
  console.log("token:", token);
};

const showUrl = () => {
  console.log("url:", authUrl);
};

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  access_token: process.env.GMAIL_ACCESS_TOKEN,
  token_type: process.env.GMAIL_TOKEN_TYPE,
  scope: process.env.GMAIL_SCOPE,
});
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

const fileAttachments = [
  {
    filename: "attachment1.txt",
    content: "This is a plain text file sent as an attachment",
  },
  // {
  //   path: path.join(__dirname, './attachment2.txt'),
  // },
  {
    filename: "websites.pdf",
    path: "https://www.labnol.org/files/cool-websites.pdf",
  },

  // {
  //   filename: 'image.png',
  //   content: fs.createReadStream(path.join(__dirname, './attach.png')),
  // },
];

const sendEmail = async (mailComposer: MailComposer) => {
  const message = await mailComposer.compile().build();
  const raw = Buffer.from(message).toString("base64");

  await gmail.users.messages.send({
    userId: "zoe@presspool.ai",
    requestBody: {
      raw,
    },
  });
};

const sendWelcomeEmail = async (
  emailAddress: string,
  userName: string,
  payload: any
) => {
  try {
    const firstName = userName.split(" ")[0];
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: emailAddress,
      subject: `Welcome Aboard, ${firstName}! Let's Dive In 🚀`,
      // text: content,
      html: `
      <p>Hey ${firstName}!</p>
      <p>We are thrilled to have you at PressPool! Ready to get started? Your personalized campaign management platform awaits.</p>
      <p> <a href='https://go.presspool.ai/verify/${payload.token}' style="color: #6c63ff; text-decoration:underline;" target="_blank">Click here</a> to activate your account: .</p>
      <p>If you need any support or have questions, join our <a href='https://join.slack.com/t/presspoolsupport/shared_invite/zt-1ytywzzld-974gUfTB8zCYlP4~f5XT1Q' style="color: #6c63ff; text-decoration:underline;" target="_blank">slack support here</a>.</p>
      <p style="margin:0px">Cheers!<p>
      <p style="margin:0px">Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendForgotPasswordEmail = async (
  emailAddress: string,
  code: string,
  userName: string
) => {
  const mailComposer = new MailComposer({
    from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
    to: emailAddress,
    subject: "Important: Your password reset code",
    // text: content,
    html: `
    <p>Hey ${userName}</p>
    <p>Here is your code to reset your password:</p>
    <p>${code}</p>
    <p style="margin:0px">Best,</p>
    <p style="margin:0px">Zoe</p>
    `,
    // attachments: fileAttachments,
    textEncoding: "base64",
    headers: [
      {
        key: "X-Application-Developer",
        value: "Oleksii Karavanov",
      },
      {
        key: "X-Application-Version",
        value: "v1.0.0",
      },
    ],
  });

  await sendEmail(mailComposer);
};

const sendTutorialEmail = async (emailAddress: string, userName: string) => {
  try {
    const firstName = userName.split(" ")[0];
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: emailAddress,
      subject: `Hey ${firstName}, ready to start your campaign?`,
      // text: content,
      html: `
      <p>Hey ${firstName}, </p>
      <p>Ready to kickstart your campaign on the Presspool platform? We’re ready to refer your solution to a highly targeted and engaged audience, all we need is your first campaign submission.</p>
      <p>Here’s how to get the ball rolling:</p>
      <p style="font-weight: 700; margin-top:20px;">Step 1: Login to Your Presspool Account</p>
      <p>Visit <a href="https://go.presspool.ai" target="_blank"">Presspool Portal URL</a> and log in to your account using your credentials.</p>
      <p style="font-weight: 700; margin-top: 10px;">Step 2: Click the ‘Create New Campaign’ Button</p>
      <p style="margin:0px">Once logged in, locate and click the "Create New Campaign" button on the top left of your screen. This will prompt you to fill in essential details such as the campaign title, copy, budget, and target audience.</p>
      
      <p style="font-weight: 700; margin-top: 10px;">Step 3: Get On-Demand Expert Support</p>
      <p>Second guessing your campaign details? Get expert content support from our VP of Content Ray by booking a <a href="https://calendly.com/ray-content-support/content-consultation" target="_blank">complimentary consultation here</a> Our goal is for you to be 100% comfortable and confident in your campaign before launch.</p>
      <p style="font-weight: 700; margin-top: 10px;">Step 4: Add Billing, Review and Confirm</p>
      <p>Add your billing information via our secure Stripe integration and then take a moment to review all the campaign information you entered. Once satisfied, click on the "Submit" button to initiate your campaign. Our software will then immediately begin sourcing the highest quality audience while you sit back and watch the warm leads roll in!</p>
            
      <p>We’re so excited to get you started and to grow together! We value win-win partnerships and can’t wait to grow with you. If you need anything else, reach out directly or be sure to <a href="https://join.slack.com/t/presspoolsupport/shared_invite/zt-1ytywzzld-974gUfTB8zCYlP4~f5XT1Q" target="_blank">join us on Slack</a> for 1:1 support.</p>
      
      <p style="margin: 0px">Warmly,</p>
      <p style="margin: 0px">Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendPublishEmail = async (
  emailAddress: string,
  userName: string,
  campaignName: string
) => {
  try {
    // const firstName = userName.split(' ')[0];
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: emailAddress,
      subject: `Congrats! Your Campaign "${campaignName}" has been submitted!`,
      // text: content,
      html: `
      <p>Hi ${userName},</p>
      <p>Congratulations! Your campaign "${campaignName}"has successfully been submitted and is now in review. Our system is currently reviewing the details and matching it with the highest quality audience.</p>
      <p>You should start to see traction within the next 2-5 business days, so keep an eye on your dashboard to track clicks and campaign performance in real-time.</p>
      <p>We’ll be sure to update you with anything else either via email or Slack.</p>
      <p>Cheers,</p>
      <p>Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendBudgetIncreaseEmail = async (
  emailAddress: string,
  campaignName: string,
  budget: string,
  userName: string
) => {
  try {
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: emailAddress,
      subject: "Your Campaign Budget Has Been Fully Utilized",
      // text: content,
      html: `
      <p>Hey ${userName}</p>
      <p>Your campaign has reached its allocated budget limit and is now complete.</p>
      <p><span style="font-weight:700">Campaign Name</span>: ${campaignName}</p>
      <p><span style="font-weight:700">Budget</span>: $${budget}</p>
      <p><span style="font-weight:700">Status</span>: Budget consumed</p>
      <p>Our team is ready and available to discuss options for extending your campaign or planning future initiatives. Please reach out here or Slack and we can schedule a call to review and discuss.</p>
      <p>In the meantime, if you wish to increase the budget of your campaign, simply:</p>
      <p style="font-weight:700; margin-left: 20px; margin-top:0px; margin-bottom: 0px;">1. Go to your ‘Campaigns’ tab</a></p>
      <p style="font-weight:700; margin-left: 20px; margin-top:0px; margin-bottom: 0px;">2. Edit your campaign’s budget by increasing the amount</p>
      <p style="font-weight:700; margin-left: 20px; margin-top:0px; margin-bottom: 0px;">3. Click submit to save</p>
      <p>You can also easily create a new campaign using the same process you used to create this campaign!</p>
      <p style="margin: 0px">Warmly,</p>
      <p style="margin: 0px">Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendBudgetReachEmail = async (
  emailAddress: string,
  campaignName: string,
  percentage: string,
  userName: string
) => {
  try {
    // const html = `
    //   <p>You campaign: ${campaignName} has reached ${percentage} of the the total budget</p>
    // `;
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: emailAddress,
      subject: `Your Campaign ${campaignName} Budget is ${percentage}% Utilized`,
      // text: content,
      html: `
      <p>Hey ${userName},</p>
      <p>We wanted to bring to your attention that your current campaign on Presspool has reached ${percentage}% of your allotted budget.</p>
      <p>Keeping you informed about your campaign's progress is essential to ensure its success. If you wish to increase your budget, simply:</p>
      <p style="font-weight:700; margin-left: 20px; margin-top:0px; margin-bottom: 0px;">1. <a href="https://go.presspool.ai/campaign/all">Go to your campaigns</a></p>
      <p style="font-weight:700; margin-left: 20px; margin-top:0px; margin-bottom: 0px;">2. Edit your campaign’s budget by increasing the amount; and</p>
      <p style="font-weight:700; margin-left: 20px; margin-top:0px; margin-bottom: 0px;">3. Click submit to save.</p>
      <p>If you have any questions or would like to discuss optimizing your remaining budget for maximum impact, please feel free to reach out!</p>
      <p style="margin:0px">Warmly,</p>
      <p style="margin:0px">Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendPurchaseEmail = async (
  emailAddress: string,
  userName: string,
  data: Array<any>
) => {
  try {
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: emailAddress,
      subject: `Your Weekly Campaign Performance Snapshot`,
      // text: content,
      html: `
        <div style="background: black; padding: 20px; text-align: center;">
          <div style="background: #fffdfd; padding: 20px; border-radius: 10px; text-align: left">
            <div style="text-align:center; width:'100%'; border-bottom: 1px solid rgba(0,0,0,0.12); padding-bottom: 15px;">
              <img src="https://presspool-upload-images.s3.amazonaws.com/pp+full+transparent.png" width="115px"  />
            </div>
            <div style="border-bottom: 1px solid rgba(0,0,0,0.12); padding: 10px 0px;">
              <p>Hey ${userName}</p>
              <p>Hope you've had a productive week! Here's a quick look at how your campaign(s) performed over the last seven days. </p> 
              <p>You can also view live analytics in your <a  href="https://go.presspool.ai" target="_blank">dashboard</a> for the most up-to-date metrics.</p>
            </div>
            ${data
          .map((item) => {
            return `
                        <div style="border-bottom: 1px solid rgba(0, 0, 0, 0.12);padding: 20px 0px;">
                        <p style="font-weight: 700; letter-spacing: -0.42px; font-size: 14px; margin-top: 0px;">${item.name
              }</p>
                        <div>
                          <table
                            bgcolor="#ffffff"
                            cellspacing="0"
                            border="0"
                            style="width: 100%; text-align: left; background-color: #ffffff"
                          >
                            <tr>
                              <table cellpadding="10px">
                                <td colspan="1" style="padding-left: 0;">
                                  <div style="text-align: left">
                                    <div
                                      style="
                                        padding: 15px;
                                        border-radius: 8px;
                                        border: 2px solid #ddad32;
                                        min-width: 170px;
                                        max-width: 170px;
                                      "
                                    >
                                    <p style="font-size: 16px; letter-spacing: -0.48px; font-weight: 500; color: #172935; margin: 0px;">Verified Clicks</p>
                                    <p style="font-size: 25px; letter-spacing: -0.75px; font-weight: 600; margin: 0px;">${item.verifiedClick
              }</p>
                                    <div style="display: flex; margin-top: 10px; align-items: center; font-size: 13px;">
                                      ${item.upVerifiedClick >= 0
                ? '<span style="border-radius: 50px; background: #7ffbae; padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">+</span>Up'
                : '<span style="border-radius: 50px; background: #FF4D42;  padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">-</span>Down'
              }
                                      <span style="color: #172935; font-size: 13px; letter-spacing: -0.3px; font-weight: 500; margin-left: 3px;">${Math.abs(
                item.upVerifiedClick
              )}% from last week</span>
                                    </div>
                                    </div>
                                  </div>
                                </td>
                                <td colspan="1">
                                  <div style="text-align: left">
                                    <div
                                      style="
                                        padding: 15px;
                                        border-radius: 8px;
                                        border: 2px solid #7ffbae;
                                        min-width: 170px;
                                        max-width: 170px;
                                      "
                                    >
                                    <p style="font-size: 16px; letter-spacing: -0.48px; font-weight: 500; color: #172935; margin: 0px;">Total Clicks</p>
                                    <p style="font-size: 25px; letter-spacing: -0.75px; font-weight: 600; margin: 0px;">${item.totalClick
              }</p>
                                    <div style="display: flex; margin-top: 10px; align-items: center; font-size: 13px;">
                                      ${item.upTotalClick >= 0
                ? '<span style="border-radius: 50px; background: #7ffbae; padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">+</span>Up'
                : '<span style="border-radius: 50px; background: #FF4D42; padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">-</span>Down'
              }
                                      <span style="color: #172935; font-size: 13px; letter-spacing: -0.3px; font-weight: 500; margin-left: 3px;">${Math.abs(
                item.upTotalClick
              )}% from last week</span>
                                    </div>
                                    </div>
                                  </div>
                                </td>
                                <td colspan="1">
                                  <div style="text-align: left">
                                    <div
                                      style="
                                        padding: 15px;
                                        border-radius: 8px;
                                        border: 2px solid #7ffbae;
                                        min-width: 170px;
                                        max-width: 170px;
                                      "
                                    >
                                    <p style="font-size: 16px; letter-spacing: -0.48px; font-weight: 500; color: #172935; margin: 0px;">Unique Clicks</p>
                                    <p style="font-size: 25px; letter-spacing: -0.75px; font-weight: 600; margin: 0px;">${item.uniqueClick
              }</p>
                                    <div style="display: flex; margin-top: 10px; align-items: center; font-size: 13px;">
                                      ${item.upUniqueClick >= 0
                ? '<span style="border-radius: 50px; background: #7ffbae; padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">+</span>Up'
                : '<span style="border-radius: 50px; background: #FF4D42;  padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">-</span>Down'
              }
                                      <span style="color: #172935; font-size: 13px; letter-spacing: -0.3px; font-weight: 500; margin-left: 3px;">${Math.abs(
                item.upUniqueClick
              )}% from last week</span>
                                    </div>
                                    </div>
                                  </div>
                                </td>
                              </table>
                            </tr>
                            <tr>
                              <table cellpadding="10px">
                                <td colspan="1" style="padding-left: 0;">
                                  <div style="text-align: left">
                                    <div
                                      style="
                                        padding: 15px;
                                        border-radius: 8px;
                                        border: 2px solid #7ffbae;
                                        min-width: 170px;
                                        max-width: 170px;
                                      "
                                    >
                                    <p style="font-size: 16px; letter-spacing: -0.48px; font-weight: 500; color: #172935; margin: 0px;">Total Spend</p>
                                    <p style="font-size: 25px; letter-spacing: -0.75px; font-weight: 600; margin: 0px;">${`$${item.totalSpent}`}</p>
                                    <div style="display: flex; margin-top: 10px; align-items: center; font-size: 13px;">
                                      ${item.upTotalSpent >= 0
                ? '<span style="border-radius: 50px; background: #7ffbae; padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">+</span>Up'
                : '<span style="border-radius: 50px; background: #FF4D42; padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">-</span>Down'
              }
                                      <span style="color: #172935; font-size: 13px; letter-spacing: -0.3px; font-weight: 500; margin-left: 3px;">${Math.abs(
                item.upTotalSpent
              )}% from last week</span>
                                    </div>
                                    </div>
                                  </div>
                                </td>
                                <td colspan="1">
                                  <div style="text-align: left">
                                    <div
                                      style="
                                        padding: 15px;
                                        border-radius: 8px;
                                        border: 2px solid #7ffbae;
                                        min-width: 170px;
                                        max-width: 170px;
                                      "
                                    >
                                    <p style="font-size: 16px; letter-spacing: -0.48px; font-weight: 500; color: #172935; margin: 0px;">AVG CPC</p>
                                    <p style="font-size: 25px; letter-spacing: -0.75px; font-weight: 600; margin: 0px;">${item.avgCPC
              }</p>
                                    <div style="display: flex; margin-top: 10px; align-items: center; font-size: 13px;">
                                      ${item.upAvgCPC >= 0
                ? '<span style="border-radius: 50px; background: #7ffbae; padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">+</span>Up '
                : '<span style="border-radius: 50px; background: #FF4D42; padding: 0px; text-align: center; width: 20px; height: 20px; color: white; margin-right: 2px;">-</span>Down '
              }
                                      <span style="color: #172935; font-size: 13px; letter-spacing: -0.3px; font-weight: 500; margin-left: 3px;">${Math.abs(
                item.upAvgCPC
              )}% from last week</span>
                                    </div>
                                    </div>
                                  </div>
                                </td>
                                <td></td>
                              </table>
                            </tr>
                            <tr>
                              <table cellpadding="10px">
                                <td colspan="1" style="padding-left: 0;">
                                  <div style="text-align: left">
                                    <div
                                      style="
                                        padding: 15px;
                                        border-radius: 8px;
                                        border: 2px solid #7ffbae;
                                        min-width: 270px;
                                        max-width: 270px;
                                      "
                                    >
                                      <p
                                        style="
                                          font-size: 16px;
                                          letter-spacing: -0.48px;
                                          font-weight: 500;
                                          color: #172935;
                                          margin: 0px;
                                        "
                                      >
                                        Engagement by Channel
                                      </p>
                                      <p
                                        style="
                                          font-size: 25px;
                                          letter-spacing: -0.75px;
                                          font-weight: 600;
                                          color: #000;
                                          margin: 0px;
                                        "
                                      >
                                      ${`${Number(item.sumEmail) +
              Number(item.sumBlog)
              }`}
                                      </p>
                                      <div
                                        style="
                                          margin-top: 10px;
                                          font-size: 13px;
                                          width: 100%;
                                          text-align: right;
                                        "
                                      >
                                        <div
                                          style="
                                            padding-left: 8px;
                                            border-color: #7ffbae;
                                            height: 40px;
                                            border-left: 4px solid #7ffbae;
                                            display: inline-block;
                                            text-align: left;
                                          "
                                        >
                                          <span> Newsletter </span><br />
                                          <span> ${item.sumEmail} </span>
                                        </div>
                                        <div
                                          style="
                                            padding-left: 8px;
                                            border-color: #6c63ff;
                                            height: 40px;
                                            border-left: 4px solid #6c63ff;
                                            margin-left: 10px;
                                            display: inline-block;
                                            text-align: left;
                                          "
                                        >
                                          <span> Referral </span><br />
                                          <span> ${item.sumBlog} </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td colspan="1">
                                  <div style="text-align: left">
                                    <div
                                      style="
                                        padding: 15px;
                                        border-radius: 8px;
                                        border: 2px solid #7ffbae;
                                        min-width: 270px;
                                        max-width: 270px;
                                      "
                                    >
                                      <p
                                        style="
                                          font-size: 16px;
                                          letter-spacing: -0.48px;
                                          font-weight: 500;
                                          color: #172935;
                                          margin: 0px;
                                        "
                                      >
                                        Engagement by Country
                                      </p>
                                      <p style="min-height: 29px; margin: 0"></p>
                                      <div
                                        style="
                                          margin-top: 10px;
                                          font-size: 13px;
                                          width: 100%;
                                          text-align: left;
                                        "
                                      >
                                      ${item.groupedByCountry.length === 1
                ? `<div
                                          style="
                                            padding-left: 8px;
                                            border-color: #7ffbae;
                                            height: 40px;
                                            border-left: 4px solid #7ffbae;
                                            display: inline-block;
                                            text-align: left;
                                          "
                                        >
                                          <span> ${item.groupedByCountry[0].ip} </span><br />
                                          <span> ${item.groupedByCountry[0].percentage}% </span>
                                        </div>`
                : ""
              }
                                        ${item.groupedByCountry.length === 2
                ? `<div
                                          style="
                                            padding-left: 8px;
                                            border-color: #6c63ff;
                                            height: 40px;
                                            border-left: 4px solid #6c63ff;
                                            margin-left: 10px;
                                            display: inline-block;
                                            text-align: left;
                                          "
                                        >
                                        <span> ${item.groupedByCountry[1].ip} </span><br />
                                        <span> ${item.groupedByCountry[1].percentage}% </span>
                                        </div>`
                : ""
              }
                                        ${item.groupedByCountry.length === 3
                ? `<div
                                          style="
                                            padding-left: 8px;
                                            border-color: #e4d33b;
                                            height: 40px;
                                            border-left: 4px solid #e4d33b;
                                            margin-left: 10px;
                                            display: inline-block;
                                            text-align: left;
                                          "
                                        >
                                        <span> ${item.groupedByCountry[2].ip} </span><br />
                                        <span> ${item.groupedByCountry[2].percentage}% </span>
                                        </div>`
                : ""
              }
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </table>
                            </tr>
                          </table>
                        </div>
                      </div>
                      `;
          })
          .join("")}
            <div style="border-bottom: 1px solid rgba(0,0,0,0.12); padding: 20px 0px;">
              <p style="margin-top: 0px;">We'll continue tracking and reporting your campaign's performance.</p>
              <p>Expect more insights next week!</p>
              <p style="margin: 0px;">Cheers,</p>
              <p style="margin: 0px;">Zoe</p>
            </div>
            <div style="text-align:center; width:100%; margin-top: 10px;">
              <img src="https://presspool-upload-images.s3.amazonaws.com/PP+logo+transparent.png" width="40px"  />
              <p style="margin: 0px; letter-spacing: -0.24px; font-size: 10px;">© 2024 Presspool</p>
            </div>
          </div>
        </div>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`email seinding error: ${error}`);
  }
};

const sendAddTemmateEmail = async (
  ownerName: string,
  companyName: string,
  email: string,
  isUserExist: boolean
) => {
  try {
    const secretKey = "presspool-ai";
    const token = sign({ companyName, email }, secretKey, { expiresIn: "1d" });
    const url = `${isUserExist
      ? `https://go.presspool.ai/login?token=${token}`
      : `https://go.presspool.ai/client-sign-up?token=${token}`
      }`;
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: email,
      subject: `${ownerName} invited you to join the ${companyName} team`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">${ownerName} invited you to join the ${companyName} team on Presspool.ai Platform</p>
      <a style="margin-top: 15px;" href="${url}" target="_blank">Join Presspool</a>
      <p style="margin-top: 20px;">Warmly,</p>
      <p>Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send add teammate dialog error: ${error}`);
  }
};

// (Math.round((req.body.currentPrice / ((4 * (1 + 0.10)) / (1 - 0.50))) * 4) - 2).toString(),
const sendSuperAdminNotificationEmail = async (
  email: string,
  adminName: string,
  campaignName: string,
  company: string,
  userName: string,
  price: string,
  uid: string,
  heroImage: string,
  additional: Array<string>,
  headline: string,
  body: string,
  cta: string,
  pageUrl: string,
  url: string,
  conversion: string,
  conversionDetail: string,
  demographic: string,
  region: string,
  audience: string,
  position: string,
  teamAvatar: string,
  companyEmail: string
) => {
  console.log("send super admin notification emails");

  try {
    let additionalFiles = "";
    for (const fileName of additional) {
      const parts = fileName.split("/");
      additionalFiles += `<p><a href="${fileName}" download="${parts[parts.length - 1]
        }"><img style="width: 135px; height: 74px; border-radius: 10px" src="fileName" alt="${parts[parts.length - 1]
        }" /></a></p>`;
    }

    let industries = ``;
    if (audience.length) {
      for (let index = 0; index < audience.length; index++) {
        industries += `<button
          style="
            background-color: #000;
            color: rgb(255, 255, 255);
            border-radius: 4px;
            margin-right: 5px;
            margin-top : 5px;
          "
        >
          ${audience[index]}
        </button>`;
      }
    }

    let demographics = ``;
    if (audience.length) {
      for (let index = 0; index < position.length; index++) {
        demographics += `<button
          style="
            background-color: #000;
            color: rgb(255, 255, 255);
            border-radius: 4px;
            margin-right: 5px;
            margin-top : 5px;
          "
        >
          ${position[index]}
        </button>`;
      }
    }

    let regions = ``;
    if (region.length) {
      for (let index = 0; index < region.length; index++) {
        regions += `<button
          style="
            background-color: #000;
            color: rgb(255, 255, 255);
            border-radius: 4px;
            margin-right: 5px;
            margin-top : 5px;
          "
        >
          ${region[index]}
        </button>`;
      }
    }

    const html = `<div>
              <div style="text-align: center">
                <img style="width: 115px; height: 40px" src="https://presspool-upload-images.s3.amazonaws.com/logo1+1.png" alt="logo"/>
              </div>
            </div>
              <hr />
              <div style="margin: 20px">
                <span>Hey ${adminName},</span><br /><br />
                <span>${company} has submitted a new campaign. Please review below.</span>
              </div>
              <hr />
              <div style="margin: 20px; display: inline-flex">
                <div>
                  ${teamAvatar
        ? `<img style="width: 77px; height: 77px; border-radius: 50%" src="${teamAvatar}" alt="" />`
        : `<div
                      style="
                        width: 77px;
                        height: 77px;
                        border-radius: 50%;
                        background: #7ffbae;
                        text-align: center;
                      "
                    >
                  ${getPlaceHolder(company)}
                    </div>`
      } 
                </div>
                <div style="margin: 0 20px">
                  <span style="font-weight: bolder; font-size: 28px">${company}</span><br />
                  <span>${companyEmail}</span>
                </div>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Campaign Title</span><br />
                <span>${campaignName}</span>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder"> Headline</span><br />
                <span>${headline}</span>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">CTA Link</span><br />
                <a href="${pageUrl}" style="color: blue">${pageUrl}</a>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Target Audience</span><br />
                <button
                  style="
                    background-color: #000;
                    color: rgb(255, 255, 255);
                    border-radius: 4px;
                  "
                >
                  ${demographic}
                </button>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Target Industrie(s)</span><br />
                <div style="margin-right: 5px;">
                ${industries}
                </div>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Target Demographic(s)</span><br />
                <div style="margin-right: 5px;">
                ${demographics}
                </div>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Target Region(s)</span><br />
                <div style="margin-right: 5px;">
                ${regions}
                </div>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Conversion Goal</span><br />
                <span>${conversion ?? "N/A"}</span>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Conversion Details</span><br />
                <span>${conversionDetail ?? "N/A"}</span>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Campaign Budget</span><br />
                <span>$${price}</span>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Beehiiv Budget</span><br />
                <span>$${(
        Math.round(
          (Number(price) / ((4 * (1 + 0.1)) / (1 - 0.6))) * 4
        ) - 2
      ).toString()}</span>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">*CTA Tracking Link for Newsletter:</span
                ><br />
                <a href="https://track.presspool.ai/${uid}" style="color: blue">https://track.presspool.ai/${uid}</a>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Hero Image:</span><br />
                <a
                  href="${heroImage}"
                >
                  <img
                    style="width: 135px; height: 74px; border-radius: 10px"
                    src="${heroImage}"
                    alt=""
                  />
                </a>
              </div>
              <div style="margin: 20px">
                <span style="font-weight: bolder">Additional Files</span><br />
                ${additionalFiles}
              </div>
              <hr />
              <div style="margin: 20px">
                <span
                  >Please review and fully understand the clients conversion goals before
                  submitting to a Creator!</span
                ><br /><br />
                <span>Cheers,</span><br />
                <span>Zoe</span>
              </div>
              <hr />
              <div>
                <div style="text-align: center">
                  <img style="width: 40px; height: 40px" src="https://presspool-upload-images.s3.amazonaws.com/Presspool+Black+Logo.png" alt="logo"/>
                </div>
                <div style="text-align: center">
                  <span>@ 2024 Presspool</span>
                </div>
              </div>`;

    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: email,
      subject: `NEW CLIENT CAMPAIGN | ${company} <> ${campaignName}`,
      // text: content,
      // attachments: fileAttachments,
      html,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send admin notification email error: ${error}`);
  }
};

const sendAdminNotificationEmail = async (
  email: string,
  adminName: string,
  campaignName: string,
  company: string,
  userName: string,
  price: string,
  uid: string,
  headline: string,
  body: string,
  cta: string,
  pageUrl: string
) => {
  console.log("send admin notification emails");
  try {
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: email,
      subject: `Review Needed: ${userName}'s "${campaignName}" Submitted`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">Hi ${adminName}</p>
      <p>${userName}'s "${campaignName}" has been submitted for review. Expected turnaround is 24-48 hours. Please be ready for any client queries or changes.</p>
      <p>Thanks,</p>
      <p>Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send admin notification email error: ${error}`);
  }
};

const sendInviteEmail = async (
  adminName: string,
  email: string,
  link: string
) => {
  console.log("send invite emails");
  try {
    const secretKey = "presspool-ai";
    const token = sign({ companyName: "", email }, secretKey, {
      expiresIn: "1d",
    });
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: email,
      subject: `Exclusive Invitation to Join PressPool!`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">${adminName} has invited you to PressPool, where AI meets precision marketing. </p>
      <p>Join us for targeted audience reach and campaign success.</p>
      <p>Click <a href='${link}&token=${token}' target='_blank'>here</a> to get started!</p>
      <p>Cheers</p>
      <p>Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send invite email error: ${error}`);
  }
};

const sendInviteAccountManagerEmail = async (email: string) => {
  console.log("send invite account maanger emails");
  try {
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: email,
      subject: `Get Set Up with PressPool!`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">Welcome to PressPool! You're invited to join us as an Account Manager.</p>
      <p>Just click <a href='https://go.presspool.ai/admin/signup' style="color: #6c63ff; text-decoration:underline;" target="_blank">this link</a> to begin and access your new dashboard where you'll track campaigns and connect with clients.</p>
      <p>Excited to have you on board. Let's get going! </p>
      <p style="margin:0px">Cheers,</p>
      <p style="margin:0px">Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send invite email error: ${error}`);
  }
};

const getPlaceHolder = (name: string) => {
  if (!name) return "";
  const names = name.split(" ");
  if (names.length === 2) {
    return `${names[0].at(0)}${names[1].at(0)}`;
  } else if (names.length === 1) {
    return `${names[0].at(0)}`;
  } else {
    return "";
  }
};

const sendRequestNewsletterEmail = async (admin: string, email: string, name: string, url: string, file: string) => {
  console.log("send request newsletter emails");
  try {
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: admin,
      subject: `New Newsletter Request!`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">${email} has submitted newsletter request</p>
      <p>Newsletter Name: ${name}</p>
      <p>Newsletter URL: ${url}</p>
      ${file && `<a href="${file}">Download File</a>`}
      <p style="margin:0px">Cheers,</p>
      <p style="margin:0px">Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send request newsletter email error: ${error}`);
  }
};

const sendPaymentMethodDetachedEmail = async (admin: string, email: string, name: string) => {
  console.log('send payment detached notification to super admins');
  try {
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: admin,
      subject: `Payment Method Detached!`,
      // text: content,
      html: `
      <p style="margin-top: 15px;">The following customer has just detached their payment method, please reach out to them ASAP:</p>
      <p>Client Name: ${name}</p>
      <p>Client Email:${email}</p>
      <p style="margin:0px">Zoe</p>
      `,
      // attachments: fileAttachments,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`send request newsletter email error: ${error}`);
  }
};

const sendCreatorWelcomeEmail = async (
  emailAddress: string,
  userName: string,
  payload: any
) => {
  try {
    const firstName = userName.split(" ")[0];
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: emailAddress,
      subject: `Welcome - ${firstName}`,
      // text: content,
      html: `<div>
      <div style="text-align: center">
        <img style="width: 115px; height: 40px" src="https://presspool-upload-images.s3.amazonaws.com/logo1+1.png" alt="logo"/>
      </div>
    </div>
      <hr />
      <div style="margin: 20px">
        <span>Hello ${firstName},</span><br /><br />
        <span>We are inviting you to join PressPool, where AI meets precision marketing.</span><br /><br />
        <span>Join us for targeted audience reach and campaign success.</span><br /><br />
        <p>Click <a href='https://go.presspool.ai/creator/${payload.creatorId}/onboarding?token=${payload.token}' style="color: #6c63ff; text-decoration:underline;" target="_blank">here</a> to get started!.</p><br /><br />
        <span>Cheers,</span><br />
        <span>Zoe</span>
      </div>
      <hr />
      <div>
        <div style="text-align: center">
          <img style="width: 40px; height: 40px" src="https://presspool-upload-images.s3.amazonaws.com/Presspool+Black+Logo.png" alt="logo"/>
        </div>
        <div style="text-align: center">
          <span>@ 2024 Presspool</span>
        </div>
      </div>`,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
  }
};

const sendCampaignRequestToCreator = async (
  emailAddress: string,
  name: string,
  campaignName: string,
) => {
  try {
    const firstName = name.split(" ")[0];
    const mailComposer = new MailComposer({
      from: "Zoe Martinez-PressPool Support Team<zoe@presspool.ai>",
      to: emailAddress,
      subject: `Hello ${firstName}`,
      // text: content,
      html: `
      <p>You have a new campaign request waiting for approval! This could be a great opportunity to collaborate with a new client and get their message out there.</p>
      <a href='https://go.presspool.ai/creator/dashboard' style="color: #6c63ff; text-decoration:underline;" target="_blank">${campaignName}</a>
      <p>Please take a moment to review the campaign details. If it's a match, you can accept and schedule the publication. If not, free to decline and provide feedback.<p>
      <p>Warmly</p>
      <p>Zoe</p>
      `,
      textEncoding: "base64",
      headers: [
        {
          key: "X-Application-Developer",
          value: "Oleksii Karavanov",
        },
        {
          key: "X-Application-Version",
          value: "v1.0.0",
        },
      ],
    });

    await sendEmail(mailComposer);
  } catch (error) {
    log.error(`welcome email seinding error: ${error}`);
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

  sendRequestNewsletterEmail,
  sendPaymentMethodDetachedEmail,

  sendAdminNotificationEmail,
  sendSuperAdminNotificationEmail,

  sendInviteEmail,
  sendInviteAccountManagerEmail,

  showUrl,
  generateToken,
  sendCreatorWelcomeEmail,

  sendCampaignRequestToCreator,
};

export default mailer;
