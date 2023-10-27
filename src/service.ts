import {
    CocosPluginConfig,
    CocosPluginManifest,
    CocosPluginOptions,
    DefaultCocosPluginOptions,
    PluginType
} from './declare';

import * as Path from 'path';
import Serve from './commands/serve'
import Pack from './commands/pack'
import Base from './config/base'
import { PluginApi } from './plugin-api';
import { defaultsDeep } from 'lodash'
import * as FS from 'fs';
import { extensions } from 'interpret'
import { prepare } from 'rechoir'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import { log } from './log';
import { PluginMgr } from './plugin-mgr';
import Create from './commands/create';
import * as FsExtra from 'fs-extra'

export interface ProjectConfig {
    manifest: CocosPluginManifest,
    options: CocosPluginOptions,
}
const ConfigTypeScript = "cc-plugin.config.ts";
const ProjectJson = "project.json";

export default class CocosPluginService {
    public webpackChainFns: Function[] = [];
    public plugins: PluginApi[] = [];
    public context: string;
    public root: string;
    public projectConfig: ProjectConfig = this.defaults;
    public pluginMgr: PluginMgr;

    constructor(context: string) {
        this.pluginMgr = new PluginMgr(this);
        this.context = context || process.cwd();
        this.root = Path.join(__dirname, '..')
        this.resolvePlugins();
    }

    public isCreatorPlugin() {
        const { type } = this.projectConfig.options;
        return type === PluginType.PluginV2 || type === PluginType.PluginV3;
    }

    public isCreatorPluginV2() {
        const { type } = this.projectConfig.options;
        return type === PluginType.PluginV2;
    }

    public isCreatorPluginV3() {
        const { type } = this.projectConfig.options;
        return type === PluginType.PluginV3;
    }

    public isWeb() {
        const { type } = this.projectConfig.options;
        return type === PluginType.Web;
    }

    private resolvePlugins() {
        this.plugins.push(new Base())
        this.plugins.push(new Create())
        this.plugins.push(new Serve())
        this.plugins.push(new Pack())
    }


    private loadEnv() {
        const dirs = [this.context, this.root];
        dirs.forEach(dir => {
            const file = Path.resolve(dir, '.env')
            if (FS.existsSync(file)) {
                const env = dotenv.config({ path: file })
                dotenvExpand(env);
            }
        })
    }

    private loadUserOptions(): CocosPluginConfig | null {
        const configNames = ['./cc-plugin.config.js', `./${ConfigTypeScript}`];
        let fileConfigPath = '';
        for (let name of configNames) {
            const fullPath = Path.join(this.context, name)
            if (FS.existsSync(fullPath)) {
                fileConfigPath = fullPath;
                break;
            }
        }
        if (fileConfigPath) {
            return this.loadModule(fileConfigPath);
        }
        return null
    }

    private loadModule(file: string) {
        // 从当前package的node_modules中找依赖
        prepare(extensions, file, this.root);
        const module = require(file);
        if (module.hasOwnProperty('default')) {
            return module.default;
        } else {
            return module;
        }
    }

    get defaults() {
        const options: CocosPluginOptions = DefaultCocosPluginOptions;
        const manifest: CocosPluginManifest = {
            name: 'cocos-creator-plugin',
            version: '0.0.0',
            main: './src/main.ts',
        }
        return { manifest, options };
    }


    private init() {
        this.loadEnv();
        const userOptions = this.loadUserOptions();
        userOptions && this.checkUserOptions(userOptions);
        this.projectConfig = defaultsDeep(userOptions, this.defaults);
        this.plugins.forEach((plugin) => {
            plugin.apply(this.pluginMgr, this);
        })
    }

