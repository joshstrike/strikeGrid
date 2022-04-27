(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./js/strike/component/StrikeGrid.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Test = void 0;
    const StrikeGrid_js_1 = require("./js/strike/component/StrikeGrid.js");
    class Test {
        grid;
        constructor() {
            this.grid = new StrikeGrid_js_1.StrikeGrid(document.getElementById('someElement'), { rowHeight: 40, multiColumnSort: true, selectable: 'single', reselectionKey: 'id' });
            window['grid'] = this.grid;
            this.init();
        }
        async init() {
            this.grid.setColumns([
                { handle: 'strA', label: 'First String', width: '4fr', sortable: true,
                    sortFn: ({ strA: a }, { strA: b }) => {
                        a = a.toLowerCase();
                        b = b.toLowerCase();
                        if (a.length != b.length)
                            return (a.length > b.length ? 1 : -1);
                        return (a == b ? 0 : (a > b ? 1 : -1));
                    }
                },
                { handle: 'strB', label: 'Second String', width: '4fr', sortable: true },
                { handle: 'difflength', label: 'Difference', width: '1fr', sortable: false, renderFromObject: { displayKey: '_', sortKey: 's' } }
            ]);
            let k = [];
            const testStrs = await (await (await fetch('assets/test.txt')).text()).split(' ');
            for (let c = 1; c < testStrs.length; c++) {
                k.push({ id: c,
                    strA: testStrs[c - 1],
                    strB: testStrs[c],
                    difflength: { _: "Huh " + Math.abs(testStrs[c].length - testStrs[c - 1].length), s: Math.abs(testStrs[c].length - testStrs[c - 1].length) },
                    diffnum: Math.abs(testStrs[c].length - testStrs[c - 1].length),
                    _rowClasses: 'centertxt' });
            }
            this.grid.setData(k);
            this.grid.addEventListener('rowClicked', (evt) => {
                console.log('Clicked row:', evt.detail.rowID);
            });
            this.grid.addEventListener('change', (evt) => {
                console.log('Selected rows:', this.grid.selectedRows);
            });
            this.grid.selectedData = [{ strA: 'single' }];
            this.grid.scrollToRow(this.grid.selectedRows[0].rowID, 300);
        }
    }
    exports.Test = Test;
    new Test();
});
