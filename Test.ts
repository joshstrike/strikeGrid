import { StrikeGrid } from "./js/strike/component/StrikeGrid.js";

type TestData = {id:number,strA:string,strB:string,difflength:{_,s},diffnum:number,_rowClasses:string};

export class Test {
    public grid:StrikeGrid<TestData>;
    public constructor() {
        this.grid = new StrikeGrid<TestData>(document.getElementById('someElement'),{rowHeight:40,/* height:800, */multiColumnSort:true,selectable:'single',reselectionKey:'id'});
        window['grid'] = this.grid;
        this.init();
    }
    public async init():Promise<void> {
        this.grid.setColumns([
            {handle:'strA',label:'First String',width:'4fr',sortable:true,
            sortFn:({strA:a},{strA:b})=>{
                a = (<string>a).toLowerCase();
                b = (<string>b).toLowerCase();
                if (a.length != b.length) return (a.length > b.length ? 1 : -1);
                return (a==b ? 0 : (a > b ? 1 : -1))}
            }, 
            {handle:'strB', label:'Second String',width:'4fr',sortable:true}, 
            {handle:'difflength',label:'Difference',width:'1fr',sortable:false,renderFromObject:{displayKey:'_',sortKey:'s'}}
        ]);

        /* Test data */
        let k:TestData[] = [];
        const testStrs:string[] = await (await (await fetch('assets/test.txt')).text()).split(' ');

        for (let c:number = 1;c < testStrs.length;c++) {
            k.push({id:c,
                    strA:testStrs[c-1], 
                    strB:testStrs[c],
                    difflength:{_:"Huh "+Math.abs(testStrs[c].length-testStrs[c-1].length),s:Math.abs(testStrs[c].length-testStrs[c-1].length)},
                    diffnum:Math.abs(testStrs[c].length-testStrs[c-1].length),
                    _rowClasses:'centertxt'});
        }

        this.grid.setData(k);
        this.grid.addEventListener('rowClicked',(evt:CustomEvent)=>{
            console.log('Clicked row:', evt.detail.rowID);
        });
        this.grid.addEventListener('change',(evt:CustomEvent)=>{
            console.log('Selected rows:',this.grid.selectedRows);
        });

        this.grid.selectedData = [{strA:'single'}];
        this.grid.scrollToRow(this.grid.selectedRows[0].rowID,300);
    }
}

new Test();
