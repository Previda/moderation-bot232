const { Schema, model } = require('mongoose');

const ticketSchema = new Schema({
  guildID: { type: String, required: true },
