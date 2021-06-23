// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

//布局方式
enum LayoutType {
    LIST,
    GRID
}

//布局方向
enum LayoutOrientation {
    VERTICAL,
    HORIZONTAL
}

//垂直布局时Item方向
enum VerticalDirection    {
    TOP_TO_BOTTOM,
    BOTTOM_TO_TOP
}

//横向布局时Item方向
enum HorizontalDirection {
    LEFT_TO_RIGHT,
    RIGHT_TO_LEFT
}

enum VerticalAlign{
    TOP,
    CENTER,
    BOTTOM
}

enum HorizontalAlign{
    LEFT,
    CENTER,
    RIGHT
}


class CellItemInfo {
    index : number = 0;
    position : cc.Vec2 = cc.v2(0, 0);
    rect : cc.Rect = cc.rect(0, 0, 0, 0);
    size : cc.Size = cc.size(0, 0);
};


const { ccclass, property, menu } = cc._decorator;

@ccclass
@menu("custom/TableView")
export default class TableView extends cc.Component {

    //布局类型 列表布局，格子布局
    @property({
        type: cc.Enum(LayoutType),
        tooltip: "布局类型：\n列表布局，格子布局"
    })
    layoutType: LayoutType = LayoutType.LIST;

    //布局方向
    @property({
        type: cc.Enum(LayoutOrientation),
        tooltip: "布局方向：\n垂直布局，水平布局"
    })
    layoutOrientation: LayoutOrientation = LayoutOrientation.VERTICAL;

    @property({
        type: cc.Enum(VerticalDirection),
        tooltip: "垂直布局时Item的方向\n（从上至下，从下至上）",
        visible() {
            return (this.layoutType == LayoutType.LIST &&
                this.layoutOrientation == LayoutOrientation.VERTICAL) ||
                this.layoutType == LayoutType.GRID;
        }
    })
    verticalDirection: VerticalDirection = VerticalDirection.TOP_TO_BOTTOM;

    @property({
        type: cc.Enum(HorizontalDirection),
        tooltip: "水平布局时Item的方向\n（从左至右，从右至左）",
        visible() {
            return (this.layoutType == LayoutType.LIST &&
                this.layoutOrientation == LayoutOrientation.HORIZONTAL) ||
                this.layoutType == LayoutType.GRID;
        }
    })
    horizontalDirection: HorizontalDirection = HorizontalDirection.LEFT_TO_RIGHT;

    @property({
        type: cc.Enum(VerticalAlign),
        tooltip: "垂直方向上对齐方式",
        visible() {
            return (this.layoutType == LayoutType.LIST &&
                this.layoutOrientation == LayoutOrientation.HORIZONTAL) ||
                this.layoutType == LayoutType.GRID;
        }
    })
    verticalAlign: VerticalAlign = VerticalAlign.TOP;

    @property({
        type: cc.Enum(HorizontalAlign),
        tooltip: "水平方向上对齐方式",
        visible() {
            return (this.layoutType == LayoutType.LIST &&
                this.layoutOrientation == LayoutOrientation.VERTICAL) ||
                this.layoutType == LayoutType.GRID;
        }
    })
    horizontalAlign: HorizontalAlign = HorizontalAlign.LEFT;
   
    @property({
        visible() {
            return (this.layoutType == LayoutType.LIST &&
                this.layoutOrientation == LayoutOrientation.HORIZONTAL) ||
                this.layoutType == LayoutType.GRID;
        },
        tooltip: "水平间隔",
    })
    spaceX: number = 0;

    @property({
        visible() {
            return (this.layoutType == LayoutType.LIST &&
                this.layoutOrientation == LayoutOrientation.VERTICAL) ||
                this.layoutType == LayoutType.GRID;
        },
        tooltip: "垂直间隔",
    })
    spaceY: number = 0;

    /**
     * 左侧内边距
     */
    @property({
        tooltip: "左侧内边距",
        visible(){
            return this.horizontalAlign == HorizontalAlign.LEFT || 
                    this.layoutOrientation == LayoutOrientation.HORIZONTAL;
        }
    })
    paddingLeft: number = 0;

