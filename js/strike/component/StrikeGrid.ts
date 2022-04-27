export type StrikeGridOptions = {
    headerHeight?:number, 
    rowHeight?:number, 
    height?:number, 
    multiColumnSort?:boolean, 
    gap?:{row:number,col:number}, 
    selectable?:null|'single'|'multi',
    reselectionKey?:string
}

export type StrikeGridColParams<T> = {
    handle:keyof T, 
    label:string, 
    sortable?:boolean, 
    width?:string, 
    defaultOrder?:'desc'|'asc',
    sortFn?:(a:T,b:T)=>number, 
    renderFromObject?:{displayKey:string, sortKey?:string}, 
    _colClasses?:string
}

class Column<T> {
    public constructor(public params:StrikeGridColParams<T>) {}
}

class RowDisplay<T> {
    public constructor(public grid:StrikeGrid<any>, public rowData:T, public rowID:number) {}
    public get rendering():string {
        let f:string = `<div class='strike-grid strike-grid-row ${this.rowData['_rowClasses']||""}' row-id='${this.rowID}'>`;
        f += this.grid.columns.map((_c,_idx)=>
                        `<div class='${_c.params._colClasses || ""}' row-id='${this.rowID}' col-id='${_idx}'> 
                            ${_c.params.renderFromObject ? this.rowData[_c.params.handle][_c.params.renderFromObject.displayKey] : 
                                                    this.rowData[_c.params.handle]}
                        </div>`).join('\n');
        f += `</div>`;
        return (f);
    }
    public get currentPosition():number {
        return (this.grid.rows.indexOf(this));
    }
    public get domElement():HTMLElement {
        return (<HTMLElement>this.grid.el.querySelectorAll(`.strike-grid-row[row-id="${this.rowID}"]`)[0]);
    }
}

export class StrikeGrid<T> extends EventTarget {
    protected static _DEFAULTS:StrikeGridOptions = {
        headerHeight:30, 
        rowHeight:30, 
        multiColumnSort:true, 
        gap:{row:1,col:1}, 
        selectable:'single'
    }
    public el:HTMLElement;
    public opts:StrikeGridOptions;
    protected _cols:Column<T>[] = [];
    protected _rows:RowDisplay<T>[] = [];
    protected _data:T[];
    public _currentSortCols:{handle:keyof T,order:'desc'|'asc'}[] = [];
    protected _currentSelectedRowIDs:Set<number> = new Set();
    protected _abortListeners:AbortController[] = [];

    protected static TEMPLATE_HTM:string = `<div id='strikeGridTemplate' class='strike-grid-holder'>
                                                <div class='table-container' role='container'>
                                                    <div class='strike-grid strike-grid-header' role='header'></div>
                                                    <div class='strike-grid strike-grid-scrollbody' role='scrollbody'></div>
                                                </div>
                                            </div>`;

    public constructor(public parent:HTMLElement, _opts:StrikeGridOptions = {}) {
        super();
        this.opts = Object.assign({...StrikeGrid._DEFAULTS},_opts);
        const _temp:HTMLElement = document.createElement('div');
        _temp.innerHTML = StrikeGrid.TEMPLATE_HTM;
        this.el = <HTMLElement>_temp.firstChild;
        this.parent.append(this.el);
        if (this.opts.height) this.height = this.opts.height;
    }
    public setColumns(colParams:StrikeGridColParams<T>[],defaultSortHandle?:keyof T) {
        //remove sort columns that no longer exist in the new column set:
        this._currentSortCols = this._currentSortCols.filter((_csc)=>colParams.find((_col)=>_col.handle==_csc.handle)!=undefined);

        if (!this._currentSortCols.length) {
            if (!defaultSortHandle) {
                //If no default sort handle was passed, resort to the first column that's sortable, if any.
                const _firstSortableCol:StrikeGridColParams<T> = colParams.find((_c)=>_c.sortable==true);
                if (_firstSortableCol !== undefined) {
                    defaultSortHandle = _firstSortableCol.handle;
                }
            }
            if (defaultSortHandle) {
                let _defaultSortCol:StrikeGridColParams<T> = colParams.find((_c)=>_c.handle==defaultSortHandle);
                if (_defaultSortCol === undefined) throw new Error(`Error in setColumns(): default sort column ${defaultSortHandle} is not defined.`);
                this._currentSortCols = [{handle:_defaultSortCol.handle, order:_defaultSortCol.defaultOrder || 'asc'}];
            }
        }
        this._cols = colParams.map((_p)=>new Column(_p));
        
        this._setStyles();
        this._renderHeader();
        if (this._data) {
            this._renderBody();
            this._setListeners();
        }
    }
    public setData(d:T[]):void {
        //Collect prior selected values from the rowIDs if reselectionKey is specified. This must be a unique ID in the data!
        let _reselectVals:(string|number)[] = [];
        if (this.opts.reselectionKey && this._currentSelectedRowIDs.size) {
            _reselectVals = Array.from(this._currentSelectedRowIDs)
                                                            .map((_rowID)=>this.getDataByID(_rowID)[this.opts.reselectionKey]);
        }
        this._currentSelectedRowIDs.clear();
        this._data = d;
        this._rows = this._data.map((_d, _idx)=>new RowDisplay(this, <any>_d, _idx));
        _reselectVals.forEach((_val)=>{
            const _rowFound:RowDisplay<T> = this._rows.find((_r)=>_r.rowData[this.opts.reselectionKey]==_val);
            if (_rowFound!==undefined) this._currentSelectedRowIDs.add(_rowFound.rowID);
        });
        this._renderBody();
        this._setListeners();
    }

