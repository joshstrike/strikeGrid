class Column {
    params;
    constructor(params) {
        this.params = params;
    }
}
class RowDisplay {
    grid;
    rowData;
    rowID;
    constructor(grid, rowData, rowID) {
        this.grid = grid;
        this.rowData = rowData;
        this.rowID = rowID;
    }
    get rendering() {
        let f = `<div class='strike-grid strike-grid-row ${this.rowData['_rowClasses'] || ""}' row-id='${this.rowID}'>`;
        f += this.grid.columns.map((_c, _idx) => `<div class='${_c.params._colClasses || ""}' row-id='${this.rowID}' col-id='${_idx}'> 
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
        return this.grid.el.querySelectorAll(`.strike-grid-row[row-id="${this.rowID}"]`)[0];
    }
}
export class StrikeGrid extends EventTarget {
    parent;
    static _DEFAULTS = {
        headerHeight: 30,
        rowHeight: 30,
        multiColumnSort: true,
        gap: { row: 1, col: 1 },
        selectable: 'single'
    };
    el;
    opts;
    _cols = [];
    _rows = [];
    _data;
    _currentSortCols = [];
    _currentSelectedRowIDs = new Set();
    _abortListeners = [];
    static TEMPLATE_HTM = `<div id='strikeGridTemplate' class='strike-grid-holder'>
                                                <div class='table-container' role='container'>
                                                    <div class='strike-grid strike-grid-header' role='header'></div>
                                                    <div class='strike-grid strike-grid-scrollbody' role='scrollbody'></div>
                                                </div>
                                            </div>`;
    constructor(parent, _opts = {}) {
        super();
        this.parent = parent;
        this.opts = Object.assign({ ...StrikeGrid._DEFAULTS }, _opts);
        const _temp = document.createElement('div');
        _temp.innerHTML = StrikeGrid.TEMPLATE_HTM;
        this.el = _temp.firstChild;
        this.parent.append(this.el);
        if (this.opts.height)
            this.height = this.opts.height;
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
        if (this._data) {
            this._renderBody();
            this._setListeners();
        }
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
        this._setListeners();
    }
    _setStyles() {
        const _widthDefs = this._cols.map((_c) => _c.params.width || '1fr').join(' ');
        this.role('header scrollbody').each((_idx, _el) => {
            this.util(_el).css({
                'grid-template-columns': _widthDefs,
                'grid-auto-rows': `minmax(${(_idx == 0 ? this.opts.headerHeight : this.opts.rowHeight) + 'px' || 'auto'},auto)`,
                'grid-row-gap': this.opts.gap.row,
                'grid-column-gap': this.opts.gap.col
            });
        });
        this.role('scrollbody').css({ 'max-height': `calc(100% - ${this.opts.headerHeight}px)` });
    }
    _setListeners() {
        this._removeListeners();
        const _a = new AbortController();
        this._abortListeners.push(_a);
        this.role('header').find('[role="header-cel"][sortable="true"]').css({ 'cursor': 'pointer' });
        this.el.querySelectorAll('[role="header-cel"][sortable="true"]').forEach((_el) => _el.addEventListener('click', (evt) => {
            const _colClickedID = parseInt(evt.currentTarget.getAttribute('col-id'));
            const _colClicked = this._cols[_colClickedID];
            const _cscIdx = this._currentSortCols.findIndex((_csc) => _csc.handle == _colClicked.params.handle);
            const _csc = this._currentSortCols[_cscIdx] || undefined;
            const _sortState = _csc == undefined ? 0 : (_csc.order == 'asc' ? 1 : 2);
            let _nextState;
            if (!this.opts.multiColumnSort || _cscIdx <= 0) {
                _nextState = (_sortState + 1) % 3;
            }
            else {
                _nextState = _sortState;
            }
            if (this._currentSortCols.length == 1 && this._currentSortCols[0].handle == _colClicked.params.handle && _nextState == 0) {
                _nextState = 1;
            }
            if (!this.opts.multiColumnSort)
                this._currentSortCols = [];
            else if (_csc)
                this._currentSortCols.splice(_cscIdx, 1);
            switch (_nextState) {
                case 0:
                    break;
                case 1:
                    this._currentSortCols.unshift({ handle: _colClicked.params.handle, order: 'asc' });
                    break;
                case 2:
                    this._currentSortCols.unshift({ handle: _colClicked.params.handle, order: 'desc' });
                    break;
            }
            this._renderHeader();
            this._renderBody();
            this._setListeners();
        }, { signal: _a.signal }));
        this.el.querySelector('.strike-grid-scrollbody')
            .addEventListener('click', (e) => this._rowClickHandler(e), { signal: _a.signal });
    }
    _removeListeners() {
        this._abortListeners.forEach((a) => a.abort());
        this._abortListeners.length = 0;
    }
    _rowClickHandler(evt) {
        const _rowDiv = evt.target.closest('.strike-grid-row');
        if (!_rowDiv)
            return;
        if (this.opts.selectable)
            this._toggleRowSelection(parseInt(_rowDiv.getAttribute('row-id')));
        this.dispatchEvent(new CustomEvent('rowClicked', { detail: { rowID: _rowDiv.getAttribute('row-id') } }));
    }
    _toggleRowSelection(rowID) {
        let _turnOn = !this._currentSelectedRowIDs.has(rowID);
        if (_turnOn) {
            if (this.opts.selectable == 'single' && this._currentSelectedRowIDs.size) {
                this._currentSelectedRowIDs.forEach((_id) => this.getRowByID(_id).domElement.classList.remove('selected'));
                this._currentSelectedRowIDs.clear();
            }
            this._currentSelectedRowIDs.add(rowID);
        }
        else {
            this._currentSelectedRowIDs.delete(rowID);
        }
        this.getRowByID(rowID).domElement.classList[_turnOn ? 'add' : 'remove']('selected');
        this.dispatchEvent(new Event('change'));
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
    clearSelection() {
        this._currentSelectedRowIDs.forEach((_rowID) => {
            this.getRowByID(_rowID).domElement.classList.remove('selected');
        });
        this._currentSelectedRowIDs.clear();
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
        this.clearSelection();
        const _rowIDs = this.getMatchingRows(match).map((_r) => _r.rowID);
        if (this.opts.selectable != 'multi')
            _rowIDs.length = 1;
        _rowIDs.forEach((_id) => {
            this._currentSelectedRowIDs.add(_id);
            this.getRowByID(_id).domElement.classList.add('selected');
        });
    }
    scrollToRow(rowID, animate = 0) {
        const _scrollTarget = this.role('scrollbody').elements[0];
        const _toPos = this.getRowByID(rowID).domElement.firstChild.offsetTop;
        if (!animate) {
            _scrollTarget.scrollTo({ top: _toPos });
        }
        else {
            const _refresh = 30;
            const _easeOut = 3;
            const _origDist = _toPos - _scrollTarget.scrollTop;
            let _c = 0;
            let f = setInterval(() => {
                _scrollTarget.scrollTop +=
                    (_toPos - _scrollTarget.scrollTop) / ((animate / (_refresh * _easeOut)) - (_c / _easeOut));
                if (_c > animate / _refresh || Math.abs(_toPos - _scrollTarget.scrollTop) < 3) {
                    _scrollTarget.scrollTo({ top: _toPos });
                    clearInterval(f);
                }
                _c++;
            }, _refresh);
        }
    }
    set height(h) {
        this.util(this.el).css({ 'max-height': h, 'height': h });
        this.role('container').css({ 'min-height': h });
    }
    set outerWidth(w) {
        this.util(this.el).css({ 'max-width': w });
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
                                            <arrow-down style='opacity:${_upDownOpacity[1]};margin-left:-0.6rem;'></arrow-down>
                                            <arrow-up style='opacity:${_upDownOpacity[0]};'></arrow-up>
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
        this._currentSelectedRowIDs.forEach((_id) => this.getRowByID(_id).domElement.classList.add('selected'));
    }
    _clearBody() {
        this.role('scrollbody').html('');
        this._currentSelectedRowIDs.clear();
    }
    role(search) {
        return (this.util().role(search));
    }
    util(search = this.el) {
        let q;
        if (typeof search === 'string')
            q = Array.from(document.querySelectorAll(search));
        else if (Array.isArray(search))
            q = search;
        else
            q = [search];
        return ({
            role: (r) => {
                const _srch = r.split(' ').map((_r) => `[role="${_r}"]`).join(',');
                q = q.reduce((a, _q) => {
                    a.push(...Array.from(_q.querySelectorAll(_srch)));
                    return (a);
                }, []);
                return (this.util(q));
            },
            html: (h) => {
                q.forEach((node) => node.innerHTML = h);
                return (this.util(q));
            },
            find: (f) => {
                const _found = [];
                q.forEach((node) => _found.push(...Array.from(node.querySelectorAll(f))));
                return (this.util(_found));
            },
            each: (fn) => {
                q.forEach((node, key) => {
                    fn(key, node);
                });
                return (this.util(q));
            },
            css: (s) => {
                q.forEach((node) => {
                    Object.keys(s).forEach((k) => {
                        node.style[k] = s[k];
                    });
                });
                return (this.util(q));
            },
            elements: q
        });
    }
    async destroy() {
        this._clearBody();
        this._rows = [];
        this._currentSortCols = [];
        this._currentSelectedRowIDs.clear();
        this._removeListeners();
    }
}
