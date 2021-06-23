const { ccclass, property } = cc._decorator;

const debugUrl = ''

// copy from cocos engine. ugly
function parseDepends (key, parsed) {
    let item = cc.loader['getItem'](key);
    if (item) {
        let depends = item['dependKeys'];
        if (depends) {
            for (let i = 0; i < depends.length; i++) {
                let depend = depends[i];
                if ( !parsed[depend] ) {
                    parsed[depend] = true;
                    
                    if (debugUrl === depend) {
                        cc.log('debug')
                    }
        
                    parseDepends(depend, parsed);
                }
            }
        }
    }
}

function visitAsset (asset, excludeMap) {
    // Skip assets generated programmatically or by user (e.g. label texture)
    if (!asset._uuid) {
        return;
    }
    let key =cc.loader['_getReferenceKey'](asset);
    if ( !excludeMap[key] ) {
        excludeMap[key] = true;

        if (debugUrl === key) {
            cc.log('debug')
        }

        parseDepends(key, excludeMap);
    }
}

function visitComponent (comp, excludeMap) {
    let props = Object.getOwnPropertyNames(comp);
    for (let i = 0; i < props.length; i++) {
        let value = comp[props[i]];
        if (typeof value === 'object' && value) {
            if (Array.isArray(value)) {
                for (let j = 0; j < value.length; j++) {
                    let val = value[j];
                    if (val instanceof cc.RawAsset) {
                        visitAsset(val, excludeMap);
                    }
                }
            }
            else if (!value.constructor || value.constructor === Object) {
                let keys = Object.getOwnPropertyNames(value);
                for (let j = 0; j < keys.length; j++) {
                    let val = value[keys[j]];
                    if (val instanceof cc.RawAsset) {
                        visitAsset(val, excludeMap);
                    }
                }
            }
            else if (value instanceof cc.RawAsset) {
                visitAsset(value, excludeMap);
            }
        }
    }
}

function visitNode (node, excludeMap) {
    for (let i = 0; i < node._components.length; i++) {
        visitComponent(node._components[i], excludeMap);
    }
    for (let i = 0; i < node._children.length; i++) {
        visitNode(node._children[i], excludeMap);
    }
}

function visitItem(item, excludeMap) {
    if (excludeMap[item.url] ) return

    if (item.complete) {
        let asset = item.content
        if (asset) {
            if (asset instanceof cc.RawAsset) {
                visitAsset(asset, excludeMap)
            }
            else {
                cc.log('asset instanceof cc.RawAsset === false')
            }
        }
        else {
            cc.log('item.complete === true, but item.content  is empty')
        }
        excludeMap[item.url] = true

        if (debugUrl === item.url) {
            cc.log('debug')
        }
    }
    else {
        excludeMap[item.url] = true
        
        if (debugUrl === item.url) {
            cc.log('debug')
        }

        let deps = item.deps
        if (deps && deps.length > 0) {
            for (let i = 0; i < deps.length; i++) {
                const item = deps[i];
                visitItem(item, excludeMap)
            }
        }
    }
}

export class ResCleaner {


   // 资源清理
    static clean() {
        cc.log('--->资源释放 开始')
        let start = Date.now()
        let excludeMap = cc.js.createMap()
        let cache =cc.loader['_cache']

        // 排除内置资源
        let builtinDeps = cc['AssetLibrary'].getBuiltinDeps()
        for (const key in builtinDeps) {
            excludeMap[key] = true
        }

        // 排除场景引用的资源
        let nodeList = cc.director.getScene().children
        for (let i = 0; i < nodeList.length; i++) {
            visitNode(nodeList[i], excludeMap)
        }

        // 剔除加载中的资源
        let runningQueues = {}
        for (const key in cache) {
            let item = cache[key]
            let queue = cc.LoadingItems.getQueue(item)
            if (queue) {
                let queueId = queue['_id']
                runningQueues[queueId] = queue
            }
        }
        for (const queueId in runningQueues) {
            const queue: cc.LoadingItems = runningQueues[queueId];
            for (const url in queue.map) {
                const item = queue.map[url]
                visitItem(item, excludeMap)
            }
        }

        // 遍历资源缓存，逐个资源判断是否被场景引用，若未被场景上的节点引用则释放。
        let releaseList = []
        for (const key in cache) {
            let item = cache[key]
            
            if (!excludeMap[key]) {
                if (!item.complete) {
                    cc.warn('资源未加载完却被释放！')
                    continue
                }
                releaseList.push(key)
            }
        }
        for (let i = 0; i < releaseList.length; i++) {
            const key = releaseList[i];
            let item = cache[key]
            if (!item) continue

            let name = ''
            if (item.content && item.content.name) name = item.content.name
            cc.log('资源释放', key)
           cc.loader.release(key)
        }

        let timeSpan = Date.now() - start
        cc.log('<---资源释放 结束。  耗时：', timeSpan, 'ms')
    }
}
