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
    _id: newExerciseTracker["_id"],
    username: newExerciseTracker["username"],
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
  const from = new Date(req.query.from).getTime() || -Infinity;
  const to = new Date(req.query.to).getTime() || Infinity;
  const limit = req.query.limit;

  ExerciseTracker.aggregate([
    { $match: { _id: new ObjectId(_id) } },
    {
      $project: {
        _id: 1,
        username: 1,
        count: 1,
        log: { description: 1, duration: 1, date: 1 },
      },
    },
  ]).then((data) => {
    if (data.length == 0) return res.send("this _id is not in the database");
    // Filtering the dates between "FROM" and "ToO"
    let logToReturn = data[0]["log"].filter((i) => {
      const dateRef = new Date(i["date"]).getTime();
      return dateRef > from && dateRef < to;
    });

    //Mapping to return objects on format {description, duration, date}
    /*  logToReturn = logToReturn.map((i) => {
      return {
        description: i["description"],
        duration: i["duration"],
        date: i["date"],
      };
    }); */

    //Slicing to get the limit Number of Logs
    const newCount = limit || data[0]["count"];
    logToReturn = logToReturn.slice(0, newCount);

    dataToReturn = [...data];
    console.log(dataToReturn);
    dataToReturn[0]["log"] = logToReturn;
    dataToReturn[0]["count"] = logToReturn.length;
    delete dataToReturn[0]["__v"];

    res.send(dataToReturn[0]);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
