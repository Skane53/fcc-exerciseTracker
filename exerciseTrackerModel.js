const mongoose = require("mongoose");

const exerciseTrackerSchema = {
  username: { type: String, required: true },
  count: { type: Number },
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: String,
    },
  ],
};

const ExerciseTracker = mongoose.model(
  "ExerciseTracker",
  exerciseTrackerSchema
);

module.exports = ExerciseTracker;
