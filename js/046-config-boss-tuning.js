"use strict"; // classic script (no modules). Boss telegraph / pacing tunables (dodgeability).
// Dodgeability rule used when tuning: the player (base speed 180, sideways x0.45, backwards x0.9, 0.15 s acceleration lag,
// ~0.25 s reaction) must be able to leave the danger zone during the warning: warn >= distance_to_leave / escape_speed + 0.4.
const BOSS_TUNE = {
  // charge: warn = red lane telegraph before the lunge; speed in px/s; dur = lunge seconds; dwarn = warn of the 2nd dash of a double charge
  charge: {
    ragehorn: { warn: 1.3, speed: 780, dur: 0.65, dwarn: 0.95 },
    omega:    { warn: 1.15, speed: 1000, dur: 0.55, dwarn: 0.8 },
    voltgaze: { warn: 0.85, speed: 1150, dur: 0.55, dwarn: 0.65 },
  },
  standOff: 70, spinReach: 240,
  lightningWarn: 0.85, lightningRange: 760, lightningWidth: 30,
  spinWarn: 1.9,         // wide spin: enough time to leave the danger zone
  slamWarn: 1.2,         // ground-pound circles (r 95), staggered +0.15 each
  leapWarn: 1.35,        // leap landing circle (r 115)
  rubbleWarn: 1.2,       // rubble circles (r 85), staggered +0.22 each
  rainWarn: 1.0,         // debris rain / meteor circles (r 70), staggered +0.18 each
  chainGap: 0.12,
  recMul: { ragehorn: 0.6, voltgaze: 0.6, omega: 0.6 },   // brief recovery between attacks; warning times stay dodgeable
};
