const express = require("express");
const subscriptionController = require("../../controllers/admin/subscription.controller");
// const checkAuth = require("../../middleware/check.auth");
const router = express.Router();

router.post('',subscriptionController.createSubscription);
router.get('',subscriptionController.getSubscriptions);
router.get('/wma',subscriptionController.getSubscriptionWma);
router.get('/:id',subscriptionController.getSubscription);
router.put('/:id',subscriptionController.updateSubscription);
router.patch('/:id',subscriptionController.onStatusChange);

module.exports = router;