const { KardexKitImportMonitorPalletManager } = require('../../src/server/pallet-managers/Kardex-Kit-Import-Monitor/KardexKitImportMonitorPalletManager');
const  MODULE_NAME = 'node-red-kardex-itm-purchasing';

console.log(module);

module.exports = function(RED) {
    "use strict";
    function kardexImportMonitorNode(config){

        RED.nodes.createNode(this, config);

        const node = this;

        let palletManager = new KardexKitImportMonitorPalletManager(RED, config, node);

        node.on('input', function(msg){
            palletManager.onInput(msg);
        });

        node.done
            
    }

    RED.nodes.registerType('Kardex Kit Import Monitor', kardexImportMonitorNode);
}