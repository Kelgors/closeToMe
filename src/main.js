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
  var current;
  this.graphics.clear().beginFill('#FFFF00');
  for (var index = 0; index < this.spawned.length; index++) {
    current = this.spawned[index];
    current.lifetime++;
    if (current.lifetime > this.maxLifeTime || this.onTick(this.graphics, current)) {
      this.spawned.splice(index, 1);
      index--;
    }
  }
};

function onLoadComplete() {

  // Add method to Sprite
  createjs.Sprite.prototype.setAnimationSpeed = function (value) {
    if (Number(value).toString() === 'NaN') {
      throw new Error('Sprite::incrAnimationSpeed with not a number');
    }
    this._animation.speed = value;
    //if (this._animation.name === 'attack')
    //  console.log(this._animation.name, this._animation.speed);
  };
  createjs.Sprite.prototype.getAnimationSpeed = function (value) {
    return this._animation.speed;
  };

  function Assets() {
    this.animations = {};
    this.spritesheets = {};
  }
  Assets.animation = function (name) {
    return { id: "animations." + name, src: "/src/medias/animations/" + name + ".json"   };
  };

  var loadQueue = new createjs.LoadQueue();

  var manifests = {};
  var assets = new Assets();

  loadQueue.loadManifest([
    Assets.animation('player'),
    Assets.animation('tourniquet')
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
    }
  }

  function onFileLoadingComplete() {
    var
      stage,
      playerSprite, rollSprite, stressBar,
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
      current.y += (((current.lifetime - 10) * 100) / 200) << 0;
      g.drawRect(current.x, current.y, 5, 5);
    };
    bullets.onTick = function (g, current) {
      current.x += 20;
      g.drawRect(current.x, current.y, 8, 4);
    };

    // main sprites
    playerSprite = new createjs.Sprite(assets.animations.player, 'roll');
    rollSprite = new createjs.Sprite(assets.animations.tourniquet, 'roll');

    // animations helpers
    function changeTourniquetAnimationSpeed(value) {
      if (currentAnimationFrame === 'roll') {
        playerSprite.setAnimationSpeed(value);
      }
      rollSprite.setAnimationSpeed(value);
    }
    function getRollAnimationSpeed() {
      return rollSprite.getAnimationSpeed();
    }
    changeTourniquetAnimationSpeed(0.0000001);

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
            }
            last.turn = Date.now();
            changeTourniquetAnimationSpeed(getRollAnimationSpeed() + 0.01 * (2 - getRollAnimationSpeed()));
            if (getRollAnimationSpeed() > 1) {
              changeTourniquetAnimationSpeed(1);
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
            bullets.spawn(playerSprite.x + 166, playerSprite.y + 134);
            keydowns.turn = false;
            last.attack = Date.now();
            playerSprite.setAnimationSpeed(playerSprite.getAnimationSpeed() + 0.1 * (2 - playerSprite.getAnimationSpeed()));
          }
          break;
      }
    }

    function drawStressBar() {
      stressBar.graphics.clear().beginFill("#00FF00").drawRect(20, 150, 20, -100 * getRollAnimationSpeed());
    }

    function updateAnimationSpeed() {
      var now = Date.now();
      if (!synchronizeSpriteAnimationFrame && now - last.attack > 250) {
        // Re-synchronize roll && player animation
        playerSprite.currentAnimationFrame = rollSprite.currentAnimationFrame;
        synchronizeSpriteAnimationFrame = true;
      } else if (keydowns.attack === false && keydowns.turn === false && currentAnimationFrame === 'attack') {
        // decelerate attack animation
        playerSprite.setAnimationSpeed(playerSprite.getAnimationSpeed() - 0.1);
        if (playerSprite.getAnimationSpeed() < MIN_ANIMATION_SPEED) {
          playerSprite.setAnimationSpeed(MIN_ANIMATION_SPEED);
        }
      }
      if (!keydowns.turn && now - last.turn > 200 || keydowns.turn && now - last.turn > 300) {
        // decelerate player &&/|| roll
        changeTourniquetAnimationSpeed(getRollAnimationSpeed() - 0.015);
        if (getRollAnimationSpeed() < MIN_ANIMATION_SPEED) {
          changeTourniquetAnimationSpeed(MIN_ANIMATION_SPEED);
        }
      }
    }

    // bind events
    window.addEventListener('keydown', onKeyEvent);
    window.addEventListener('keyup', onKeyEvent);
    createjs.Ticker.addEventListener('tick', updateAnimationSpeed);
    createjs.Ticker.addEventListener('tick', drawStressBar);
    createjs.Ticker.addEventListener('tick', particles.tick.bind(particles));
    createjs.Ticker.addEventListener('tick', bullets.tick.bind(bullets));
    createjs.Ticker.addEventListener('tick', stage.update.bind(stage));


    // add childs
    stage.addChild(rollSprite);
    stage.addChild(playerSprite);
    stage.addChild(stressBar);
    stage.addChild(particlesShape);
    stage.addChild(bulletShape);
  }

  loadQueue.on('fileload', onFileLoaded);
  loadQueue.on('complete', onFileLoadingComplete);

  loadQueue.load();

};
window.addEventListener('load', onLoadComplete);