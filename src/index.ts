#! /usr/bin/env node

import { program } from 'commander';
import { cocosPluginService } from './service';

program.version('1.0.0').allowUnknownOption(true)

cocosPluginService.readyPlugins();
program.parse(process.argv)
