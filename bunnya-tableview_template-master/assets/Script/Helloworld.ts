const {ccclass, property} = cc._decorator;

import TableView from "./TableView"

@ccclass
export default class Helloworld extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null;

    @property
    text: string = 'hello';

    @property(cc.Prefab)
    itemPrefab : cc.Prefab = null;

    @property(TableView)
    tbView : TableView = null;
    
    @property
    itemCount = 50;

    onLoad(){

    }

    start () {
        // init logic
        this.label.string = this.text;

        this.tbView.registerCellAtIndex(this._cellAtIndexCall.bind(this));
        this.tbView.registerCellNumberOfCellCall(this._cellNumberOfCellCall.bind(this));
        this.tbView.registerCellSizeAtIndex(this._cellSizeAtIndexCall.bind(this));

        this.tbView.updateView();
    }

    onClickAdd(){
        this.itemCount++;
        this.tbView.updateView();
    }

    onClickSub(){
        this.itemCount--;
        this.tbView.updateView();
    }

    onClickTop(){
        this.tbView.scrollToTop();
    }

    onClickBottom(){
        this.tbView.scrollToBottom();
    }

    _cellAtIndexCall(tbv : TableView,index : number) : cc.Node {
        let dq = tbv.dequeueCell();
        let it = dq.getChildByName("joker");
        if(it){
            it.getChildByName("label").getComponent(cc.Label).string = index.toString();
        }
        else{
            it = cc.instantiate(this.itemPrefab);
            it.name = "joker";
            it.parent = dq;
            it.getChildByName("label").getComponent(cc.Label).string = index.toString();
        }
        return dq;
    };
    _cellSizeAtIndexCall(tbv : TableView,index : number) : cc.Size{
        return cc.size(50,50);
    };
    _cellNumberOfCellCall() : number{
        return this.itemCount; 
    };
}
