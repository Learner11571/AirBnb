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
  // Set initial data with empty coordinates object
  initData.data = initData.data.map((obj) => ({
    ...obj,
    owner: "66f2b9ed12d2570cb3330a9f",
    coordinates: { type: "Point", coordinates: [0, 0] }  // Initialize coordinates with default values
  }));
  
  let listings = await Listing.insertMany(initData.data);  // Insert data with default coordinates
  
  for (let listing of listings) {
    try {
      const result = await geocoder.geocode(`${listing.country} ${listing.location}`);
      
      if (result && result[0]) {
        // Ensure the correct structure for GeoJSON
        listing.coordinates = {
          type: "Point",  // Set the required type
          coordinates: [result[0].longitude, result[0].latitude]  // Geocoder returns lat, lon; ensure correct order
        };
        
        await listing.save();  // Save updated listing with coordinates
      } else {
        console.log(`No geocoding result for ${listing.location}, ${listing.country}`);
      }
    } catch (err) {
      console.error(`Error geocoding ${listing.location}, ${listing.country}:`, err);
    }
  }
  console.log(listings[0].coordinates.coordinates);
  console.log("Data was initialized successfully.");
};

initDB();