const express = require("express");
const externalController = require("../../controllers/external/external.controller");
const router = express.Router();

router.get('/yelp/business/search',externalController.yelpBusinessSearch);
router.get('/yelp/business/phone',externalController.yelpBusinessSearchByPhone);
router.get('/yelp/business/businessId',externalController.yelpBusinessSearchByBusinessId);
router.get('/yelp/business/reviews',externalController.yelpBusinessReviewById);
router.get('/google/business/search',externalController.googleBusinessSearch);
router.get('/google/business/place',externalController.googleBusinessSearchById);
router.get('/bbb/business/organization',externalController.bbbBusinessSearch);
router.post('/review-submit',externalController.reviewSubmit);
router.get('/negative-review',externalController.getNegativeReviews);
router.get('/negative-review/:id',externalController.getNegativeReview);
router.get('/check-platform-connected',externalController.checkPlatformConnection);
// router.get('/twilio/business/organization',externalController.twilio)
// router.get('/google/business/demo',externalController.demo)

module.exports = router;