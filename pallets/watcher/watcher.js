const {
	WatcherManager,
} = require("../../src/server/pallet-managers/watcher/WatcherManager");
const MODULE_NAME = "node-red-contrib-itm-watcher";

module.exports = function (RED) {
	"use strict";
	function watcherNode(config) {
		RED.nodes.createNode(this, config);

		const node = this;
		let palletManager = new WatcherManager(RED, config, node);

		node.on("input", function (msg) {
			palletManager.onInput(msg);
		});

		node.on("close", function (msg) {
			palletManager.onClose();
		});
		node.done;
	}

	RED.nodes.registerType("ITM watcher", watcherNode);
};
