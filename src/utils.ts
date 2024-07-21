import { CocosPluginManifest, CocosPluginOptions, PluginType } from './declare';
import { ProjectConfig, cocosPluginService } from './service';

class Utils {
    private manifest: CocosPluginManifest | null = null;
    public options: CocosPluginOptions | null = null;
    private i18nFlag: string = "i18n.";
    private _init: boolean = false;
    // 内置的菜单
    public builtinMenu = {
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
    }
    init(config: ProjectConfig) {
        this._init = true;
        this.manifest = config.manifest;
        this.options = config.options;
        const { type } = config;
        if (type === PluginType.PluginV2) {
            this.builtinMenu.project = this.toi18n('MAIN_MENU.project.title')
            this.builtinMenu.package = this.toi18n('MAIN_MENU.package.title');
        } else if (type === PluginType.PluginV3) {
            this.builtinMenu.project = this.toi18n('menu.project')
            this.builtinMenu.node = this.toi18n('menu.node');
            this.builtinMenu.panel = this.toi18n('menu.panel');
            this.builtinMenu.package = this.toi18n('menu.extension');
            this.builtinMenu.develop = this.toi18n('develop');
        }
    }
    menuProject(name: string): string {
        return this.doI18n(name, this.builtinMenu.project);
    }
    menuPackage(name: string): string {
        return this.doI18n(name);
    }
    private doI18n(name: string, head?: string, separator: string = '/'): string {
        if (!this._init) {
            console.error("need init");
            return "";
        }
        const newPathParts = Array<string>();
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
    tryAppendi18n(key: string): string {
        if (key.startsWith(this.i18nFlag)) {
            key = key.substring(this.i18nFlag.length, key.length);
            cocosPluginService.checkI18nKey(key);
            return this.i18n(key);
        }
        return key;
    }
    i18n(key: string) {
        const pkgName = this.manifest!.name;
        return this.toi18n(`${pkgName}.${key}`);
    }
    toi18n(key: string) {
        return `i18n:${key}`;
    }
}

const utils = new Utils();
export default utils;
