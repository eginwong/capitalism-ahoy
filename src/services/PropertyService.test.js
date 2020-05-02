import PropertyService from "./PropertyService";



// export default class PropertyService {
//     properties = [];

//     init(pathToResource = process.env.PUBLIC_URL + "/resources/monopolyConfiguration.json") {
//         this.clone(pathToResource);
//     }

//     clone(pathToResource) {
//         console.log(pathToResource);
//         this.properties = JSON.parse(pathToResource);
//         console.log(this.properties);
//         // retrieve from resources
//     }


describe("PropertyService", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules()
        process.env = { ...OLD_ENV };
        delete process.env.NODE_ENV;
    });

  test("loads in properties with default path", () => {
    process.env.PUBLIC_URL = "../public/";
    const service = new PropertyService();
    service.init();

  });
});
