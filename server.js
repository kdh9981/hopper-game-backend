const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;
const uri = process.env.MONGODB_URI || 'mongodb+srv://kdh9981:Kdh9931039!@cluster0.q5f8e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
let db;

async function connectToDatabase() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    await client.connect();
    db = client.db('hopper_game');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

app.post('/api/save-progress', async (req, res) => {
  const { walletAddress, data } = req.body;
  try {
    await db.collection('user_progress').updateOne(
      { walletAddress },
      { $set: {
        totalHops: parseFloat(data.totalHops.toFixed(1)),
        hopsPerJump: parseFloat(data.hopsPerJump.toFixed(1)),
        activeItems: data.activeItems
      }},
      { upsert: true }
    );
    res.status(200).json({ message: 'Progress saved successfully' });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ message: 'Error saving progress' });
  }
});

app.get('/api/load-progress/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  console.log('Loading progress for wallet:', walletAddress);
  try {
    const progress = await db.collection('user_progress').findOne({ walletAddress });
    res.status(200).json(progress || { totalHops: 0, pointsPerJump: 1 });
  } catch (error) {
    console.error('Error loading progress:', error);
    res.status(500).json({ message: 'Error loading progress' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  console.log('Fetching leaderboard data...');
  try {
    const leaderboard = await db.collection('user_progress')
      .find({})
      .sort({ totalHops: -1 })
      .limit(10)
      .toArray();
    
    console.log('Raw leaderboard data from DB:', leaderboard);
    
    if (!Array.isArray(leaderboard)) {
      throw new Error('Leaderboard data is not an array');
    }

    const formattedLeaderboard = leaderboard.map(entry => ({
      walletAddress: entry.walletAddress,
      totalHops: parseFloat((entry.totalHops || 0).toFixed(1))
    }));

    console.log('Formatted leaderboard data:', formattedLeaderboard);
    res.json(formattedLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
});

connectToDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});