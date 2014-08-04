function ParticleGenerator(maxLifeTime,graphics) {
  this.spawned = [];
  this.maxLifeTime = maxLifeTime;
  this.graphics = graphics;
}
ParticleGenerator.prototype.spawn = function (x, y) {
  this.spawned.push({
    x: x,
    y: y,
    sideX: -1,
    sideY: Math.random() > 0.5 ? 1 : -1,
    lifetime: 0
  });
};
ParticleGenerator.prototype.tick = function () {
  var current, index = 0;
  this.graphics.clear().beginFill('#FFFF00');
  for (; index < this.spawned.length; index++) {
    current = this.spawned[index];
    current.lifetime++;
    if (current.lifetime > this.maxLifeTime || this.onTick(this.graphics, current)) {
      this.spawned.splice(index, 1);
      index--;
    }
  }
};
function Assets() {
  this.animations = {};
  this.spritesheets = {};
  this.images = {};
}
Assets.animation = function (name) {
  return { id: "animations." + name, src: "/src/medias/animations/" + name + ".json"   };
};
Assets.image = function (name) {
  return { id: "images." + name, src: "/src/medias/images/" + name + ".png" };
};

function onLoadComplete() {

  // Add method to Sprite
  createjs.Sprite.prototype.setAnimationSpeed = function (value) {
    if (Number(value).toString() === 'NaN') {
      throw new Error('Sprite::incrAnimationSpeed with not a number');
    }
    this._animation.speed = value;
  };
  createjs.Sprite.prototype.getAnimationSpeed = function (value) {
    return this._animation.speed;
  };
  createjs.Sprite.prototype.reverse = function  (time) {
    var currentFrame = this._currentFrame;
    var numFrames = this.spriteSheet.getNumFrames(this.currentAnimation);
    if (currentFrame <= 0) {
        currentFrame = numFrames - 1;
    } else {
        currentFrame--;
    }
    this._goto(this.currentAnimation, currentFrame);
  };

  var loadQueue = new createjs.LoadQueue();

  var manifests = {};
  var assets = new Assets();

  loadQueue.loadManifest([
    Assets.animation('player'),
    Assets.animation('tourniquet'),
    Assets.animation('otherone'),
    Assets.animation('blop'),
    Assets.image('door')
  ]);

  function onFileLoaded(event) {
    var breadcrumb = event.item.id.split('.');
    switch (event.item.type) {
      case createjs.LoadQueue.JSON:
        if (!manifests[breadcrumb[0]]) { manifests[breadcrumb[0]] = {}; }
        manifests[breadcrumb[0]][breadcrumb[1]] = event.result;
        if (event.result.animations) {
          assets[breadcrumb[0]][breadcrumb[1]] = new createjs.SpriteSheet(event.result);
        }
        break;
      default:
        assets[breadcrumb[0]][breadcrumb[1]] = event.result;
        break;
    }
  }

  function onFileLoadingComplete() {
    var
      stage,
      playerSprite, rollSprite, stressBar, otheroneSprite, doorBitmap, corners,
      particles, bullets,
      keydowns = {
        turn: false,
        attack: false
      },
      last = {
        turn: 0,
        attack: 0
      },
      currentAnimationFrame = 'roll',
      MIN_ANIMATION_SPEED = 0.0025,
      particlesShape = new createjs.Shape(),
      bulletShape = new createjs.Shape(),
      synchronizeSpriteAnimationFrame = true;

    // create stage
    stage = new createjs.Stage("main-stage");

    // Particle generators
    particles = new ParticleGenerator(30, particlesShape.graphics);
    bullets = new ParticleGenerator(100, bulletShape.graphics);
    particles.onTick = function (g, current) {
      current.x += Math.random() * -5 << 0;
      current.y += ((current.lifetime - 10) * 0.5) << 0
      g.drawRect(current.x, current.y, 5, 5);
    };
    bullets.onTick = function (g, current) {
      current.x += 20;
      g.drawRect(current.x, current.y, 8, 4);
    };


    // images
    doorBitmap = new createjs.Bitmap(assets.images.door);

    // main sprites
    playerSprite = new createjs.Sprite(assets.animations.player, currentAnimationFrame);
    rollSprite = new createjs.Sprite(assets.animations.tourniquet, 'roll');
    otheroneSprite = new createjs.Sprite(assets.animations.otherone, 'run');
    rollSprite.framesReverse = 0;

    // setup positions & behaviors
    doorBitmap.x = stage.canvas.width - doorBitmap.image.width - 20;
    doorBitmap.y = -doorBitmap.image.height;
    rollSprite.x = playerSprite.x = 100;
    rollSprite.y = playerSprite.y = 10;
    otheroneSprite.x = stage.canvas.width;
    otheroneSprite.y = 10;
    otheroneSprite.shouldIdling = false;

    window.r = rollSprite;

    function updateOtheroneSpritePosition() {
      if (otheroneSprite.x > 1) {
        otheroneSprite.x -= 20;
        otheroneSprite.y += 2;
      } else if (!otheroneSprite.shouldIdling) {
        otheroneSprite.x = 1;
        otheroneSprite.shouldIdling = true;
        otheroneSprite.gotoAndPlay('idle');
        createjs.Ticker.removeEventListener('tick', updateOtheroneSpritePosition);
      }
    }

    // animations helpers
    function changeRollAnimationSpeed(value) {
      if (currentAnimationFrame === 'roll') {
        playerSprite.setAnimationSpeed(value);
      }
      rollSprite.setAnimationSpeed(value);
    }
    function getRollAnimationSpeed() {
      return rollSprite.getAnimationSpeed();
    }
    changeRollAnimationSpeed(0);

    // corners
    corners = new createjs.Shape();

    // GUI
    stressBar = new createjs.Shape();
    stressBar.graphics.beginFill("#00FF00");

    // Input handlers
    function onKeyEvent(event) {
      switch (event.which) {
        case 83: // s
          if (keydowns.turn && event.type === 'keydown') {
            return;
          }

          if ((keydowns.turn = event.type === 'keydown') && keydowns.attack === false) {
            if (currentAnimationFrame !== 'roll') {
              currentAnimationFrame = 'roll';
              playerSprite.gotoAndPlay('roll');
              playerSprite.setAnimationSpeed(0);
              synchronizeSpriteAnimationFrame = false;
              if (rollSprite.getAnimationSpeed() < MIN_ANIMATION_SPEED) {
                changeRollAnimationSpeed(MIN_ANIMATION_SPEED);
              }
            }
            last.turn = Date.now();
            changeRollAnimationSpeed(getRollAnimationSpeed() + 0.01 * (2 - getRollAnimationSpeed()));
            if (getRollAnimationSpeed() > 1) {
              changeRollAnimationSpeed(1);
            }
          }
          break;
        case 68: // d
          if (keydowns.attack && event.type === 'keydown') {
            return;
          }
          if ((keydowns.attack = event.type === 'keydown')) {
            if (currentAnimationFrame !== 'attack') {
              currentAnimationFrame = 'attack';
              playerSprite.gotoAndPlay('attack');
              // reset playerSprite animation speed
              playerSprite.setAnimationSpeed(0);
              // decrement the roll speed
              rollSprite.setAnimationSpeed(rollSprite.getAnimationSpeed() - 0.2);
              if (rollSprite.getAnimationSpeed() < MIN_ANIMATION_SPEED) {
                rollSprite.setAnimationSpeed(MIN_ANIMATION_SPEED);
              }
            }
            particles.spawn(playerSprite.x + 134, playerSprite.y + 125);
            bullets.spawn(playerSprite.x + 166 - playerSprite.currentFrame, playerSprite.y + 134);
            keydowns.turn = false;
            last.attack = Date.now();
            playerSprite.setAnimationSpeed(playerSprite.getAnimationSpeed() + 0.1 * (2 - playerSprite.getAnimationSpeed()));
          }
          break;
      }
    }

    function drawCorners() {
      corners.graphics.clear()
        .beginStroke('#000000')
        .moveTo(20, 200)
        .lineTo(120, 10)
        .lineTo(600, 10)
        .moveTo(120, 10)
        .lineTo(120, 190)
        .lineTo(20, 400)
        .moveTo(120, 190)
        .lineTo(600, 190);
    }

    function updateDoorPosition() {
      if (rollSprite.animationFrameChanged)
        doorBitmap.y += 0.5;
    }

    function drawStressBar() {
      stressBar.graphics.clear().beginFill("#00FF00").drawRect(20, 150, 20, -100 * getRollAnimationSpeed());
    }

    function updateAnimationSpeed() {
      var now = Date.now();
      if (rollSprite.lastFrame !== rollSprite.currentFrame) {
        rollSprite.lastFrame = rollSprite.currentFrame;
        rollSprite.animationFrameChanged = true;
      } else {
        rollSprite.animationFrameChanged = false;
      }
      if (!synchronizeSpriteAnimationFrame && now - last.attack > 250) {
        // Re-synchronize roll && player animation
        playerSprite.currentAnimationFrame = rollSprite.currentAnimationFrame;
        synchronizeSpriteAnimationFrame = true;
      } else if (!keydowns.attack && !keydowns.turn && currentAnimationFrame === 'attack') {
        // decelerate attack animation
        playerSprite.setAnimationSpeed(playerSprite.getAnimationSpeed() - 0.1);
        if (playerSprite.getAnimationSpeed() < MIN_ANIMATION_SPEED) {
          playerSprite.setAnimationSpeed(MIN_ANIMATION_SPEED);
        }
      }
      if (!keydowns.turn && now - last.turn > 200 || keydowns.turn && now - last.turn > 300) {
        // decelerate player &&/|| roll
        var min = currentAnimationFrame === 'attack' ? -0.25 : MIN_ANIMATION_SPEED;
        changeRollAnimationSpeed(getRollAnimationSpeed() - 0.015);
        if (getRollAnimationSpeed() < min) {
          changeRollAnimationSpeed(min);
        }
      }
      if (getRollAnimationSpeed() < 0) {
        if (rollSprite.framesReverse++ % Math.abs(rollSprite._animation.speed * 100) === 0) {
          // console.log('reverse');
          rollSprite.reverse();
        }
      }
    }

    // bind events
    window.addEventListener('keydown', onKeyEvent);
    window.addEventListener('keyup', onKeyEvent);
    createjs.Ticker.addEventListener('tick', drawCorners);
    createjs.Ticker.addEventListener('tick', updateAnimationSpeed);
    createjs.Ticker.addEventListener('tick', drawStressBar);
    createjs.Ticker.addEventListener('tick', particles.tick.bind(particles));
    createjs.Ticker.addEventListener('tick', bullets.tick.bind(bullets));
    createjs.Ticker.addEventListener('tick', stage.update.bind(stage));
    createjs.Ticker.addEventListener('tick', updateOtheroneSpritePosition);

    createjs.Ticker.addEventListener('tick', updateDoorPosition);


    // add childs
    stage.addChild(corners);
    stage.addChild(rollSprite);
    stage.addChild(playerSprite);

    stage.addChild(stressBar);
    stage.addChild(particlesShape);
    stage.addChild(bulletShape);
    stage.addChild(doorBitmap);

    stage.addChild(otheroneSprite);
  }

  loadQueue.on('fileload', onFileLoaded);
  loadQueue.on('complete', onFileLoadingComplete);

  loadQueue.load();

};
window.addEventListener('load', onLoadComplete);