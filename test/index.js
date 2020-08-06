/**
 * Test commands and resources
 * Note these are *not* any of our Mocks, Stubs, or Utils:
 * - Mocks: Fake, Empty data to make things work
 * - Stubs: Fake, Filled-in data to aid a Test
 * - Utils: Tools for hammering/hacking our Tests together
 * - This File: Commands, Functions, etc. that either compose
 *              the above Types, or just nice-to-haves that
 *              don't belong as any of the above; "default" case
 */
module.exports = {
  /**
   * Given-When-Then
   * Formatting function. Not a Util because it doesn't affect the test,
   *      just the naming convention. This is an opinion-based or semantic-
   *      providing function for readability.
   * @param {String} strings - A string of the format: "Given clause | When clause | Then clause"
   */
  gwt(strings) {
    const statements = strings.raw[0].split(' | ');
    return `GIVEN ${statements[0]} WHEN ${statements[1]} THEN ${statements[2]}`;
  },
};
