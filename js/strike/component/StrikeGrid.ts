import { StrikeComponent } from './StrikeComponent';

export type StrikeGridOptions = {
    rowHeight?:number, 
    height?:number, 
    multiColumnSort?:boolean, 
    gap?:{row:number,col:number}, 
    selectable?:null|'single'|'multi',
    reselectionKey?:string
}

export type StrikeGridColParams = {
    handle:string, 
    label:string, 
    sortable?:boolean, 
    width?:string, 
    defaultOrder?:'desc'|'asc',
    sortFn?:(a:Record<string,CelData>,b:Record<string,CelData>)=>number, 
    renderFromObject?:{displayKey:string, sortKey?:string}
}

type CelData = string | number | Record<any, string | number>;
type RowData = Record<string, CelData>;

class Column {
    public constructor(public params:StrikeGridColParams) {}
}

class RowDisplay {
    public constructor(public grid:StrikeGrid, public rowData:RowData, public rowID:number) {}
    public get rendering():string {
        let f:string = `<div class='strike-grid strike-grid-row ${this.rowData['_rowClasses']||""}' row-id='${this.rowID}'>`;
        f += this.grid.columns.map((_c,_idx)=>
                        `<div style='z-index:${this.grid.columns.length-_idx}' row-id='${this.rowID}' col-id='${_idx}'> 
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
        return (this.grid.el.find(`[row-id="${this.rowID}"]`)[0]);
    }
}

export class StrikeGrid extends StrikeComponent {
    protected _cols:Column[] = [];
    protected _rows:RowDisplay[] = [];
    protected _data:Record<string,any>[];
    public _currentSortCols:{handle:string,order:'desc'|'asc'}[] = [];
    protected _currentSelectedRowIDs:Set<number> = new Set();

    protected static TEMPLATE_HTM:string = `<div id='strikeGridTemplate' class='strike-grid-holder'>
                                                <div class='table-container' role='container'>
                                                    <div class='strike-grid strike-grid-header' role='header'></div>
                                                    <div class='strike-grid strike-grid-scrollbody' role='scrollbody'></div>
                                                </div>
                                            </div>`;

    public constructor(public handle:string, public opts?:StrikeGridOptions) {
        super(handle,$(StrikeGrid.TEMPLATE_HTM));//'#strikeGridTemplate',async ()=>{ return StrikeGrid.TEMPLATE_HTM; });
        if (!this.opts) this.opts = {rowHeight:30};
        if (!this.opts.gap) this.opts.gap = {row:1,col:1};
    }
    protected async drawInternals():Promise<void> {
        if (this.opts.height) this.height = this.opts.height;
    }
    public setColumns(colParams:StrikeGridColParams[],defaultSortHandle?:string) {
        //remove sort columns that no longer exist in the new column set:
        this._currentSortCols = this._currentSortCols.filter((_csc)=>colParams.find((_col)=>_col.handle==_csc.handle)!=undefined);

        if (!this._currentSortCols.length) {
            if (!defaultSortHandle) {
                //If no default sort handle was passed, resort to the first column that's sortable, if any.
                const _firstSortableCol:StrikeGridColParams = colParams.find((_c)=>_c.sortable==true);
                if (_firstSortableCol !== undefined) {
                    defaultSortHandle = _firstSortableCol.handle;
                }
            }
            if (defaultSortHandle) {
                let _defaultSortCol:StrikeGridColParams = colParams.find((_c)=>_c.handle==defaultSortHandle);
                if (_defaultSortCol === undefined) throw new Error(`Error in setColumns(): default sort column ${defaultSortHandle} is not defined.`);
                this._currentSortCols = [{handle:_defaultSortCol.handle, order:_defaultSortCol.defaultOrder || 'asc'}];
            }
        }
        this._cols = colParams.map((_p)=>new Column(_p));
        
        this._setStyles();
        this._renderHeader();
        if (this._data) this._renderBody();
    }
    public setData(d:Record<string,any>[]):void {
        //Collect prior selected values from the rowIDs if reselectionKey is specified. This must be a unique ID in the data!
        let _reselectVals:(string|number)[] = [];
        if (this.opts.reselectionKey && this._currentSelectedRowIDs.size) {
            _reselectVals = Array.from(this._currentSelectedRowIDs)
                                                            .map((_rowID)=>this.getDataByID(_rowID)[this.opts.reselectionKey]);
        }
        this._currentSelectedRowIDs.clear();
        this._data = d;
        this._rows = this._data.map((_d, _idx)=>new RowDisplay(this, _d, _idx));
        _reselectVals.forEach((_val)=>{
            const _rowFound:RowDisplay = this._rows.find((_r)=>_r.rowData[this.opts.reselectionKey]==_val);
            if (_rowFound!==undefined) this._currentSelectedRowIDs.add(_rowFound.rowID);
        });
        this._renderBody();
    }

    /* Setup */
    protected _setStyles():void {
        const _widthDefs:string = this._cols.map((_c)=>_c.params.width || '1fr').join(' ');
        this.role('header scrollbody').each((_idx, _el)=>{
            $(_el).css({
                'grid-template-columns': _widthDefs, 
                'grid-auto-rows': `minmax(${this.opts.rowHeight+'px' || 'auto'},auto)`, 
                'grid-row-gap': this.opts.gap.row, 
                'grid-column-gap': this.opts.gap.col
            });
        });
        this.role('scrollbody').css('max-height',`calc(100% - ${this.opts.rowHeight}px)`);
    }
    protected _setListeners():void {
        //Header / sort listeners
        this.role('header').find('[role="header-cel"][sortable="true"]').css('cursor','pointer').off().on('click',(evt:JQuery.Event)=>{
            const _colClickedID:number = parseInt($(evt.currentTarget).attr('col-id'));
            const _colClicked:Column = this._cols[_colClickedID];
            const _cscIdx:number = this._currentSortCols.findIndex((_csc)=>_csc.handle==_colClicked.params.handle);
            const _csc = this._currentSortCols[_cscIdx] || undefined;
            const _sortState:number = _csc==undefined ? 0 : (_csc.order=='asc'  ? 1 : 2);
            const _nextState:number = (_sortState + 1) % 3;
            if (!this.opts.multiColumnSort) this._currentSortCols = [];
            switch (_nextState) {
                case 0:
                    if (_csc) this._currentSortCols.splice(_cscIdx,1);
                    break;
                case 1:
                    this._currentSortCols.unshift({handle:_colClicked.params.handle, order:'asc'});
                    break;
                case 2:
                    if (_csc) {
                        this._currentSortCols.splice(_cscIdx,1);
                        this._currentSortCols.unshift(_csc);
                        _csc.order = 'desc';
                        break;
                    }
            }
            this._renderHeader();
            this._renderBody();
        });

        //Row listeners
        this.el.find('.strike-grid-row').off().on('click',(evt:JQuery.Event)=>{
            if (this.opts.selectable) this._handleSelectClick(parseInt($(evt.currentTarget).attr('row-id')));
            $(this).trigger('rowClicked',{rowID:$(evt.currentTarget).attr('row-id')});
        });
    }
    protected _handleSelectClick(rowID:number):void {
        let _turnOn:boolean = !this._currentSelectedRowIDs.has(rowID);
        if (_turnOn) {
            if (this.opts.selectable=='single' && this._currentSelectedRowIDs.size) {
                this._currentSelectedRowIDs.forEach((_id)=>$(this.getRowByID(_id).domElement).removeClass('selected'));
                this._currentSelectedRowIDs.clear();
            }
            this._currentSelectedRowIDs.add(rowID); 
        } else {
            this._currentSelectedRowIDs.delete(rowID);
        }
        $(this.getRowByID(rowID).domElement).toggleClass('selected',_turnOn);
    }
    
    /* Utilities */
    public get columns():Column[] {
        return (this._cols);
    }
    public get rows():RowDisplay[] {
        return (this._rows);
    }
    public getRowByID(uid:number):RowDisplay {
        return (this._rows.find((_r)=>_r.rowID==uid));
    }
    public getDataByID(id:number):Record<string,any> {
        return (this._data[id]);
    }
    public getMatchingRows(match:Record<string,any>[]):RowDisplay[] {
        return (this._rows.filter((_r)=>{
            return match.find((_m)=>{
                for (let _k of Object.keys(_m)) {
                    if (_m[_k] != _r.rowData[_k]) return (false);
                }
                return (true);
            }) || false;
        }))
    }
    public get selectedRows():RowDisplay[] {
        return (Array.from(this._currentSelectedRowIDs).map((_id)=>this.getRowByID(_id)));
    }
    public get selectedData():Record<string,any>[] {
        return (this.selectedRows.map((_row)=>_row.rowData));
    }
    public set selectedData(match:Record<string,any>[]) {
        if (!this.opts.selectable) return;
        this._currentSelectedRowIDs.clear();
        const _rowIDs:number[] = this.getMatchingRows(match).map((_r)=>_r.rowID);
        if (this.opts.selectable!='multi') _rowIDs.length = 1;
        _rowIDs.forEach((_id)=>{
            this._currentSelectedRowIDs.add(_id);
            $(this.getRowByID(_id).domElement).addClass('selected');
        });
    }
    public scrollToRow(rowID:number,animate:number = 0):void {
        //Note that if we're using x-scrolling, we need to put the overflow on the .el instead of scrollbody; in that case we scroll the whole .el, 
        //and the header sticks inside any containing element (or the document.body). Otherwise the header just sitsn there and we scroll the 
        //scrollbody alone.
        const _scrollTarget:JQuery<HTMLElement> = this.el.css('overflow')=='scroll' ? this.el : this.role('scrollbody');
        const _toPos:number = _scrollTarget.scrollTop() + $(this.getRowByID(rowID).domElement.firstChild).position().top - this.opts.rowHeight;
        if (!animate) _scrollTarget.scrollTop(_toPos);
        else _scrollTarget.animate({scrollTop:_toPos},animate);
    }
    public set height(h:number) {
        this.el.css('max-height',h);
        this.role('container').css('min-height',h);
    }
    public set outerWidth(w:number) {
        this.el.css('max-width',w);
    }
    public set innerWidth(w:number) {
        this.role('container').css({'max-width':w,'width':w,'min-width':w});
    }

    /* Rendering */
    protected _sortRows():void {
        const _csc:{col:Column,order:'desc'|'asc'}[] = this._currentSortCols.map(({handle,order})=>{
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
                    let _aVal:string|number;
                    let _bVal:string|number; 
                    if (col.params.renderFromObject && col.params.renderFromObject.sortKey) {
                        _aVal = a[col.params.handle][col.params.renderFromObject.sortKey];
                        _bVal = b[col.params.handle][col.params.renderFromObject.sortKey];
                    } else {
                        _aVal = <string|number>a[col.params.handle];
                        _bVal = <string|number>b[col.params.handle];
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
        this.role('header').find('[role="header-cel"]').off();
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
                                            <arrow-down style='opacity:${_upDownOpacity[1]};margin-left:-0.6rem;'/>
                                            <arrow-up style='opacity:${_upDownOpacity[0]};'/>
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
        this._currentSelectedRowIDs.forEach((_id)=>$(this.getRowByID(_id).domElement).addClass('selected'));
        this._setListeners();
    }
    protected _clearBody():void {
        this.role('scrollbody').html('');
        this._currentSelectedRowIDs.clear();
    }
    public async destroy(): Promise<void> {
        this._clearBody();
        this._rows = [];
        this._currentSortCols = [];
        this._currentSelectedRowIDs.clear();
        this.el.find('.strike-grid-row').off();
        return super.destroy();
    }
}
