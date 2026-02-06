
const express = require('express');
const router = express.Router();

// Controllers import
// Humne identifiers ko "Controller" suffix ke saath uniform rakha hai
const sedanController = require('../controllers/sedanPricingController');
const suvController = require('../controllers/suvPricingController');
const hourlyController = require('../controllers/hourlyPricingController');
const firstClassController = require('../controllers/firstClassPricingController'); // Path check kar lein


// 🏎️ Sedan Endpoint
// Pehle Sedan logic check hoga, agar 'hours' milay to hourlyController ko pass hoga
router.post('/sedan', sedanController.calculateSedanDistance, hourlyController.calculateHourlyPrice);

// 🚙 SUV Endpoint
// Pehle SUV logic check hoga, agar 'hours' milay to hourlyController ko pass hoga
router.post('/suv', suvController.calculateSuvDistance, hourlyController.calculateHourlyPrice);




// First Class Pricing Route
router.post('/first-class', firstClassController.calculateFirstClassDistance, hourlyController.calculateHourlyPrice);



module.exports = router;