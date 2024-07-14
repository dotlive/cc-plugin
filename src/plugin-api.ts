import { PluginMgr } from './plugin-mgr';
import { CocosPluginService } from './service';

export abstract class PluginApi {
    abstract apply(api: PluginMgr, service: CocosPluginService): void;
}
