export default {

    propTypes:{
        showCloseAction:React.PropTypes.bool,
        onCloseAction:React.PropTypes.func
    },

    focusItem:function(){
        this.setState({focus:true});
    },

    blurItem:function(){
        this.setState({focus:false});
    },

    mergeStyleWithFocus:function(){
        return {...this.props.style, zIndex: this.state.focus ? 1 : null};
    },

    getInitialSate:function(){
        return {focus:false, showCloseAction: false};
    },

    toggleEditMode: function(value = undefined){
        if(value === undefined){
            this.setState({showCloseAction:!(this.state && this.state.showCloseAction)});
        }else{
            this.setState({showCloseAction:value});
        }
    },

    getCloseButton:function(){
        if(this.state && this.state.showCloseAction){
            const closeAction = this.props.onCloseAction || ()=>{};
            const overlayStyle = {
                position:'absolute',
                backgroundColor:'rgba(0,0,0,0.53)',
                zIndex:10,
                top:0,
                left:0,
                bottom:0,
                right:0,
                display:'flex',
                alignItems:'center',
                justifyContent:'center'
            };
            return(
                <div style={overlayStyle}>
                    <MaterialUI.FlatButton
                        label={pydio.MessageHash['ajxp_admin.home.48']}
                        className="card-close-button"
                        onTouchTap={closeAction}
                        style={{color:'white'}}
                    >
                    </MaterialUI.FlatButton>
                </div>
            );
        }else{
            return null;
        }
    },

    statics:{
        getGridLayout:function(x, y){
            return {
                x:x||0,
                y:y||0,
                w:this.gridWidth || 4,
                h:this.gridHeight || 12,
                isResizable:false
            };
        },
        hasBuilderFields:function(){
            return this.builderFields?true:false;
        },
        getBuilderFields:function(){
            return this.builderFields;
        }
    }

};
