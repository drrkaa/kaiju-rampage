// [js-split] ===== js/290-loop-boot.js: Main frame loop (frame), then boot: newGame(), window.__G debug hook for tests, first requestAnimationFrame (must stay last) =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ------------------------------------------------------------------- LOOP ---
let last = 0;
function frame(ts) {
  let dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts;
  if (skipDt) { dt = 0; skipDt = false; }
  frameNo++;
  if (paused) { /* frozen */ }
  else if (state === "play" && G.hitStop > 0) G.hitStop -= dt;      // hit-stop: freeze the simulation briefly
  else if (state === "play") updatePlay(dt); else updateIdle(dt);
  render();
  if (frameNo % 60 === 0) purgeChunks();
  requestAnimationFrame(frame);
}
newGame();             // so G exists for the title backdrop; the real run starts on input
window.__G = () => ({ G, state, setState: s => { state = s; }, startGame, chunks, DEBUG, bState,
  api: {
    // platform & tools (015, 272, 275, 285)
    TOUCH, TOUCH_CFG, PLATFORM, touchLayout, touchReleaseAll, DBG, DEBUG_ACTIONS, registerDebugAction, runDebugAction, debugSetMode, UI, resize, hurtPlayer,
    // player progression / look (205, 255)
    damageEnemy, PLAYER, playerAppearance, onBossKilled, evolvePlayer, updatePlayerLook, PLAYER_FORMS, PLAYER_LOOK, EVOLVE, PERKS, DEFENSE, UPGRADES,
    RADIANCE, updateRadiance, heavyChargeSpec, heavyChargeReady,
    enemyHurtCircles, enemyCircleHit, enemySegmentHit, enemyAnnulusHit, enemyConeHit, coneHit, tailHit, updateBoss,
    CAMERA, playerCameraZoom, drawKaiju, BACK_GLOW, backChargeGlow, chargedSpikeColor, bossDragonGeometry, drawBoss, VICTORY, victoryPlaying, endRestartReady,
    clawHandPose, swipeFx,
    MORTAR, SPAWN, ENEMY_SHOTS, ETYPES, updateEnemy, updateSpawning,
    BOSSES, BOSS_ADDS_MAX, BOSS_ZOOM, spawnCurve, SPAWN_CURVE, STOMP, TAILSPIN, stompBands, BATK, pickAttack, bossesAlive, spawnEnemy, spawnBoss, xpNeed, XP_GAIN_MUL, buildingXp, BLDG_XP, gainXp, awardXp, checkLevelUp, anySolid, freeSpot, collideEnemy, steerGround, ENEMY_NAV, BOSS_BLDG, XP_LABEL, stepTurn, spriteCache, enemySprite, drawEnemyShadows, ENEMY_SPRITE, jag, roarPose, setPaused, isPaused: () => paused, smokers, SMOKE, BLDG_STAGES, SWIPE_LV, BREATH_LV, swipeStats, breathStats, swipeLevel, breathLevel, weaponDesc, speedFactor, turnToward, approachVel, getChunk, damageBuilding, buildingsInCircle, purgeChunks, collidePlayer, trySwipe,
         startAbility, spawnTremor, colRect, crushTrees, tremorRadius, bumpFrame: n => { frameNo += n; }, canAct, BREATH, SWIPE, MOVE, TREMOR, ROAR, renderChunk, fireProj, hasLOS, segHitsBuilding, COVER, COVER_HINT, BOSS_TUNE, coverState, showCoverHint,
    // beams & charge (035, 155, 165, 245, 265)
    gainCharge, CHARGE, MEGA, SUPERLASER, BEAM_SPECS, BEAM_FX, TEASE, heavyBeamK, beamDimAmount, unlockSuperLaser, superLaserOnBossKilled, superLaserReady, ACTION_MODS, drawTitleTease, drawRampageHud, rollChoices, grantDebugLevels,
    // movement chunk (165, 035)
    // evade slot + leveled Super Laser (035, 165, 166)
    EVADE, HEAVY_LV, startEvade, evadeLift, isEvading, heavyBeamId, isSuperLaser, abilCd, ABILS, upgradeAvailable, applyUpgrade,
    BUILDING_SECTIONS, buildingParts, cityBlocksInBox, citySegmentFree, cityRouteDirection, cityRouteField, CITY_NAV,
    // world & ground chunk (085, 086, 175)
    damageCarsInCircle, damageCarsInSegment, damageCarsInCone, onFootstepMark, onStompMark, onTremorMark, groundWearAdd, tileWear, wearKey, surfaceAt, wearStage, WS, WEAR, WORLD_CARS, MARKS, drawGroundWear,
    isFlying, levelSpeedMul, levelTurnMul, ramBuilding, MOVE_LEVEL, FLYING_TYPES, TREMOR_FX } });  // debug hook for tests
requestAnimationFrame(frame);
