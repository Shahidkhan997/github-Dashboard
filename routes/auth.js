const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/github/callback", authController.githubCallback);
router.get("/integration/status", authController.getIntegrationStatus);
router.post("/integration/remove", authController.removeIntegration);

module.exports = router;
