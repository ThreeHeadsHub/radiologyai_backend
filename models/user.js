const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Email is not valid');
        }
      },
    },
    password: { type: String, required: true },
    reports: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Report' }],
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

userSchema.methods.generateToken = async function () {
  const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_KEY, {
    expiresIn: '7d',
  });
  this.tokens = this.tokens.concat({ token });
  await this.save();
  return token;
};
userSchema.methods.toJSON = function () {
  let user = this.toObject();
  delete user.password;
  delete user.tokens;
  return user;
};
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email });

  if (!user) {
    return null;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return null;
  }

  return user;
};

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
