const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth.js');
const resourceTypeRoutes = require('./routes/resourceTypes.js');
const checkUser = require('./routes/checkUser.js');
const resources = require('./routes/resources.js');

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());

// Route groups
app.use('/api', authRoutes);
app.use('/api/resource-types', resourceTypeRoutes);
app.use('/api/check-user', checkUser);
app.use('/api/resources', resources);

const PORT = process.env.PORT || 3001; // <- Required by Render
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
