const React = require('react')
const ReactDOM = require('react-dom')
const XMLUtils = require('pydio/util/xml')
const PathUtils = require('pydio/util/path')
const FuncUtils = require('pydio/util/func')
const ResourcesManager = require('pydio/http/resources-manager')
import PydioContextProvider from './PydioContextProvider'

export default class Builder{

    constructor(pydio){
        this._pydio = pydio;
        this.guiLoaded = false;
        this._componentsRegistry = new Map();
    }

    insertChildFromString(parent, html){
        let element = document.createElement('div');
        element.innerHTML = html;
        for(let i = 0; i < element.childNodes.length; i++){
            parent.appendChild(element.childNodes[i].cloneNode(true));
        }
    }

    initTemplates(){

        if(!this._pydio.getXmlRegistry()) return;

        const tNodes = XMLUtils.XPathSelectNodes(this._pydio.getXmlRegistry(), "client_configs/template[@component]");
        for(let i=0;i<tNodes.length;i++){

            let target = tNodes[i].getAttribute("element");
            let themeSpecific = tNodes[i].getAttribute("theme");
            let props = {};
            if(tNodes[i].getAttribute("props")){
                props = JSON.parse(tNodes[i].getAttribute("props"));
            }
            props.pydio = this._pydio;

            let containerId = props.containerId;
            let namespace = tNodes[i].getAttribute("namespace");
            let component = tNodes[i].getAttribute("component");

            if(themeSpecific && this._pydio.Parameters.get("theme") && this._pydio.Parameters.get("theme") != themeSpecific){
                continue;
            }
            let targetObj = document.getElementById(target);
            if(!targetObj){
                let tags = document.getElementsByTagName(target);
                if(tags.length) targetObj = tags[0];
            }
            if(targetObj){
                let position = tNodes[i].getAttribute("position");
                let name = tNodes[i].getAttribute('name');
                if((position === 'bottom' && name) || target === 'body'){
                    let newDiv = document.createElement('div');
                    if(target === 'body') {
                        targetObj.appendChild(newDiv);
                    } else {
                        targetObj.parentNode.appendChild(newDiv);
                    }
                    newDiv.id = name;
                    target = name;
                    targetObj = newDiv;
                }
                ResourcesManager.loadClassesAndApply([namespace], function(){
                    if(!global[namespace] || !global[namespace][component]){
                        if(console) console.error('Cannot find component ['+namespace+']['+component+']. Did you forget to export it? ')
                        return;
                    }
                    const element = React.createElement(PydioContextProvider(global[namespace][component], this._pydio), props);
                    const el = ReactDOM.render(element, targetObj);
                    this._componentsRegistry.set(target, el);
                }.bind(this));

            }
        }
        this.guiLoaded = true;
        this._pydio.notify("gui_loaded");

    }

    refreshTemplateParts(){

        this._componentsRegistry.forEach(function(reactElement){
            reactElement.forceUpdate();
        });

    }

    updateHrefBase(cdataContent){
        return cdataContent;
        /*
         if(Prototype.Browser.IE10){
         var base = document.getElementsByTagName('base')[0].getAttribute("href");
         if(!base){
         return cdataContent;
         }
         return cdataContent.replace('data-hrefRebase="', 'href="'+base);
         }
         */
    }

    /**
     *
     * @param component
     */
    registerEditorOpener(component){
        this._editorOpener = component;
    }

    unregisterEditorOpener(component){
        if(this._editorOpener === component) {
            this._editorOpener = null;
        }
    }

    getEditorOpener(){
        return this._editorOpener;
    }

    openCurrentSelectionInEditor(editorData, forceNode){
        const selectedNode =  forceNode ? forceNode : this._pydio.getContextHolder().getUniqueNode();
        if(!selectedNode) return;
        if(!editorData){
            const selectedMime = PathUtils.getAjxpMimeType(selectedNode);
            const editors = this._pydio.Registry.findEditorsForMime(selectedMime, false);
            if(editors.length && editors[0].openable && !(editors[0].write && selectedNode.getMetadata().get("ajxp_readonly") === "true")){
                editorData = editors[0];
            }
        }
        if(editorData){
            this._pydio.Registry.loadEditorResources(editorData.resourcesManager, function(){
                const editorOpener = this.getEditorOpener();
                if(!editorOpener || editorData.modalOnly){
                    modal.openEditorDialog(editorData);
                }else{
                    editorOpener.openEditorForNode(selectedNode, editorData);
                }
            }.bind(this));
        }else{
            if(this._pydio.Controller.getActionByName("download")){
                this._pydio.Controller.getActionByName("download").apply();
            }
        }
    }

    registerModalOpener(component){
        this._modalOpener = component;
    }

    unregisterModalOpener(){
        this._modalOpener = null;
    }

    openComponentInModal(namespace, componentName, props){
        if(!this._modalOpener){
            Logger.error('Cannot find any modal opener for opening component ' + namespace + '.' + componentName);
            return;
        }
        // Collect modifiers
        let modifiers = [];
        let namespaces = [];
        props = props || {};
        props['pydio'] = this._pydio;
        XMLUtils.XPathSelectNodes(this._pydio.getXmlRegistry(), '//client_configs/component_config[@className="'+namespace + '.' + componentName +'"]/modifier').map(function(node){
            const module = node.getAttribute('module');
            modifiers.push(module);
            namespaces.push(module.split('.').shift());
        });
        if(modifiers.length){
            ResourcesManager.loadClassesAndApply(namespaces, function(){
                let modObjects = [];
                modifiers.map(function(mString){
                    try{
                        let classObject = FuncUtils.getFunctionByName(mString, window);
                        modObjects.push(new classObject());
                    }catch(e){
                        console.log(e);
                    }
                });
                props['modifiers'] = modObjects;
                this._modalOpener.open(namespace, componentName, props);
            }.bind(this));
        }else{
            this._modalOpener.open(namespace, componentName, props);
        }
    }

    /**
     *
     * @param component
     */
    registerMessageBar(component){
        this._messageBar = component;
    }

    unregisterMessageBar(){
        this._messageBar = null;
    }

    displayMessage(type, message, actionLabel = null, actionCallback = null){
        if(!this._messageBar){
            Logger.error('Cannot find any messageBar for displaying message ' + message);
            return;
        }
        if(type === 'ERROR'){
            this._messageBar.error(message, actionLabel, actionCallback);
        }else{
            this._messageBar.info(message, actionLabel, actionCallback);
        }
    }

    hasHiddenDownloadForm(){
        return this._hiddenDownloadForm;
    }

    registerHiddenDownloadForm(component){
        this._hiddenDownloadForm = component;
    }

    unRegisterHiddenDownloadForm(component){
        this._hiddenDownloadForm = null;
    }

    sendDownloadToHiddenForm(selection, parameters){
        if(this._hiddenDownloadForm){
            this._hiddenDownloadForm.triggerDownload(selection, parameters);
        }
    }

}