const mongoose = require('mongoose');

const normalReportSchema = new mongoose.Schema({
  reportTitle: { type: String, required: true },
  reportContent: { type: String, required: true },
});

module.exports = mongoose.model('NormalReport', normalReportSchema);
