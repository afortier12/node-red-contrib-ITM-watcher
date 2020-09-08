
const { BOMPreprocessPalletManager } = require('../../src/server/pallet-managers/BOM-preprocess/BOMPreprocessPalletManager');
const  MODULE_NAME = 'node-red-kardex-itm-purchasing';

console.log(module);

module.exports = function(RED) {
    "use strict";
    function bomPrepNode(config){

        RED.nodes.createNode(this, config);

        const node = this;

        let palletManager = new BOMPreprocessPalletManager(RED, config, node);

        node.on('input', function(msg){
            palletManager.onInput(msg);
        });

            
    }

    RED.nodes.registerType('BOM Pre-process', bomPrepNode);
}