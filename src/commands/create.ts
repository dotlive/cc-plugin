import { OptionValues } from 'commander';
import * as Fs from 'fs';
import * as FsExtra from 'fs-extra';
import * as Path from 'path';
import { ConfigTypeScript } from '../const';
import { PluginType } from '../declare';
import { log } from '../log';
import { PluginApi } from '../plugin-api';
import { PluginMgr } from '../plugin-mgr';
import { CocosPluginService } from '../service';
import { showWeChatQrCode } from './tool';

export default class Create extends PluginApi {
    apply(api: PluginMgr, service: CocosPluginService): void {
        api.registerCommand('create', {
            description: '创建项目',
            arguments: [
                { name: 'name', desc: '项目名字', required: false, value: "ccp-plugin-demo" }
            ],
            options: [
                { name: '--override', desc: "强制覆盖当前目录" },
                { name: '--clean', desc: '清空目录' }
            ]
        }, (projectName: string, opts: OptionValues) => {
            // 校验是否在creator项目目录执行
            const dir = process.cwd();
            if (service.checkIsProjectDir(dir)) {
                log.red(`创建失败: ${dir}是个creator项目`)
                return;
            }
            const extDirs = [
                service.getPluginDir(PluginType.PluginV2),
                service.getPluginDir(PluginType.PluginV3)
            ]
            for (let i = 0; i < extDirs.length; i++) {
                const ext = extDirs[i];
                const dirName = Path.basename(dir);
                if (dirName === ext) {
                    if (service.checkIsProjectDir(Path.join(dir, '../'))) {
                        log.red(`创建失败: ${dir}是creator项目的扩展目录`);
                        return;
                    }
                }
            }

            const projectDir = Path.join(service.context, projectName)
            if (Fs.existsSync(projectDir)) {
                if (opts.override) {
                } else {
                    log.red(`目录已经存在：${projectDir}`);
                    return
                }
                if (opts.clean) {
                    FsExtra.emptydirSync(projectDir);
                }
            }
            const templateDir = Path.join(service.root, './template/project')
            FsExtra.copySync(templateDir, projectDir, { recursive: true });
            this.dealIgnoreFile(templateDir, projectDir);
            // 替换名字
            const file = Path.join(projectDir, ConfigTypeScript);
            if (Fs.existsSync(file)) {
                const content = Fs.readFileSync(file, 'utf8')
                    .replace(/%pkg_name%/g, projectName);
                Fs.writeFileSync(file, content);
            }
            log.green(`生成模板成功: ${projectDir}`);
            // npmInstall(projectDir)
            showWeChatQrCode()
        })
    }
    private dealIgnoreFile(templateDir: string, projectDir: string) {
        // 确认.gitignore文件，因为npm会自动忽略这个文件，如果使用files字段，会导致其他文件也需要在files中声明
        const sourceIgnoreFile = Path.join(templateDir, ".gitignore-shadow");
        if (Fs.existsSync(sourceIgnoreFile)) {
            const gitIgnoreData = Fs.readFileSync(sourceIgnoreFile, 'utf-8')
            const destIgnoreFile = Path.join(projectDir, '.gitignore');
            Fs.writeFileSync(destIgnoreFile, gitIgnoreData);
            const ignoreShadow = Path.join(projectDir, ".gitignore-shadow");
            if (Fs.existsSync(ignoreShadow)) {
                FsExtra.removeSync(ignoreShadow);
            }
        }
    }
};
