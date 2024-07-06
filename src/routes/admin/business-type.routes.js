const express = require("express");
const businessTypeController = require("../../controllers/admin/business-type.controller");
// const checkAuth = require("../../middleware/check.auth");
const router = express.Router();

router.post('',businessTypeController.businessTypeCreate);
router.get('',businessTypeController.getBusinessTypes);
router.get('/wma',businessTypeController.getBusinessTypesWma);
router.get('/:id',businessTypeController.getBusinessType);
router.put('/:id',businessTypeController.updateBusinessType);
router.patch('/:id',businessTypeController.onStatusChange);

module.exports = router;