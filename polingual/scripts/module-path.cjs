const path = require("path");
const Module = require("module");

process.env.NODE_PATH = [path.join(__dirname, "../node_modules"), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
