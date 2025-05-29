const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth.js');
const inviteRoutes = require('./routes/invite.js');
const documents = require('./routes/documents.js');
const resourceTypeRoutes = require('./routes/resourceTypes');

dotenv.config();

const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/documents', documents);
app.use('/api/resource-types', resourceTypeRoutes);

app.listen(3001, () => {
  console.log('Backend running at http://localhost:3001');
});