    /**
     * 右侧内边距
     */
    @property({
        tooltip: "右侧内边距",
        visible(){
            return this.horizontalAlign == HorizontalAlign.RIGHT || 
                    this.layoutOrientation == LayoutOrientation.HORIZONTAL;
        }
    })
    paddingRight: number = 0;

    /**
     * 顶部内边距
     */
    @property({
        tooltip: "顶部内边距",
        visible(){
            return this.verticalAlign == VerticalAlign.TOP || 
                    this.layoutOrientation == LayoutOrientation.VERTICAL;
        }
    })
    paddingTop: number = 0;

    /**
     * 底部内边距
     */
    @property({
        tooltip: "底部内边距",
        visible(){
            return this.verticalAlign == VerticalAlign.BOTTOM || 
                    this.layoutOrientation == LayoutOrientation.VERTICAL;
        }
    })
    paddingBottom: number = 0;

    _scrollView: cc.ScrollView = null;
    /**
     * 可视区域尺寸
     */
    _visibleSize: cc.Size = cc.Size.ZERO;
    //当前显示的cell
    _cells: { index: number, node: cc.Node }[] = [];
    //cellItem信息，保存位置及矩形信息
    _cellItemsInfo: CellItemInfo[] = [];

    //缓存的不可见cell
    _invisibleCells: cc.Node[] = [];
    //获取当前索引的cell
    _cellAtIndexCall: (tbv: TableView, index: number) => cc.Node = null;
    //获取当前索引cell的Size
    _cellSizeAtIndexCall: (tbv: TableView, index: number) => cc.Size = null;
    //获取cell数量
    _cellNumberOfCellCall: () => number = null;
    //cell数量
    _cellCount: number = 0;

    onLoad() {
        this._scrollView = this.node.getComponent(cc.ScrollView);
        if (!this._scrollView) {
            return;
        }

        this._scrollView.content.removeAllChildren(true);

        this._visibleSize = this._scrollView.content.parent.getContentSize();
        this._scrollView.content.setAnchorPoint(0,1);
        this._scrollView.content.setPosition(- this._visibleSize.width / 2,this._visibleSize.height / 2);
        let scrollViewEventHandler = new cc.Component.EventHandler();
        scrollViewEventHandler.target = this.node; // 这个 node 节点是你的事件处理代码组件所属的节点
        scrollViewEventHandler.component = "TableView";// 这个是代码文件名
        scrollViewEventHandler.handler = "scrollEvent";

        this._scrollView.scrollEvents.push(scrollViewEventHandler);
    }

    /**
     * 获取节点
     */
    dequeueCell() {
        if (this._invisibleCells.length > 0) {
            let cellNode = this._invisibleCells.shift();
            return cellNode;
        }
        let cellNode = new cc.Node();
        cellNode.parent = this._scrollView.content;
        return cellNode;
    }

    /**
     * 注册Cell节点回调
     * @param callBack 回调函数
     */
    registerCellAtIndex(callBack: (tbv: TableView, index: number) => cc.Node) {
        this._cellAtIndexCall = callBack;
    }

    /**
     * 注册获取节点Size回调
     * @param callBack 回调函数
     */
    registerCellSizeAtIndex(callBack: (tbv: TableView, index: number) => cc.Size) {
        this._cellSizeAtIndexCall = callBack;
    }

    /**
     * 注册获取节点数量回调
     * @param callBack 回调函数
     */
    registerCellNumberOfCellCall(callBack: () => number) {
        this._cellNumberOfCellCall = callBack;
    }

