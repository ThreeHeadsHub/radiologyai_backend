const mongoose = require('mongoose');
const promptReport = require('./promptReport');

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    creator: { type: mongoose.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
