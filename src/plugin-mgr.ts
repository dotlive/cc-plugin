import CocosPluginService from './service';
import Chain from 'webpack-chain'
import Config from 'webpack-chain';
import { PluginApi } from './plugin-api';
import { Argument, Command, program } from 'commander';

export type PluginCmdOptions = { description?: string, arguments?: Array<{ name: string, desc?: string, value?: any, required?: boolean }> };
export type PluginCmdCallback = (param: string[]) => void;


export class PluginMgr {
    private service: CocosPluginService;
    private commander: Command;

    constructor(service: CocosPluginService) {
        this.service = service;
        this.commander = program;
    }

    registerCommand(name: string, opts: PluginCmdOptions, callback: PluginCmdCallback) {
        let cmd = this.commander
            .command(name)
            .description(opts.description || '');
        if (opts.arguments) {
            opts.arguments.forEach(opt => {
                const arg = new Argument(opt.name, opt.desc || opt.name)
                arg.required = !!opt.required;
                arg.argParser;
                arg.default(opt.value);
                cmd.addArgument(arg);
            })
        }
        cmd.action((...args) => {
            // 把参数传递进去
            callback(args)
        })
    }

    chainWebpack(fn: (config: Config) => void) {
        this.service.webpackChainFns.push(fn);
    }

    resolveChainWebpackConfig() {
        const config = new Chain();
        this.service.webpackChainFns.forEach(fn => {
            fn(config);
        })
        return config.toConfig();
    }
}