    /* Setup */
    protected _setStyles():void {
        const _widthDefs:string = this._cols.map((_c)=>_c.params.width || '1fr').join(' ');
        this.role('header scrollbody').each((_idx, _el)=>{
            this.util(_el).css({
                'grid-template-columns': _widthDefs, 
                'grid-auto-rows': `minmax(${(_idx==0 ? this.opts.headerHeight : this.opts.rowHeight)+'px' || 'auto'},auto)`, 
                'grid-row-gap': this.opts.gap.row, 
                'grid-column-gap': this.opts.gap.col
            });
        });
        this.role('scrollbody').css({'max-height':`calc(100% - ${this.opts.headerHeight}px)`});
    }
    protected _setListeners():void {
        this._removeListeners();
        const _a:AbortController = new AbortController();
        this._abortListeners.push(_a);

        //Header / sort listeners
        this.role('header').find('[role="header-cel"][sortable="true"]').css({'cursor':'pointer'});

        this.el.querySelectorAll('[role="header-cel"][sortable="true"]').forEach((_el)=>_el.addEventListener('click',(evt)=>{          
            const _colClickedID:number = parseInt((<HTMLElement>evt.currentTarget).getAttribute('col-id'));
            console.log('_colClickedID',_colClickedID);
            const _colClicked:Column<T> = this._cols[_colClickedID];
            const _cscIdx:number = this._currentSortCols.findIndex((_csc)=>_csc.handle==_colClicked.params.handle);
            const _csc = this._currentSortCols[_cscIdx] || undefined;
            const _sortState:number = _csc==undefined ? 0 : (_csc.order=='asc'  ? 1 : 2);
            let _nextState:number;
            //in single column sorting, always tick through the states. In multi-column sorting, always turn on if it was off, 
            //and increment state if it's the primary (first index). However, if it's not the first index, make it the first index 
            //without incrementing the state on the initial click.
            if (!this.opts.multiColumnSort || _cscIdx <= 0) {
                _nextState = (_sortState + 1) % 3;
            } else {
                _nextState = _sortState;
            }

            //if only one column is lit AND this is the column we're ticking, don't unlight it.
            if (this._currentSortCols.length==1 && this._currentSortCols[0].handle==_colClicked.params.handle && _nextState==0) {
                _nextState = 1;
            }

            if (!this.opts.multiColumnSort) this._currentSortCols = []; //single: clear the sort columns.
                else if (_csc) this._currentSortCols.splice(_cscIdx,1); //multi: splice out the clicked column's _cscposition, then unshift it.
            switch (_nextState) {
                case 0:
                    //nothing to do, we already removed it.
                    break;
                case 1:
                    //put it at the front, ascending.
                    this._currentSortCols.unshift({handle:_colClicked.params.handle, order:'asc'});
                    break;
                case 2:
                    //put it at the front, descending.
                    this._currentSortCols.unshift({handle:_colClicked.params.handle, order:'desc'});
                    break;
            }
            this._renderHeader();
            this._renderBody();
            this._setListeners();
        }, {signal:_a.signal}));

        //Row listeners
        this.el.querySelector('.strike-grid-scrollbody')
                    .addEventListener('click', (e)=>this._rowClickHandler(e), {signal:_a.signal});
    }
    protected _removeListeners():void {
        this._abortListeners.forEach((a)=>a.abort());
        this._abortListeners.length = 0;
    }
    protected _rowClickHandler(evt:Event) {
        const _rowDiv = (<HTMLElement>evt.target).closest('.strike-grid-row');
        if (!_rowDiv) return;
        if (this.opts.selectable) this._toggleRowSelection(parseInt(_rowDiv.getAttribute('row-id')));
        this.dispatchEvent(new CustomEvent('rowClicked', {detail:{rowID:_rowDiv.getAttribute('row-id')}}))
    }
    protected _toggleRowSelection(rowID:number):void {
        let _turnOn:boolean = !this._currentSelectedRowIDs.has(rowID);
        if (_turnOn) {
            if (this.opts.selectable=='single' && this._currentSelectedRowIDs.size) {
                this._currentSelectedRowIDs.forEach((_id)=>this.getRowByID(_id).domElement.classList.remove('selected'));
                this._currentSelectedRowIDs.clear();
            }
            this._currentSelectedRowIDs.add(rowID); 
        } else {
            this._currentSelectedRowIDs.delete(rowID);
        }
        this.getRowByID(rowID).domElement.classList[_turnOn ? 'add' : 'remove']('selected');
        this.dispatchEvent(new Event('change'));
    }
    
