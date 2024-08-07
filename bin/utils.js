"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const declare_1 = require("./declare");
const service_1 = require("./service");
class Utils {
    constructor() {
        this.manifest = null;
        this.options = null;
        this.i18nFlag = "i18n.";
        this._init = false;
        // 内置的菜单
        this.builtinMenu = {
            /**
             * 项目菜单
             */
            project: '',
            /**
             * 节点菜单
             */
            node: '',
            /**
             * 面板菜单
             */
            panel: '',
            /**
             * 扩展菜单
             */
            package: '',
            /**
             * 开发者菜单
             */
            develop: "",
        };
    }
    init(config) {
        this._init = true;
        this.manifest = config.manifest;
        this.options = config.options;
        const { type } = config;
        if (type === declare_1.PluginType.PluginV2) {
            this.builtinMenu.project = this.toi18n('MAIN_MENU.project.title');
            this.builtinMenu.package = this.toi18n('MAIN_MENU.package.title');
        }
        else if (type === declare_1.PluginType.PluginV3) {
            this.builtinMenu.project = this.toi18n('menu.project');
            this.builtinMenu.node = this.toi18n('menu.node');
            this.builtinMenu.panel = this.toi18n('menu.panel');
            this.builtinMenu.package = this.toi18n('menu.extension');
            this.builtinMenu.develop = this.toi18n('develop');
        }
    }
    menuProject(name) {
        return this.doI18n(name, this.builtinMenu.project);
    }
    menuPackage(name) {
        return this.doI18n(name);
    }
    doI18n(name, head, separator = '/') {
        if (!this._init) {
            console.error("need init");
            return "";
        }
        const newPathParts = Array();
        // head
        if (head !== undefined && head !== null) {
            newPathParts.push(this.tryAppendi18n(head));
        }
        // path
        const curPathParts = name.split(separator);
        for (let pathPart of curPathParts) {
            newPathParts.push(this.tryAppendi18n(pathPart));
        }
        return newPathParts.join(separator);
    }
    tryAppendi18n(key) {
        if (key.startsWith(this.i18nFlag)) {
            key = key.substring(this.i18nFlag.length, key.length);
            service_1.cocosPluginService.checkI18nKey(key);
            return this.i18n(key);
        }
        return key;
    }
    i18n(key) {
        const pkgName = this.manifest.name;
        return this.toi18n(`${pkgName}.${key}`);
    }
    toi18n(key) {
        return `i18n:${key}`;
    }
}
const utils = new Utils();
exports.default = utils;
//# sourceMappingURL=utils.js.map