var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./StrikeComponent"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StrikeGrid = void 0;
    const StrikeComponent_1 = require("./StrikeComponent");
    class Column {
        constructor(params) {
            this.params = params;
        }
    }
    class RowDisplay {
        constructor(grid, rowData, rowID) {
            this.grid = grid;
            this.rowData = rowData;
            this.rowID = rowID;
        }
        get rendering() {
            let f = `<div class='strike-grid strike-grid-row ${this.rowData['_rowClasses'] || ""}' row-id='${this.rowID}'>`;
            f += this.grid.columns.map((_c, _idx) => `<div style='z-index:${this.grid.columns.length - _idx}' row-id='${this.rowID}' col-id='${_idx}'> 
                            ${_c.params.renderFromObject ? this.rowData[_c.params.handle][_c.params.renderFromObject.displayKey] :
                this.rowData[_c.params.handle]}
                        </div>`).join('\n');
            f += `</div>`;
            return (f);
        }
        get currentPosition() {
            return (this.grid.rows.indexOf(this));
        }
        get domElement() {
            return (this.grid.el.find(`[row-id="${this.rowID}"]`)[0]);
        }
    }
    class StrikeGrid extends StrikeComponent_1.StrikeComponent {
        constructor(handle, opts) {
            super(handle, $(StrikeGrid.TEMPLATE_HTM));
            this.handle = handle;
            this.opts = opts;
            this._cols = [];
            this._rows = [];
            this._currentSortCols = [];
            this._currentSelectedRowIDs = new Set();
            if (!this.opts)
                this.opts = { rowHeight: 30 };
            if (!this.opts.gap)
                this.opts.gap = { row: 1, col: 1 };
        }
        drawInternals() {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.opts.height)
                    this.height = this.opts.height;
            });
        }
        setColumns(colParams, defaultSortHandle) {
            this._currentSortCols = this._currentSortCols.filter((_csc) => colParams.find((_col) => _col.handle == _csc.handle) != undefined);
            if (!this._currentSortCols.length) {
                if (!defaultSortHandle) {
                    const _firstSortableCol = colParams.find((_c) => _c.sortable == true);
                    if (_firstSortableCol !== undefined) {
                        defaultSortHandle = _firstSortableCol.handle;
                    }
                }
                if (defaultSortHandle) {
                    let _defaultSortCol = colParams.find((_c) => _c.handle == defaultSortHandle);
                    if (_defaultSortCol === undefined)
                        throw new Error(`Error in setColumns(): default sort column ${defaultSortHandle} is not defined.`);
                    this._currentSortCols = [{ handle: _defaultSortCol.handle, order: _defaultSortCol.defaultOrder || 'asc' }];
                }
            }
            this._cols = colParams.map((_p) => new Column(_p));
            this._setStyles();
            this._renderHeader();
            if (this._data)
                this._renderBody();
        }
        setData(d) {
            let _reselectVals = [];
            if (this.opts.reselectionKey && this._currentSelectedRowIDs.size) {
                _reselectVals = Array.from(this._currentSelectedRowIDs)
                    .map((_rowID) => this.getDataByID(_rowID)[this.opts.reselectionKey]);
            }
            this._currentSelectedRowIDs.clear();
            this._data = d;
            this._rows = this._data.map((_d, _idx) => new RowDisplay(this, _d, _idx));
            _reselectVals.forEach((_val) => {
                const _rowFound = this._rows.find((_r) => _r.rowData[this.opts.reselectionKey] == _val);
                if (_rowFound !== undefined)
                    this._currentSelectedRowIDs.add(_rowFound.rowID);
            });
            this._renderBody();
        }
        _setStyles() {
            const _widthDefs = this._cols.map((_c) => _c.params.width || '1fr').join(' ');
            this.role('header scrollbody').each((_idx, _el) => {
                $(_el).css({
                    'grid-template-columns': _widthDefs,
                    'grid-auto-rows': `minmax(${this.opts.rowHeight + 'px' || 'auto'},auto)`,
                    'grid-row-gap': this.opts.gap.row,
                    'grid-column-gap': this.opts.gap.col
                });
            });
            this.role('scrollbody').css('max-height', `calc(100% - ${this.opts.rowHeight}px)`);
        }
        _setListeners() {
            this.role('header').find('[role="header-cel"][sortable="true"]').css('cursor', 'pointer').off().on('click', (evt) => {
                const _colClickedID = parseInt($(evt.currentTarget).attr('col-id'));
                const _colClicked = this._cols[_colClickedID];
                const _cscIdx = this._currentSortCols.findIndex((_csc) => _csc.handle == _colClicked.params.handle);
                const _csc = this._currentSortCols[_cscIdx] || undefined;
                const _sortState = _csc == undefined ? 0 : (_csc.order == 'asc' ? 1 : 2);
                const _nextState = (_sortState + 1) % 3;
                if (!this.opts.multiColumnSort)
                    this._currentSortCols = [];
                switch (_nextState) {
                    case 0:
                        if (_csc)
                            this._currentSortCols.splice(_cscIdx, 1);
                        break;
                    case 1:
                        this._currentSortCols.unshift({ handle: _colClicked.params.handle, order: 'asc' });
                        break;
                    case 2:
                        if (_csc) {
                            this._currentSortCols.splice(_cscIdx, 1);
                            this._currentSortCols.unshift(_csc);
                            _csc.order = 'desc';
                            break;
                        }
                }
                this._renderHeader();
                this._renderBody();
            });
            this.el.find('.strike-grid-row').off().on('click', (evt) => {
                if (this.opts.selectable)
                    this._handleSelectClick(parseInt($(evt.currentTarget).attr('row-id')));
                $(this).trigger('rowClicked', { rowID: $(evt.currentTarget).attr('row-id') });
            });
        }
        _handleSelectClick(rowID) {
            let _turnOn = !this._currentSelectedRowIDs.has(rowID);
            if (_turnOn) {
                if (this.opts.selectable == 'single' && this._currentSelectedRowIDs.size) {
                    this._currentSelectedRowIDs.forEach((_id) => $(this.getRowByID(_id).domElement).removeClass('selected'));
                    this._currentSelectedRowIDs.clear();
                }
                this._currentSelectedRowIDs.add(rowID);
            }
            else {
                this._currentSelectedRowIDs.delete(rowID);
            }
            $(this.getRowByID(rowID).domElement).toggleClass('selected', _turnOn);
        }
        get columns() {
            return (this._cols);
        }
        get rows() {
            return (this._rows);
        }
        getRowByID(uid) {
            return (this._rows.find((_r) => _r.rowID == uid));
        }
        getDataByID(id) {
            return (this._data[id]);
        }
        getMatchingRows(match) {
            return (this._rows.filter((_r) => {
                return match.find((_m) => {
                    for (let _k of Object.keys(_m)) {
                        if (_m[_k] != _r.rowData[_k])
                            return (false);
                    }
                    return (true);
                }) || false;
            }));
        }
        get selectedRows() {
            return (Array.from(this._currentSelectedRowIDs).map((_id) => this.getRowByID(_id)));
        }
        get selectedData() {
            return (this.selectedRows.map((_row) => _row.rowData));
        }
        set selectedData(match) {
            if (!this.opts.selectable)
                return;
            this._currentSelectedRowIDs.clear();
            const _rowIDs = this.getMatchingRows(match).map((_r) => _r.rowID);
            if (this.opts.selectable != 'multi')
                _rowIDs.length = 1;
            _rowIDs.forEach((_id) => {
                this._currentSelectedRowIDs.add(_id);
                $(this.getRowByID(_id).domElement).addClass('selected');
            });
        }
        scrollToRow(rowID, animate = 0) {
            const _scrollTarget = this.el.css('overflow') == 'scroll' ? this.el : this.role('scrollbody');
            const _toPos = _scrollTarget.scrollTop() + $(this.getRowByID(rowID).domElement.firstChild).position().top - this.opts.rowHeight;
            if (!animate)
                _scrollTarget.scrollTop(_toPos);
            else
                _scrollTarget.animate({ scrollTop: _toPos }, animate);
        }
        set height(h) {
            this.el.css('max-height', h);
            this.role('container').css('min-height', h);
        }
        set outerWidth(w) {
            this.el.css('max-width', w);
        }
        set innerWidth(w) {
            this.role('container').css({ 'max-width': w, 'width': w, 'min-width': w });
        }
        _sortRows() {
            const _csc = this._currentSortCols.map(({ handle, order }) => {
                return { col: this._cols.find((_c) => _c.params.handle == handle), order: order };
            });
            if (!_csc.length)
                return;
            this._rows.sort(({ rowData: a }, { rowData: b }) => {
                let _res = 0;
                for (let { col, order } of _csc) {
                    if (col.params.sortFn) {
                        _res = col.params.sortFn(a, b);
                        if (_res != 0)
                            return (_res * (order == 'desc' ? -1 : 1));
                    }
                    else {
                        let _aVal;
                        let _bVal;
                        if (col.params.renderFromObject && col.params.renderFromObject.sortKey) {
                            _aVal = a[col.params.handle][col.params.renderFromObject.sortKey];
                            _bVal = b[col.params.handle][col.params.renderFromObject.sortKey];
                        }
                        else {
                            _aVal = a[col.params.handle];
                            _bVal = b[col.params.handle];
                        }
                        if (typeof _aVal === 'string')
                            _aVal = _aVal.toLowerCase();
                        if (typeof _bVal === 'string')
                            _bVal = _bVal.toLowerCase();
                        if (_aVal == _bVal)
                            continue;
                        return (_aVal > _bVal ? 1 : -1) * (order == 'desc' ? -1 : 1);
                    }
                }
                return (0);
            });
        }
        _renderHeader() {
            this.role('header').find('[role="header-cel"]').off();
            this.role('header').html(this._cols.map((_c, _idx) => {
                const _priority = this._currentSortCols.findIndex((_csc) => _csc.handle == _c.params.handle);
                const _opacity = 1 - (_priority / this._currentSortCols.length);
                let _sortColorClass = _priority > -1 ? `sort-color-${Math.floor(_opacity * 10)}` : '';
                const _upDownOpacity = _priority == -1 ? [0.3, 0.3] :
                    this._currentSortCols[_priority].order == 'desc' ? [_opacity, 0] : [0.1, _opacity];
                let _sortArrows = '';
                let _labelClasses = 'header-label';
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
                        </div>`;
            }).join('\n\n'));
        }
        _renderBody() {
            this._sortRows();
            this.role('scrollbody').html(this._rows.map((_r) => _r.rendering).join('\n\n'));
            this._currentSelectedRowIDs.forEach((_id) => $(this.getRowByID(_id).domElement).addClass('selected'));
            this._setListeners();
        }
        _clearBody() {
            this.role('scrollbody').html('');
            this._currentSelectedRowIDs.clear();
        }
        destroy() {
            const _super = Object.create(null, {
                destroy: { get: () => super.destroy }
            });
            return __awaiter(this, void 0, void 0, function* () {
                this._clearBody();
                this._rows = [];
                this._currentSortCols = [];
                this._currentSelectedRowIDs.clear();
                this.el.find('.strike-grid-row').off();
                return _super.destroy.call(this);
            });
        }
    }
    exports.StrikeGrid = StrikeGrid;
    StrikeGrid.TEMPLATE_HTM = `<div id='strikeGridTemplate' class='strike-grid-holder'>
                                                <div class='table-container' role='container'>
                                                    <div class='strike-grid strike-grid-header' role='header'></div>
                                                    <div class='strike-grid strike-grid-scrollbody' role='scrollbody'></div>
                                                </div>
                                            </div>`;
});
