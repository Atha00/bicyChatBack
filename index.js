const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const uid2 = require("uid2");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
mongoose.connect(
  "mongodb://localhost/bike-chat",
  { useNewUrlParser: true }
);

const app = express();

const BikeModel = require("./models/Bike");
const MessageModel = require("./models/Message");
const ThreadModel = require("./models/Thread");
const UserModel = require("./models/User");

// const farid = new UserModel({
//   firstName: "Farid",
//   name: "Safi"
// });
// farid.save();

// const xavier = new UserModel({
//   firstName: "Xavier",
//   name: "Chéplus"
// });
// xavier.save();

// const bike = new BikeModel({ brand: "Decathlon", user: farid });
// bike.save();

// const thread = new ThreadModel({
//   users: [farid, xavier],
//   bike: bike
// });
// thread.save();

app.get("/", function(req, res) {
  res.send({ msg: "Hello Chat" });
});

app.get("/messages/:thread", function(req, res) {
  MessageModel.find({ thread: req.params.thread })
    .populate({ path: "user" })
    .populate({ path: "thread", populate: { path: "bike" } })
    .sort({ createdAt: -1 })
    .exec((err, messages) => {
      res.send(messages);
    });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", function connection(ws, req) {
  console.log("someone is connected");
  ws.on("message", function incoming(data) {
    try {
      const dataJSON = JSON.parse(data);
      console.log(dataJSON);

      // text: String,
      // createdAt: { type: Date, default: Date.now },
      // user: {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "User"
      // },
      // thread: {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "Thread"
      // }

      UserModel.findOne({ name: dataJSON.name }).exec((err, user) => {
        MessageModel.find({ thread: dataJSON.thread })
          .count()
          .exec((err, count) => {
            let message;
            if (count === 0) {
              message = new MessageModel({
                text: dataJSON.text,
                user: user,
                thread: dataJSON.thread,
                isRequest: true
              });
            } else {
              message = new MessageModel({
                text: dataJSON.text,
                user: user,
                thread: dataJSON.thread,
                isRequest: false
              });
            }

            message.save(err => {
              wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  if (dataJSON.text && dataJSON.name) {
                    client.send(
                      JSON.stringify({
                        _id: message._id,
                        text: dataJSON.text,
                        user: { name: dataJSON.name },
                        createdAt: message.createdAt
                      })
                    );
                  }
                }
              });
            });
          });
      });
    } catch (e) {
      console.error(e.message);
    }
  });
});

server.listen(process.env.PORT || 3000, function listening() {
  console.log("Listening on %d", server.address().port);
});
