import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const Team = mongoose.model('Team', teamSchema);

export default Team;
