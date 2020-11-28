/**
 * Helpers:
 *   Collection of useful filters by conditions that are used throughout the application and tests.
 */

module.exports = {
  findById,
  findByGroup,
  findByPosition,
  findByProperty,
};

function findByProperty(property, identifier) {
  return (p) => p[property] === identifier;
}

function findById(input, idName) {
  return input.find(findByProperty('id', idName));
}

function findByGroup(input, groupName) {
  return input.find(findByProperty('group', groupName));
}

function findByPosition(input, position) {
  return input.find(findByProperty('position', position));
}
