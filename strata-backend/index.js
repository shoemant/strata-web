const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth');
const resourceTypeRoutes = require('./routes/resourceTypes');
const checkUserRoutes = require('./routes/checkUser');
const resourceRoutes = require('./routes/resources');
const announcementRoutes = require('./routes/announcements');
const eventRoutes = require('./routes/events');

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Backend is running' });
});

// Route groups
app.use('/api', authRoutes);
app.use('/api/resource-types', resourceTypeRoutes);
app.use('/api/check-user', checkUserRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
