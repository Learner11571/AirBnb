const Listing = require("../models/listing");
const nodemailer = require("nodemailer");
require('dotenv').config();
const axios = require('axios');
const NodeGeocoder = require('node-geocoder');
const options = {
    provider: 'google',
    apiKey: process.env.MAP_API_KEY,
};

const geocoder = NodeGeocoder(options);

module.exports.index = async (req, res) => {
    const listings = await Listing.find();
    let gstPrice = [];
    for (let i = 0; i < listings.length; i++) {
        gstPrice.push(listings[i].price * 1.18);
    }
    res.render("listings/index.ejs", { listings, gstPrice });
};

module.exports.searchListing = async (req, res) => {
    const qu = req.query.title;
    if (!qu) {
        req.flash("error", "Please enter the query!");
        return res.redirect("/listings");
    }
    const listings = await Listing.find({ title: { $regex: new RegExp(qu, 'i') } });
    if (!listings) {
        req.flash("error", "No results for this search!");
        return res.redirect("/listings");
    }
    let gstPrice = [];
    for (let i = 0; i < listings.length; i++) {
        gstPrice.push(listings[i].price * 1.18);
    }
    res.render("listings/index.ejs", { listings, gstPrice });
};

module.exports.findListings = async (req, res) => {
    const { latitude, longitude } = req.body;
    const listingsWithinRadius = await Listing.find({
        coordinates: {
            $geoWithin: {
                $centerSphere: [[longitude, latitude], 10 / 6371]
            }
        }
    });
    if (!listingsWithinRadius) {
        req.flash("error", "No hotels found near you!");
        return;
    }
    let gstPrice = [];
    for (let i = 0; i < listingsWithinRadius.length; i++) {
        gstPrice.push(listingsWithinRadius[i].price * 1.18);
    }
    res.json({ success: true, listings: listingsWithinRadius, gstPrice });
}

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({ path: "reviews", populate: { path: "author" } }).populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings");
    }
    
    const places = await findNearbyAmenities(listing.coordinates.coordinates[1],listing.coordinates.coordinates[0]);
    res.render("listings/show.ejs", { listing,places });
};

module.exports.createNewListing = async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image.filename = req.file.filename;
    newListing.image.url = req.file.path;
    const result = await geocoder.geocode(`${newListing.location} ${newListing.country}`);
    newListing.coordinates = {
        type: "Point",
        coordinates: [result[0].longitude, result[0].latitude]
    };
    await newListing.save();
    req.flash("success", "New Listing created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings");
    }
    let imgurl = listing.image.url;
    imgurl = imgurl.replace("/upload", "/upload/w_250")
    res.render("listings/edit.ejs", { listing, imgurl });
};

module.exports.updateListing = async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body.listing };
    if (req.file) {
        updateData.image = {
            filename: req.file.filename,
            url: req.file.path
        };
    }
    const result = await geocoder.geocode(`${updateData.country} ${updateData.location}`);
    updateData.coordinates = {
        type: "Point",
        coordinates: [result[0].longitude, result[0].latitude]
    };
    const listing = await Listing.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};

module.exports.sendEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Listing.findById(id);

        if (!hotel) {
            req.flash("error", "Hotel not found.");
            return res.redirect("/listings");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            secure: true,
            port: 465,
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS
            }
        });

        const recipientEmail = res.locals.currUser?.email; // Ensure currUser exists
        if (!recipientEmail) {
            req.flash("error", "User email not found.");
            return res.redirect(`/listings/${id}`);
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: "WanderLust Booking Confirmation",
            text: `Your request to book the hotel ${hotel.title} is confirmed.`
        };

        // Using async/await for better error handling
        await transporter.sendMail(mailOptions);
        
        req.flash("success", "Booking confirmed! Check your email.");
        return res.redirect(`/listings/${hotel._id}`); // Redirect to show flash message

    } catch (error) {
        console.error("Error in sendEmail:", error);
        req.flash("error", "Something went wrong! Please try again.");
        return res.redirect("/listings");
    }
};

async function findNearbyAmenities(lat, long) {
    const categories = {
        gym: "gym",
        theatre: "movie_theater",
        food: "restaurant",
        hospital: "hospital",
        banks: "bank",
        ATM: "atm",
        religious: "hindu_temple",
        tourist: "tourist_attraction"
    };

    const places = {
        gym: [],
        theatre: [],
        food: [],
        hospital: [],
        banks: [],
        ATM: [],
        religious: [],
        tourist: []
    };

    try {
        for (const [key, type] of Object.entries(categories)) {
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
                params: {
                    location: `${lat},${long}`,
                    radius: 2000, 
                    type: type,
                    key: process.env.MAP_API_KEY
                }
            });

            // ✅ Filter out permanently closed places
            const extractedPlaces = response.data.results.filter(place => !place.permanently_closed);

            // ✅ Extract required fields & compute score
            places[key] = extractedPlaces.map(place => {
                const rating = place.rating || 0;
                const total_reviews = place.user_ratings_total || 0;

                return {
                    name: place.name,
                    location: place.geometry.location,
                    rating: rating,
                    total_reviews: total_reviews,
                    score: total_reviews >= 100 ? rating * total_reviews : 0, // ✅ Score only if 100+ reviews
                    address: place.vicinity,
                    photo: place.photos 
                        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${process.env.MAP_API_KEY}` 
                        : null
                };
            });

            // ✅ Sort & keep top 5 results
            places[key].sort((a, b) => a.score - b.score);
            places[key] = places[key].slice(0, 5);
        }
        return places;
    } catch (error) {
        console.error("Error fetching amenities:", error.message);
        return places; // Return empty lists if error occurs
    }
}
