const express = require('express');
const {
  getCurrentUser,
  login,
  signup,
  updateUser,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
} = require('../controllers/user-controller');
const {
  listenUser,
  getReportsByUserId,
  createReport,
  deleteReport,
  checkReport,
  updateReport,
  getAllPromptReports,
  deletePromptReportById,
} = require('../controllers/report-controller');
const auth = require('../middlewares/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });
const router = express.Router();

router.get('/', (req, res, next) => {
  res.status(200).send();
});
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/reports', auth, getReportsByUserId);
router.post('/report', auth, createReport);
router.delete('/report', auth, deleteReport);
router.patch('/report', auth, updateReport);

router.post('/write', auth, createReport);
router.post('/speak', auth, upload.single('audio'), listenUser);
router.post('/check', auth, checkReport);

router.patch('/user', auth, updateUser);
router.get('/user/me', auth, getCurrentUser);

router.post('/logout', auth, logout);
router.post('/logoutAll', auth, logoutAll);

router.get('/prompts', auth, getAllPromptReports);
router.delete('/prompts', auth, deletePromptReportById);

module.exports = router;
