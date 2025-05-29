/**
 * sendInvitationEmail.js
 *
 * This module handles sending invitation emails via SendGrid to users (owners or tenants)
 * who are invited to join a building on the platform.
 *
 * - Constructs a tokenized registration link pointing to the frontend.
 * - Sends a formatted HTML email using SendGrid.
 * - Uses environment variables for credentials and configuration.
 *
 * Environment Variables Required:
 * - SENDGRID_API_KEY:   Your SendGrid API key
 * - FRONTEND_URL:       The base URL of your frontend (used to build the invite link)
 * - SENDER_EMAIL:       A verified sender email in SendGrid
 *
 * Note:
 * Ensure that the SENDER_EMAIL is verified within your SendGrid account.
 */

const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Initialize SendGrid with API key from environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends an invitation email containing a unique signup token link.
 *
 * @param {string} email - Recipient's email address
 * @param {string} token - Unique invitation token to be appended to the signup URL
 */
async function sendInvitationEmail(email, token) {
  // Construct the full signup URL with the token as a query parameter
  const inviteLink = `${process.env.FRONTEND_URL}/signup?token=${token}`;

  // Define the email message payload
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: 'You’ve been invited!',
    html: `
      <p>You’ve been invited to join a building on our platform.</p>
      <p><a href="${inviteLink}">Click here to accept the invite and complete registration</a></p>
    `,
  };

  // Send the email
  await sgMail.send(msg);
}

// Export the function for use in other backend modules
module.exports = {
  sendInvitationEmail,
};