    /* Utilities */
    public get columns():Column<T>[] {
        return (this._cols);
    }
    public get rows():RowDisplay<T>[] {
        return (this._rows);
    }
    public getRowByID(uid:number):RowDisplay<T> {
        return (this._rows.find((_r)=>_r.rowID==uid));
    }
    public getDataByID(id:number):Record<string,any> {
        return (this._data[id]);
    }
    public getMatchingRows(match:Partial<T>[]):RowDisplay<T>[] {
        return (this._rows.filter((_r)=>{
            return match.find((_m)=>{
                for (let _k of Object.keys(_m)) {
                    if (_m[_k] != _r.rowData[_k]) return (false);
                }
                return (true);
            }) || false;
        }))
    }
    public clearSelection():void {
        this._currentSelectedRowIDs.forEach((_rowID)=>{
            this.getRowByID(_rowID).domElement.classList.remove('selected');
        })
        this._currentSelectedRowIDs.clear();
    }
    public get selectedRows():RowDisplay<T>[] {
        return (Array.from(this._currentSelectedRowIDs).map((_id)=>this.getRowByID(_id)));
    }
    public get selectedData():T[] {
        return (this.selectedRows.map((_row)=>_row.rowData));
    }
    public set selectedData(match:Partial<T>[]) {
        if (!this.opts.selectable) return;
        this.clearSelection();
        const _rowIDs:number[] = this.getMatchingRows(match).map((_r)=>_r.rowID);
        if (this.opts.selectable!='multi') _rowIDs.length = 1;
        _rowIDs.forEach((_id)=>{
            this._currentSelectedRowIDs.add(_id);
            this.getRowByID(_id).domElement.classList.add('selected');
        });
    }
    public scrollToRow(rowID:number,animate:number = 0):void {
        //Note that if we're using x-scrolling, we need to put the overflow on the .el instead of scrollbody; in that case we scroll the whole .el, 
        //and the header sticks inside any containing element (or the document.body). Otherwise the header just sitsn there and we scroll the 
        //scrollbody alone.
        const _scrollTarget:HTMLElement = this.role('scrollbody').elements[0];
        const _toPos:number = (<HTMLElement>this.getRowByID(rowID).domElement.firstChild).offsetTop;//.position().top;
        if (!animate) {
            _scrollTarget.scrollTo({top:_toPos});
        } else {
            const _refresh:number = 30;
            const _easeOut:number = 3;
            const _origDist:number = _toPos - _scrollTarget.scrollTop;
            let _c:number = 0;
            let f = setInterval(()=>{
                _scrollTarget.scrollTop += 
                    (_toPos - _scrollTarget.scrollTop)/((animate/(_refresh*_easeOut)) - (_c/_easeOut));
                    //_origDist/(animate/30); //steady
                if (_c > animate/_refresh || Math.abs(_toPos - _scrollTarget.scrollTop) < 3) {
                    _scrollTarget.scrollTo({top:_toPos});
                    clearInterval(f);
                }
                _c++;
            },_refresh);
        }
    }
    public set height(h:string|number) {
        this.util(this.el).css({'max-height':h, 'height':h});
        this.role('container').css({'min-height':h});
    }
    public set outerWidth(w:string|number) {
        this.util(this.el).css({'max-width':w});
    }
    public set innerWidth(w:string|number) {
        this.role('container').css({'max-width':w,'width':w,'min-width':w});
    }

