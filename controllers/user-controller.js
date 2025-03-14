const User = require("../models/user");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASSWORD,
  },
});

const getCurrentUser = async (req, res) => {
  const user = req.user;
  try {
    res.status(200).send({ user });
  } catch (error) {
    return res.status(500).status({ error: "Internal Server Error" });
  }
};
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findByCredentials(email, password);

    if (!user) {
      return res.status(401).send("Invalid email or password");
    }

    const token = await user.generateToken();

    res.status(200).send({ email: user.email, token: token });
  } catch (error) {
    return res.status(500).send("Unable to Log User In");
  }
};

const signup = async (req, res) => {
  const { email, password } = req.body;
  try {
    const foundUser = await User.findOne({ email });
    if (foundUser) {
      return res.status(200).send("Email zaten kayıtlı");
    }
  } catch (error) {
    return res.status(200).send("Database Error");
  }
  try {
    const user = new User({
      email,
      password,
      reports: [],
    });
    await user.save();
    return res.status(201).send();
  } catch (error) {
    return res.status(200).send("Bir hata oluştu");
  }
};
const updateUser = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = new Set(["email", "password"]);
  const isValidUpdate = updates.every((update) => allowedUpdates.has(update));

  if (!isValidUpdate) {
    return res.status(400).send({ error: "Invalid Update" });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send({ error: "No User Found" });
    }
    updates.forEach((update) => {
      user[update] = req.body[update];
    });

    await user.save();

    res.status(200).send(user.toJSON());
  } catch (error) {
    return res
      .status(400)
      .send({ error: error.message || "Unable to Update User" });
  }
};
const logout = async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      (token) => token.token !== req.token
    );
    await req.user.save();
    res.status(200).send();
  } catch (error) {
    res.status(500).send();
  }
};
const logoutAll = async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.status(200).send();
  } catch (error) {
    res.status(500).send();
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: "Kullanıcı bulunamadı" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });

    const resetLink = `${process.env.FRONT_LINK}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      //to: process.env.EMAIL_USER,
      subject: "Şifrenizi Sıfırlayın",
      text: `Şifrenizi sıfırlamak için bu bağlantıya tıklayın: ${resetLink}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send({ message: "E-posta gönderilemedi" });
      }
      res.status(200).send({ message: "E-posta gönderildi!" });
    });
  } catch (error) {
    res.status(500).send({ message: "Bir hata oluştu, lütfen tekrar deneyin" });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;
  console.log("token : ", token)
  console.log("password : ", password)
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("decoded : ", decoded)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).send({ message: "Kullanıcı bulunamadı" });
    }

    user.password = password;
    await user.save();

    res.status(200).send({ message: "Şifreniz başarıyla değiştirildi" });
  } catch (error) {
    res.status(500).send({ message: "Bir hata oluştu" });
  }
};

module.exports = {
  getCurrentUser,
  updateUser,
  login,
  logout,
  logoutAll,
  signup,
  forgotPassword,
  resetPassword
};
