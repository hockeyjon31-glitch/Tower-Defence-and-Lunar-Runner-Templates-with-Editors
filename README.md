I have created AstraCraft Studio, a game development suite inspired by modern game studios like Nodecraft, specialized for two distinct sci-fi templates with full gameplay campaigns and integrated visual level editors:
1. Moon Rover Trials (2D Vehicle Platformer)
Physics & Vehicle Mechanics:
Real-time 2D lunar physics engine with dual-wheel suspension struts, variable spring stiffness, damping, traction friction, and low lunar gravity.
Rollover Detection: Flipping the vehicle upside down or having the cabin roll cage strike the lunar regolith causes an immediate crash.
Airborne Balance Controls: Use Q/E (or on-screen tilt pedals) to apply rotational torque in mid-air and level out before touchdown.
Helium-3 Boosters: Use W/Space/Up to leap across crater chasms and plasma minefields.
Pickups & Hazards: Collectible Alien Power Crystals, Helium-3 fuel canisters, proximity plasma mines, springboards, and low-gravity anomaly zones.
Integrated Level Editor:
Visual terrain heightfield sculptor with node positioning, crater stamp brush, and slope smoothing.
Drag-and-drop object palette (Spawn, Finish Beacon, Crystals, Fuel, Mines, Jump Pads, Low-G Fields).
Physics inspector for tuning lunar gravity, motor torque, suspension springs, damping, and booster thrust.
Single-click "Test Drive" button for instant playtesting and returning to the editor.
2. Cursed Relic: Lunar Outpost (Cursed Treasure Style TD)
Authentic Cursed Treasure Mechanics:
An ancient Monolith Vault holds 5 Alien Relic Cores.
Alien invaders march through lunar trenches to steal relics and escape toward the exit.
Dropped Relics: Destroying an invader carrying a relic drops the artifact onto the lunar dust. Passing aliens will pick it up and carry it closer to escape!
Dematerialization Return: Undisturbed dropped relics slowly return to the Vault over time, or can be recalled using orbital recall drones.
Terrain-Restricted Towers & Tech Trees:
Plasma Blaster (Must be built on Lunar Basalt): Upgrades to armor-piercing Hyper-Railgun or rapid-fire Gatling Repeater.
Cryo-Stasis Spire (Built on Lunar Regolith): Upgrades to AoE Glacial Permafrost or shield-shattering Absolute Zero Laser.
Tesla Arc Spire (Built on Crystalline Geodes): Upgrades to multi-target Overcharge Arc Storm or boss-melting Solar Disintegrator.
Clearable Debris: Spend minerals to blast meteor rubble into buildable Basalt rock.
Orbital Command Powers:
Orbital Meteor: Targeted kinetic bombardment dealing high AoE burst damage.
Stasis EMP Pulse: Freezes all aliens on the surface for 4 seconds.
Relic Recall Drone: Instantly teleports a dropped relic back into the Vault.
Integrated Level Editor:
Grid painter for paths, basalt, geode, regolith, obsidian, debris, spawn portals, and vault waypoints.
Real-time path connectivity checker ensuring aliens have a traversable route.
Wave configurator to adjust enemy types (Scouts, Armored Mechs, Phase Weavers, Swarms, Goliath Titans), spawn delays, and rewards.
3. Studio Dashboard & Audio Engine
Dashboard: Browse campaign levels and custom user-created levels, create new tracks, or inspect engine documentation.
Audio Synthesizer: Procedural Web Audio API sound synthesizer with engine revs, boost whooshes, laser blasts, tesla lightning, "Relic Taken!" alarms, and a toggleable ambient sci-fi synthesizer.
