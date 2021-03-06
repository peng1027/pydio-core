const PydioApi = require('pydio/http/api')
const PathUtils = require('pydio/util/path')

export default function (pydio) {

    return function(){
        const userSelection = pydio.getUserSelection();
        if(!pydio.Parameters.get('multipleFilesDownloadEnabled')){
            return;
        }

        let zipName;
        if(userSelection.isUnique()){
            zipName = PathUtils.getBasename(userSelection.getUniqueFileName());
            if(!userSelection.hasDir()) zipName = zipName.substr(0, zipName.lastIndexOf("\."));
        }else{
            zipName = PathUtils.getBasename(userSelection.getContextNode().getPath());
            if(zipName == "") zipName = "Archive";
        }
        let index=1, buff = zipName;
        while(userSelection.fileNameExists(zipName + ".zip")){
            zipName = buff + "-" + index; index ++ ;
        }

        pydio.UI.openComponentInModal('PydioReactUI', 'PromptDialog', {
            dialogTitleId:313,
            legendId:314,
            fieldLabelId:315,
            defaultValue:zipName + '.zip',
            defaultInputSelection: zipName,
            submitValue:function(value){
                PydioApi.getClient().postSelectionWithAction('compress', null, null, {archive_name:value});
            }
        });

    }

}