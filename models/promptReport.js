const mongoose = require('mongoose');

const promptReportSchema = new mongoose.Schema({
  promptContent: [{ type: String, required: true }],
  owner: { type: mongoose.Types.ObjectId, required: false, ref: 'User' },
  savedReports: [
    {
      type: mongoose.Types.ObjectId,
      required: false,
      ref: 'Report',
    },
  ],
});

module.exports = mongoose.model('PromptReport', promptReportSchema);
