import { StrikeGrid } from "./js/strike/component/StrikeGrid";

const grid = new StrikeGrid('testGrid',{rowHeight:40,/* height:800, */multiColumnSort:true,selectable:'multi',reselectionKey:'id'});
window['grid'] = grid;
grid.init($('#someElement')).then((res:any)=>{
    grid.setColumns([
        {handle:'strA',label:'First String',width:'4fr',sortable:true,//renderFromObject:{displayKey:'_',sortKey:'s'}
        sortFn:({strA:a},{strA:b})=>{
            a = (<string>a).toLowerCase();
            b = (<string>b).toLowerCase();
            if (a.length != b.length) return (a.length > b.length ? 1 : -1);
            return (a==b ? 0 : (a > b ? 1 : -1))}
        }, 
        {handle:'strB',label:'Second String',width:'4fr',sortable:true}, 
        {handle:'difflength',label:'Difference',width:'1fr',sortable:false,renderFromObject:{displayKey:'_',sortKey:'s'}}
    ]);

    /* Test data */
    let k:{id:number,strA:string,strB:string,difflength:{_,s},diffnum:number,_rowClasses:string}[] = [];
    const testStrs:string[] = $.ajax({url:'assets/test.txt', async:false}).responseText.split(' ');
    for (let c:number = 1;c < testStrs.length;c++) {
        k.push({id:c,
                strA:testStrs[c-1], 
                strB:testStrs[c],
                difflength:{_:"Huh "+Math.abs(testStrs[c].length-testStrs[c-1].length),s:Math.abs(testStrs[c].length-testStrs[c-1].length)},
                diffnum:Math.abs(testStrs[c].length-testStrs[c-1].length),
                _rowClasses:'centertxt red'});
    }

    //grid._currentSortCols = [{handle:'strA',order:'asc'},{handle:'difflength',order:'desc'},{handle:'strB',order:'asc'}];
    grid.setData(k);
    $(grid).on('rowClicked',(evt:JQuery.Event,params:{rowID:number})=>{
        //alert (grid.getRowByID(params.rowID).currentPosition);
        //if (grid.selectedRows.length > 4) grid.setData(grid.selectedRows.map((_sr)=>_sr.rowData));
    });

    grid.selectedData = [{strA:'self-aggrandizing'}];
    grid.scrollToRow(grid.selectedRows[0].rowID,300);
});