const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ExerciseTracker = require("./exerciseTrackerModel");
const { ObjectId, ReturnDocument } = require("mongodb");

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.MONGO_URI);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", (req, res) => {
  ExerciseTracker.aggregate([
    { $project: { _id: 1, username: 1, __v: 1 } },
  ]).then((data) => res.send(data));
});

app.post("/api/users", (req, res) => {
  const username = req.body.username;
  const newExerciseTracker = new ExerciseTracker({
    username,
    count: 0,
    log: [],
  });
  newExerciseTracker.save();

  res.json({
    username: newExerciseTracker["username"],
    _id: newExerciseTracker["_id"],
  });
});

app.post("/api/users/:_id/exercises", (req, res, next) => {
  const _id = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;

  if (date === "") {
    date = new Date();
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    date = new Date(req.body.date);
  } else {
    return res.send({ date: "format is invalid" });
  }

  date = date.toDateString();

  ExerciseTracker.findOneAndUpdate(
    { _id: _id },
    {
      $push: { log: { description, duration, date } },
      $inc: { count: 1 },
    },
    { returnDocument: "after" }
  )
    .then((data) =>
      res.send({
        _id: data["_id"],
        username: data["username"],
        date: data["log"][data["count"] - 1]["date"],
        duration: data["log"][data["count"] - 1]["duration"],
        description: data["log"][data["count"] - 1]["description"],
      })
    )
    .catch((err) => {
      res.send("this _id is not in the database");
    });
});

app.get("/api/users/:_id/logs", (req, res) => {
  const _id = req.params._id;
  const from = req.query.from && -Infinity; //new Date(req.query.from).getTime() || -Infinity;
  const to = new Date(req.query.to).getTime() || Infinity;
  const limit = req.query.limit;

  ExerciseTracker.find(
    { _id: _id },
    { "log._id": 0, __v: 0 },
    { "log.date": { $gt: from } }
  ).then((data) => {
    console.log(
      new Date(from).getTime(),
      new Date(data[0]["log"][1]["date"]).getTime()
    );
    if (data.length == 0) return res.send("this _id is not in the database");
    let logToReturn = data[0]["log"];
    logToReturn = logToReturn.filter(
      (i) =>
        Number(new Date(i["date"]).getTime()) >=
          Number(new Date(from).getTime()) &&
        Number(new Date(i["date"]).getTime()) <= Number(new Date(to).getTime())
    );
    console.log(logToReturn);
    res.send(data[0]);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
