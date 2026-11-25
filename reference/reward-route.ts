router.post("/users/me/game-reward", (_req,res) => {
  res.status(410).json({awarded:false,seedsAwarded:0,alreadyClaimed:false,
    error:"Game Seed rewards are disabled until server-validated runs are available.",
    message:"Practice mode. No Seeds awarded."});
});
