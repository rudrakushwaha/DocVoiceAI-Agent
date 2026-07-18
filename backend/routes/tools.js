const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

const axios = require('axios');
const nodemailer = require('nodemailer');





// Google OAuth and Calendar integration
const {
  getOAuth2Client,
  generateAuthUrl,
  getTokensFromCode,
  createMeeting
} = require('../utils/googleOAuth');

// router.get('/oauth2callback', async (req, res) => {
//   const code = req.query.code;

//   if (!code) {
//     return res.send('No code received');
//   }

//   try {
//     const tokens = await getTokensFromCode(code);

//     console.log('TOKENS:', tokens);

//     res.send(`
//       <h2>OAuth Success ✅</h2>
//       <p>Check your backend console for refresh token.</p>
//     `);

//   } catch (err) {
//     console.error(err);
//     res.send('Error exchanging code');
//   }
// });

// GET /api/google-auth-url
router.get('/google-auth-url', (req, res) => {
  try {
    const url = generateAuthUrl();
    console.log('[Google OAuth] Auth URL:', url);
    return res.json({ url });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate auth URL', details: err.message });
  }
});

// POST /api/google-exchange-code
router.post('/google-exchange-code', async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });
  try {
    const tokens = await getTokensFromCode(code);
    console.log('[Google OAuth] Tokens:', tokens);
    return res.json(tokens);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to exchange code', details: err.message });
  }
});



// Setup nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// Debug: log Authorization header for all requests
router.use((req, res, next) => {
  console.log('[tools.js] Authorization header:', req.get('Authorization'));
  next();
});
router.use(auth);

// POST /api/send-email
router.post('/send-email', async (req, res) => {
    console.log("inside send mail function in backend");
  const uid = req.user && req.user.uid;
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  const { to, subject, body } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: 'to and body required' });
  try {
    console.log('[send-email] Request received:', { to, subject, body });
    const mailOptions = {
      from: `"DocVoice Agent" <${process.env.EMAIL_FROM}>`,
      to,
      subject: subject || '',
      text: body
    };
    const start = Date.now();
    console.log('[send-email] Sending mail with options:', mailOptions);
    const info = await transporter.sendMail(mailOptions);
    const elapsed = Date.now() - start;
    console.log('[send-email] Mail sent. MessageId:', info.messageId, 'Elapsed(ms):', elapsed);
    return res.json({ success: true, messageId: info.messageId, elapsed });
  } catch (err) {
    console.error('[send-email] Email send error:', err);
    return res.status(500).json({ error: 'failed_to_send_email', details: err.message });
  }
});

// POST /api/schedule-meeting
router.post('/schedule-meeting', async (req, res) => {
  const uid = req.user && req.user.uid;
  if (!uid) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { title, participants, date, time } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: 'title required' });
  }
  if (!date || !time) {
    return res.status(400).json({ error: 'date and time required' });
  }
  try {
    const result = await createMeeting({ title, participants, date, time });
    if (!result.meetLink) {
      return res.status(500).json({ error: 'Failed to create Google Meet link', details: result });
    }
    return res.json({ meetLink: result.meetLink, eventId: result.eventId, htmlLink: result.htmlLink });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to schedule meeting', details: err && err.message ? err.message : err });
  }
});

// POST /api/linkedin-post (no external API, just echo)
router.post('/linkedin-post', async (req, res) => {
  const uid = req.user && req.user.uid;
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  // Just echo back for frontend to handle
  return res.json({ text });
});

// POST /api/generate-pdf
router.post('/generate-pdf', async (req, res) => {
  try {
    const { content } = req.body || {};
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'content required' });
    }

    // Truncate very large content (e.g., 10,000 chars)
    const safeContent = content.length > 10000 ? content.slice(0, 10000) + '\n... (truncated)' : content;

    // Ensure /temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `docvoice_${timestamp}.pdf`;
    const filePath = path.join(tempDir, filename);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.fontSize(20).text('DocVoice Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(safeContent, { align: 'left' });
    doc.end();

    writeStream.on('finish', () => {
      const fileUrl = `${req.protocol}://${req.get('host')}/temp/${filename}`;
      return res.json({ success: true, fileUrl });
    });
    writeStream.on('error', (err) => {
      console.error('[generate-pdf] File write error:', err);
      return res.status(500).json({ error: 'Failed to write PDF file' });
    });
  } catch (err) {
    console.error('[generate-pdf] Error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
  }
});

module.exports = router;


