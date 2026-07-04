const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  companyCode: { type: String, required: true },
  year: { type: Number, required: true },
  seq: { type: Number, default: 0 }
});

counterSchema.statics.getNextSequence = async function(companyCode, year) {
  const counter = await this.findOneAndUpdate(
    { companyCode, year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

module.exports = mongoose.model('Counter', counterSchema);