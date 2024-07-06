const express = require('express')
const router = express.Router()

const googlePlatformController = require('../../controllers/business/google-platform.controller')

//create google platform...
router.post('/',googlePlatformController.createGooglePlatform);

//goolge platform status change...
router.patch('/:id',googlePlatformController.statusChange)

module.exports = router