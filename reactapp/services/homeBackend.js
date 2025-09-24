// reactapp/services/homeBackend.js
import Backend from "./Backend";

// Connect to the "flowforge" consumer (tethysapp/flowforge/consumers/home.py)
const homeBackend = new Backend("/");
export default homeBackend;
