const express = require("express");
const businessController = require("../../controllers/business/business.controller");
const checkAuth = require("../../middleware/check.auth");
const router = express.Router();

router.post('/sign-up',businessController.businessSignUp);
router.post('/login',businessController.businessLogin);
router.post('/logout',checkAuth,businessController.businessLogout);
router.get('/',businessController.getBusinessList);
// router.get('/wma',subscriptionController.getSubscriptionWma);
// router.get('/:id',subscriptionController.getSubscription);
// router.put('/:id',subscriptionController.updateSubscription);
// router.patch('/:id',subscriptionController.onStatusChange);

module.exports = router;