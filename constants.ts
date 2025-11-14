// Game Configuration Constants - All tunables in one place
export const GAME_CONFIG = {
  // ===================
  // PHYSICS CONSTANTS
  // ===================
  PHYSICS: {
    // Base physics values
    MAX_VELOCITY_INITIAL: 22,        // u/s - Starting max velocity
    ACCELERATION_BASE: 6,            // u/s² - Base acceleration
    DRIFT_FACTOR_INITIAL: 0.85,     // Initial drift responsiveness (0-1)
    SLIP_DAMPING: 8,                 // s⁻¹ - How fast slip reduces when input released
    
    // Advanced physics
    YAW_RATE_MAX: Math.PI * 2,       // rad/s - Maximum yaw rate (120°/s)
    DRIFT_THRESHOLD: Math.PI / 36,   // rad - Minimum slip angle for drift detection (5°)
    RECOVERY_DAMPING: 0.85,          // Damping factor when releasing input
    OVERSTEER: 0.15,                 // Slight oversteer feel for arcade physics
    LATERAL_FORCE_MAX: 15,           // Maximum lateral force during drift
    VELOCITY_INFLUENCE: 0.3,         // How much velocity affects drift
    
    // Bounds and validation
    MAX_POSITION_JUMP: 5,            // Maximum position change per tick (anti-cheat)
    MAX_ACCELERATION_ALLOWED: 15,    // Maximum allowed acceleration (anti-cheat)
    TELEPORT_THRESHOLD: 20,          // Distance that constitutes teleporting
    STUCK_THRESHOLD: 0.1,            // Minimum movement to avoid "stuck" detection
  },

  // ===================
  // CAMERA CONSTANTS
  // ===================
  CAMERA: {
    // Position relative to car
    OFFSET: { x: 0.8, y: 2.4, z: -6.5 }, // Right, Up, Back from car center
    
    // Orientation
    YAW_ANTICIPATION: 10,            // Degrees - Camera looks ahead to right
    PITCH_BASE: -12,                 // Degrees - Downward angle
    
    // Field of View
    FOV_BASE: 65,                    // Degrees - Base FOV
    FOV_MIN: 60,                     // Degrees - Minimum FOV (low speed)
    FOV_MAX: 75,                     // Degrees - Maximum FOV (high speed/drift)
    
    // Smoothing (lag times in seconds)
    SMOOTHING: {
      HORIZONTAL: 0.30,              // Horizontal movement lag
      VERTICAL: 0.20,                // Vertical movement lag
      ZOOM: 0.15,                    // FOV change damping
      ROLL: 0.25,                    // Roll transition time
    },
    
    // Roll effect
    ROLL_MAX: 3,                     // Degrees - Maximum roll during drift
    
    // Camera shake
    SHAKE: {
      INTENSITY_MAX: 0.5,            // Maximum shake intensity
      DURATION: 0.5,                 // Seconds - Shake duration
      TRIGGER_DRIFT_TIME: 2.0,       // Seconds - Drift time to trigger shake
      AMPLITUDE: { x: 0.3, y: 0.5, z: 0.3 }, // Shake amplitude per axis
    },
    
    // Safety
    NEAR_PLANE: 0.1,                 // Near clipping plane
    FAR_PLANE: 2000,                 // Far clipping plane
    DRAW_DISTANCE: 1000,             // Effective draw distance
  },

  // ===================
  // TRACK CONSTANTS
  // ===================
  TRACK: {
    // Dimensions
    WIDTH_BASE: 7.0,                 // Base track width in units
    WIDTH_VARIATION: { min: 0.8, max: 1.2 }, // Width multiplier range
    GUARDRAIL_HEIGHT: 0.6,           // Height of guardrails
    
    // Generation
    SEGMENT_STEP_SIZE: 2.0,          // Distance between centerline points
    CHECKPOINT_INTERVAL: 25,         // Distance between checkpoints (meters)
    
    // Pooling and streaming
    SEGMENT_POOL_SIZE: 25,           // Number of segments to keep active
    GENERATE_AHEAD_DISTANCE: 200,    // Distance ahead to generate (meters)
    DESPAWN_BEHIND_DISTANCE: 50,     // Distance behind to remove (meters)
    MAX_SEGMENTS: 100,               // Maximum segments for memory management
    
    // Curvature limits (radians per unit)
    CURVATURE: {
      GENTLE: Math.PI / 6 / 45,      // 30° over 45 units
      MEDIUM: Math.PI / 3 / 40,      // 60° over 40 units  
      HAIRPIN: 2 * Math.PI / 3 / 35, // 120° over 35 units
      S_CURVE_AMPLITUDE: Math.PI / 9, // 20° amplitude for S-curves
    },
    
    // Banking limits (radians)
    BANKING: {
      GENTLE: Math.PI / 90,          // 2°
      MEDIUM: Math.PI / 45,          // 4°
      HAIRPIN: Math.PI / 30,         // 6°
    },
  },

  // ===================
  // DIFFICULTY CONSTANTS
  // ===================
  DIFFICULTY: {
    // Progression
    INTERVAL: 300,                   // Distance interval for difficulty increases (meters)
    MAX_DISTANCE: 3000,              // Distance where max difficulty is reached
    
    // Velocity scaling
    VELOCITY_SCALING: {
      BEGINNER: 1.0,                 // No scaling
      INTERMEDIATE: 1.15,            // 15% faster
      EXPERT: 1.35,                  // 35% faster
      INSANE: 1.55,                  // 55% faster
    },
    
    // Track generation bias
    RIGHT_TURN_BIAS: {
      BASE: 0.65,                    // 65% base right turn bias
      MAX: 0.80,                     // 80% maximum bias at high difficulty
      PROGRESSION: 0.02,             // Increase per difficulty tier
    },
    
    // Curve frequency (0-1)
    CURVE_FREQUENCY: {
      MIN: 0.3,                      // 30% curves at easy
      MAX: 0.9,                      // 90% curves at insane
    },
    
    // Score multipliers
    SCORE_MULTIPLIERS: {
      BEGINNER: 1.0,
      NOVICE: 1.2,
      INTERMEDIATE: 1.5,
      ADVANCED: 1.8,
      EXPERT: 2.2,
      MASTER: 2.5,
      INSANE: 3.0,
    },
  },

  // ===================
  // MULTIPLAYER CONSTANTS
  // ===================
  MULTIPLAYER: {
    // Network timing
    TICK_RATE: 30,                   // Server update rate (Hz)
    SNAPSHOT_RATE: 18,               // Snapshot broadcast rate (Hz)
    
    // Client prediction and lag compensation
    INTERPOLATION_BUFFER: 120,       // Milliseconds to buffer for interpolation
    EXTRAPOLATION_MAX: 80,           // Maximum extrapolation time (ms)
    ROLLBACK_FRAMES: 8,              // Frames to keep for rollback
    
    // Ghost rendering
    GHOST_OPACITY: 0.5,              // Default opacity for remote players
    PROXIMITY_OPACITY: 0.35,         // Opacity when players are close
    PROXIMITY_DISTANCE: 1.5,         // Distance threshold for proximity (units)
    PROXIMITY_DURATION: 2000,        // Time to maintain low opacity (ms)
    
    // Room limits
    MAX_PLAYERS_PER_ROOM: 8,         // Maximum players in one room
    DEFAULT_ROOM_SIZE: 4,            // Default room size
    MIN_PLAYERS_TO_START: 2,         // Minimum players to start a game
    
    // Game timing
    COUNTDOWN_DURATION: 3000,        // Milliseconds for countdown
    MAX_GAME_DURATION: 300000,       // 5 minutes maximum game time
    RECONNECTION_TIMEOUT: 30000,     // 30 seconds to reconnect
    
    // Anti-cheat
    MAX_INPUT_RATE: 50,              // Maximum inputs per second
    VALIDATION_WINDOW: 5000,         // Time window for violation tracking (ms)
    TRUST_SCORE_THRESHOLD: 0.3,      // Minimum trust score to continue
  },

  // ===================
  // VISUAL EFFECTS
  // ===================
  EFFECTS: {
    // Particle systems
    PARTICLES: {
      SMOKE: {
        EMIT_RATE_BASE: 30,          // Base particles per second
        EMIT_RATE_MAX: 100,          // Maximum particles per second
        LIFETIME: { min: 0.8, max: 1.5 }, // Particle lifetime range
        SIZE: { min: 0.5, max: 1.2 }, // Particle size range
        DRIFT_THRESHOLD: Math.PI / 18, // 10° - Min drift angle for smoke
      },
      
      SPARKS: {
        EMIT_RATE: 80,               // Particles per second during sparks
        LIFETIME: { min: 0.2, max: 0.6 }, // Spark lifetime range
        SIZE: { min: 0.1, max: 0.3 }, // Spark size range
        DRIFT_THRESHOLD: Math.PI / 9, // 20° - Min drift angle for sparks
      },
    },
    
    // Tire trails
    TIRE_TRAILS: {
      LIFETIME: 4000,                // Trail visibility time (ms)
      WIDTH: 0.3,                    // Trail width
      MAX_TRAILS: 20,                // Maximum concurrent trails
      DRIFT_THRESHOLD: Math.PI / 22.5, // 8° - Min drift angle for trails
      FADE_TIME: 1000,               // Time to fade out (ms)
    },
    
    // Screen effects
    SCREEN_EFFECTS: {
      MOTION_BLUR: {
        ENABLED: true,
        INTENSITY: 0.3,              // Motion blur intensity (0-1)
        MIN_VELOCITY: 15,            // Minimum velocity to trigger
      },
      
      BLOOM: {
        ENABLED: true,
        INTENSITY: 0.4,              // Bloom intensity (0-1)
        THRESHOLD: 0.8,              // Brightness threshold
      },
    },
  },

  // ===================
  // AUDIO CONSTANTS
  // ===================
  AUDIO: {
    // Engine sounds
    ENGINE: {
      BASE_PITCH: 1.0,               // Base engine pitch
      PITCH_RANGE: { min: 0.8, max: 2.0 }, // Pitch range based on velocity
      VOLUME: 0.7,                   // Engine volume (0-1)
    },
    
    // Drift sounds
    DRIFT: {
      TIRE_VOLUME: 0.6,              // Tire screech volume
      TIRE_PITCH_RANGE: { min: 0.9, max: 1.3 }, // Pitch based on slip angle
      MIN_SLIP_FOR_SOUND: Math.PI / 36, // 5° minimum slip for sound
    },
    
    // UI sounds
    UI: {
      CLICK_VOLUME: 0.3,             // Button click volume
      NOTIFICATION_VOLUME: 0.5,      // Notification sound volume
      COUNTDOWN_VOLUME: 0.8,         // Countdown beep volume
    },
    
    // Music
    MUSIC: {
      DEFAULT_VOLUME: 0.4,           // Background music volume
      DUCK_DURING_DRIFT: 0.2,        // Volume reduction during long drifts
      DUCK_THRESHOLD: 1.5,           // Drift duration to trigger ducking (seconds)
    },
  },

  // ===================
  // ECONOMY CONSTANTS
  // ===================
  ECONOMY: {
    // Betting
    BET_AMOUNTS: [0, 5, 10, 25, 50, 100, 250, 500], // Available bet amounts
    MIN_BET: 5,                      // Minimum bet amount
    MAX_BET: 1000,                   // Maximum bet amount
    
    // Payouts (multipliers)
    SINGLE_PLAYER_MULTIPLIERS: {
      BASIC: 1.0,                    // Basic completion
      GOOD_RUN: 1.5,                 // > 500m
      GREAT_RUN: 2.0,                // > 1000m
      PERFECT_RUN: 2.5,              // New personal best
    },
    
    MULTIPLAYER_PAYOUTS: {
      WINNER: 0.6,                   // 60% of pot to winner
      SECOND: 0.3,                   // 30% to second place
      THIRD: 0.1,                    // 10% to third place
      HOUSE_EDGE: 0.05,              // 5% house edge
    },
    
    // Transactions
    MIN_DEPOSIT: 10,                 // Minimum deposit amount
    MAX_DEPOSIT: 10000,              // Maximum deposit amount
    MIN_WITHDRAWAL: 20,              // Minimum withdrawal amount
    WITHDRAWAL_FEE: 0.02,            // 2% withdrawal fee
    
    // Affiliates (3-LEVEL SYSTEM)
    AFFILIATE_COMMISSION: 0.10,      // 10% base commission (Level 1)
    AFFILIATE_LEVELS: {
      LEVEL_1: { rate: 0.10, description: '10% for direct referrals' },    // Direct referrals
      LEVEL_2: { rate: 0.05, description: '5% for second level' },         // Referrals of referrals
      LEVEL_3: { rate: 0.02, description: '2% for third level' },          // Third level
    },
    AFFILIATE_TIERS: {
      BRONZE: { min: 0, rate: 0.10 },    // 10% for new affiliates
      SILVER: { min: 1000, rate: 0.10 }, // 10% after R$1000 generated
      GOLD: { min: 5000, rate: 0.10 },   // 10% after R$5000 generated
      PLATINUM: { min: 20000, rate: 0.12 }, // 12% after R$20000 generated (bonus)
    },
  },

  // ===================
  // PERFORMANCE CONSTANTS
  // ===================
  PERFORMANCE: {
    // Target framerates
    TARGET_FPS: 60,                  // Target framerate
    FALLBACK_FPS: 45,                // Fallback for low-end devices
    MIN_FPS: 30,                     // Minimum acceptable framerate
    
    // Rendering
    LOD_DISTANCES: [50, 100, 200],   // Level of detail distances
    SHADOW_DISTANCE: 100,            // Shadow rendering distance
    PARTICLE_BUDGET: 500,            // Maximum particles on screen
    
    // Mobile optimizations
    MOBILE: {
      RENDER_SCALE: 0.85,            // Render scale for mobile (0-1)
      PARTICLE_SCALE: 0.6,           // Particle count multiplier for mobile
      EFFECT_QUALITY: 0.7,           // Effect quality multiplier
      AUTO_QUALITY: true,            // Auto-adjust quality based on performance
    },
    
    // Memory management
    MEMORY: {
      TEXTURE_POOL_SIZE: 50,         // Maximum cached textures
      MESH_POOL_SIZE: 100,           // Maximum cached meshes
      AUDIO_POOL_SIZE: 20,           // Maximum cached audio clips
      GARBAGE_COLLECT_INTERVAL: 30000, // GC interval (ms)
    },
  },

  // ===================
  // DEBUG CONSTANTS
  // ===================
  DEBUG: {
    // Logging levels
    LOG_LEVEL: 'info',               // 'debug', 'info', 'warn', 'error'
    
    // Visual debug
    SHOW_PHYSICS_DEBUG: false,       // Show physics debug lines
    SHOW_CAMERA_DEBUG: false,        // Show camera debug info
    SHOW_NETWORK_DEBUG: false,       // Show network debug overlay
    SHOW_PERFORMANCE_DEBUG: false,   // Show performance metrics
    
    // Cheats (development only)
    ALLOW_CHEATS: false,             // Enable cheat codes
    GOD_MODE: false,                 // Disable crash detection
    UNLIMITED_VELOCITY: false,       // Remove velocity limits
    FREE_CAMERA: false,              // Enable free camera movement
    
    // Testing
    FORCE_MULTIPLAYER_LOCAL: false,  // Force multiplayer with local bots
    SKIP_INTRO: false,               // Skip intro animations
    AUTO_LOGIN: false,               // Auto-login with test account
  },

  // ===================
  // PLATFORM CONSTANTS
  // ===================
  PLATFORM: {
    // Input
    TOUCH_DEADZONE: 40,              // Pixels - Touch deadzone for UI
    GAMEPAD_DEADZONE: 0.1,           // Gamepad analog deadzone
    
    // Mobile-specific
    HAPTIC_FEEDBACK: true,           // Enable haptic feedback
    HAPTIC_INTENSITY: 0.5,           // Haptic intensity (0-1)
    
    // Desktop-specific
    KEYBOARD_REPEAT_DELAY: 200,      // Keyboard repeat delay (ms)
    MOUSE_SENSITIVITY: 1.0,          // Mouse sensitivity multiplier
    
    // Cross-platform
    DOUBLE_TAP_TIME: 300,            // Double-tap detection time (ms)
    LONG_PRESS_TIME: 500,            // Long press detection time (ms)
  },
};

