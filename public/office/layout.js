// [layout config]
// [layout config]
// [layout config]

// [layout config]
// [layout config]
// [layout config]

const LAYOUT = {
  // [layout config]
  game: {
    width: 1280,
    height: 720
  },

  // [layout config]
  areas: {
    door:        { x: 640, y: 550 },
    writing:     { x: 320, y: 360 },
    researching: { x: 320, y: 360 },
    error:       { x: 1066, y: 180 },
    breakroom:   { x: 640, y: 360 }
  },

  // [layout config]
  furniture: {
    // [layout config]
    sofa: {
      x: 670,
      y: 144,
      origin: { x: 0, y: 0 },
      depth: 10
    },

    // [layout config]
    desk: {
      x: 218,
      y: 417,
      origin: { x: 0.5, y: 0.5 },
      depth: 1000
    },

    // [layout config]
    flower: {
      x: 310,
      y: 405,
      origin: { x: 0.5, y: 0.5 },
      depth: 1100
    },

    // [layout config]
    starWorking: {
      x: 217,
      y: 333,
      origin: { x: 0.5, y: 0.5 },
      depth: 900,
      scale: 1.32
    },

    // [layout config]
    plants: [
      { x: 565, y: 178, depth: 5 },
      { x: 230, y: 185, depth: 5 },
      { x: 977, y: 496, depth: 5 }
    ],

    // [layout config]
    poster: {
      x: 252,
      y: 66,
      depth: 4
    },

    // [layout config]
    coffeeMachine: {
      x: 659,
      y: 397,
      origin: { x: 0.5, y: 0.5 },
      depth: 99
    },

    // [layout config]
    serverroom: {
      x: 1021,
      y: 142,
      origin: { x: 0.5, y: 0.5 },
      depth: 2
    },

    // [layout config]
    errorBug: {
      x: 1007,
      y: 221,
      origin: { x: 0.5, y: 0.5 },
      depth: 50,
      scale: 0.9,
      pingPong: { leftX: 1007, rightX: 1111, speed: 0.6 }
    },

    // [layout config]
    syncAnim: {
      x: 1157,
      y: 592,
      origin: { x: 0.5, y: 0.5 },
      depth: 40
    },

    // [layout config]
    cat: {
      x: 94,
      y: 557,
      origin: { x: 0.5, y: 0.5 },
      depth: 2000
    }
  },

  // [layout config]
  plaque: {
    x: 640,
    y: 720 - 36,
    width: 420,
    height: 44
  },

  // [layout config]
  forcePng: {
    desk_v2: true // [config]
  },

  // [layout config]
  totalAssets: 15
};
