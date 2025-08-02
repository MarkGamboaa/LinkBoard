const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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
  userId: String, // Add user ID field
  userEmail: String, // Add user email for reference
  isPublic: { type: Boolean, default: false }, // Add public/private toggle
});

// User Profile Schema
const UserProfileSchema = new mongoose.Schema({
  userId: String,
  email: String,
  firstName: String,
  lastName: String,
  displayName: String,
  updatedAt: { type: Date, default: Date.now }
});

const Board = mongoose.model('UserBoards', BoardSchema);
const UserProfile = mongoose.model('UserInfo', UserProfileSchema);

// API Endpoints
app.get('/api/boards', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    // Only return boards that have a userId field and match the current user
    const boards = await Board.find({ 
      userId: { $exists: true, $eq: userId } 
    });
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// Get public boards (no authentication required)
app.get('/api/boards/public', async (req, res) => {
  try {
    const publicBoards = await Board.find({ 
      isPublic: true 
    }).populate('userId', 'userEmail');
    res.json(publicBoards);
  } catch (error) {
    console.error('Error fetching public boards:', error);
    res.status(500).json({ error: 'Failed to fetch public boards' });
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    const { userId, userEmail, ...boardData } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const board = new Board({
      ...boardData,
      userId,
      userEmail
    });
    await board.save();
    res.json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

app.put('/api/boards/:id', async (req, res) => {
  try {
    console.log('Updating board:', req.params.id, 'with data:', req.body);
    
    // First, let's check if the board exists
    const existingBoard = await Board.findById(req.params.id);
    console.log('Existing board before update:', existingBoard);
    
    if (!existingBoard) {
      console.log('Board not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Board not found' });
    }
    
    const board = await Board.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    console.log('Updated board:', board);
    
    // Verify the update worked by fetching the board again
    const verifyBoard = await Board.findById(req.params.id);
    console.log('Verified board after update:', verifyBoard);
    
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

// Delete all boards for a specific user (for account deletion)
app.delete('/api/boards', async (req, res) => {
  try {
    const { userId } = req.query;
    console.log('Received request to delete all boards for userId:', userId);
    
    if (!userId) {
      console.log('Error: User ID is required');
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const result = await Board.deleteMany({ userId });
    console.log('Deleted boards result:', result);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting user boards:', error);
    res.status(500).json({ error: 'Failed to delete user boards' });
  }
});

// User Profile Endpoints
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.params.userId });
    if (profile) {
      res.json(profile);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const { userId, email, firstName, lastName } = req.body;
    if (!userId || !firstName || !lastName) {
      return res.status(400).json({ error: 'User ID, first name, and last name are required' });
    }

    const displayName = `${firstName.trim()} ${lastName.trim()}`;
    
    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.delete('/api/profile/:userId', async (req, res) => {
  try {
    console.log('Received request to delete profile for userId:', req.params.userId);
    const result = await UserProfile.findOneAndDelete({ userId: req.params.userId });
    console.log('Profile deletion result:', result);
    
    if (result) {
      res.json({ success: true, message: 'Profile deleted successfully' });
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// Migration endpoint to clean up old boards (optional)
app.delete('/api/boards/cleanup/old', async (req, res) => {
  try {
    // Delete all boards that don't have a userId (old data)
    const result = await Board.deleteMany({ userId: { $exists: false } });
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} old boards without userId` 
    });
  } catch (error) {
    console.error('Error cleaning up old boards:', error);
    res.status(500).json({ error: 'Failed to cleanup old boards' });
  }
});

// Test endpoint to check if server is running
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint for basic health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'LinkBoard API is running', 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to check MongoDB connection and create a test board
app.get('/api/test-mongo', async (req, res) => {
  try {
    // Test creating a simple board
    const testBoard = new Board({
      title: 'Test Board',
      links: [{ title: 'Test Link', url: 'https://example.com', color: '#000000' }],
      userId: 'test-user',
      userEmail: 'test@example.com'
    });
    
    const savedBoard = await testBoard.save();
    console.log('Test board created:', savedBoard);
    
    // Delete the test board
    await Board.findByIdAndDelete(savedBoard._id);
    
    res.json({ 
      message: 'MongoDB is working correctly',
      testBoard: savedBoard,
      deleted: true
    });
  } catch (error) {
    console.error('MongoDB test failed:', error);
    res.status(500).json({ error: 'MongoDB test failed', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    