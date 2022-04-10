(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./js/strike/component/StrikeGrid"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const StrikeGrid_1 = require("./js/strike/component/StrikeGrid");
    const grid = new StrikeGrid_1.StrikeGrid('testGrid', { rowHeight: 40, multiColumnSort: true, selectable: 'multi', reselectionKey: 'id' });
    window['grid'] = grid;
    grid.init($('#someElement')).then((res) => {
        grid.setColumns([
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
        const testStrs = $.ajax({ url: 'assets/test.txt', async: false }).responseText.split(' ');
        for (let c = 1; c < testStrs.length; c++) {
            k.push({ id: c,
                strA: testStrs[c - 1],
                strB: testStrs[c],
                difflength: { _: "Huh " + Math.abs(testStrs[c].length - testStrs[c - 1].length), s: Math.abs(testStrs[c].length - testStrs[c - 1].length) },
                diffnum: Math.abs(testStrs[c].length - testStrs[c - 1].length),
                _rowClasses: 'centertxt red' });
        }
        grid.setData(k);
        $(grid).on('rowClicked', (evt, params) => {
        });
        grid.selectedData = [{ strA: 'self-aggrandizing' }];
        grid.scrollToRow(grid.selectedRows[0].rowID, 300);
    });
});
