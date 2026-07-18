const fs = require('fs');
const path = require('path');
// Serve /temp folder statically for PDF downloads
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const firebaseAdmin = require('./services/firebaseAdmin');
// initialize mongo connection
require('./services/mongo');

const documentsRouter = require('./routes/documents');
const queryRouter = require('./routes/query');
const toolsRouter = require('./routes/tools');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));


app.use('/temp', express.static(tempDir));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/documents', documentsRouter);
app.use('/api/query', queryRouter);
app.use('/api', toolsRouter);



app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API Gateway listening on ${PORT}`));
