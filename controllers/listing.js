const Listing = require("../models/listing");
const geolocation = require("geolocation");
require('dotenv').config();
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
    res.json({ success: true, listings: listingsWithinRadius,gstPrice});
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

    res.render("listings/show.ejs", { listing });
};

module.exports.createNewListing = async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image.filename = req.file.filename;
    newListing.image.url = req.file.path;
    const result = await geocoder.geocode(`${newListing.country} ${newListing.location}`);
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