const express = require('express');
const router = express.Router({ mergeParams: true });
const listingController = require("../controllers/listing.js");
const wrapAsync = require('../utils/wrapAsync.js');

//find
router.route("/")
    .post(wrapAsync(listingController.findListings));

module.exports = router;