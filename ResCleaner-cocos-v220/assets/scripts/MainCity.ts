import { ResCleaner } from "./ResCleaner";

const {ccclass, property} = cc._decorator;


const PREFAB_A_URL = 'prefabs/PrefabA'


@ccclass//('MainCity')
export class MainCity extends cc.Component {
   
    @property(cc.SpriteFrame)
    spframe:cc.SpriteFrame = null

    start () {
        let self = this
        cc.loader.loadRes(PREFAB_A_URL, cc.Prefab, (error: Error, asset?: cc.Prefab) => {
            !error && self.scheduleOnce(self.onLoadCompleted, 0)
        })

        this.clean()
        // this.cleanWhileLoading()
    }

    clean() {
        ResCleaner.clean()
    }

    fight() {
        cc.director.loadScene('Fight')
    }

    // 测试：在资源加载过程中进行资源的释放
    cleanWhileLoading() {
        cc.loader.loadResDir('mix')
        this.schedule(this.clean) // 强制每帧资源清理
    }

    onLoadCompleted() {
        let asset: cc.Prefab = cc.loader.getRes(PREFAB_A_URL)
        let prefab = cc.instantiate(asset)
        this.node.addChild(prefab)
        cc.log('PrefabA 添加到场景')
        this.clean()

        prefab.removeFromParent()
        prefab.destroy()
        cc.log('PrefabA 已销毁')
        this.clean()

        this.spframe = null
        cc.log('this.spframe = null')
        this.clean()
    }
}