// ===================
// ENVIRONMENT CONFIGS
// ===================
export const ENV_CONFIG = {
  DEVELOPMENT: {
    API_URL: 'http://localhost:3001',
    COLYSEUS_URL: 'ws://localhost:2567',
    DEBUG_ENABLED: true,
    HOT_RELOAD: true,
    MOCK_PAYMENTS: true,
  },
  
  STAGING: {
    API_URL: 'https://api-staging.drifttoright.com',
    COLYSEUS_URL: 'wss://mp-staging.drifttoright.com',
    DEBUG_ENABLED: true,
    HOT_RELOAD: false,
    MOCK_PAYMENTS: true,
  },
  
  PRODUCTION: {
    API_URL: 'https://api.drifttoright.com',
    COLYSEUS_URL: 'wss://multiplayer.drifttoright.com',
    DEBUG_ENABLED: false,
    HOT_RELOAD: false,
    MOCK_PAYMENTS: false,
  },
};

// ===================
// UTILITY FUNCTIONS
// ===================
export const GameUtils = {
  // Get current environment config
  getEnvConfig: () => {
    const env = process.env.NODE_ENV || 'development';
    switch (env) {
      case 'production': return ENV_CONFIG.PRODUCTION;
      case 'staging': return ENV_CONFIG.STAGING;
      default: return ENV_CONFIG.DEVELOPMENT;
    }
  },
  
  // Convert units to display values
  unitsToKmh: (units: number) => Math.round(units * 3.6),
  metersToDisplay: (meters: number) => Math.floor(meters),
  
  // Angle utilities
  degreesToRadians: (degrees: number) => degrees * Math.PI / 180,
  radiansToDegrees: (radians: number) => radians * 180 / Math.PI,
  
  // Clamping utilities
  clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
  lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  
  // Validation
  isValidBetAmount: (amount: number) => 
    GAME_CONFIG.ECONOMY.BET_AMOUNTS.includes(amount) && 
    amount >= GAME_CONFIG.ECONOMY.MIN_BET && 
    amount <= GAME_CONFIG.ECONOMY.MAX_BET,
    
  isValidVelocity: (velocity: number) => 
    velocity >= 0 && velocity <= GAME_CONFIG.PHYSICS.MAX_VELOCITY_INITIAL * 2,
};

// Export default configuration
export default GAME_CONFIG;