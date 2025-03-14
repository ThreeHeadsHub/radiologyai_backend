const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = async (req, res, next) => {
  if (req.method == 'OPTIONS') {
    return next();
  }
  try {
    const token = req.headers.authorization.replace('Bearer ', '');
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findOne({
      _id: decodedToken._id,
      'tokens.token': token,
    });
    if (!user) {
      throw new Error();
    }
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).send('Authentication Failed');
  }
};
