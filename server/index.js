const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose Schemas
const LinkSchema = new mongoose.Schema({
  title: String,
  url: String,
  color: String,
});
const BoardSchema = new mongoose.Schema({
  title: String,
  links: [LinkSchema],
});
const Board = mongoose.model('Board', BoardSchema);

// API Endpoints
app.get('/api/boards', async (req, res) => {
  try {
    const boards = await Board.find();
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    const board = new Board(req.body);
    await board.save();
    res.json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

app.put('/api/boards/:id', async (req, res) => {
  try {
    const board = await Board.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(board);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

app.delete('/api/boards/:id', async (req, res) => {
  try {
    await Board.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    