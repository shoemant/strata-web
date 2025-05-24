import express from 'express';
import authRoutes from './routes/auth.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

app.use(cors()); // Allow frontend to call your API
app.use(express.json());
app.use('/api', authRoutes);

app.listen(3000, () => {
  console.log('Backend running at http://localhost:3000');
});
