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
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StrikeComponent = void 0;
    class StrikeComponent {
        constructor(handle, templateID = null, loadHTM = null, cache = false, directDraw = false) {
            this.handle = handle;
            this.templateID = templateID;
            this.loadHTM = loadHTM;
            this.cache = cache;
            this.directDraw = directDraw;
            this._loaded = false;
            this._waiting = false;
            this._destroyed = false;
            if (this.loadHTM)
                return;
            this._loaded = true;
        }
        get waitHolder() {
            return (this.el);
        }
        set waiting(w) {
            if (this._waiting && w != false) {
                if (w === true) {
                    this.find(`#strike-wait-holder-${this.instanceID}`).find('#strike-wait-txt').css('display', 'none').html('');
                }
                else {
                    this.find(`#strike-wait-holder-${this.instanceID}`).find('#strike-wait-txt').css('display', 'block').html(w);
                }
                return;
            }
            if (!w) {
                this.el.find(`#strike-waiter-backdrop-${this.instanceID}`).remove();
            }
            else {
                let b = $('#strike-waiter-backdrop').clone().html('');
                b.css({ visibility: 'visible', position: 'absolute' });
                b.attr('id', `strike-waiter-backdrop-${this.instanceID}`);
                let h = $('#strike-wait-holder').clone();
                h.attr('id', `strike-wait-holder-${this.instanceID}`).css({ position: 'sticky', top: '40vh' });
                if (w === true) {
                    h.find('#strike-wait-txt').css('display', 'none').html('');
                }
                else {
                    h.find('#strike-wait-txt').css('display', 'block').html(w);
                }
                h.css('visibility', 'visible');
                b.append(h);
                this.waitHolder.append(b);
            }
            this._waiting = w;
        }
        get waiting() {
            return (this._waiting);
        }
        get instanceID() {
            if (!this._instanceID) {
                let c = 1;
                let id;
                while (c != undefined) {
                    id = this.handle + "_" + (Math.floor(Math.random() * Math.pow(10, 7)).toString());
                    c = $(`#${id}`)[0];
                }
                this._instanceID = id;
            }
            return (this._instanceID);
        }
        init(appendTo = null, autoFillData = true) {
            return __awaiter(this, void 0, void 0, function* () {
                if (appendTo && this.directDraw)
                    throw new Error('Components with directDraw .el will not be reappended to the DOM.');
                if (this.loadHTM) {
                    let htm;
                    if (typeof this.loadHTM === "string") {
                        let c = StrikeComponent._CACHED_HTM.find((c) => {
                            return (c.loc == this.loadHTM);
                        });
                        if (c) {
                            htm = c.src;
                        }
                        else {
                            htm = yield $.ajax(this.loadHTM, { cache: this.cache });
                            StrikeComponent._CACHED_HTM.push({ loc: this.loadHTM, src: htm });
                        }
                    }
                    else {
                        htm = yield this.loadHTM();
                    }
                    this._loaded = true;
                    let temp = document.createElement('div');
                    $(temp).html(htm);
                    this.drawElement($(temp));
                    temp = null;
                }
                else {
                    this.drawElement();
                }
                let elRef = this.el.parent();
                elRef.addClass('blur');
                if (appendTo && !this.directDraw)
                    $(appendTo).append(this.el);
                yield this.drawInternals();
                this.fixHeights();
                if (autoFillData)
                    yield this.fillData();
                $(window).on(`refresh-${this.handle}.${this.instanceID}`, this.fillData.bind(this));
                $(window).on(`fixScreenHeights.${this.instanceID}`, this.fixHeights.bind(this));
                elRef.removeClass('blur');
            });
        }
        drawElement(tempElement) {
            if (!this.templateID) {
                this.el = $(document.createElement('div'));
            }
            else if (tempElement) {
                this.el = tempElement.find(this.templateID).clone();
            }
            else {
                this.el = this.directDraw ? $(this.templateID) : $(this.templateID).clone();
            }
            if (!this.directDraw)
                this.el.attr('id', this.instanceID);
            this.el.find('input').not('[type="radio"]').not('[type="checkbox"]').not('[type="hidden"]').attr('name', Math.random() * 10000 + '-' + Date.now());
        }
        drawInternals() {
            return __awaiter(this, void 0, void 0, function* () {
            });
        }
        fixHeights() {
        }
        fillData(evt) {
            return __awaiter(this, void 0, void 0, function* () {
            });
        }
        find(s) {
            return $(this.el).find(s);
        }
        role(input, tag = 'role') {
            let s = input.split(' ');
            let k = [];
            s.forEach((_s) => { k.push(`[${tag}="${_s}"]`); });
            return (this.find(k.join(',')));
        }
        destroy() {
            return __awaiter(this, void 0, void 0, function* () {
                $(window).off(`.${this.instanceID}`);
                $(this.el).off().remove();
                this.el = null;
                this._destroyed = true;
            });
        }
    }
    exports.StrikeComponent = StrikeComponent;
    StrikeComponent._CACHED_HTM = [];
});
