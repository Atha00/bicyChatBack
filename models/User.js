const mongoose = require("mongoose");

const UserModel = mongoose.model("User", {
  name: String,
  firstName: String
});

module.exports = UserModel;
