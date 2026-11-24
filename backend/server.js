require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.get('/', (req, res) => res.send('Expense Tracker API is running.'));

const port = process.env.PORT || 4000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => console.log(`Server listening on port ${port}`));
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
