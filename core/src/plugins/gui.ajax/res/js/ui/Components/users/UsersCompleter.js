/*
 * Copyright 2007-2013 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */
import AddressBook from './addressbook/AddressBook'
const {AsyncComponent} = require('pydio/http/resources-manager').requireLib('boot')
const {TextField, AutoComplete, RefreshIndicator, IconButton, Popover} = require('material-ui');
const React = require('react')

const UsersLoader = React.createClass({

    propTypes:{

        renderSuggestion: React.PropTypes.func.isRequired,
        onValueSelected : React.PropTypes.func.isRequired,
        fieldLabel      : React.PropTypes.string.isRequired,
        excludes        : React.PropTypes.array.isRequired,
        usersOnly       : React.PropTypes.bool,
        usersFrom       : React.PropTypes.oneOf(['local', 'remote', 'any']),
        existingOnly    : React.PropTypes.bool,
        freeValueAllowed: React.PropTypes.bool,
        className       : React.PropTypes.string
    },

    getInitialState:function(){
        return {
            dataSource  : [],
            loading     : false,
            searchText  : '',
            minChars    : parseInt(global.pydio.getPluginConfigs("core.conf").get("USERS_LIST_COMPLETE_MIN_CHARS"))
        };
    },

    suggestionLoader:function(input, callback){
        const excludes = this.props.excludes;
        const disallowTemporary = this.props.existingOnly && !this.props.freeValueAllowed;
        this.setState({loading:this.state.loading + 1});
        PydioUsers.Client.authorizedUsersStartingWith(input, function(users){
            this.setState({loading:this.state.loading - 1});
            if(disallowTemporary){
                users = users.filter(function(user){
                    return !user.getTemporary();
                });
            }
            if(excludes && excludes.length){
                users = users.filter(function(user){
                    return excludes.indexOf(user.getId()) == -1;
                });
            }
            callback(users);
        }.bind(this), this.props.usersOnly, this.props.existingOnly);

    },

    textFieldUpdate: function(value){

        this.setState({searchText: value});
        if(this.state.minChars && value && value.length < this.state.minChars ){
            return;
        }
        this.loadBuffered(value, 350);

    },

    loadBuffered: function(value, timeout){

        if(!value && this._emptyValueList){
            this.setState({dataSource: this._emptyValueList});
            return;
        }
        FuncUtils.bufferCallback('remote_users_search', timeout, function(){
            this.setState({loading: true});
            this.suggestionLoader(value, function(users){
                let crtValueFound = false;
                const values = users.map(function(userObject){
                    let component = (<MaterialUI.MenuItem>{this.props.renderSuggestion(userObject)}</MaterialUI.MenuItem>);
                    return {
                        userObject  : userObject,
                        text        : userObject.getExtendedLabel(),
                        value       : component
                    };
                }.bind(this));
                if(!value){
                    this._emptyValueList = values;
                }
                this.setState({dataSource: values, loading: false});
            }.bind(this));
        }.bind(this));

    },


    onCompleterRequest: function(value, index){

        if(index === -1){
            this.state.dataSource.map(function(entry){
                if(entry.text === value){
                    value = entry;
                }
            });
            if(value && !value.userObject && this.props.freeValueAllowed){
                const fake = new PydioUsers.User(value, value, 'user', null, null, true);
                this.props.onValueSelected(fake);
                this.setState({searchText: '', dataSource:[]});
                return;
            }
        }
        if(value && value.userObject){
            const object = value.userObject;
            if(object.getTemporary()){
                if(this.props.freeValueAllowed){
                    this.props.onValueSelected(object);
                }else{
                    this.setState({createUser: object.getLabel()});
                }
            }else{
                this.props.onValueSelected(object);
            }
            this.setState({searchText: '', dataSource:[]});
        }

    },

    onUserCreated: function(newUser){
        this.props.onValueSelected(newUser);
        this.setState({createUser:null});
    },

    onCreationCancelled:function(){
        this.setState({createUser:null});
    },

    openAddressBook:function(event){
        this.setState({
            addressBookOpen: true,
            addressBookAnchor: event.currentTarget
        });
    },

    closeAddressBook: function(){
        this.setState({addressBookOpen: false});
    },

    onAddressBookItemSelected: function(item){
        this.props.onValueSelected(item);
    },

    render: function(){

        const {dataSource} = this.state;
        const containerStyle = {position:'relative', overflow: 'visible'};

        if(this.state.createUser){

            return (
                <div style={containerStyle}>
                    <TextField
                        floatingLabelText={this.props.fieldLabel}
                        value={global.pydio.MessageHash[485] + ' (' + this.state.createUser + ')'}
                        disabled={true}
                        fullWidth={true}
                        underlineShow={!this.props.underlineHide}
                    />
                    <div style={{position: 'absolute', top: 73, left: 0, right: 0, zIndex: 10}}>
                        <AsyncComponent
                            namespace={"PydioForm"}
                            componentName={"UserCreationForm"}

                            newUserName={this.state.createUser}
                            onUserCreated={this.onUserCreated}
                            onCancel={this.onCreationCancelled}
                            pydio={this.props.pydio}
                        />
                    </div>
                </div>
            );

        }

        return (
            <div style={containerStyle}>
                <AutoComplete
                    filter={MaterialUI.AutoComplete.noFilter}
                    dataSource={dataSource}
                    searchText={this.state.searchText}
                    onUpdateInput={this.textFieldUpdate}
                    className={this.props.className}
                    openOnFocus={true}
                    floatingLabelText={this.props.fieldLabel}
                    underlineShow={!this.props.underlineHide}
                    fullWidth={true}
                    onNewRequest={this.onCompleterRequest}
                    listStyle={{maxHeight: 350, overflowY: 'auto'}}
                    onFocus={() => {this.loadBuffered(this.state.searchText, 100)}}
                />
                <div style={{position:'absolute', right:4, bottom: 14, height: 20, width: 20}}>
                    <RefreshIndicator
                        size={20}
                        left={0}
                        top={0}
                        status={this.state.loading ? 'loading' : 'hide' }
                    />
                </div>
                {this.props.showAddressBook &&
                    <AddressBook
                        mode="popover"
                        pydio={this.props.pydio}
                        loaderStyle={{width: 320, height: 420}}
                        onItemSelected={this.onAddressBookItemSelected}
                        usersFrom={this.props.usersFrom}
                    />
                }
            </div>
        );

    }

});

export {UsersLoader as default}