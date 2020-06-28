
/**
 * Responsibility: 
 *   Defines a model and associated metadata for a space on the game board.
 * 
 * System Rules:
 *   All properties inherit from Tile class.
 *   PropertySpace is the binding between Tile and Property.
*/
/* abstract */ class Tile {
  constructor(property) {
    Object.assign(this, property);
  }
  land() {
    console.log(`LANDED ON ${this.name || "void"}`);
    // function is overridden per tile
    // TODO: KENTINUE
    // window.emit ON_LAND(data)
    // window.emit PAY_RENT?
  }
}

class CommunityChestSpace extends Tile {
  constructor(property) {
    super(property);
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // this.PropertyService[id];
  }
}

class ChanceSpace extends Tile {
  constructor(property) {
    super(property);
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // this.PropertyService[id];
  }
}

class FreeSpace extends Tile {
  constructor(property) {
    super(property);
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // this.PropertyService[id];
  }
}

class JailSpace extends Tile {
  constructor(property) {
    super(property);
  }
  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // this.PropertyService[id];
  }
}

class GoToJailSpace extends Tile {
  constructor(property) {
    super(property);
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // send them to jail 🙃
    // this.PropertyService[id];
  }
}

class LuxurySpace extends Tile {
  constructor(property) {
    super(property);
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // send them to luxury 🙃
    // this.PropertyService[id];
  }
}

class IncomeTaxSpace extends Tile {
  constructor(property) {
    super(property);
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // send them to luxury 🙃
    // this.PropertyService[id];
  }
}

class UtilitySpace extends Tile {
  constructor(property) {
    super(property);
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // this.PropertyService[id];
  }

  mortgage() {}
}

class RailRoadSpace extends Tile {
  constructor(property) {
    super(property);
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // this.PropertyService[id];
  }

  mortgage() {}
}

class PropertySpace extends Tile {
  constructor(property) {
    super(property);
  }

  constructBuilding() {
    // for utilities: cannot build
  }

  deconstructBuilding() {
    // for utilities: cannot build
  }

  // don't need player parameter because function will affect active player
  land() {
    super.land();
    // this.PropertyService[id];
  }

  mortgage() {}
}

class PropertyService {
  _propertiesMeta;
  _properties;

  static get properties() {
    return this._properties || [];
  }

  static set properties(propertyArray) {
    this._properties = propertyArray;
  }

  static landOn(position) {
    const landedOnProperty = this._properties.find(
      (prop) => prop.position === position
    );
    landedOnProperty.land();
    console.dir(landedOnProperty);
  }
}

PropertyService._propertiesMeta = require("../config/monopolyConfiguration").properties;
PropertyService._properties = PropertyService._propertiesMeta.map((p) => {
  if (p.group !== "Special") {
    switch (p.group) {
      case "Utilities":
        return new UtilitySpace(p);
      case "RailRoad":
        return new RailRoadSpace(p);
      default:
        return new PropertySpace(p);
    }
  }

  switch (p.id.split(/\d/)[0]) {
    case "freeparking":
    case "go":
      return new FreeSpace(p);
    case "chance":
      return new ChanceSpace(p);
    case "communitychest":
      return new CommunityChestSpace(p);
    case "jail":
      return new JailSpace(p);
    case "gotojail":
      return new GoToJailSpace(p);
    case "luxurytax":
      return new LuxurySpace(p);
    case "incometax":
      return new IncomeTaxSpace(p);
    default:
      console.error("property yoself");
  }
});

module.exports = { PropertyService };