    /* Rendering */
    protected _sortRows():void {
        const _csc:{col:Column<T>,order:'desc'|'asc'}[] = this._currentSortCols.map(({handle,order})=>{
            return {col:this._cols.find((_c)=>_c.params.handle==handle), order:order}
        });
        if (!_csc.length) return; //no sorted columns;
        this._rows.sort(({rowData:a},{rowData:b})=>{
            let _res:number = 0;
            for (let {col,order} of _csc) {
                if (col.params.sortFn) {
                    _res = col.params.sortFn(a,b);
                    if (_res != 0) return (_res * (order=='desc' ? -1 : 1));
                } else {
                    let _aVal:T[keyof T]|string|number;
                    let _bVal:T[keyof T]|string|number;
                    if (col.params.renderFromObject && col.params.renderFromObject.sortKey) {
                        _aVal = a[col.params.handle][col.params.renderFromObject.sortKey];
                        _bVal = b[col.params.handle][col.params.renderFromObject.sortKey];
                    } else {
                        _aVal = a[col.params.handle];
                        _bVal = b[col.params.handle];
                    }
                    if (typeof _aVal==='string') _aVal = _aVal.toLowerCase();
                    if (typeof _bVal==='string') _bVal = _bVal.toLowerCase();
                    //if the sort values match in this column, continue to the next column.
                    if (_aVal == _bVal) continue;
                    return (_aVal > _bVal ? 1 : -1) * (order=='desc' ? -1 : 1);
                }
            }
            return (0); //no currently sorting column showed a difference.
        });
    }
    protected _renderHeader():void {
        this.role('header').html(
            this._cols.map((_c,_idx)=>{
                const _priority:number = this._currentSortCols.findIndex((_csc)=>_csc.handle==_c.params.handle);
                const _opacity:number = 1 - (_priority / this._currentSortCols.length);
                let _sortColorClass:string = _priority > -1 ? `sort-color-${Math.floor(_opacity * 10)}` : ''

                const _upDownOpacity:number[] = _priority==-1 ? [0.3, 0.3] : 
                                                    this._currentSortCols[_priority].order=='desc' ? [_opacity, 0] : [0.1, _opacity]; 
                let _sortArrows:string = '';
                let _labelClasses:string = 'header-label';
                if (_c.params.sortable) {
                    _sortArrows = `<div class='arrow-holder' role='arrow-holder'>
                                        <div style='width:1.2em;position:relative;left:0px;display:inline-block;'>
                                            <arrow-down style='opacity:${_upDownOpacity[1]};margin-left:-0.6rem;'></arrow-down>
                                            <arrow-up style='opacity:${_upDownOpacity[0]};'></arrow-up>
                                        </div>
                                    </div>`;
                    _labelClasses += ' with-arrows';
                }
                return `<div class='${_sortColorClass}' role='header-cel' col-id='${_idx}' sortable='${_c.params.sortable ? 'true' : 'false'}'>
                            ${_sortArrows}
                            <div class='${_labelClasses}' role='header-label'>${_c.params.label}</div>
                        </div>`
            }).join('\n\n')
        );
    }
    protected _renderBody():void {
        this._sortRows();
        this.role('scrollbody').html(
            this._rows.map((_r)=>_r.rendering).join('\n\n')
        );
        this._currentSelectedRowIDs.forEach((_id)=>this.getRowByID(_id).domElement.classList.add('selected'));
    }
    protected _clearBody():void {
        this.role('scrollbody').html('');
        this._currentSelectedRowIDs.clear();
    }
    public role(search:string):utilType {
        return (this.util().role(search));
    }

    /* shortcuts */
    public util(search:string|HTMLElement|HTMLElement[] = this.el):utilType {
        let q:HTMLElement[]; 
        if (typeof search==='string') q = <HTMLElement[]>Array.from(document.querySelectorAll(search));
        else if (Array.isArray(search)) q = search;
        else q = [search];

        return ({
                    role:(r:string)=>{
                        const _srch:string = r.split(' ').map((_r)=>`[role="${_r}"]`).join(',');
                        q = q.reduce((a,_q)=>{
                            a.push(...<HTMLElement[]>Array.from(_q.querySelectorAll(_srch)));
                            return (a);
                        },[]);
                        return (this.util(q));
                    },
                    html:(h:string)=>{
                        q.forEach((node)=>node.innerHTML = h);
                        return (this.util(q));
                    }, 
                    find:(f:string)=>{
                        const _found:HTMLElement[] = [];
                        q.forEach((node)=>_found.push(...<HTMLElement[]>Array.from(node.querySelectorAll(f))));
                        return (this.util(_found));
                    },
                    each:(fn:(idx:number,el:HTMLElement)=>any)=>{
                        q.forEach((node,key)=>{
                            fn(key,node);
                        });
                        return (this.util(q));
                    },
                    css:(s:Record<string,string|number>)=>{
                        q.forEach((node)=>{
                            Object.keys(s).forEach((k)=>{
                                (<HTMLElement>node).style[k] = s[k];
                            });
                        });
                        return (this.util(q));
                    },
                    elements:q
                });
    }
    public async destroy(): Promise<void> {
        this._clearBody();
        this._rows = [];
        this._currentSortCols = [];
        this._currentSelectedRowIDs.clear();
        this._removeListeners();
    }
}

type utilType = {
    role:(string)=>utilType, 
    html:(string)=>utilType, 
    find:(string)=>utilType, 
    each:(fn:(idx:number,el:HTMLElement)=>any)=>utilType, 
    css:(s:Record<string,number|string>)=>utilType,
    elements:HTMLElement[]
};