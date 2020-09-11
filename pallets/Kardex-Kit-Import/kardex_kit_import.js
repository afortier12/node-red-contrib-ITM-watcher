const { KardexKitImportPalletManager } = require('../../src/server/pallet-managers/Kardex-Kit-Import/KardexKitImportPalletManager');
const  MODULE_NAME = 'node-red-kardex-itm-purchasing';

console.log(module);

module.exports = function(RED) {
    "use strict";
    function kardexImportNode(config){

        RED.nodes.createNode(this, config);

        const node = this;

        let palletManager = new KardexKitImportPalletManager(RED, config, node);

        node.on('input', function(msg){
            palletManager.onInput(msg);
        });

            
    }

    RED.nodes.registerType('Kardex Kit Import', kardexImportNode);
}