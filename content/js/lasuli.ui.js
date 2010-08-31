include("resource://lasuli/modules/Observers.js");
  
lasuli.ui = {
  initTabs : function()
  {
    $tabs = $('#tabs').tabs({
      tabTemplate: '<li><a href="#{href}" class="tab-viewpoint">#{label}</a> <span class="ui-icon ui-icon-close">Remove Tab</span></li>',
      selected:0,
      add: function(event, ui) {
        $(ui.panel).append('' + ui.panel.id);
      },
      remove: function(event, ui)
      {
        //debug(ui.panel.id);
        if($('#' + ui.panel.id))
          $('#' + ui.panel.id).remove();
      }
    });
    
    $tabs.bind('tabsselect', function(event, ui) {
      //jsHighLighter.removeHighlighter();
      if($(ui.tab).hasClass("tab-add"))
      {
      }
    });
  },
  
  initDocumentPanel : function(){
    var browsingUrl = "http://cassandre/text/d0";
    Observers.notify("lasuli.core.actionLoadDocument", browsingUrl);
  },
  
  initViewpointPanel : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.listViewpoints");
    $('#btn-create-viewpoint').button({
			label: 'Create',
			icons: {
				primary: 'ui-icon-circle-plus'
			}
		});
		var resizeInput = function(){
		  $('div#create-viewpoint input').width( $('#tabs').innerWidth() - 130);
		};
		//Resize the input box
		$(window).resize(resizeInput);
		resizeInput();
		
		//Bind the button to create the viewpoint
		$('div#create-viewpoint button').click(function(){
		  var viewpointName = $.trim($(this).prev().val());
		  if(viewpointName == "")
		  {
		    alert("viewpoint name cannot be null");
		    return false;
		  }
		  logger.debug("Create viewpoint button click.\nViewpoint name:" + viewpointName);
		  Observers.notify("lasuli.core.actionCreateViewpoint", viewpointName);
		});
		
		//Noticy the core to load all viewpoints.
		Observers.notify("lasuli.core.actionListViewpoints", null);
		
		//When click enter key also create viewpoint
		$('#txtViewpoint').keyup(function(event){
      if (event.keyCode == 13)
        $('#btn-create-viewpoint').trigger('click');
    });
    
		$('#viewpoints-ul li').live('mouseover', function(){
      $(this).find("img").stop().animate({opacity: 1}, 250);
      //$(this).stop().animate({marginLeft : -26}, 250);
    });
    $('#viewpoints-ul li').live('mouseout', function(){
      $(this).find("img").stop().animate({opacity: 0}, 250);
      //$(this).stop().animate({marginLeft : 0}, 250);
    });
    //Click the trash icon to delete a viewpoint
    $('.icon-remove-viewpoint').live('click', function(){
      var viewpointID = $(this).parent().attr('id');
      var viewpointName = $(this).next().text();
      var message = {};
      message.title = _("Warning");
      message.content = _("delete.viewpoint.warning", [viewpointName]);
      message.callback = function() {
        Observers.notify("lasuli.core.actionDestroyViewpoint", viewpointID);
      };
      Observers.notify("lasuli.ui.showMessage", message);
    });
  },
  
  initAttributeGrid : function(){
    $('#attribute-delete').button({
			label: _('delete'),
			icons: {
				primary: 'ui-icon-minus'
			}
		});
		$('#attribute-add').button({
			label: _('new'),
			icons: {
				primary: 'ui-icon-plus'
			}
		});
		$('#attribute-modify').button({
			label: _('modify'),
			icons: {
				primary: 'ui-icon-comment'
			}
		});
		
		$("#gird-attribute").jqGrid({
      url: "#",
      datatype: "local",
      height: "100%",
      colNames:[_('name'),_('value')],
      colModel:[
           {name:'name',index:'name',editable:true},
           {name:'value',index:'value',editable:true}    
         ],
      sortname: 'name',
      viewrecords: true,
      sortorder: "desc",
      multiselect: false,
      cellsubmit: 'clientArray',
      /*ondblClickRow: function(id){
        if(id && id!==lastsel){
          jQuery('#gird-attribute').jqGrid('restoreRow',lastsel);
          jQuery('#gird-attribute').jqGrid('editRow',id, true, false, false, 'clientArray');
          lastsel=id;
        }
      },
      afterSaveCell : function(rowid,name,val,iRow,iCol) {
        alert("a");
      },*/
      caption: _("attributes")
    });
  },  
  //Auto register all observers
  register: function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.register");
    for(var func in this)
      if(func.substr(0, 4) == "show")
      {
        //logger.debug("registering function: " + func);
        Observers.add("lasuli.ui." + func, lasuli.ui[func], lasuli.ui);
      }
  },
  unregister: function(){
    for(var func in this)
      if(func.substr(0, 4) == "show")
        Observers.remove("lasuli.ui." + func, lasuli.ui[func], lasuli.ui);
  },
  
  showMessage : function(subject, data){
    var msgTitle = (typeof(subject.title) == "string") ? subject.title : "Information";
    $("#message").html(subject.content);
    if(subject.callback)
    {
      $("#message-dialog").dialog('destroy');
      var i18nButtons = {};
      i18nButtons[_('Cancel')] = function() { $(this).dialog('close');  };
  	  i18nButtons[_('Okay')] = function() { $(this).dialog('close');  subject.callback();  };
      $("#message-dialog").dialog({
        autoOpen: true,
        modal: true,
        width: 150,
        buttons: i18nButtons
      });
    }
    else
    {
    	var i18nButtons = {};
      i18nButtons[_('Okay')] = function() { $(this).dialog('close');  };
      $("#message-dialog").dialog('destroy');
      $("#message-dialog").dialog({
        bgiframe: true,
        autoOpen: true,
        modal: true,
        width: 150,
        buttons: i18nButtons
      });
    }
    $("#ui-dialog-title-message-dialog").html(msgTitle);
  },
  
  showViewpoints : function(subject,data){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.showViewpoints");
    logger.debug(subject);
    $('#viewpoints-ul li').hide().remove();
  
    if(subject)
    $.each(subject,function(i,viewpoint){
      $("#viewpoints-ul").append("<li id='" + viewpoint.id + "'><img src='css/blitzer/images/delete.png' class='icon-remove-viewpoint'><a>"
                                 + viewpoint.name + "</a></li>");
    });
  },
  
  showUsers : function(users){
    $("#actors ul li").hide().remove();
    if(!users) return;
    users.sort();
    for(var i=0, user; user = users[i]; i++)
    {
      var content = "<li class='actor'><a uri='" + user + "'>" + user + "</a></li>";
      $("#actors ul").append(content);
    }
  },
  
  showItemName : function(itemName){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.showItemName");
    logger.debug(itemName);
    if(!itemName) itemName = _("no.name");
    $("#h3-entity-name").html(itemName);
  },
  
  showAttributes : function(attributes)
  {
  }
}


$(window).bind("load", function(){
  lasuli.ui.register();
  lasuli.ui.initTabs();
  lasuli.ui.initViewpointPanel();
  lasuli.ui.initDocumentPanel();
  lasuli.ui.initAttributeGrid();
});

$(window).bind("unload", function(){
  lasuli.ui.unregister();
});