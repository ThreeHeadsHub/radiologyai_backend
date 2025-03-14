const NormalReport = require('../models/normalReport');
const Report = require('../models/report');
const PromptReport = require('../models/promptReport');
const mongoose = require('mongoose');
const { OpenAI } = require('openai');
const fs = require('fs');
const {
  whisperPrompt,
  guessPrompt,
  generatePrompt,
  checkPrompt,
} = require('../constants/constants');
require('dotenv').config({ path: '../.env.development' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const getNormalReportByTitle = async (reportTitle) => {
  let foundReport;
  try {
    foundReport = await NormalReport.findOne({ reportTitle });
    if (!foundReport) {
      throw new Error('Report not found');
    }
  } catch (error) {
    throw error;
  }
  return foundReport;
};
const getReportsByUserId = async (req, res) => {
  const { limit } = req.query;
  const maxLimit = 10;
  try {
    const reportLimit =
      limit && limit > 0 ? Math.min(parseInt(limit, 10), maxLimit) : 1;
    const foundReports = await Report.find({ creator: req.user._id })
      .sort({ createdAt: -1 })
      .limit(reportLimit);
    res.status(200).send({ foundReports });
  } catch (error) {
    return res.status(401).send({ error });
  }
};
const deleteReport = async (req, res) => {
  const sess = await mongoose.startSession();
  sess.startTransaction();

  try {
    const report = await Report.findByIdAndDelete(req.query.reportId, {
      session: sess,
    });
    if (!report) {
      throw new Error('Report not found');
    }
    req.user.reports = req.user.reports.filter(
      (reportId) => reportId.toString() !== req.query.reportId
    );
    await req.user.save({ session: sess });

    await sess.commitTransaction();
    sess.endSession();

    res.status(200).send({ message: 'Report deleted successfully' });
  } catch (error) {
    await sess.abortTransaction();
    sess.endSession();
    res.status(500).send({ error: error.message });
  }
};
const createReport = async (req, res) => {
  const report = new Report({
    title: req.body.reportTitle,
    content: req.body.reportContext,
    creator: req.user._id,
  });

  const sess = await mongoose.startSession();
  sess.startTransaction();

  try {
    await report.save({ session: sess });

    req.user.reports.push(report._id);
    let promptReports = await getPromptReport(req.user._id);
    console.log('CREATEREPORT promptReports', promptReports);
    if (promptReports && promptReports.length > 0) {
      const savePromises = promptReports.map(async (promptReport) => {
        promptReport.savedReports.push(report._id);
        await promptReport.save();
      });
      console.log('CREATEREPORT savePromises', savePromises);
      await Promise.all(savePromises);
    }
    await req.user.save({ session: sess });

    await sess.commitTransaction();
    sess.endSession();

    res.status(201).send();
  } catch (error) {
    await sess.abortTransaction();
    sess.endSession();
    res.status(500).send({ error: error.message });
  }
};
const updateReport = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = new Set(['title', 'content', '_id']);
  const isValidUpdate = updates.every((update) => allowedUpdates.has(update));

  if (!isValidUpdate) {
    return res.status(400).send({ error: 'Invalid Update' });
  }
  try {
    const foundReport = await Report.findById(req.body._id);
    if (!foundReport) {
      return res.status(404).send({ error: 'No User Found' });
    }
    updates.forEach((update) => {
      foundReport[update] = req.body[update];
    });
    await foundReport.save();
    res.status(200).send();
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};
const listenUser = async (req, res) => {
  try {
    const audioFilePath = req.file.path;
    const { processType } = req.query;

    let reportTitle = req.body.reportTitle || null;
    let reportContext = req.body.reportContext || null;

    if (!fs.existsSync(audioFilePath)) {
      return res.status(400).json({ error: 'Ses dosyası bulunamadı.' });
    }
    const audioStream = fs.createReadStream(audioFilePath);
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: 'tr',
      prompt: whisperPrompt,
    });
    const result = transcription.text;
    if (processType == 'guess') {
      reportTitle = await guessReportTitle(result);
      reportData = await getNormalReportByTitle(reportTitle);
      reportContext = reportData.reportContent;
    } else if (processType == 'generate') {
      const reportWithDemands = reportContext + `\n` + result;
      reportContext = await generateReport(
        reportTitle,
        reportWithDemands,
        req.user._id
      );
    }

    res.status(200).send({ reportTitle, reportContext });
  } catch (error) {
    res.status(500).json({ error });
  } finally {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Dosya silinemedi:', err);
      });
    }
  }
};
const guessReportTitle = async (whisperResponse) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: guessPrompt,
        },
        { role: 'user', content: whisperResponse.toLowerCase() },
      ],
      temperature: 0,
      top_p: 0,
      max_tokens: 2048,
    });
    return response.choices[0].message.content;
  } catch (error) {
    throw new Error(error);
  }
};
const getPromptReport = async (userId) => {
  try {
    const foundPrompt = await PromptReport.find({ owner: userId });
    return foundPrompt;
  } catch (error) {
    throw new Error(error);
  }
};
const checkReport = async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: checkPrompt(req.body.reportTitle),
        },
        { role: 'user', content: req.body.reportContext },
      ],
      temperature: 0,
      top_p: 0,
      max_tokens: 2048,
    });
    res.status(200).send(response.choices[0].message.content);
  } catch (error) {
    return res.status(400).send(error);
  }
};
const generateReport = async (reportTitle, reportContext, userId) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: generatePrompt(reportTitle),
        },
        { role: 'user', content: reportContext },
      ],
      temperature: 0,
      top_p: 0,
      max_tokens: 2048,
    });
    let promptReport = await getPromptReport(userId);
    console.log('GENERATE promptReport', promptReport);
    if (promptReport.length > 0) {
      promptReport[0].promptContent.push(reportContext);
      await promptReport[0].save();
    } else {
      promptReport = new PromptReport({
        promptContent: [reportContext],
        owner: userId,
        savedReports: [],
      });
      await promptReport.save();
    }
    return response.choices[0].message.content;
  } catch (error) {
    throw new Error(error);
  }
};
const getAllPromptReports = async (req, res) => {
  try {
    const reports = await PromptReport.find().populate('savedReports');
    console.log(reports);
    if (reports.length > 0) {
      const prompt = reports[0].promptContent;
      const report = reports[0].savedReports.map((report) => report.content);
      res.status(200).send({ prompt, report });
    }
    res.status(200).send();
  } catch (error) {
    console.error('Error fetching prompt reports:', error);
    res.status(500).send({ error: 'Failed to fetch prompt reports' });
  }
};
const deletePromptReportById = async (req, res) => {
  try {
    await PromptReport.deleteMany({});
    res
      .status(200)
      .send({ message: 'All prompt reports have been deleted successfully' });
  } catch (error) {
    console.error('Error deleting prompt reports:', error);
    res.status(500).send({ error: 'Failed to delete prompt reports' });
  }
};

module.exports = {
  listenUser,
  createReport,
  getReportsByUserId,
  deleteReport,
  checkReport,
  updateReport,
  getAllPromptReports,
  deletePromptReportById,
};
