const express = require("express");
const PeriodController = require("../../controllers/admin/period.controller");
const router = express.Router();

router.get('',PeriodController.getPeriods);

module.exports = router;