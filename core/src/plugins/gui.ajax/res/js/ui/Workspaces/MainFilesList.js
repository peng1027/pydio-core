import FilePreview from './FilePreview'
const ReactDOM = require('react-dom')

class ComponentConfigsParser {

    constructor() {

    }

    getDefaultListColumns() {
        return {
            text:{
                label:'File Name',
                message:'1',
                width: '50%',
                renderCell:MainFilesList.tableEntryRenderCell,
                sortType:'string',
                remoteSortAttribute:'ajxp_label'
            },
            filesize:{
                label:'File Size',
                message:'2',
                sortType:'number',
                sortAttribute:'bytesize',
                remoteSortAttribute:'filesize'
            },
            mimestring:{
                label:'File Type',
                message:'3',
                sortType:'string'
            },
            ajxp_modiftime:{
                label:'Mofidied on',
                message:'4',
                sortType:'number'
            }
        };
    }

    loadConfigs(componentName) {
        let configs = new Map();
        let columnsNodes = XMLUtils.XPathSelectNodes(global.pydio.getXmlRegistry(), 'client_configs/component_config[@className="FilesList"]/columns/column|client_configs/component_config[@className="FilesList"]/columns/additional_column');
        let columns = {};
        let messages = global.pydio.MessageHash;
        columnsNodes.forEach(function(colNode){
            let name = colNode.getAttribute('attributeName');
            columns[name] = {
                message : colNode.getAttribute('messageId'),
                label   : colNode.getAttribute('messageString') ? colNode.getAttribute('messageString') : messages[colNode.getAttribute('messageId')],
                sortType: messages[colNode.getAttribute('sortType')]
            };
            if(name === 'ajxp_label') {
                columns[name].renderCell = MainFilesList.tableEntryRenderCell;
            }
            if(colNode.getAttribute('reactModifier')){
                let reactModifier = colNode.getAttribute('reactModifier');
                ResourcesManager.detectModuleToLoadAndApply(reactModifier, function(){
                    columns[name].renderComponent = columns[name].renderCell = FuncUtils.getFunctionByName(reactModifier, global);
                }, true);
            }
            columns[name]['sortType'] = 'string';
        });
        configs.set('columns', columns);
        return configs;
    }

}

