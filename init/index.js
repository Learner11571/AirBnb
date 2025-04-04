const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
require("dotenv").config();

const MONGO_URL = process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}
const NodeGeocoder = require('node-geocoder');
const options = {
  provider: 'google',
  apiKey: process.env.MAP_API_KEY,
};

const geocoder = NodeGeocoder(options);

const initDB = async () => {
  await Listing.deleteMany({}); // Clear existing data
  
};

initDB();