    /**
     * 数据变更时刷新View
     */
    updateView() {
        this._cellCount = this._cellNumberOfCellCall ? this._cellNumberOfCellCall() : 0;

        let contentHeight = this._visibleSize.height;
        let contentWidth = this._visibleSize.width;

        this._cellItemsInfo.length = 0;

        //存在元素
        if(this._cellCount > 0){
            //垂直内边距
            let paddingVertical = this.verticalDirection == VerticalDirection.TOP_TO_BOTTOM ? this.paddingTop : this.paddingBottom;
            //水平内边距
            let paddingHorizontal = this.horizontalDirection == HorizontalDirection.LEFT_TO_RIGHT ? this.paddingLeft : this.paddingRight;

            let height = paddingVertical;
            let width = paddingHorizontal;
    
            //缓存的高度和宽度，用来计算单行或单列
            let tempHeight = 0;
            let tempWidth = 0;

            let rowItemInfos : { items: CellItemInfo[] , height : number , width : number}[] = [];
            let cloumnItemInfos : { items: CellItemInfo[] , height : number , width : number}[] = [];

            let rowItemInfo : { items: CellItemInfo[] , height : number , width : number} = null;
            let cloumnItemInfo : { items: CellItemInfo[] , height : number , width : number} = null;


            //计算content总高度
            for (let i = 0; i < this._cellCount; i++) {
                let size = this._cellSizeAtIndexCall ? this._cellSizeAtIndexCall(this, i) : cc.Size.ZERO;

                if(this._isOrientationVertical() && rowItemInfo == null){
                    rowItemInfo = { items : [] , height : 0 ,width : 0};
                }
                else if(this._isOrientationHorizontal() && cloumnItemInfo == null){
                    cloumnItemInfo = { items : [] , height : 0 ,width : 0};
                }

                //新建CellItem
                let cIt = new CellItemInfo();
                cIt.index = i;
                cIt.size = size;

                if (this.layoutType == LayoutType.LIST) {
                    //List只处理方向上的宽高
                    if (this._isOrientationVertical()) {
                        height += size.height + (i != 0 ? this.spaceY : 0);
                        rowItemInfo.items.push(cIt);
                        rowItemInfo.height = size.height;
                        rowItemInfo.width = size.width;
                        rowItemInfos.push(rowItemInfo);

                        rowItemInfo = null;
                    }
                    else {
                        width += size.width + (i != 0 ? this.spaceX : 0);

                        cloumnItemInfo.items.push(cIt);
                        cloumnItemInfo.height = size.height;
                        cloumnItemInfo.width = size.width;
                        cloumnItemInfos.push(cloumnItemInfo);
                        cloumnItemInfo = null;
                    }
                }
                else if (this.layoutType == LayoutType.GRID) {
                    if (this._isOrientationVertical()) {
                        if(tempWidth + paddingHorizontal + size.width + (tempWidth > 0 ? this.spaceX : 0) > this._visibleSize.width){
                            //水平区域放不下Item
                            if(tempWidth == 0){
                                //如果这一行没有item 则把item放在这一行
                                height += size.height + (rowItemInfos.length == 0 ? 0 : this.spaceY);

                                rowItemInfo.items.push(cIt);
                                rowItemInfo.height = size.height;
                                rowItemInfo.width = size.width;
                                rowItemInfos.push(rowItemInfo);

                                rowItemInfo = null;
                            }
                            else{
                                //item放到下一行
                                height += rowItemInfo.height + (rowItemInfos.length == 0 ? 0 : this.spaceY);
                                rowItemInfo.width = tempWidth;
                                //先保存上一行item再新建一行数据
                                rowItemInfos.push(rowItemInfo);
                                rowItemInfo = { items : [cIt] , height : size.height , width : 0 };

                                tempWidth = size.width;
                            }
                        }
                        else{
                            //正常向后排列
                            tempWidth += size.width + (tempWidth > 0 ? this.spaceX : 0);
                            rowItemInfo.items.push(cIt);
                            rowItemInfo.height = Math.max(rowItemInfo.height,size.height);
                        }
                    }
                    else if(this._isOrientationHorizontal()){
                        if(tempHeight + paddingVertical + size.height + (tempHeight > 0 ? this.spaceY : 0) > this._visibleSize.height){
                            //水平区域放不下Item
                            if(tempHeight == 0){
                                //如果这一列没有item 则把item放在这一列
                                width += size.width + (cloumnItemInfos.length == 0 ? 0 : this.spaceX);

                                cloumnItemInfo.items.push(cIt);
                                cloumnItemInfo.width = size.width;
                                cloumnItemInfo.height = size.height;
                                cloumnItemInfos.push(cloumnItemInfo);

                                cloumnItemInfo = null;
                            }
                            else{
                                width += cloumnItemInfo.width + (cloumnItemInfos.length == 0 ? 0 : this.spaceX);
                                cloumnItemInfo.height = tempHeight;
                                //先保存上一列item再新建一列数据
                                cloumnItemInfos.push(cloumnItemInfo);
                                cloumnItemInfo = { items : [cIt] , width : size.width , height : 0 };

                                tempHeight = size.height;
                            }
                        }
                        else{
                            //正常向下排列
                            tempHeight += size.height + (tempHeight > 0 ? this.spaceY : 0);
                            cloumnItemInfo.items.push(cIt);
                            cloumnItemInfo.width = Math.max(cloumnItemInfo.width,size.width);
                        }
                    }
                }
            }

            if(this._isOrientationVertical() && rowItemInfo != null){
                height += rowItemInfo.height + (rowItemInfos.length == 0 ? 0 : this.spaceY);
                rowItemInfo.width = tempWidth;
                rowItemInfos.push(rowItemInfo);
            }

            if(this._isOrientationHorizontal() && cloumnItemInfo != null){
                width += cloumnItemInfo.width + (cloumnItemInfos.length == 0 ? 0 : this.spaceX);
                cloumnItemInfo.height = tempHeight;
                cloumnItemInfos.push(cloumnItemInfo);
            }

            height += this.verticalDirection == VerticalDirection.TOP_TO_BOTTOM ? this.paddingBottom : this.paddingTop;
            width += this.horizontalDirection == HorizontalDirection.LEFT_TO_RIGHT ? this.paddingBottom : this.paddingTop;

            if(this._isOrientationVertical()){
                contentHeight = Math.max(height, this._visibleSize.height);

                if(this.verticalDirection == VerticalDirection.BOTTOM_TO_TOP){
                    rowItemInfos.reverse();
                }
                
                let rh = this.paddingTop;
                rowItemInfos.forEach( row=>{
                    let xStart = paddingHorizontal;

                    if(this.horizontalAlign == HorizontalAlign.CENTER){
                        xStart = this._visibleSize.width / 2 - row.width / 2;
                    }
                    else if(this.horizontalAlign == HorizontalAlign.LEFT){
                        xStart = this.paddingLeft;
                    }
                    else if(this.horizontalAlign == HorizontalAlign.RIGHT){
                        xStart = this._visibleSize.width - this.paddingRight - row.width;
                    }

                    if(this.horizontalDirection == HorizontalDirection.RIGHT_TO_LEFT){
                        row.items.reverse();
                    }

                    row.items.forEach( item=> {
                        item.position.x = xStart + item.size.width / 2;

                        xStart += item.size.width + this.spaceX;

                        item.position.y = contentHeight - (rh + item.size.height / 2);

                        item.rect = cc.rect(item.position.x - item.size.width / 2,item.position.y - item.size.height / 2,item.size.width,item.size.height);

                        item.position.y -= contentHeight;
                    });

                    rh += row.height + this.spaceY;

                    this._cellItemsInfo.push(...row.items);
                    row.items.length = 0;
                });

                rowItemInfos.length = 0;
            }
            else{
                contentWidth = Math.max(width, this._visibleSize.width);

                if(this.horizontalDirection == HorizontalDirection.RIGHT_TO_LEFT){
                    cloumnItemInfos.reverse();
                }

                let cw = this.paddingLeft;
                cloumnItemInfos.forEach( cloumn=>{
                    let yStart = paddingVertical;

                    if(this.verticalAlign == VerticalAlign.CENTER){
                        yStart = this._visibleSize.height / 2 + cloumn.height / 2;
                    }
                    else if(this.verticalAlign == VerticalAlign.TOP){
                        yStart = this._visibleSize.height - this.paddingTop;
                    }
                    else if(this.verticalAlign == VerticalAlign.BOTTOM){
                        yStart = cloumn.height + this.paddingBottom;
                    }

                    if(this.horizontalDirection == HorizontalDirection.RIGHT_TO_LEFT){
                        cloumn.items.reverse();
                    }

                    cloumn.items.forEach( item=>{

                        item.position.y = yStart - item.size.height / 2;
                        yStart -= item.size.height + this.spaceY;

                        item.position.x = (cw + item.size.height / 2);

                        item.rect = cc.rect(item.position.x - item.size.width / 2,item.position.y - item.size.height / 2,item.size.width,item.size.height);

                        item.position.y -= contentHeight;
                    });

                    cw += cloumn.width + this.spaceX;

                    this._cellItemsInfo.push(...cloumn.items);
                });

                cloumnItemInfos.length = 0;
            }
        }

        this._scrollView.content.height = contentHeight;
        this._scrollView.content.width = contentWidth;

        this._cells.forEach(cell => {
            cell.node.active = false;
            this._invisibleCells.push(cell.node);
        });

        this._cells.length = 0;

        this.updateContent();
    }