let MainFilesList = React.createClass({

    propTypes: {
        pydio: React.PropTypes.instanceOf(Pydio),
        horizontalRibbon: React.PropTypes.bool
    },

    statics: {
        tableEntryRenderCell: function(node){
            return <span><FilePreview loadThumbnail={false} node={node}/> {node.getLabel()}</span>;
        }
    },

    getInitialState: function(){
        let configParser = new ComponentConfigsParser();
        let columns = configParser.loadConfigs('FilesList').get('columns');
        return {
            contextNode : this.props.pydio.getContextHolder().getContextNode(),
            displayMode : this.props.displayMode?this.props.displayMode:'list',
            thumbNearest: 200,
            thumbSize   : 200,
            elementsPerLine: 5,
            columns     : columns ? columns : configParser.getDefaultListColumns(),
            parentIsScrolling: this.props.parentIsScrolling,
            repositoryId: this.props.pydio.repositoryId
        }
    },

    componentDidMount: function(){
        // Hook to the central datamodel
        this._contextObserver = function(){
            this.setState({contextNode: this.props.pydio.getContextHolder().getContextNode()});
        }.bind(this);
        this.props.pydio.getContextHolder().observe("context_changed", this._contextObserver);
        this.props.pydio.getController().updateGuiActions(this.getPydioActions());

        this.recomputeThumbnailsDimension();
        if(window.addEventListener){
            window.addEventListener('resize', this.recomputeThumbnailsDimension);
        }else{
            window.attachEvent('onresize', this.recomputeThumbnailsDimension);
        }
    },

    componentWillUnmount: function(){
        this.props.pydio.getContextHolder().stopObserving("context_changed", this._contextObserver);
        this.getPydioActions(true).map(function(key){
            this.props.pydio.getController().deleteFromGuiActions(key);
        }.bind(this));
        if(window.addEventListener){
            window.removeEventListener('resize', this.recomputeThumbnailsDimension);
        }else{
            window.detachEvent('onresize', this.recomputeThumbnailsDimension);
        }
    },

    shouldComponentUpdate: function(nextProps, nextState){
        return (!this.state || this.state.repositoryId !== nextProps.pydio.repositoryId || nextState !== this.state );
    },

    componentWillReceiveProps: function(){
        if(this.state && this.state.repositoryId !== this.props.pydio.repositoryId ){
            this.props.pydio.getController().updateGuiActions(this.getPydioActions());
            let configParser = new ComponentConfigsParser();
            const columns = configParser.loadConfigs('FilesList').get('columns');
            this.setState({
                columns: columns ? columns : configParser.getDefaultListColumns(),
            })
        }
    },

    resize: function(){
        this.recomputeThumbnailsDimension();
    },

    recomputeThumbnailsDimension: function(nearest){

        if(!nearest || nearest instanceof Event){
            nearest = this.state.thumbNearest;
        }
        const MAIN_CONTAINER_FULL_PADDING = 2;
        const THUMBNAIL_MARGIN = 1;

        let containerWidth = ReactDOM.findDOMNode(this.refs['list']).clientWidth - MAIN_CONTAINER_FULL_PADDING;

        // Find nearest dim
        let blockNumber = Math.floor(containerWidth / nearest);
        let width = Math.floor(containerWidth / blockNumber) - THUMBNAIL_MARGIN * 2;
        if(this.props.horizontalRibbon){
            blockNumber = this.state.contextNode.getChildren().size;
            if(this.state.displayMode === 'grid-160') width = 160;
            else if(this.state.displayMode === 'grid-320') width = 320;
            else if(this.state.displayMode === 'grid-80') width = 80;
            else width = 200;
        }

        // Recompute columns widths
        let columns = this.state.columns;
        let columnKeys = Object.keys(columns);
        let defaultFirstWidthPercent = 10;
        let defaultFirstMinWidthPx = 250;
        let firstColWidth = Math.max(250, containerWidth * defaultFirstWidthPercent / 100);
        let otherColWidth = (containerWidth - firstColWidth) / (Object.keys(this.state.columns).length - 1);
        columnKeys.map(function(columnKey){
            columns[columnKey]['width'] = otherColWidth;
        });

        this.setState({
            columns: columns,
            elementsPerLine: blockNumber,
            thumbSize: width,
            thumbNearest:nearest
        });


    },

    entryRenderIcon: function(node, entryProps = {}){
        return (
            <FilePreview
                loadThumbnail={!entryProps['parentIsScrolling']}
                node={node}
            />
        );
    },

    entryRenderActions: function(node){
        // This would be for mobile actions
        /*
         if(node.isLeaf()){
         return null;
         let pushNodeToEditor = function(){

         };
         return <ReactMUI.FontIcon className="icon-ellipsis-vertical" tooltip="Info" onClick={pushNodeToEditor}/>;
         }else{
         let selectFolder = function(e){
         e.stopPropagation();
         this.props.pydio.getContextHolder().setSelectedNodes([node]);
         }.bind(this);
         return <ReactMUI.FontIcon className="icon-ellipsis-vertical" tooltip="Info" onClick={selectFolder}/>;
         }*/
        let content = null;
        if(node.getMetadata().get('overlay_class')){
            let elements = node.getMetadata().get('overlay_class').split(',').map(function(c){
                return <span key={c} className={c + ' overlay-class-span'}></span>;
            });
            content = <div className="overlay_icon_div">{elements}</div>;
        }
        return content;

    },

    entryHandleClicks: function(node, clickType, event){
        let dm = this.props.pydio.getContextHolder();
        if(!clickType || clickType == PydioComponents.SimpleList.CLICK_TYPE_SIMPLE){
            if(event && event.shiftKey && dm.getSelectedNodes().length){
                const newSelection = this.refs.list.computeSelectionFromCurrentPlusTargetNode(dm.getSelectedNodes(), node);
                dm.setSelectedNodes(newSelection);
            }else{
                dm.setSelectedNodes([node]);
            }
        }else if(clickType == PydioComponents.SimpleList.CLICK_TYPE_DOUBLE){
            if(node.isLeaf()){
                dm.setSelectedNodes([node]);
                this.props.pydio.Controller.fireAction("open_with_unique");
            }else{
                dm.requireContextChange(node);
            }
        }
    },

    entryRenderSecondLine: function(node){
        let metaData = node.getMetadata();
        let pieces = [];
        if(metaData.get("ajxp_description")){
            pieces.push(<span key="ajxp_description" className="metadata_chunk metadata_chunk_description">{metaData.get('ajxp_description')}</span>);
        }

        var first = false;
        var attKeys = Object.keys(this.state.columns);
        for(var i = 0; i<attKeys.length;i++ ){
            let s = attKeys[i];
            let columnDef = this.state.columns[s];
            let label;
            if(s === 'ajxp_label' || s === 'text'){
                continue;
            }else if(s=="ajxp_modiftime"){
                var date = new Date();
                date.setTime(parseInt(metaData.get(s))*1000);
                label = PathUtils.formatModifDate(date);
            }else if(s == "ajxp_dirname" && metaData.get("filename")){
                var dirName = PathUtils.getDirname(metaData.get("filename"));
                label =  dirName?dirName:"/" ;
            }else if(s == "filesize" && metaData.get(s) == "-") {
                continue;
            }else if(columnDef.renderComponent){
                columnDef['name'] = s;
                label = columnDef.renderComponent(node, columnDef);
            }else{
                var metaValue = metaData.get(s) || "";
                if(!metaValue) continue;
                label = metaValue;
            }
            let sep;
            if(!first){
                sep = <span className="icon-angle-right"></span>;
            }
            let cellClass = 'metadata_chunk metadata_chunk_standard metadata_chunk_' + s;
            pieces.push(<span key={s} className={cellClass}>{sep}<span className="text_label">{label}</span></span>);
        }
        return pieces;

    },

    switchDisplayMode: function(displayMode){
        this.setState({displayMode: displayMode});
        if(displayMode.indexOf('grid-') === 0){
            let near = parseInt(displayMode.split('-')[1]);
            this.recomputeThumbnailsDimension(near);
        }else if(displayMode === 'detail'){
            this.recomputeThumbnailsDimension();
        }
    },

    getPydioActions: function(keysOnly = false){
        if(keysOnly){
            return ['switch_display_mode'];
        }
        var multiAction = new Action({
            name:'switch_display_mode',
            icon_class:'mdi mdi-view-list',
            text_id:150,
            title_id:151,
            text:MessageHash[150],
            title:MessageHash[151],
            hasAccessKey:false,
            subMenu:true,
            subMenuUpdateImage:true
        }, {
            selection:false,
            dir:true,
            actionBar:true,
            actionBarGroup:'display_toolbar',
            contextMenu:false,
            infoPanel:false
        }, {}, {}, {
            staticItems:[
                {name:'List',title:227,icon_class:'mdi mdi-view-list',callback:function(){this.switchDisplayMode('list')}.bind(this),hasAccessKey:true,accessKey:'list_access_key'},
                {name:'Detail',title:461,icon_class:'mdi mdi-view-headline',callback:function(){this.switchDisplayMode('detail')}.bind(this),hasAccessKey:true,accessKey:'detail_access_key'},
                {name:'Thumbs',title:229,icon_class:'mdi mdi-view-grid',callback:function(){this.switchDisplayMode('grid-160')}.bind(this),hasAccessKey:true,accessKey:'thumbs_access_key'},
                {name:'Thumbs large',title:229,icon_class:'mdi mdi-view-agenda',callback:function(){this.switchDisplayMode('grid-320')}.bind(this),hasAccessKey:false},
                {name:'Thumbs small',title:229,icon_class:'mdi mdi-view-module',callback:function(){this.switchDisplayMode('grid-80')}.bind(this),hasAccessKey:false}
            ]
        });
        let buttons = new Map();
        buttons.set('switch_display_mode', multiAction);
        return buttons;
    },

    render: function(){

        let tableKeys, sortKeys, elementStyle, className = 'files-list layout-fill main-files-list';
        let elementHeight, entryRenderSecondLine, elementsPerLine = 1, near;
        let dMode = this.state.displayMode;
        if(dMode.indexOf('grid-') === 0){
            near = parseInt(dMode.split('-')[1]);
            dMode = 'grid';
        }
        let infiniteSliceCount = 50;

        if(dMode === 'detail'){

            elementHeight = PydioComponents.SimpleList.HEIGHT_ONE_LINE;
            tableKeys = this.state.columns;

        } else if(dMode === 'grid'){

            sortKeys = this.state.columns;
            className += ' material-list-grid grid-size-' + near;
            elementHeight =  Math.ceil(this.state.thumbSize / this.state.elementsPerLine);
            if(!elementHeight || this.props.horizontalRibbon){
                elementHeight = 1;
            }
            elementsPerLine = this.state.elementsPerLine;
            elementStyle={
                width: this.state.thumbSize,
                height: this.state.thumbSize
            };
            if(this.props.horizontalRibbon){
                className += ' horizontal-ribbon';
            }
            // Todo: compute a more real number of elements visible per page.
            if(near === 320) infiniteSliceCount = 25;
            else if(near === 160) infiniteSliceCount = 80;
            else if(near === 80) infiniteSliceCount = 200;

        } else if(dMode === 'list'){

            sortKeys = this.state.columns;
            elementHeight = PydioComponents.SimpleList.HEIGHT_TWO_LINES;
            entryRenderSecondLine = this.entryRenderSecondLine;

        }

        const {pydio} = this.props;
        const {contextNode} = this.state;
        const messages = pydio.MessageHash;
        const canUpload = (pydio.user && pydio.user.write && pydio.Controller.getActionByName('upload') && (contextNode.getMetadata().get('ajxp_readonly') !== 'true'));
        const secondary = messages[canUpload ? '565' : '566'];
        const iconClassName = canUpload ? 'mdi mdi-cloud-upload' : 'mdi mdi-folder-outline';
        let emptyStateProps = {
            style           : {backgroundColor: 'transparent'},
            iconClassName   : iconClassName,
            primaryTextId   : messages['562'],
            secondaryTextId : secondary,
        };
        if(contextNode.isRoot()){
            const recyclePath = contextNode.getMetadata().get('repo_has_recycle');
            emptyStateProps = {
                style           : {backgroundColor: 'transparent'},
                iconClassName   : iconClassName,
                primaryTextId   : messages['563'],
                secondaryTextId : secondary,
            };
            if(recyclePath){
                emptyStateProps = {
                    ...emptyStateProps,
                    checkEmptyState: (node) => { return (node.isLoaded() && node.getChildren().size === 1 && node.getChildren().get(recyclePath) )} ,
                    actionLabelId: messages['567'],
                    actionIconClassName: 'mdi mdi-delete',
                    actionCallback: (e) => {
                        pydio.goTo(recyclePath);
                    }
                };
            }
        }else{
            const recycle = pydio.getContextHolder().getRootNode().getMetadata().get('repo_has_recycle');
            if(contextNode.getPath() === recycle){
                emptyStateProps = {
                    ...emptyStateProps,
                    iconClassName   : 'mdi mdi-delete-empty',
                    primaryTextId   : messages['564'],
                    secondaryTextId : null,
                }
            }
        }

        return (
            <PydioComponents.SimpleList
                ref="list"
                tableKeys={tableKeys}
                sortKeys={sortKeys}
                node={this.state.contextNode}
                dataModel={pydio.getContextHolder()}
                className={className}
                actionBarGroups={["change_main"]}
                infiniteSliceCount={infiniteSliceCount}
                skipInternalDataModel={true}
                elementsPerLine={elementsPerLine}
                elementHeight={elementHeight}
                elementStyle={elementStyle}
                passScrollingStateToChildren={true}
                entryRenderIcon={this.entryRenderIcon}
                entryRenderSecondLine={entryRenderSecondLine}
                entryRenderActions={this.entryRenderActions}
                entryHandleClicks={this.entryHandleClicks}
                horizontalRibbon={this.props.horizontalRibbon}
                emptyStateProps={emptyStateProps}
            />
        );
    }

});

export {MainFilesList as default}
