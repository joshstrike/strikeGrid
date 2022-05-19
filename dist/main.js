(()=>{"use strict";class e{params;constructor(e){this.params=e}}class t{grid;rowData;rowID;constructor(e,t,r){this.grid=e,this.rowData=t,this.rowID=r}get rendering(){let e=`<div class='strike-grid strike-grid-row ${this.rowData._rowClasses||""}' row-id='${this.rowID}'>`;return e+=this.grid.columns.map(((e,t)=>`<div class='${e.params._colClasses||""}' row-id='${this.rowID}' col-id='${t}'> \n                            ${e.params.renderFromObject?this.rowData[e.params.handle][e.params.renderFromObject.displayKey]:this.rowData[e.params.handle]}\n                        </div>`)).join("\n"),e+="</div>",e}get currentPosition(){return this.grid.rows.indexOf(this)}get domElement(){return this.grid.el.querySelectorAll(`.strike-grid-row[row-id="${this.rowID}"]`)[0]}}class r extends EventTarget{parent;static _DEFAULTS={headerHeight:30,rowHeight:30,multiColumnSort:!0,gap:{row:1,col:1},selectable:"single"};el;opts;_cols=[];_rows=[];_data;_currentSortCols=[];_currentSelectedRowIDs=new Set;_abortListeners=[];static TEMPLATE_HTM="<div id='strikeGridTemplate' class='strike-grid-holder'>\n                                                <div class='table-container' role='container'>\n                                                    <div class='strike-grid strike-grid-header' role='header'></div>\n                                                    <div class='strike-grid strike-grid-scrollbody' role='scrollbody'></div>\n                                                </div>\n                                            </div>";constructor(e,t={}){super(),this.parent=e,this.opts=Object.assign({...r._DEFAULTS},t);const s=document.createElement("div");s.innerHTML=r.TEMPLATE_HTM,this.el=s.firstChild,this.parent.append(this.el),this.opts.height&&(this.height=this.opts.height)}setColumns(t,r){if(this._currentSortCols=this._currentSortCols.filter((e=>null!=t.find((t=>t.handle==e.handle)))),!this._currentSortCols.length){if(!r){const e=t.find((e=>1==e.sortable));void 0!==e&&(r=e.handle)}if(r){let e=t.find((e=>e.handle==r));if(void 0===e)throw new Error(`Error in setColumns(): default sort column ${r} is not defined.`);this._currentSortCols=[{handle:e.handle,order:e.defaultOrder||"asc"}]}}this._cols=t.map((t=>new e(t))),this._setStyles(),this._renderHeader(),this._data&&(this._renderBody(),this._setListeners())}setData(e){let r=[];this.opts.reselectionKey&&this._currentSelectedRowIDs.size&&(r=Array.from(this._currentSelectedRowIDs).map((e=>this.getDataByID(e)[this.opts.reselectionKey]))),this._currentSelectedRowIDs.clear(),this._data=e,this._rows=this._data.map(((e,r)=>new t(this,e,r))),r.forEach((e=>{const t=this._rows.find((t=>t.rowData[this.opts.reselectionKey]==e));void 0!==t&&this._currentSelectedRowIDs.add(t.rowID)})),this._renderBody(),this._setListeners()}_setStyles(){const e=this._cols.map((e=>e.params.width||"1fr")).join(" ");this.role("header scrollbody").each(((t,r)=>{this.util(r).css({"grid-template-columns":e,"grid-auto-rows":`minmax(${(0==t?this.opts.headerHeight:this.opts.rowHeight)+"px"||0},auto)`,"grid-row-gap":this.opts.gap.row,"grid-column-gap":this.opts.gap.col})})),this.role("scrollbody").css({"max-height":`calc(100% - ${this.opts.headerHeight}px)`})}_setListeners(){this._removeListeners();const e=new AbortController;this._abortListeners.push(e),this.role("header").find('[role="header-cel"][sortable="true"]').css({cursor:"pointer"}),this.el.querySelectorAll('[role="header-cel"][sortable="true"]').forEach((t=>t.addEventListener("click",(e=>{const t=parseInt(e.currentTarget.getAttribute("col-id")),r=this._cols[t],s=this._currentSortCols.findIndex((e=>e.handle==r.params.handle)),o=this._currentSortCols[s]||void 0,i=null==o?0:"asc"==o.order?1:2;let l;switch(l=!this.opts.multiColumnSort||s<=0?(i+1)%3:i,1==this._currentSortCols.length&&this._currentSortCols[0].handle==r.params.handle&&0==l&&(l=1),this.opts.multiColumnSort?o&&this._currentSortCols.splice(s,1):this._currentSortCols=[],l){case 0:break;case 1:this._currentSortCols.unshift({handle:r.params.handle,order:"asc"});break;case 2:this._currentSortCols.unshift({handle:r.params.handle,order:"desc"})}this._renderHeader(),this._renderBody(),this._setListeners()}),{signal:e.signal}))),this.el.querySelector(".strike-grid-scrollbody").addEventListener("click",(e=>this._rowClickHandler(e)),{signal:e.signal})}_removeListeners(){this._abortListeners.forEach((e=>e.abort())),this._abortListeners.length=0}_rowClickHandler(e){const t=e.target.closest(".strike-grid-row");t&&(this.opts.selectable&&this._toggleRowSelection(parseInt(t.getAttribute("row-id"))),this.dispatchEvent(new CustomEvent("rowClicked",{detail:{rowID:t.getAttribute("row-id")}})))}_toggleRowSelection(e){let t=!this._currentSelectedRowIDs.has(e);t?("single"==this.opts.selectable&&this._currentSelectedRowIDs.size&&(this._currentSelectedRowIDs.forEach((e=>this.getRowByID(e).domElement.classList.remove("selected"))),this._currentSelectedRowIDs.clear()),this._currentSelectedRowIDs.add(e)):this._currentSelectedRowIDs.delete(e),this.getRowByID(e).domElement.classList[t?"add":"remove"]("selected"),this.dispatchEvent(new Event("change"))}get columns(){return this._cols}get rows(){return this._rows}getRowByID(e){return this._rows.find((t=>t.rowID==e))}getDataByID(e){return this._data[e]}getMatchingRows(e){return this._rows.filter((t=>e.find((e=>{for(let r of Object.keys(e))if(e[r]!=t.rowData[r])return!1;return!0}))||!1))}clearSelection(){this._currentSelectedRowIDs.forEach((e=>{this.getRowByID(e).domElement.classList.remove("selected")})),this._currentSelectedRowIDs.clear()}get selectedRows(){return Array.from(this._currentSelectedRowIDs).map((e=>this.getRowByID(e)))}get selectedData(){return this.selectedRows.map((e=>e.rowData))}set selectedData(e){if(!this.opts.selectable)return;this.clearSelection();const t=this.getMatchingRows(e).map((e=>e.rowID));"multi"!=this.opts.selectable&&(t.length=1),t.forEach((e=>{this._currentSelectedRowIDs.add(e),this.getRowByID(e).domElement.classList.add("selected")}))}scrollToRow(e,t=0){const r=this.role("scrollbody").elements[0],s=this.getRowByID(e).domElement.firstChild.offsetTop;if(t){const e=30,o=3;r.scrollTop;let i=0,l=setInterval((()=>{r.scrollTop+=(s-r.scrollTop)/(t/(e*o)-i/o),(i>t/e||Math.abs(s-r.scrollTop)<3)&&(r.scrollTo({top:s}),clearInterval(l)),i++}),e)}else r.scrollTo({top:s})}set height(e){this.util(this.el).css({"max-height":e,height:e}),this.role("container").css({"min-height":e})}set outerWidth(e){this.util(this.el).css({"max-width":e})}set innerWidth(e){this.role("container").css({"max-width":e,width:e,"min-width":e})}_sortRows(){const e=this._currentSortCols.map((({handle:e,order:t})=>({col:this._cols.find((t=>t.params.handle==e)),order:t})));e.length&&this._rows.sort((({rowData:t},{rowData:r})=>{let s=0;for(let{col:o,order:i}of e){if(!o.params.sortFn){let e,s;if(o.params.renderFromObject&&o.params.renderFromObject.sortKey?(e=t[o.params.handle][o.params.renderFromObject.sortKey],s=r[o.params.handle][o.params.renderFromObject.sortKey]):(e=t[o.params.handle],s=r[o.params.handle]),"string"==typeof e&&(e=e.toLowerCase()),"string"==typeof s&&(s=s.toLowerCase()),e==s)continue;return(e>s?1:-1)*("desc"==i?-1:1)}if(s=o.params.sortFn(t,r),0!=s)return s*("desc"==i?-1:1)}return 0}))}_renderHeader(){this.role("header").html(this._cols.map(((e,t)=>{const r=this._currentSortCols.findIndex((t=>t.handle==e.params.handle)),s=1-r/this._currentSortCols.length;let o=r>-1?`sort-color-${Math.floor(10*s)}`:"";const i=-1==r?[.3,.3]:"desc"==this._currentSortCols[r].order?[s,0]:[.1,s];let l="",a="header-label";return e.params.sortable&&(l=`<div class='arrow-holder' role='arrow-holder'>\n                                        <div style='width:1.2em;position:relative;left:0px;display:inline-block;'>\n                                            <arrow-down style='opacity:${i[1]};margin-left:-0.6rem;'></arrow-down>\n                                            <arrow-up style='opacity:${i[0]};'></arrow-up>\n                                        </div>\n                                    </div>`,a+=" with-arrows"),`<div class='${o}' role='header-cel' col-id='${t}' sortable='${e.params.sortable?"true":"false"}'>\n                            ${l}\n                            <div class='${a}' role='header-label'>${e.params.label}</div>\n                        </div>`})).join("\n\n"))}_renderBody(){this._sortRows(),this.role("scrollbody").html(this._rows.map((e=>e.rendering)).join("\n\n")),this._currentSelectedRowIDs.forEach((e=>this.getRowByID(e).domElement.classList.add("selected")))}_clearBody(){this.role("scrollbody").html(""),this._currentSelectedRowIDs.clear()}role(e){return this.util().role(e)}util(e=this.el){let t;return t="string"==typeof e?Array.from(document.querySelectorAll(e)):Array.isArray(e)?e:[e],{role:e=>{const r=e.split(" ").map((e=>`[role="${e}"]`)).join(",");return t=t.reduce(((e,t)=>(e.push(...Array.from(t.querySelectorAll(r))),e)),[]),this.util(t)},html:e=>(t.forEach((t=>t.innerHTML=e)),this.util(t)),find:e=>{const r=[];return t.forEach((t=>r.push(...Array.from(t.querySelectorAll(e))))),this.util(r)},each:e=>(t.forEach(((t,r)=>{e(r,t)})),this.util(t)),css:e=>(t.forEach((t=>{Object.keys(e).forEach((r=>{t.style[r]=e[r]}))})),this.util(t)),elements:t}}async destroy(){this._clearBody(),this._rows=[],this._currentSortCols=[],this._currentSelectedRowIDs.clear(),this._removeListeners()}}try{window.require(["./css/strikegrid.css"])}catch(e){}new class{grid;constructor(){this.grid=new r(document.getElementById("someElement"),{rowHeight:40,multiColumnSort:!0,selectable:"single",reselectionKey:"id"}),window.grid=this.grid,this.init()}async init(){this.grid.setColumns([{handle:"strA",label:"First String",width:"4fr",sortable:!0,sortFn:({strA:e},{strA:t})=>(e=e.toLowerCase(),t=t.toLowerCase(),e.length!=t.length?e.length>t.length?1:-1:e==t?0:e>t?1:-1)},{handle:"strB",label:"Second String",width:"4fr",sortable:!0},{handle:"difflength",label:"Difference",width:"1fr",sortable:!1,renderFromObject:{displayKey:"_",sortKey:"s"}}]);let e=[];const t=await(await(await fetch("assets/test.txt")).text()).split(" ");for(let r=1;r<t.length;r++)e.push({id:r,strA:t[r-1],strB:t[r],difflength:{_:"Huh "+Math.abs(t[r].length-t[r-1].length),s:Math.abs(t[r].length-t[r-1].length)},diffnum:Math.abs(t[r].length-t[r-1].length),_rowClasses:"centertxt"});this.grid.setData(e),this.grid.addEventListener("rowClicked",(e=>{console.log("Clicked row:",e.detail.rowID)})),this.grid.addEventListener("change",(e=>{console.log("Selected rows:",this.grid.selectedRows)})),this.grid.selectedData=[{strA:"single"}],this.grid.scrollToRow(this.grid.selectedRows[0].rowID,300)}}})();