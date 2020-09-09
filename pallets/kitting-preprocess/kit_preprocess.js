
const { KitPreprocessPalletManager } = require('../../src/server/pallet-managers/Kit-preprocess/KitPreprocessPalletManager');
const  MODULE_NAME = 'node-red-kardex-itm-purchasing';

console.log(module);

module.exports = function(RED) {
    "use strict";
    function kitPrepNode(config){

        RED.nodes.createNode(this, config);

        const node = this;

        let palletManager = new KitPreprocessPalletManager(RED, config, node);

        node.on('input', function(msg){
            palletManager.onInput(msg);
        });

            
    }

    RED.nodes.registerType('Kit Pre-process', kitPrepNode);
}