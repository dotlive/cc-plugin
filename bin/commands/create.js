"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Fs = __importStar(require("fs"));
const FsExtra = __importStar(require("fs-extra"));
const Path = __importStar(require("path"));
const const_1 = require("../const");
const declare_1 = require("../declare");
const log_1 = require("../log");
const plugin_api_1 = require("../plugin-api");
const tool_1 = require("./tool");
class Create extends plugin_api_1.PluginApi {
    apply(api, service) {
        api.registerCommand('create', {
            description: '创建项目',
            arguments: [
                { name: 'name', desc: '项目名字', required: false, value: "ccp-plugin-demo" }
            ],
            options: [
                { name: '--override', desc: "强制覆盖当前目录" },
                { name: '--clean', desc: '清空目录' }
            ]
        }, (projectName, opts) => {
            // 校验是否在creator项目目录执行
            const dir = process.cwd();
            if (service.checkIsProjectDir(dir)) {
                log_1.log.red(`创建失败: ${dir}是个creator项目`);
                return;
            }
            const extDirs = [
                service.getPluginDir(declare_1.PluginType.PluginV2),
                service.getPluginDir(declare_1.PluginType.PluginV3)
            ];
            for (let i = 0; i < extDirs.length; i++) {
                const ext = extDirs[i];
                const dirName = Path.basename(dir);
                if (dirName === ext) {
                    if (service.checkIsProjectDir(Path.join(dir, '../'))) {
                        log_1.log.red(`创建失败: ${dir}是creator项目的扩展目录`);
                        return;
                    }
                }
            }
            const projectDir = Path.join(service.context, projectName);
            if (Fs.existsSync(projectDir)) {
                if (opts.override) {
                }
                else {
                    log_1.log.red(`目录已经存在：${projectDir}`);
                    return;
                }
                if (opts.clean) {
                    FsExtra.emptydirSync(projectDir);
                }
            }
            const templateDir = Path.join(service.root, './template/project');
            FsExtra.copySync(templateDir, projectDir, { recursive: true });
            this.dealIgnoreFile(templateDir, projectDir);
            // 替换名字
            const file = Path.join(projectDir, const_1.ConfigTypeScript);
            if (Fs.existsSync(file)) {
                const content = Fs.readFileSync(file, 'utf8')
                    .replace(/%pkg_name%/g, projectName);
                Fs.writeFileSync(file, content);
            }
            log_1.log.green(`生成模板成功: ${projectDir}`);
            // npmInstall(projectDir)
            (0, tool_1.showWeChatQrCode)();
        });
    }
    dealIgnoreFile(templateDir, projectDir) {
        // 确认.gitignore文件，因为npm会自动忽略这个文件，如果使用files字段，会导致其他文件也需要在files中声明
        const sourceIgnoreFile = Path.join(templateDir, ".gitignore-shadow");
        if (Fs.existsSync(sourceIgnoreFile)) {
            const gitIgnoreData = Fs.readFileSync(sourceIgnoreFile, 'utf-8');
            const destIgnoreFile = Path.join(projectDir, '.gitignore');
            Fs.writeFileSync(destIgnoreFile, gitIgnoreData);
            const ignoreShadow = Path.join(projectDir, ".gitignore-shadow");
            if (Fs.existsSync(ignoreShadow)) {
                FsExtra.removeSync(ignoreShadow);
            }
        }
    }
}
exports.default = Create;
;
//# sourceMappingURL=create.js.map