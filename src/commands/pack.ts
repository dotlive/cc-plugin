import { OptionValues } from 'commander';
import { existsSync } from 'fs';
import { copySync, emptyDirSync, ensureDirSync } from 'fs-extra';
import { merge } from 'lodash';
import * as Path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import Config from 'webpack-chain';
import { PluginType } from '../declare';
import { log } from '../log';
import { PluginApi } from '../plugin-api';
import { PluginMgr } from '../plugin-mgr';
import Zip from '../plugin/zip';
import { CocosPluginService, cocosPluginService } from '../service';
import { checkBuildType, defineVar, getBuildOptions, parseBuildOptions } from './commonOptions';
import { getFallback } from './fallback';

export default class Pack extends PluginApi {
    exit() {
        process.exit(0);
    }

    apply(api: PluginMgr, service: CocosPluginService) {
        api.registerCommand('pack', getBuildOptions("打包插件"),
            (type, options: OptionValues) => {
                checkBuildType(type, true);
                cocosPluginService.init(type as PluginType);
                // 打包前，再次清理output目录，可能会清理2次，但是关系不大
                const { output } = cocosPluginService.projectConfig.options;
                if (output && existsSync(output)) {
                    emptyDirSync(output);
                    log.yellow(`清空目录：${output}`);
                }

                api.chainWebpack(async (webpackChain: Config) => {
                    webpackChain.mode('production')
                    webpackChain.devtool(false);
                    // 传递变量给项目，用于代码剔除
                    parseBuildOptions(webpackChain, type, options);
                    defineVar(webpackChain, false);
                    webpackChain.optimization.minimizer('TerserPlugin').use(TerserPlugin, [
                        // @ts-ignore 不输出license.txt
                        {
                            extractComments: false,
                            // @ts-ignore
                            terserOptions: {
                                // @ts-ignore
                                compress: {
                                    dead_code: true,
                                    drop_console: true,
                                    drop_debugger: true,
                                }
                            }

                        }
                    ])

                    // 修改配置，主要是把server参数关闭了
                    webpackChain.module.rule('config-loader')
                        .test(/\.config.ts$/)
                        .use('cc-plugin-config-loader')
                        .loader(Path.join(__dirname, '../plugin/cc-plugin-config.loader.js'))
                        .options({})
                    // webpackChain
                    //     .plugin('clean')
                    //     .use(CleanWebpackPlugin, [{
                    //         verbose: true,
                    //         cleanStaleWebpackAssets: false,
                    //         cleanOnceBeforeBuildPatterns: ['**/*'],
                    //     }])
                    //     .end();

                    webpackChain.plugin('zip').use(Zip, [service])
                })

                // clean output results
                const { cleanBeforeBuildWithPack } = service.projectConfig.options;
                if (cleanBeforeBuildWithPack) {
                    const { output } = service.projectConfig.options;
                    if (output && existsSync(output)) {
                        emptyDirSync(output)
                        console.log(`clean output:${output}`)
                    }
                }

                let webpackConfig = api.resolveChainWebpackConfig();
                let fallback = getFallback(service);
                webpackConfig = merge(webpackConfig, { resolve: { fallback } });

                webpack(webpackConfig, ((err, stats) => {
                    if (err) {
                        return this.exit();
                    }
                    if (stats?.hasErrors()) {
                        stats?.compilation.errors.forEach(error => {
                            log.yellow(error.message)
                            log.blue(error.details || "")
                            log.red(error.stack || '')
                        })
                        return this.exit();
                    }
                    this.dealStaticFiles(service);
                    log.green('构建成功')
                    // showWeChatQrCode();
                }))
            }
        )
    }
    private dealStaticFiles(service: CocosPluginService) {
        let dir = service.projectConfig.options.staticFileDirectory;
        if (!dir) {
            return;
        }
        if (dir.startsWith('.')) {
            dir = Path.join(service.context, dir)
        }
        if (!existsSync(dir)) {
            log.yellow(`静态文件目录不存在：${dir}`)
            return;
        }
        const dest = service.projectConfig.options.output;
        if (!dest) {
            log.yellow(`请配置output目录`)
            return;
        }
        if (!existsSync(dest)) {
            return;
        }
        const base = Path.basename(dir)
        const destDir = Path.join(dest, base)
        ensureDirSync(destDir)
        const filterArray: string[] = service.projectConfig.options.staticFileFilter || [];
        const validFilter: string[] = [];
        filterArray.map(item => {
            try {
                new RegExp(item);
                validFilter.push(item);
            } catch {
                log.yellow(`invalid filter reg: ${item}`)
            }
        })
        log.green(`copy static files: ${dir} => ${dest}`)
        copySync(dir, destDir, {
            overwrite: true,
            filter: (src: string, dest: string) => {
                if (!filterArray.length) {
                    return true;
                }
                // if (!statSync(src).isFile()) {
                //     return true;
                // }
                const rel = Path.relative(dir!, src).replace(/\\/g, '/');
                if (!rel) {
                    return true;
                }
                for (let i = 0; i < validFilter.length; i++) {
                    const filter = validFilter[i];
                    // .replace(/\\/g, '/');// 正则中也有\转义符，这里不能替换
                    if (new RegExp(filter).test(rel)) {
                        log.green(`reg [${filter}] filter file: ${rel}`)
                        return false;
                    }
                }
                return true;
            }
        })
        log.green(`copy static files successful: ${dir} => ${dest}`)
    }
}
