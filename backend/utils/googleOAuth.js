// backend/utils/googleOAuth.js
// Google OAuth2 and Calendar integration for DocVoice Agent

const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/oauth2callback';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

function getOAuth2Client() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('Missing Google OAuth2 environment variables');
  }
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
  if (REFRESH_TOKEN) {
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  }
  return oAuth2Client;
}

function generateAuthUrl() {
  const oAuth2Client = getOAuth2Client();
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
  });
  return url;
}

async function getTokensFromCode(code) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

async function createMeeting({ title, participants, date, time }) {
  if (!date || !time) throw new Error('Missing date or time');
  console.log('[googleOAuth.createMeeting] Input:', { title, participants, date, time });
  const oAuth2Client = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  // Parse date and time to RFC3339
  const startDateTime = new Date(`${date}T${time}`);
  if (isNaN(startDateTime.getTime())) {
    console.error('[googleOAuth.createMeeting] Invalid date or time format:', { date, time });
    throw new Error('Invalid date or time format');
  }
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour

  const event = {
    summary: title,
    start: { dateTime: startDateTime.toISOString() },
    end: { dateTime: endDateTime.toISOString() },
    attendees: Array.isArray(participants) ? participants.map(email => ({ email })) : [],
    conferenceData: {
      createRequest: {
        requestId: `docvoice-meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };
  console.log('[googleOAuth.createMeeting] Event resource:', event);

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });
    console.log('[googleOAuth.createMeeting] Google API response:', response && response.data);
    return {
      meetLink: response.data.hangoutLink || (response.data.conferenceData && response.data.conferenceData.entryPoints && response.data.conferenceData.entryPoints[0] && response.data.conferenceData.entryPoints[0].uri),
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
    };
  } catch (err) {
    console.error('[googleOAuth.createMeeting] Google API error:', err && err.response ? err.response.data : err);
    throw err;
  }
}

module.exports = {
  getOAuth2Client,
  generateAuthUrl,
  getTokensFromCode,
  createMeeting,
};