    /**
     * 滚动到顶部
     * @param timeInSecond 所需时间（单位秒）
     * @param attenuated 是否使用摩擦力
     */
    scrollToTop(timeInSecond?: number, attenuated?: boolean) {
        this._scrollView.scrollToTop(timeInSecond, attenuated);

        if (!timeInSecond) {
            this.updateContent();
        }
    }

    /**
     * 滚动到底部
     * @param timeInSecond 所需时间（单位秒）
     * @param attenuated 是否使用摩擦力
     */
    scrollToBottom(timeInSecond?: number, attenuated?: boolean) {
        this._scrollView.scrollToBottom(timeInSecond, attenuated);

        if (!timeInSecond) {
            this.updateContent();
        }
    }

    /**
     * 滚动到左侧
     * @param timeInSecond 所需时间（单位秒）
     * @param attenuated 是否使用摩擦力
     */
    scrollToLeft(timeInSecond?: number, attenuated?: boolean) {
        this._scrollView.scrollToLeft(timeInSecond, attenuated);

        if (!timeInSecond) {
            this.updateContent();
        }
    }

    /**
     * 滚动到右侧
     * @param timeInSecond 所需时间（单位秒）
     * @param attenuated 是否使用摩擦力
     */
    scrollToRight(timeInSecond?: number, attenuated?: boolean) {
        this._scrollView.scrollToRight(timeInSecond, attenuated);

        if (!timeInSecond) {
            this.updateContent();
        }
    }