    private checkIsProjectDir(projDir: string) {
        // 必须存在这个目录
        const needDirs = ['assets'];
        let isProject = true;

        for (let i = 0; i < needDirs.length; i++) {
            const dir = needDirs[i];
            const assets = Path.join(projDir, dir)
            if (!FS.existsSync(assets)) {
                isProject = false;
                break;
            }

            if (FS.statSync(projDir).isFile()) {
                isProject = false;
                break;
            }
        }
        return isProject;
    }

    private catchOutput(projectDir: string, pluginDir: string, pluginName: string) {
        // 相对目录
        if (projectDir.startsWith('./')) {
            log.red(`当type为creator插件时，options.outputProject 暂时不支持相对目录的写法：${projectDir}`)
            process.exit(0)
        }
        let output = projectDir;
        if (this.checkIsProjectDir(projectDir)) {
            output = Path.join(projectDir, pluginDir, pluginName);
            if (!FS.existsSync(output)) {
                log.yellow(`自动创建输出目录：${output}`)
                FsExtra.ensureDirSync(output)
            }
        } else {
            log.yellow(`options.outputProject需要配置为有效的Creator项目目录：${projectDir}`);
            output = projectDir;
        }
        return output;
    }

    getPluginDir(version: PluginType) {
        if (version === PluginType.PluginV2) {
            return 'packages';
        } else if (version === PluginType.PluginV3) {
            return 'extensions';
        }
    }

    private getConfigProjectPath(type: PluginType): string | null {
        let projectPath = null;
        const projCfg = Path.join(this.context, ProjectJson);
        if (FS.existsSync(projCfg)) {
            const cfg: { v2: string, v3: string } = JSON.parse(FS.readFileSync(projCfg, 'utf-8'));
            switch (type) {
                case PluginType.PluginV2: {
                    projectPath = cfg.v2;
                    break;
                }
                case PluginType.PluginV3: {
                    projectPath = cfg.v3;
                    break;
                }
            }
        }
        if (projectPath && FS.existsSync(projectPath)) {
            return projectPath;
        }
        return null;
    }
    private checkUserOptions(userOptions: CocosPluginConfig) {
        // 根据配置，将output目录统一变为绝对路径
        const { options, manifest } = userOptions;
        let { type, outputProject } = options;
        const pluginDir = this.getPluginDir(type!);
        if (typeof outputProject === 'object') {
            const { v2, v3, web } = outputProject!;
            if (type === PluginType.PluginV2 || type === PluginType.PluginV3) {
                // 优先支持配置文件
                const cfgProject = this.getConfigProjectPath(type);
                let dirs: { url: string, source: string }[] = [];
                if (cfgProject) {
                    dirs.push({ url: cfgProject, source: ProjectJson })
                }
                if (v2 !== undefined && type === PluginType.PluginV2) {
                    dirs.push({ url: v2, source: ConfigTypeScript })
                }
                if (v3 !== undefined && type === PluginType.PluginV3) {
                    dirs.push({ url: v3, source: ConfigTypeScript });
                }
                if (dirs.length <= 0) {
                    log.red(`未配置options.outputProject`);
                } else {
                    for (let i = 0; i < dirs.length; i++) {
                        const { url, source } = dirs[i];
                        if (url && FS.existsSync(url)) {
                            options.output = this.catchOutput(url, pluginDir!, manifest.name);
                            break;
                        } else {
                            log.blue(`[${source}]里面的输出目录无效：${url}`)
                        }
                    }
                }
            } else if (web && type === PluginType.Web) {
                let fullPath = Path.join(this.context, web);
                if (!FS.existsSync(fullPath)) {
                    log.yellow(`auto create directory: ${fullPath}`);
                    FsExtra.ensureDirSync(fullPath);
                }
                options.output = fullPath;
            }
        } else {
            options.output = this.catchOutput(outputProject, pluginDir!, manifest.name);
        }
        if (options.output && FS.existsSync(options.output)) {
        } else {
            log.red(`options.outputProject配置无效:${options.output}`)
            process.exit(0);
        }
    }

    run() {
        this.init();
    }
}
