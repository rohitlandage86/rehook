const express =  require("express");
const platformController = require("../../controllers/admin/platform.controller");

const router = express.Router();

router.post('',platformController.createPlatform);
router.get('/wma',platformController.getPaltformWma);
router.get('',platformController.getPlatforms);
router.get('/:id',platformController.getPlatform);
router.put('/:id',platformController.updatePlatform);
router.patch('/:id',platformController.onStatusChange);

// router.get('/:id',subscriptionController.getSubscription);
// router.put('/:id',subscriptionController.updateSubscription);
module.exports = router;