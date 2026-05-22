/**
 * UserPreference Model
 * Stores student personalization preferences for contextual LLM responses
 */

const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  faculty: {
    type: String,
    default: null
  },
  programme: {
    type: String,
    default: null
  },
  year: {
    type: Number,
    default: null
  },
  preferredLanguage: {
    type: String,
    enum: ['ms', 'en', 'mixed', null],
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
