export class StrikeComponent {
    
    protected static _CACHED_HTM:{loc:string,src:string}[] = [];
    
    public el:JQuery<HTMLElement>;
    protected _instanceID:string;
    protected _loaded:boolean = false;
    protected _waiting:boolean|string = false;
    protected _destroyed:boolean = false;
    constructor(protected handle:string, protected templateID:string|JQuery<HTMLElement> = null, protected loadHTM:string|(()=>Promise<string>) = null, protected cache:boolean = false, protected directDraw:boolean = false) {
        if (this.loadHTM) return; //in this case, init() must be awaited to handle the loading.
        this._loaded = true;
    }
    protected get waitHolder():JQuery<HTMLElement> {
        return (this.el); //StrikeModalComponent overrides this.
    }
    public set waiting(w:boolean|string) {
        if (this._waiting && w != false) {
            if (w === true) {
                this.find(`#strike-wait-holder-${this.instanceID}`).find('#strike-wait-txt').css('display','none').html('');
            } else {
                this.find(`#strike-wait-holder-${this.instanceID}`).find('#strike-wait-txt').css('display','block').html(w);
            }
            return;
        }
        if (!w) {
            this.el.find(`#strike-waiter-backdrop-${this.instanceID}`).remove();
        } else {
            let b:JQuery<HTMLElement> = $('#strike-waiter-backdrop').clone().html(''); //remove the waiter copy if it was attached to the main backdrop.
            b.css({ visibility:'visible', position:'absolute'});
            b.attr('id',`strike-waiter-backdrop-${this.instanceID}`);
            let h:JQuery<HTMLElement> = $('#strike-wait-holder').clone();
            h.attr('id',`strike-wait-holder-${this.instanceID}`).css({position:'sticky',top:'40vh'});
            if (w === true) {
                h.find('#strike-wait-txt').css('display','none').html('');
            } else {
                h.find('#strike-wait-txt').css('display','block').html(w);
            }
            h.css('visibility','visible');
            b.append(h);
            this.waitHolder.append(b);
        }
        this._waiting = w;
    }
    public get waiting():boolean|string {
        return (this._waiting);
    }
    public get instanceID():string {
        if (!this._instanceID) {
            let c:any = 1;
            let id:string;
            while (c != undefined) {
                id = this.handle+"_"+(Math.floor(Math.random() * Math.pow(10,7)).toString());
                c = $(`#${id}`)[0]; //if something with the same id exists on the DOM, try a different random ID.
            }
            this._instanceID = id;
        }
        return (this._instanceID);
    }
    public async init(appendTo:HTMLElement|JQuery<HTMLElement> = null,autoFillData:boolean = true):Promise<void> {
        if (appendTo && this.directDraw) throw new Error('Components with directDraw .el will not be reappended to the DOM.')
        if (this.loadHTM) {
            //Do NOT handle the ajax call failing here. If it fails, it will throw and reject the promise here, 
            //which halts execution of subclasses at super.init(). When initing a StrikeComponent, await and .catch() at the 
            //point in the code where you init it.
            let htm:string;
            if (typeof this.loadHTM === "string") {
                //Store the HTM string for re-use, whether the first load was cached or not. One point of weirdness here. 
                //With asynchronous calls, e.g. with Checklist which creates many ChecklistItems with Promise.all(), but even with normal inline awaits, 
                //this cache is not always updated by the time another init on the same class occurs.
                let c:{loc:string,src:string} = StrikeComponent._CACHED_HTM.find((c:{loc:string,src:string})=>{ 
                    return (c.loc==this.loadHTM); 
                });
                if (c) {
                    htm = c.src;
                } else {
                    htm = await $.ajax(this.loadHTM, { cache:this.cache });
                    StrikeComponent._CACHED_HTM.push({loc:this.loadHTM,src:htm});
                }
            } else {
                htm = await this.loadHTM();
            }
            this._loaded = true;
            let temp:HTMLElement = document.createElement('div');
            $(temp).html(htm);
            this.drawElement($(temp));
            temp = null;
        } else {
            this.drawElement();
        }
        
        let elRef:JQuery<HTMLElement> = this.el.parent();
        elRef.addClass('blur');
        if (appendTo && !this.directDraw) $(appendTo).append(this.el); //directDraw elements remain where they are in the DOM.
        await this.drawInternals(); //You must await this. Although in a lot of cases it's not necessary, when drawing datatables it is, 
        //even if it seems like it isn't most of the time. When running remotely, certain draws take longer because of CSS and datatables 
        //cannot get a proper height if we don't wait for this before filling the data. There is not any major impact on load time here.
        this.fixHeights();
        if (autoFillData) await this.fillData();
        $(window).on(`refresh-${this.handle}.${this.instanceID}`,this.fillData.bind(this));
        $(window).on(`fixScreenHeights.${this.instanceID}`, this.fixHeights.bind(this));
        elRef.removeClass('blur');
    }
    protected drawElement(tempElement?:JQuery<HTMLElement>):void {
        if (!this.templateID) {
            //no ID provided means we create a basic element from scratch and fill it with something later.
            this.el = $(document.createElement('div'));
        } else if (tempElement) {
            //clone the loaded element; it will need to be appended somewhere.
            this.el = tempElement.find(this.templateID).clone();//.attr('id',this.instanceID);
        } else {
            //The element exists in the DOM somewhere. Draw directly into the element, or set up .el as a clone to be appended.
            //This only works if there is no tempElement and no load.
            this.el = this.directDraw ? $(this.templateID) : $(this.templateID).clone();//.attr('id',this.instanceID);
        }
        //DO NOT rename OR reappend directDraw elements.
        //They are hooked as .el and remain where they are.
        if (!this.directDraw) this.el.attr('id',this.instanceID);
        
        //autocomplete prevention hack -- DO NOT do this on radio buttons or they think they're all part of the same group!
        this.el.find('input').not('[type="radio"]').not('[type="checkbox"]').not('[type="hidden"]').attr('name',Math.random()*10000 + '-' + Date.now());
    }
    protected async drawInternals():Promise<void> {
        //marked for override
    }
    public fixHeights():void {
        //marked for override
    }
    protected async fillData(evt?:Event):Promise<void> {
        //console.log(this.instanceID,'fillData',evt);
        //marked for override
    }
    public find(s:string):JQuery<HTMLElement> {
        return $(this.el).find(s);
    }
    public role(input:string,tag:string = 'role'):JQuery<HTMLElement> {
        let s:string[] = input.split(' ');
        let k:string[] = [];
        s.forEach((_s:string)=>{ k.push(`[${tag}="${_s}"]`)});
        return (this.find(k.join(',')));
    }
    public async destroy():Promise<void> {
        //Should be extended or overridden. Destroying this.el should involve nulling and removing it (and all children) from the DOM.
        $(window).off(`.${this.instanceID}`);
        $(this.el).off().remove();
        this.el = null;
        this._destroyed = true;
    }
}