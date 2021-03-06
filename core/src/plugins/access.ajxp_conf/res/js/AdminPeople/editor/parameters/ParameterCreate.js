const React = require('react')
const {TextField, FlatButton} = require('material-ui')
const Pydio = require('pydio');
const {ActionDialogMixin, CancelButtonProviderMixin} = Pydio.requireLib('boot');

import EditorCache from '../util/EditorCache'
import ParametersPicker from './ParametersPicker'

export default React.createClass({

    mixins: [
        ActionDialogMixin, CancelButtonProviderMixin
    ],

    propTypes:{
        workspaceScope:React.PropTypes.string,
        showModal:React.PropTypes.func,
        hideModal:React.PropTypes.func,
        pluginsFilter:React.PropTypes.func,
        roleType:React.PropTypes.oneOf(['user', 'group', 'role']),
        createParameter:React.PropTypes.func
    },

    getDefaultProps: function(){
        return {
            dialogPadding: 0,
            dialogTitle: '',
            dialogSize: 'md',
        }
    },

    getInitialState: function(){
        return {
            step:1,
            workspaceScope:this.props.workspaceScope,
            pluginName:null,
            paramName:null
        };
    },

    setSelection:function(plugin, type, param, attributes){
        this.setState({pluginName:plugin, type:type, paramName:param, attributes:attributes}, this.createParameter);
    },

    createParameter:function(){
        this.props.createParameter(this.state.type, this.state.pluginName, this.state.paramName, this.state.attributes);
        this.props.onDismiss();
    },

    render: function(){

        // This is passed via state, context is not working,
        // so we have to get the messages from the global.
        var getMessage = function (id, namespace='pydio_role') {
            return global.pydio.MessageHash[namespace + (namespace ? '.' : '') + id] || id;
        };

        var title, content, actions;
        var params = EditorCache.CACHE['PARAMETERS'];
        if(!params){
            return (<div>Oups: parameters cache is not loaded!</div>);
        }
        var scopeId = this.props.workspaceScope;
        var pluginsFilter = this.props.pluginsFilter || function(){return true;};

        var allParams = {};
        var currentRoleType = this.props.roleType;
        params.forEach(function(data, pluginName){
            if(data.size && pluginsFilter(scopeId, pluginName)){
                var pluginParams = [];
                data.forEach(function(aParam){
                    aParam._type = 'parameter';
                    if(aParam.scope && aParam.scope.indexOf(currentRoleType) !== -1){
                        //console.log('ignoring ' + aParam.label + '? Scope is ' + aParam.scope);
                        return;
                    }
                    pluginParams.push(aParam);
                });
                if(pluginParams.length){
                    allParams[pluginName] = {name:pluginName, params:pluginParams};
                }
            }
        });

        var theActions = EditorCache.CACHE['ACTIONS'];
        var allActions = {};
        theActions.forEach(function(value, pluginName){
            if(value.size && pluginsFilter(scopeId, pluginName)){
                var pluginActions = [];
                value.forEach(function(actionObject, actionName){
                    pluginActions.push({_type:'action', name:actionName,label:actionObject.label?actionObject.label:actionName});
                });
                allActions[pluginName] = {name:pluginName, actions:pluginActions};
            }
        });

        return (
            <div className="picker-list">
                <div className="color-dialog-title">
                    <h3>{getMessage('14')}</h3>
                    <div className="legend">{getMessage('15')}</div>
                </div>
                <ParametersPicker
                    allActions={allActions}
                    allParameters={allParams}
                    onSelection={this.setSelection}
                    getMessage={getMessage}
                />
            </div>
        );

    }

});

