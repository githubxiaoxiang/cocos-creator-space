import { ResCleaner } from './ResCleaner';
const { ccclass, property } = cc._decorator;

const BULLET_PATH = 'prefabs/PrefabB'

// 对象池使用示例

@ccclass//('Fight')
export class Fight extends cc.Component {

    // 对象池
    bulletPool: cc.Node[] = []

    start () {
        // 每间隔0.5秒生成1颗子弹
        this.schedule(this.makeBullet, 0.5, 5)

        // 每过3秒清理一次资源。这里是方便观察资源释放，实际项目中请不要频繁调用。
        this.schedule(this.clean, 3)
        // ResCleaner.clean()
    }

    makeBullet() {
        let bullet = this.bulletPool.pop()
        if (bullet) {
            bullet.active = true
        }
        else {
            let bulletPrefab =cc.loader.getRes(BULLET_PATH)
            if (bulletPrefab) {
                bullet = cc.instantiate(bulletPrefab)
                bullet.parent = this.node
            }
            else {
                let self = this
               cc.loader.loadRes(BULLET_PATH, cc.Prefab, (err: Error, asset?: cc.Prefab) => {
                    if (err) {
                        cc.error('loadRes failed', err)
                    }
                    else {
                        if (!self.isValid) return

                        self.makeBullet()
                    }
                })
                return
            }
        }

        let x = (Math.random() - 0.5) * 100
        let y = (Math.random() - 0.5) * 100
        bullet.setPosition(x, y)
        
        // 一秒后回收子弹
        this.scheduleOnce( () => {
            this.returnToPool(bullet)
        }, 1)
    }

    returnToPool(bullet: cc.Node) {
        // 注意：这里不要使用 bullet.removeFromParent()。
        // 因为removeFromParent会造成节点从场景上移除，后续资源清理系统遍历场景的时候会访问不到该节点，导致资源使用统计不全面，进而造成资源的误删除！。
        // 所以，如果节点后续还需要复用，请使用node.active = false。
        bullet.active = false 

        this.bulletPool.push(bullet)
    }

    backToCity() {
        cc.director.loadScene('MainCity')
    }
    clean() {
        ResCleaner.clean()
    }
}
