const { KardexKitImportCreatePalletManager } = require('../../src/server/pallet-managers/Kardex-Kit-Import-Create/KardexKitImportCreatePalletManager');
const  MODULE_NAME = 'node-red-kardex-itm-purchasing';

console.log(module);

module.exports = function(RED) {
    "use strict";
    function kardexImportCreateNode(config){

        RED.nodes.createNode(this, config);

        const node = this;

        let palletManager = new KardexKitImportCreatePalletManager(RED, config, node);

        node.on('input', function(msg){
            palletManager.onInput(msg);
        });

            
    }

    RED.nodes.registerType('Kardex Kit Import Create', kardexImportCreateNode);
}