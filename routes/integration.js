const express = require("express");

const router = express.Router();

router.get("/connect/github", (req, res) => {
  const scopes = ["read:org", "repo"];
  console.log(
    "Redirecting to GitHub for authentication with scopes:",
    process.env.GITHUB_REDIRECT_URL
  );
  const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${
    process.env.GITHUB_CLIENT_ID
  }&redirect_uri=${process.env.GITHUB_REDIRECT_URL}&scope=${scopes.join(" ")}`;

  console.log(redirectUrl);
  res.redirect(redirectUrl);
});

module.exports = router;
