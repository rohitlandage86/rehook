const express = require('express')
const router = express.Router()

const yelpPlatformController = require('../../controllers/business/yelp-platform.controller')
//create yelp platform...
router.post('/', yelpPlatformController.createYelpPlatform)
//goolge platform status change...
router.patch('/:id',yelpPlatformController.statusChange)
module.exports = router