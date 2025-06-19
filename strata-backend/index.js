const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth.js');
const inviteRoutes = require('./routes/invite.js');
const documents = require('./routes/documents.js');
const resourceTypeRoutes = require('./routes/resourceTypes.js');
const checkUser = require('./routes/checkUser.js');

dotenv.config();

const app = express();

// Use dynamic origin for CORS in production
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());


// Route groups
app.use('/api', authRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/documents', documents);
app.use('/api/resource-types', resourceTypeRoutes);
app.use('/api/check-user', checkUser);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});