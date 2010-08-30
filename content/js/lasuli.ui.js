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
  
  initViewpointPanel : function()
  {
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
    
  },

  //Auto register all observers
  register: function()
  {
    var logger = Log4Moz.repository.getLogger("lasuli.ui.register");
    for(var func in this)
      if(func.substr(0, 4) == "show")
      {
        logger.debug("registering function: " + func);
        Observers.add("lasuli.ui." + func, lasuli.ui[func], lasuli.ui);
      }
  },
  unregister: function()
  {
    for(var func in this)
      if(func.substr(0, 4) == "show")
        Observers.remove("lasuli.ui." + func, lasuli.ui[func], lasuli.ui);
  },
  
  showViewpoints : function(subject,data)
  {
    var logger = Log4Moz.repository.getLogger("lasuli.ui.showViewpoints");
    logger.debug(subject);
    $('#viewpoints-ul li').hide().remove();
  
    if(subject)
    $.each(subject,function(i,viewpoint){
      $("#viewpoints-ul").append("<li uri='" + viewpoint.id + "'><img src='css/blitzer/images/delete.png' class='icon-remove-viewpoint'><a>"
                                 + viewpoint.name + "</a></li>");
    });
  }
}

function showMessage(title, content, callback)
{
  title = (title) ? title : "Information";
  $("#ui-dialog-title-message-dialog").html(title);
  $("#message").html(content);
  if(callback)
  {
    $("#message-dialog").dialog('destroy');
    var i18nButtons = {};
    i18nButtons[_('Cancel')] = function() { $(this).dialog('close');  };
	  i18nButtons[_('Okay')] = function() { $(this).dialog('close');  callback();  };
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
}

$(window).bind("load", function(){
  lasuli.ui.register();
  lasuli.ui.initTabs();
  lasuli.ui.initViewpointPanel();
});

$(window).bind("unload", function(){
  lasuli.ui.unregister();
});