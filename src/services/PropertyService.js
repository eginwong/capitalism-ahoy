




export default class PropertyService {
    properties = [];
    // pathToResource = process.env.PUBLIC_URL + "/resources/monopolyConfiguration.json"

    init(propObject) {
        this.properties = propObject;
    }

    get(id) {
        // return entire property object
    }

    set() {
        // set entire property object
    }
}