    /**
     * 获取可见节点
     */
    getVisibleItems() : cc.Node[] {
        return this._cells.map( cell => cell.node);
    }

    protected updateContent() {
        let offSet = this._scrollView.getScrollOffset();
        
        let visibleRect = cc.rect(offSet.x,this._scrollView.content.height-offSet.y - this._visibleSize.height,this._visibleSize.width,this._visibleSize.height);

        if(this._isOrientationHorizontal()){
            visibleRect = cc.rect(-offSet.x,0,this._visibleSize.width,this._visibleSize.height);
        }

        for(let i = this._cellItemsInfo.length; i-- ; ){
            let itemInfo = this._cellItemsInfo[i];

            let cellIndex = this._cells.findIndex(c => c.index == itemInfo.index);

            if (visibleRect.intersects(itemInfo.rect) || visibleRect.containsRect(itemInfo.rect)) {
                if (cellIndex == -1) {
                    let node = this._cellAtIndexCall(this, itemInfo.index);
                    node.active = true;
                    node.setPosition(itemInfo.position);
                    this._cells.push({ index: itemInfo.index, node: node });
                }
            }
            else {
                if (cellIndex != -1) {
                    this._cells[cellIndex].node.active = false;
                    this._invisibleCells.push(this._cells[cellIndex].node);
                    this._cells.splice(cellIndex, 1);
                }
            }
        }
    }

    /**
     * 滚动事件
     * @param scrollview scrollView
     * @param eventType 事件类型
     * @param customEventData 自定义Data
     */
    scrollEvent(scrollview: cc.ScrollView, eventType: cc.ScrollView.EventType, customEventData: string) {
        this.updateContent();
    }

    /**
     * 是否是垂直布局
     */
    protected _isOrientationVertical() : boolean{
        return this.layoutOrientation == LayoutOrientation.VERTICAL;
    }

    /**
     * 是否水平布局
     */
    protected _isOrientationHorizontal() : boolean {
        return this.layoutOrientation == LayoutOrientation.HORIZONTAL;
    }
}
