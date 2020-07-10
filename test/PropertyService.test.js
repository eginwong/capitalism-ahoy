const expect = require("chai").expect;
const sinon = require("sinon");
const { cloneDeep } = require("lodash");
const { PropertyService } = require("../entities/PropertyService");

describe("PropertyService", () => {
  const properties = cloneDeep(PropertyService.properties);
  beforeEach(() => {
    PropertyService.properties = properties;
  });
  it("should load contain 40 properties by default", () => {
    expect(PropertyService.properties.length).to.equal(40);
  });
  it("should set properties and handle no properties", () => {
    PropertyService.properties = undefined;
    expect(PropertyService.properties).to.deep.equal([]);
  });
  it("should load on a position and trigger its property effects", () => {
    const propertySpy = sinon.spy();
    const fakePosition = 8;
    const landedOnProperty = PropertyService.properties.find(
      (prop) => prop.position === fakePosition
    );
    landedOnProperty.land = propertySpy;
    PropertyService.landOn(fakePosition);
    expect(propertySpy.calledOnce).to.equal(true);
  });
});
