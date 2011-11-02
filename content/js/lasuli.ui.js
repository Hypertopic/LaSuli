include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Sync.js");
include("resource://lasuli/modules/Preferences.js");

lasuli.ui = {
  initTabs : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.initTabs");
    $tabs = $('#tabs').tabs({
      tabTemplate: '<li><a href="#{href}" class="tab-viewpoint">#{label}</a> <span class="ui-icon ui-icon-close">Remove Tab</span></li>',
      selected:0,
      add: function(event, ui) {
        logger.trace(ui);
        var viewpointPanelHtml = '<div class="viewpoint-header"><p class="h3-title viewpoint-name"><span>ViewpointName</span></p><button class="viewpoint-modify">' + _("view")  + '</button></div>'
                               + '<div class="viewpoint-content"><div class="topics" ><p class="h3-title"><span>' + _("Index") + '</span></p>'
                          		 + '<ul class="topics-ul"></ul></div>'
                          		 + '<div class="fragments-container"><p class="h3-title"><span>' + _("Analysis") + '</span></p></div></div>'
                          		 + '<div class="topic-tree hide"></div>';
        $(ui.panel).append(viewpointPanelHtml);
        
        $('button.viewpoint-modify').button({ icons: { primary: "ui-icon-locked"} }).click(function(){
          var logger = Log4Moz.repository.getLogger("lasuli.ui.viewpointpanel.modify");
          var content = $(this).parent().next();
          var btn = $(this);
          btn.button("option", "disabled", true);
          if($(this).button("option", "label") == _('modify'))
          {
            dispatch("lasuli.ui.doUpdateViewpointName", null);
            dispatch("lasuli.ui.doHideEmptyAnalysis", null);
            content.slideDown({duration: 500, easing: 'easeInBounce', 
              complete: function() {
                $(this).next().slideUp({duration: 400, easing: 'easeOutBounce', complete: function(){
                  btn.button("option", "label", _('view'));
                  btn.button("option", "disabled", false);
                  btn.button("option", "icons", { primary: "ui-icon-locked"});
                  $(this).html('');
                }});
              }
            });
          }
          else
          {
            dispatch("lasuli.ui.doShowViewpointInput", null);
            dispatch("lasuli.ui.doShowTreePanel", null);
            content.slideUp({duration: 100, easing: 'easeInOutBack', 
              complete: function() {
                  $(this).next().slideDown({duration: 800, easing: 'easeOutBounce', complete: function(){
                  btn.button("option", "label", _('modify'));
                  btn.button("option", "disabled", false);
                  btn.button("option", "icons", { primary: "ui-icon-unlocked"});
                }});
              }
            });
            
          }
        });
      },
      remove: function(event, ui)
      {
        //logger.trace(ui);
        if($('#' + ui.panel.id))
          $('#' + ui.panel.id).remove();
      }
    });

    $tabs.bind('tabsselect', function(event, ui) {
      var logger = Log4Moz.repository.getLogger("lasuli.ui.initTabs.tabsselect");
      //logger.trace($(ui.tab).attr("class"));

      if($(ui.tab).hasClass("tab-viewpoint"))
      {
        var viewpointID = $(ui.tab).attr("href").substr(1);
        var viewpoint = {};
        viewpoint.id = viewpointID;
        viewpoint.name = $(ui.tab).html();
        dispatch("lasuli.ui.doShowViewpointName", viewpoint);
        _p(30);
        dispatch("lasuli.ui.doClearViewpointPanel", viewpointID);
        _p(50);
        dispatch("lasuli.core.doLoadKeywords", viewpointID);
        _p(70);
        dispatch("lasuli.core.doLoadFragments", viewpointID);
        _p(100);
      }
      else
        dispatch('lasuli.contextmenu.doHide', null);

      if($(ui.tab).hasClass("tab-document"))
      {
        dispatch("lasuli.core.doLoadDocument", null);
      }
      if($(ui.tab).hasClass("tab-add"))
      {
        //logger.trace("lasuli.core.doListViewpoints");
        dispatch("lasuli.core.doListViewpoints", null);
        dispatch('lasuli.highlighter.doClear', null);
      }
      $("div.ui-tabs-panel").height($(window).height() - $('ul.ui-tabs-nav').outerHeight() - 56);
      $("#config-panel").height($(window).height() - 56);
    });

    $('#tabs span.ui-icon-close').die().live('click', function() {
      var index = $('li',$tabs).index($(this).parent());
      $tabs.tabs('remove', index);
      return false;
    });

    $(window).bind('resize', function() {
      var logger = Log4Moz.repository.getLogger("lasuli.ui.initTabs.window.resize");
      //logger.debug($('.toolbar').innerWidth());
      $("div.ui-tabs-panel").height($(window).height() - $('ul.ui-tabs-nav').outerHeight() - 56);
      $("#config-panel").height($(window).height() - 56);
    }).trigger('resize');

    $('#h3-related-topics').html(_('topics'));
    $('#h3-actors').html(_('users'));
    $('#tab-document-title').html(_('document'));
    $('#span-viewpoint-list').html(_('viewpoints'));
    $('#config').bind('click', lasuli.ui.initConfigPanel);
    $('#config-panel button.ok').button({ icons: { primary: "ui-icon-check" }}).bind('click', lasuli.ui.doSaveConfiguration);
    $('#config-panel button.add').button({ icons: { primary: "ui-icon-plusthick" }}).bind('click', lasuli.ui.doAddServerField);
    $('#config-panel button.delete').live('click', lasuli.ui.doRemoveServerField);
  },

	initConfigPanel: function(){
		$('#tabs').slideToggle({duration: 500, easing: 'easeInSine', complete: function(){
			$('#config-panel').slideToggle({duration: 500, easing: 'easeInSine', complete: function(){
				if($('#config-panel').css('display') != 'block') return false;
				//Remove all none related panel
				$('#config-panel').find('fieldset[id!="default-server"]').remove();
				var servers = Preferences.get("extensions.lasuli.setting",JSON.stringify(new Array()));
				//alert(servers);
      	if(typeof(servers) == "string") servers = JSON.parse(servers);
				for(var i=0, server; server = servers[i]; i++)
    		if(server.default === true)
    		{
    			$('#default-server input.url').val(server.url);
    			$('#default-server input.user').val(server.user);
    			$('#default-server input.pass').val(server.pass);
    		}
    		else
    		{
    			$field = lasuli.ui.doAddServerField();
    			$field.find('input.url').val(server.url);
    			$field.find('input.user').val(server.user);
    			$field.find('input.pass').val(server.pass);
    		}		
				}});
			}
		});
	},
	
  initDocumentPanel : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.initDocumentPanel");
    //logger.trace("initDocumentPanel");
    //var browsingUrl = "http://cassandre/text/d0";
    dispatch("lasuli.core.doLocationChange", null);
  },

  initPlusPanel : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.initPlusPanel");
    $('#btn-create-viewpoint').button({
			label: _('Create'),
			icons: {
				primary: 'ui-icon-circle-plus'
			}
		}).click(function(){
		  var viewpointName = $.trim($(this).prev().val());
		  if(viewpointName == "")
		  {
		    var message = {"title": _("Warning"), "content": _('create.viewpoint.warning')};
		    dispatch("lasuli.ui.doShowMessage", message);
		    return false;
		  }
		  //logger.trace("Create viewpoint button click.\nViewpoint name:" + viewpointName);
		  dispatch("lasuli.core.doCreateViewpoint", viewpointName);
		});

		var resizeInput = function(){
		  $('div#create-viewpoint input').width( $('#tabs').innerWidth() - 130);
		};
		//Resize the input box
		$(window).resize(resizeInput);
		resizeInput();

    $('#txtViewpoint').focus(function(){ $(this).select(); });

		//When click enter key also create viewpoint
		$('#txtViewpoint').keyup(function(event){
      if (event.keyCode == 13)
        $('#btn-create-viewpoint').trigger('click');
    });

		$('#viewpoints-ul li').live('mouseover', function(){
      $(this).find("img").stop().animate({opacity: 1}, 250);
      return false;
    });
    $('#viewpoints-ul li').live('mouseout', function(){
      $(this).find("img").stop().animate({opacity: 0}, 250);
      return false;
    });
    //Click the trash icon to delete a viewpoint
    $('.icon-remove-viewpoint').die().live('click', function(){
      var viewpointID = $(this).parent().attr('uri');
      var viewpointName = $(this).next().text();
      var message = {};
      message.title = _("Warning");
      message.content = _("delete.viewpoint.warning", [viewpointName]);
      message.callback = function() {
        dispatch("lasuli.core.doDestroyViewpoint", viewpointID);
      };
      dispatch("lasuli.ui.doShowMessage", message);
      return false;
    });
    $('#viewpoints-ul li a').die().live('click', function(){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.initPlusPanel.viewpoint.click");
      var viewpointID = $(this).parent().attr("uri");
      var viewpointName = $(this).text();
      var viewpoints = new Array({"id": viewpointID, "name": viewpointName});
      //logger.trace(viewpoints);
      dispatch("lasuli.ui.doShowViewpointPanels", viewpoints);
      return false;
    });
  },

  initViewpointPanel : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.initViewpointPanel");

    //Mouse over the tag shows the trash icon
    $(".topic").live("mouseover", function(){
      $(this).find("img").removeClass("hide");
      return false;
    }).live("mouseout", function(){
      $(this).find("img").addClass("hide");
      return false;
    });

    //Edit in place of a tag
    $(".topic a").die().live("click", function(event){
      var el = $(this);

      //Save the content for future restore it back
      var container = $('ul.topics-ul');
      container.data("topicName", $(this).html());
      container.data("topicID", $(this).attr("uri"));

      el.replaceWith("<input type='text' class='edit-in-place' value=''>");
      var in_element = container.find("input");
      in_element.val(container.data("topicName"));
      in_element.focus().select();

      in_element.blur(function(){
        var topicID = container.data("topicID");
        //var_dump("[UI.init.js] edit in place topic name", uri, 4);
        var viewpointID = $(this).parents('.ui-tabs-panel').attr("id");
        var topicName = container.data("topicName");
        var topicNewName = $(this).val();
        dispatch("lasuli.core.doRenameKeyword", {"viewpointID":viewpointID, "topicID":topicID, "name": topicName, "newName": topicNewName});
        return false;
      });

      in_element.keyup(function(event){
        if (event.keyCode == 27)
        {
          $(this).replaceWith("<a uri='" + container.data("topicID") + "'>" + container.data("topicName") + "</a>");
        }
        if (event.keyCode == 13)
        {
          $(this).blur();
        }
      });

      event.stopImmediatePropagation();
      return false;
    });


    //Topic side icon click
    $(".fragment-toggle").die().live('click', function(event){
      if($(this).attr('src').indexOf('toggle-close.png') > 0)
      {
        $(this).parent().next().slideUp({duration: 1000, easing: 'easeOutBounce'});
        $(this).attr('src','css/blitzer/images/toggle-open.png');
        return false;
      }
      if($(this).attr('src').indexOf('toggle-open.png') > 0)
      {
        $(this).parent().next().slideDown({duration: 600, easing: 'easeInBounce'});
        $(this).attr('src','css/blitzer/images/toggle-close.png');
        return false;
      }
    });

    $("li.fragment").live("mouseover", function(){
      $(this).find("span.ui-icon").removeClass("ui-icon-arrowthick-2-n-s").addClass("ui-icon-trash");
    });

    $("li.fragment").live("mouseout", function(){
      $(this).find("span.ui-icon").removeClass("ui-icon-trash").addClass("ui-icon-arrowthick-2-n-s");
    });

    $("li.fragment em.fragment-text").live("click", function(){
      var fragmentID = $(this).parent().attr("fragmentID");
      dispatch("lasuli.highlighter.doScrollTo", fragmentID);
      return false;
    });

    //Delete fragment
    $("li.fragment span.ui-icon-trash").live("click", function(){
      var fragmentID = $(this).parent().attr("fragmentID");
      var viewpointID = $(this).parent().attr("viewpointID");
      var topicID = $(this).parent().attr("topicID");
      var itemID = $(this).parent().attr("itemID");
      dispatch("lasuli.core.doDestroyFragment", {"fragmentID": fragmentID, "viewpointID": viewpointID, "topicID": topicID});
      return false;
    });


    //Edit analysis topic
    $('.fragment-header span').die().live('click', function(event){
      var divContainer = $(this).parent();
      var originalSpan = $(this).clone();
      var originalTopicName = $(this).text();
      var img = $(this).prev();
      var originalImage = img.attr('src');
      //img.attr('src','css/blitzer/images/delete.png');
      //var_dump("[UI.init.js] fragment header edit", $(this).html(), 4);
      $(this).replaceWith("<input type='text' class='edit-in-place' value=''>");
      var in_element = divContainer.find("input");
      in_element.val(originalSpan.html());
      in_element.focus().select();

      in_element.blur(function(){
        var viewpointID = divContainer.attr("viewpointID");
        var topicID = divContainer.attr("topicID");
        var newName = $(this).val();

        if(newName == originalTopicName)
        {
          //Sleep 500ms for capture the click on the delete icon
          Sync.sleep(500);
          dispatch("lasuli.ui.doRestoreAnalysis", {
            "viewpointID": viewpointID, "topicID": topicID, "name": originalTopicName,
            "newName": newName, "originalSpan": originalSpan, "originalImage": originalImage});
        }
        else
          dispatch("lasuli.core.doRenameAnalysis", {
            "viewpointID": viewpointID, "topicID": topicID, "name": originalTopicName,
            "newName": newName, "originalSpan": originalSpan, "originalImage": originalImage});
      });
      in_element.keyup(function(event){
        if (event.keyCode == 27)
        {
          $(this).replaceWith(originalSpan);
          setTimeout("restoreImg('" + originalImage + "');", 500);
        }
        if (event.keyCode == 13)
          $(this).blur();
      });
      event.stopImmediatePropagation();
      return false;
    });
  },

  initAttributeGrid : function(){
    var attributesDialogButtons = {};
  	attributesDialogButtons[_('Okay')] = function() {
  	  var bValid = true;
      $('#attribute-name').removeClass('ui-state-error');
      $('#attribute-value').removeClass('ui-state-error');
      var attributeName = $('#attribute-name').val();
      var attributeValue = $('#attribute-value').val();
      if ( attributeName.length == 0)
      {
        $('#attribute-name').addClass('ui-state-error');
        bValid = false;
      }

      if ( attributeValue.length == 0)
      {
        $('#attribute-value').addClass('ui-state-error');
        bValid = false;
      }

      if (bValid) {
        var attribute = {"name": attributeName, "value": attributeValue};
        dispatch("lasuli.core.doCreateAttribute", attribute);
        $('#attribute-dialog').dialog('close');
      }
    };

    $("#attribute-dialog").dialog({
      bgiframe: true,
      autoOpen: false,
      modal: true,
      width: 170,
      title: _("add.attribute.dialog.title"),
      buttons: attributesDialogButtons,
      open: function(){
        $('#attribute-name').val('').focus().select();
        $('#attribute-value').val('');
      },
      close: function()
      {
        $('#attribute-name').removeClass('ui-state-error');
        $('#attribute-value').removeClass('ui-state-error');
      }
    });

    $('#attribute-name').keyup(function(event){
      if (event.keyCode == 13)
        $('#attribute-value').focus().select();
    });
    $('#attribute-value').keyup(function(event){
      if (event.keyCode == 13)
      {
        var buttons = $('#attribute-dialog').dialog('option','buttons');
        if(typeof(buttons[_('Okay')]) == "function")
          buttons[_('Okay')].call();
      }
    });

    //If the jqGrid script isn't loaded yet.
    while(!("jqGrid" in $("#attribute-grid")))
      Sync.sleep(10);

		$("#attribute-grid").jqGrid({
      url: "#",
      datatype: "local",
      height: "100%",
      width: "98%",
      colNames:[_('name'),_('value')],
      colModel:[
           {name:'name', index:'name',editable:true},
           {name:'value', index:'value',editable:true}
         ],
      sortname: 'name',
      viewrecords: true,
      sortorder: "desc",
      multiselect: false,
      cellsubmit: 'clientArray',
      toolbar: [true, "bottom"],
      caption: _("attributes")
    });
    $(window).bind('resize', function() {
        $("#attribute-grid").setGridWidth($('#tabs').innerWidth() - 38);
    }).trigger('resize');
    //initial toolbar
    $('#t_attribute-grid').html("<button id='attribute-del'></button><button id='attribute-modify' class='hide'></button><button id='attribute-add'></button>");
    $('#attribute-add').button({
			text: false,
			icons: {
				primary: 'ui-icon-plus'
			}
		}).click(function(){ $('#attribute-dialog').dialog('open'); });

		//Delete selected attribute
		$('#attribute-del').button({
			text: false,
			icons: {
				primary: 'ui-icon-trash'
			}
		}).click(function(){
		  var gr = $("#attribute-grid").jqGrid('getGridParam','selrow');
      if( gr != null )
      {
        var data = $("#attribute-grid").jqGrid('getRowData',gr);
        var attribute = {"name": data.name, "value": data.value};
        dispatch("lasuli.core.doDestroyAttribute", attribute);
      }
      else
      {
        var message = {};
        message.title = _("Warning");
        message.content = _("no.attribute.selected");
        dispatch("lasuli.ui.doShowMessage", message);
      }
		});
  },

  initTagCloud : function(){
    $("#tags").contextMenu({
        menu: "tagcloudContextMenu"
    },
    function(action, el, pos)
    {
      switch(action)
      {
        case "tagcloudSwitcher":
          if($("#tags ul").hasClass("alt"))
            $("#tags ul").hide().removeClass("alt").fadeIn("fast");
          else
            $("#tags ul").hide().addClass("alt").fadeIn("fast");
          return;
        case "tagcloudSortAlphabetically":
          if($(".tagcloudSortAlphabetically").data("desc"))
          {
            $("#tags ul li").tsort({order:"desc"});
            $(".tagcloudSortAlphabetically").data("desc", false);
          }
          else
          {
            $(".tagcloudSortAlphabetically").data("desc", true);
            $("#tags ul li").tsort({order:"asc"});
          }
          return;
        case "tagcloudSortByStrength":
          if($(".tagcloudSortByStrength").data("desc"))
          {
            $(".tagcloudSortByStrength").data("desc", false);
            $("#tags ul li").tsort({order:"asc",attr:"class"});
          }
          else
          {
            $(".tagcloudSortByStrength").data("desc", true);
            $("#tags ul li").tsort({order:"desc",attr:"class"});
          }
          return;
      }
    });
  },

  initItemName : function(){
    //Edit in place of a tag
    $("h3#h3-entity-name").die().live("click", function(event){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.initItemName");
      var itemName = $(this).html();
      $('div#tabs-document').data('itemName', itemName);
      //logger.trace(itemName);
      $(this).replaceWith("<input type='text' class='edit-itemname-in-place' value=''>");
      $("input.edit-itemname-in-place").val(itemName).focus().select();
  
      $("input.edit-itemname-in-place").blur(function(){
        var logger = Log4Moz.repository.getLogger("lasuli.ui.initItemName.blur");
        var name = $('div#tabs-document').data('itemName');
        var newName = $(this).val();
        //logger.trace(name + "," + newName);
        if(name == newName){
          dispatch("lasuli.ui.doShowItemName", name);
          $('div#tabs-document').data('itemName', null)
        }
        else
          dispatch("lasuli.core.doRenameItem", {"name": name, "newName": newName});
        event.stopImmediatePropagation();
        return false;
      });
  
      $("input.edit-itemname-in-place").keyup(function(event){
        //var logger = Log4Moz.repository.getLogger("lasuli.ui.initItemName.keyup");
        if (event.keyCode == 27)
        {
          dispatch("lasuli.ui.doShowItemName", $('div#tabs-document').data('itemName'));
          $('div#tabs-document').data('itemName', null)
        }
        if(event.keyCode == 13)
        {
          //logger.trace(event.keyCode);
          $(this).blur();
        }
        return false;
      });
      event.stopImmediatePropagation();
      return false;
    });
  },
  
  //Auto register all observers
  register: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do" && typeof(lasuli.ui[func]) == "function")
        Observers.add("lasuli.ui." + func, lasuli.ui[func], lasuli.ui);
  },
  
  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do" && typeof(lasuli.ui[func]) == "function")
        Observers.remove("lasuli.ui." + func, lasuli.ui[func], lasuli.ui);
  },

  doBlockUI : function(){
    $('div#overlay-div').removeClass('hide');
  },

  doUnBlockUI : function(){
    $('div#overlay-div').addClass('hide');
  },

	doAddServerField : function(){
		var str = '<fieldset>';
		str += '<legend>Service Hypertopic</legend>';
		str += '<p><label>URL : <input type="text" class="url" type="url" size="29"/></label></p>';
		str += '<p><label>Utilisateur : <input type="text" class="user" size="25"/></label></p>';
		str += '<p><label>Mot de passe : <input type="password" class="pass" size="23"/></label></p>';
		str += '<div align="right"><button class="delete" type="button">Supprimer</button></div>';
		str += '</fieldset>';
		
		return $(str).insertBefore('#config-toolbar').find('button').button({ icons: { primary: "ui-icon-closthick" }}).parents('fieldset');
	},
	
	doRemoveServerField : function(){
		$(this).parents('fieldset').hide().remove();
	},
	
	doSaveConfiguration : function(){
		var servers = [];
		var defaultServer = false;
		$('#config-panel').find('fieldset').each(function(){
			var server = {};
			server.url = $(this).find('input.url').val();
			server.user = $(this).find('input.user').val();
			server.pass = $(this).find('input.pass').val();
			
			if($(this).attr('id') == 'default-server')
			{
				if(server.url != ''){
					server.default = true;
					defaultServer = true;
					servers.push(server);
				}
			}
			else
				if(server.url != '')
					servers.push(server);
				else
					$(this).remove();
		});
		
		if(!defaultServer)
		{
	    dispatch("lasuli.ui.doShowMessage", {"title": _("Error"), "content": _('options.error.nodefaultserver')});
	    return false;
		}

		Preferences.set("extensions.lasuli.setting",JSON.stringify(servers));
		self.location.reload();
	},
	
	doOpenConfigPanel : function(){
		this.initConfigPanel();
	},
	
	doHideEmptyAnalysis : function(viewpointID){
	  var logger = Log4Moz.repository.getLogger("lasuli.ui.doHideEmptyAnalysis");
	  viewpointID = viewpointID || $('div#tabs li.ui-tabs-selected a').attr('href').substr(1);
	  logger.trace(viewpointID);
    var viewpointDiv = $('div#' + viewpointID);
    logger.trace(viewpointDiv.html());
    var fragmentDivs = viewpointDiv.find('.fragments');
    logger.trace(fragmentDivs.length);
    if(fragmentDivs.length == 0 ) return false;
    fragmentDivs.each(function(){
      logger.trace($(this).html());
      if($(this).find('li').length > 0)
        $(this).show();
      else
        $(this).hide();
    });
	},
	
	doShowViewpointInput : function(viewpointID){
	  var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowViewpointInput");
    viewpointID = viewpointID || $('div#tabs li.ui-tabs-selected a').attr('href').substr(1);
    var viewpointDiv = $('div#' + viewpointID);
    var originalHtml = viewpointDiv.find('p.viewpoint-name').html();
    var viewpointName = viewpointDiv.find('p.viewpoint-name span').html();
    var input = $('<input type="text" class="edit-viewpoint-name-in-place">')
                .val(viewpointName)
                .attr("viewpointName", viewpointName)
                .data("html", originalHtml);
    viewpointDiv.find('p.viewpoint-name span').replaceWith(input);
	},
	
	doUpdateViewpointName : function(viewpointID){
	  var logger = Log4Moz.repository.getLogger("lasuli.ui.doUpdateViewpointName");
    viewpointID = viewpointID || $('div#tabs li.ui-tabs-selected a').attr('href').substr(1);
    var viewpointDiv = $('div#' + viewpointID);
    var input = viewpointDiv.find('input.edit-viewpoint-name-in-place');
    var newName = input.val(),
        oldName = input.attr("viewpointName"),
        originalHtml = input.data('html');
    viewpointDiv.find('p.viewpoint-name input').replaceWith(originalHtml);
    if(input.val() == input.attr("viewpointName"))
      return false;
    dispatch("lasuli.core.doRenameViewpoint", {"viewpointID": viewpointID, "newName": newName});
	},
	
  doShowItemName : function(itemName){
    if(!itemName) itemName = _("no.name");
    if($("input.edit-itemname-in-place").length > 0)
      $("input.edit-itemname-in-place").replaceWith('<h3 id="h3-entity-name"></h3>');

    $("#h3-entity-name").text(itemName);
  },

  doCloseViewpointPanel : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doCloseViewpointPanel");
    //If the viewpointID is specificed, then only close one viewpoint panel.
    if(viewpointID)
    {
      var el = "div#tabs ul li a[href='#" + viewpointID + "']";
      //logger.trace(el);
      $(el).next('span').click();
    }
    else
    {
      //Close all viewpoint panel
      var el = "div#tabs ul li a.tab-viewpoint";
      $(el).next('span').click();
      //Open the first tab panel
      $tabs.tabs('option', 'selected', 0);
    }
    $('#topic-tree-dialog').dialog('close');
  },

  doShowMessage : function(subject, data){
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

  doShowViewpoints : function(viewpoints){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowViewpoints");
    $('#viewpoints-ul li').hide().remove();
    for(var viewpointID in viewpoints)
      $("#viewpoints-ul").append("<li uri='" + viewpointID + "'><img src='css/blitzer/images/delete.png' class='icon-remove-viewpoint'><a>"
                                   + viewpoints[viewpointID] + "</a></li>");
  },

  doShowUsers : function(users){
    $("#actors ul li").hide().remove();
    if(!users) return;
    users.sort();
    for(var i=0, user; user = users[i]; i++)
    {
      var content = "<li class='actor'><a uri='" + user + "'>" + user + "</a></li>";
      $("#actors ul").append(content);
    }
    $("li.actor a").click(function(){
      var user = $(this).attr("uri");
      dispatch("lasuli.core.doOpenViewpointByUser", user);
      return false;
    });
  },

  doShowAttributes : function(attributes){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowAttributes");
    //logger.trace(attributes);
    $("#attribute-grid").jqGrid('clearGridData');
    if(!attributes) return false;
    var index = 1;
    for(var name in attributes)
      for(var j=0, v; v = attributes[name][j]; j++)
      {
        //logger.trace({"name": name, "value": v});
        $("#attribute-grid").addRowData(index, {"name": name, "value": v});
        index++;
      }
  },

  doShowTagCloud : function(tags){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowTagCloud");
    //logger.trace(tags);
    $("#tags ul li").hide().remove();
    if(!tags) return false;

    var max = 0;
    var min = 32768;
    for(var name in tags)
    {
      if(tags[name].size > max) max = tags[name].size;
      if(tags[name].size < min) min = tags[name].size;
    }
    //var_dump("UI.init.js", "max:" + max + ", min:" + min, 4);
    for(var name in tags)
    {
      var size = Math.round((tags[name].size - min) / (max-min) * 4) + 1;
      //var_dump("UI.init.js", "topics[name].length:" + topics[name].length, 4);
      var content = "<li class='tag" + size + "'><a>" + name + "</a></li>";
      $("#tags ul").append(content);
    }
    $(".tagcloudSortAlphabetically").data("desc", true);
    $("#tags ul li").tsort({order:"asc"});
    $("#tags ul li a").click(function(){
      var topicName = $(this).text();
      dispatch("lasuli.core.doOpenViewpointByTopicName", topicName);
      return false;
    });
  },

  doClearDocumentPanel : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doClearDocumentPanel");
    //logger.trace("clear the document panel");
    // Clear the document name
    $("#h3-entity-name").html(_("no.name"));
    // Clear the attribute grid
    try{
      $("#attribute-grid").jqGrid('clearGridData');
    }catch(e){
      logger.fatal(e);
    }
    // Clear the tag cloud
    try{
      if($("#tags ul li").length > 0) $("#tags ul li").hide().remove();
    }catch(e){
      logger.fatal(e);
    }
    // Clear the users list
    try{
      if($("#actors ul li").length > 0) $("#actors ul li").hide().remove();
    }catch(e){
      logger.fatal(e);
    }

  },

  doShowViewpointPanels : function(viewpoints){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowViewpointPanels");
    //logger.trace(viewpoints);
    if(!viewpoints) return false;

    var tabIndex = -1;
    for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
    {
      //logger.trace($("div#"+viewpoint.id));
      //If this viewpoint tab is already created.
      if($("div#"+viewpoint.id).length > 0) continue;
      //Create the tab for this viewpoint
      //logger.trace("adding viewpoint:" + viewpoint.id + ", " + viewpoint.name);
      tabIndex = $tabs.tabs('length')-1;
      $tabs.tabs('add', '#' + viewpoint.id, viewpoint.name, tabIndex);
    }

    //Open created tab
    if(tabIndex > 0)
      $tabs.tabs('option', 'selected', tabIndex);
    else
      $("#tabs ul li").each(function(){
        if($(this).find("a").attr("href") == "#" + viewpoints[0].id)
          $(this).find("a").click();
      });
  },

  doShowViewpointName : function(viewpoint) {
    var el = 'div#' + viewpoint.id + ' p.viewpoint-name span';
    $(el).html(viewpoint.name);
  },

  doShowTreePanel : function(viewpointID){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowTreePanel");
    viewpointID = viewpointID || $('div#tabs li.ui-tabs-selected a').attr('href').substr(1);
    logger.trace(viewpointID);
    var viewpointDiv = $('div#' + viewpointID);
    
    viewpointDiv.find('div.topic-tree')
    .append('<div id="tree"></div><div class="tree-toolbar"></div>')
    .find('.tree-toolbar')
    .html("<button class='tt-stopic'></button>"
        + "<button class='tt-ptopic'></button>"
        + "<button class='tt-rename'></button>"
        + "<button class='tt-trash'></button>"
        + "<button class='tt-tag'></button>");

    $('.tt-stopic').button({
			text: false, disabled: false,
			icons: { primary: 'ui-icon-stopic' }
		}).bind('click', lasuli.ui.button.stopic);
		$('.tt-ptopic').button({
			text: false, disabled: true,
			icons: { primary: 'ui-icon-ptopic' }
		}).click(lasuli.ui.button.ptopic);
		$('.tt-rename').button({
			text: false, disabled: true,
			icons: { primary: 'ui-icon-rename' }
		}).click(lasuli.ui.button.rename);
		$('.tt-trash').button({
			text: false, disabled: true,
			icons: { primary: 'ui-icon-trash' }
		}).click(lasuli.ui.button.trash);
		$('.tt-tag').button({
			text: false, disabled: true,
			icons: { primary: 'ui-icon-tag' }
		}).click(lasuli.ui.button.tag);
		
    dispatch("lasuli.core.doLoadTopicTree", viewpointID);
  },

  doShowTopicTree : function(topics){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowTopicTree");
    $.jstree._themes = 'chrome://lasuli/content/css/jsTree/themes/';
    $("#tree").jstree({
      "json_data" : topics,
      "types" : lasuli.ui.jstree_types,
      "dnd" : lasuli.ui.jstree_dnd,
      "ui" : lasuli.ui.jstree_ui,
      "sort" : lasuli.ui.jstree_sort,
      "plugins" : [ "themes", "json_data", "ui", "crrm", "dnd", "contextmenu", "types", "sort", "cookies" ]
    })
    .bind("rename.jstree", lasuli.ui.jstree_rename)
    .bind("move_node.jstree", lasuli.ui.jstree_move)
    .bind("select_node.jstree", lasuli.ui.jstree_selected)
  },

  doClearViewpointPanel : function(viewpointID){
    $("div#" + viewpointID).find("ul.topics-ul li").hide().remove();
    $("div#" + viewpointID).find("div.fragments").hide().remove();
    $("div#" + viewpointID).find("button.cancel").click();
  },

  doShowKeywords : function(keywords){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowKeywords");
    var html = "";
    var viewpointID = null;
    for each(var topic in keywords)
    {
      if(!viewpointID) viewpointID = topic.viewpointID;
      var el = 'div#' + topic.viewpointID + ' ul.topics-ul li a[uri="' + topic.topicID + '"]';
      //logger.trace(el);
      if($(el).length > 0)
        continue;
      html += '<li class="topic"><input type="checkbox" class="cb-remove-keyword hide"><a uri="' + topic.topicID + '">' + topic.name + '</a></li>';
      //logger.trace(html);
    }
    //logger.trace(viewpointID);
    //logger.trace(html);
    if(viewpointID && $('#' + viewpointID).length > 0)
    {
      //$('#' + viewpointID +' .topics-ul li').remove();
      $('#' + viewpointID).find(".topics-ul").append(html);
    }
  },

  button : {
    stopic : function(){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.button.stopic");
      var nodes = new Array();
      $.jstree._reference("#tree").get_selected().each(
        function(i,e){
          var viewpointID = $(e).attr("viewpointID"),
              topicID = $(e).attr("topicID") || '',
              nodeType = $(e).attr("rel"),
              name = $(e).attr("name"),
              arg = {"viewpointID": viewpointID, "topicID": topicID, "nodeType": nodeType, "name": name, "sourceObj": $(e)};
          nodes.push(arg);
        }
      );
      
      if(nodes.length == 0){
        var viewpointID = $('div#tabs li.ui-tabs-selected a').attr('href').substr(1);
        nodes = new Array({"viewpointID": viewpointID, "topicID": null, "sourceObj": null});
      }
      //logger.debug(nodes);
      dispatch("lasuli.core.doCreateTopicTreeItem", nodes);
    },
    ptopic : function(){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.button.ptopic");
      var nodes = new Array();
      $.jstree._reference("#tree").get_selected().each(
        function(i,e){
          var viewpointID = $(e).attr("viewpointID"),
              topicID = $(e).attr("topicID") || '',
              nodeType = $(e).attr("rel"),
              name = $(e).attr("name"),
              arg = {"viewpointID": viewpointID, "topicID": topicID, "nodeType": nodeType, "name": name, "sourceObj": $(e)};
          nodes.push(arg);
        }
      );
      
      if(nodes.length == 0)
        return false;
      //logger.debug(nodes);
      dispatch("lasuli.core.doCreateGeneralTopicTreeItem", nodes);
    },
    rename : function(){
      //var logger = Log4Moz.repository.getLogger("lasuli.ui.button.rename");
      var selected = $.jstree._reference("#tree").get_selected();
      if(selected.length == 0) return false;
      //logger.debug(selected.length);
      var node = selected[0];
      //logger.debug($(node).text());
      $.jstree._reference("#tree").rename($(node));
    },
    trash : function(){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.button.trash");
      $.jstree._reference("#tree").get_selected().each(
        function(i,e){
          if($(e).attr("rel") == 'fragment') {
            var arg = { "fragmentID": $(e).attr("fragmentID"), "sourceObj": $(e)};
            dispatch("lasuli.core.doDestroyFragment", arg);
            return false;
          }
          var viewpointID = $(e).attr("viewpointID"),
              topicID = $(e).attr("topicID") || '',
              nodeType = $(e).attr("rel"),
              name = $(e).attr("name"),
              arg = {"viewpointID": viewpointID, "topicID": topicID, "nodeType": nodeType, "name": name, "sourceObj": $(e)};
          dispatch("lasuli.core.doDestroyTopicTreeItem", arg);
        }
      );
    },
    tag : function(){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.button.tag");
      $.jstree._reference("#tree").get_selected().each(
        function(i,e){
          var viewpointID = $(e).attr("viewpointID"),
              topicID = $(e).attr("topicID") || '',
              nodeType = $(e).attr("rel"),
              name = $(e).attr("name"),
              arg = {"viewpointID": viewpointID, "topicID": topicID, "nodeType": nodeType, "name": name, "sourceObj": $(e)};
          
          if($(e).attr("rel") == "keyword")
            dispatch("lasuli.core.doUnTagTopicTreeItem", arg);
          else
    	      dispatch("lasuli.core.doTagTopicTreeItem", arg);
        }
      );
    }
  },

  jstree_types : {
      "valid_children" : [ "viewpoint" ],
      "types" : {
        "fragment": { "icon" : {  "image" : "css/blitzer/images/document.png"} },
        "keyword": { "icon" : {  "image" : "css/blitzer/images/topic_tag.png" } },
        "analysis": { "icon" : {  "image" : "css/blitzer/images/topic_analysis.png" } },
        "topic": { "icon" : { "image" : "css/blitzer/images/topic_add.png" } }
      }
  },

  jstree_move : function (e, data) {
    data.rslt.o.each(function (i) {
      var logger = Log4Moz.repository.getLogger("lasuli.ui.jstree_move");
      /*logger.debug($(this).attr("viewpointID"));
      logger.debug($(this).attr("topicID"));
      logger.debug($(this).attr("name"));
      logger.debug($(this).attr("rel"));
      logger.debug(data.rslt.np.attr("topicID"));
      logger.debug(data.rslt.np.attr("name"));
      logger.debug(data.rslt.np.attr("rel"));*/
      
      if($(this).attr("rel") == 'fragment'){
        dispatch("lasuli.core.doMoveFragment", 
          {
            "fragmentID": $(this).attr("fragmentID"), 
            "sourceTopicID": data.rslt.op.attr("topicID"), 
            "targetTopicID": data.rslt.np.attr("topicID"), 
            "rlbk": data.rlbk,
            "rslt": data.rslt,
            "viewpointID": $(this).attr("viewpointID")
          } 
        );
        return false;
      }
        
      var arg = {
        "viewpointID": $(this).attr("viewpointID"), 
        "topicID": $(this).attr("topicID"), 
        "broaderTopicID": data.rslt.np.attr("topicID"), 
        "rlbk": data.rlbk,
        "rslt": data.rslt};
      dispatch("lasuli.core.doMoveTopicTreeItem", arg);
      //$.jstree.rollback(data.rlbk);
      //data.inst.refresh(data.inst._get_parent(data.rslt.oc));
    });
  },

  jstree_selected : function (e, data) {
    var logger = Log4Moz.repository.getLogger("lasuli.ui.jstree_selected");
    $('.tt-stopic').button({ disabled: false });
    $('.tt-ptopic').button({ disabled: false });
    $('.tt-rename').button({ disabled: false });
    $('.tt-trash').button({ disabled: false });
    $('.tt-tag').button({ disabled: false });
    var num = 0;
    $.jstree._reference("#tree").get_selected().each(
      function(i,e){
        num++;
        if(num == 2) {
          $('.tt-stopic').button({ disabled: true });
          $('.tt-rename').button({ disabled: true });
        }
        if( $(e).attr("rel") == "fragment") {
          $('.tt-rename').button({ disabled: true });
          $('.tt-tag').button({ disabled: true });
          $('.tt-stopic').button({ disabled: true });
          $('.tt-ptopic').button({ disabled: true });
        }
        if( $(e).attr("rel") == "analysis")
          $('.tt-tag').button({ disabled: true });
      }
    );
  },

  jstree_rename: function (e, data) {
    var logger = Log4Moz.repository.getLogger("lasuli.ui.jstree_rename");
    var sourceObj   = data.rslt.obj;
    var viewpointID = sourceObj.attr('viewpointID');
    //logger.debug(viewpointID);
    var topicID     = sourceObj.attr('topicID') || '';
    //logger.debug(topicID);
    var topicType   = sourceObj.attr('rel');
    var name        = data.rslt.old_name;
    var newName     = data.rslt.new_name;
    //logger.debug(newName);
    var arg = {"viewpointID": viewpointID, "topicID": topicID, "topicType": topicType, "name": name, "newName": newName, "sourceObj": sourceObj};

    dispatch("lasuli.core.doRenameTopicTreeItem", arg);
  },

  jstree_sort: function(a, b){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.jstree_sort");
    try{
      //logger.debug($(a).attr("rel"));
      //logger.debug($(b).attr("rel"));
      
      if($(a).attr("rel") != $(b).attr("rel") 
        && ($(a).attr("rel") == "fragment" || $(b).attr("rel") == "fragment"))
        return $(a).attr("rel") > $(b).attr("rel") ? 1 : -1;
    }catch(e){
      //logger.fatal(a);
      logger.fatal(e.message);
    }
    return this.get_text(a) > this.get_text(b) ? 1 : -1;
  },

  jstree_ui : {
    "select_limit" : -1,
    "select_multiple_modifier" : "meta"
  },

  doRefreshTopicTree: function(data){
    data.inst.refresh(data.inst._get_parent(data.rslt.oc));
  },

  doRollbackTopicTree: function(data){
    $.jstree.rollback(data.rlbk);
  },
  
  doReloadTopicTree: function(topics){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doReloadTopicTree");
    //logger.trace(topics);
    //this.doShowTopicTree(topics);
    //$("#tree").jstree('refresh');
    //$("#tree").jstree({"json_data" : topics}).jstree('refresh', -1);
    $("#tree").jstree('destroy');
    //Sync.sleep(1000);
    dispatch("lasuli.ui.doShowTopicTree", topics);
  },
  
  doCreateTopicTreeItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doCreateTopicTreeItem");
    var pos = (arg.sourceObj) ? "inside" : "last";
    var node = (arg.sourceObj) ? arg.sourceObj : null;
    //logger.debug(pos);
    $("#tree").jstree("create", null, pos, {"data": _("no.name"), "attr": {"viewpointID": arg.viewpointID, "topicID": arg.topicID, "rel": "topic"}}, null, true);
  },
  
  doDestroyTopicTreeItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doDestroyTopicTreeItem");
    if(arg.sourceObj) {
      $("#tree").jstree("delete_node", arg.sourceObj);
    }
    //$("#tree").jstree("remove", arg.sourceObj);
  },

  doRenameViewpoint : function(viewpointID, name){
    $('div#tabs li a[href="#' + viewpointID + '"]').html(name);
    $('div#' + viewpointID).find('p.viewpoint-name span').html(name);
  },

  doRenameTopicTreeItem : function(arg){
    var node = arg.sourceObj;
    if(arg.name)
    {
      node.attr("name", arg.name);
    }
  },

  doUpdateTopicTreeMenuItem : function(arg){
    var node = arg.sourceObj;
    if(arg.rel)
    {
      node.attr("rel", arg.rel);
    }
  },
  doDestroyKeyword : function(keyword){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doDestroyKeyword");
    //logger.trace('div#' + tag.viewpointID + ' ul.topics-ul li a[uri="' + tag.topicID + '"]');
    var el = 'div#' + keyword.viewpointID + ' ul.topics-ul li a[uri="' + keyword.topicID + '"]';
    if($(el).length > 0)
      $(el).parent().remove();
  },

  doRestoreKeyword : function(keyword){
    //$('ul.topics-ul img.remove-tag-img').addClass('hide');
    $('ul.topics-ul').find('input.edit-in-place').replaceWith("<a uri='" + keyword.topicID + "'>" + keyword.name + "</a>");
  },

  _initFragmentsContainer : function(topic){
    var logger = Log4Moz.repository.getLogger("lasuli.ui._initFragmentsContainer");
    if(!topic.color) topic.color = getColor(topic.topicID);
    var html = '<div class="fragments ui-widget hide" viewpointID="' + topic.viewpointID + '" topicID="' + topic.topicID + '">'
       +'<div class="fragment-header" viewpointID="' + topic.viewpointID + '" topicID="' + topic.topicID + '">'
       +'<img class="fragment-toggle" src="css/blitzer/images/toggle-close.png">'
       +'<span class="ui-corner-right" style="background-color:'+ alpha(topic.color) + '">'
       + topic.name + '</span></div><ul>'
       + '</ul></div>';
    $('div#' + topic.viewpointID).find(".fragments-container").append(html);
  },

  doCreateFragments : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doCreateFragments");
    //logger.trace(arg);
    var fragments = arg.fragments;
    var vid;
    for(var fragmentID in fragments)
    {
      fragment = fragments[fragmentID];
      var coordinates = fragment.getCoordinates();
      var startPos = coordinates[0][0];
      var viewpointID = fragment.topic.getViewpointID();
      vid = viewpointID;
      var topicID = fragment.topic.getID();
      var text = fragment.getText();
      var li_html = '<li class="fragment ui-corner-bottom" viewpointID="' + viewpointID + '" topicID="' + topicID + '" fragmentID="' + fragmentID + '" startPos="' + startPos + '" >'
             +'<span class="ui-icon ui-icon-arrowthick-2-n-s"></span>'
             +'<em class="fragment-text">' + text + '</em></li>';
      //logger.trace(li_html);
      var el = "div.fragments[viewpointID='" + viewpointID + "'][topicID='" + topicID + "']";
      //logger.trace(el);
      if($(el).length > 0)
        $(el).find("ul").append(li_html);
    }

    $("div.fragments ul li").tsort({order:"asc",attr:"startPos"});
    dispatch("lasuli.ui.doMakeFragmentsDragable", null);
    dispatch("lasuli.ui.doHideEmptyAnalysis", vid);
  },

  doShowFragments : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowFragments");
    //logger.trace(arg);
    var topics = arg.topics;
    for each(var topic in topics)
    {
      lasuli.ui._initFragmentsContainer(topic);
    }
    dispatch("lasuli.ui.doMakeFragmentsDroppable", null);
    //logger.trace(arg.fragments);
    dispatch("lasuli.ui.doCreateFragments", {"fragments": arg.fragments, "highlight": true} );
  },

  doMakeFragmentsDragable : function(){
    $(".fragment").draggable(
      {
        connectToSortable: '.fragments ul',
        cursor: 'move',
        helper: 'clone',
        revert: 'invalid'
      });
    dispatch("lasuli.ui.doHideEmptyAnalysis", null);
  },

  doMakeFragmentsDroppable : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doMakeFragmentsDroppable");
    //logger.trace('doMakeFragmentsDroppable');
    $(".fragments").droppable({
      accept: '.fragment',
      drop: function(event, ui)
      {
        var logger = Log4Moz.repository.getLogger("lasuli.ui.doMakeFragmentsDroppable.drop");
        //logger.trace($(this).html());
        var li_element = ui.draggable;
        var ul_element = ui.draggable.parent();
        //logger.trace(ul_element.prev("div").attr("class"));
        var sourceTopicID = ul_element.prev("div").attr("topicID");
        var targetTopicID = $(this).attr("topicID");
        var fragmentID = li_element.attr("fragmentID");
        var viewpointID = li_element.attr("viewpointID");

        //logger.trace("sourceTopicID:" + sourceTopicID + ", targetTopicID:" + targetTopicID + ",fragmentID:" + fragmentID);

        if(targetTopicID == sourceTopicID)
        {
          ui.helper.fadeOut();
          return;
        }
        dispatch("lasuli.core.doMoveFragment", {"fragmentID": fragmentID, "sourceTopicID": sourceTopicID, "targetTopicID": targetTopicID, "helper": ui.helper,
          "viewpointID": viewpointID} );
      }
    });
  },

  doDropFragmentAccepted : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doDropFragmentAccepted");
    
    //logger.debug(arg);
    var viewpointID = $('.fragments li[fragmentID="' + arg.fragmentID + '"]').attr("viewpointID");
    //logger.debug(viewpointID);
    var fragments = $("div.fragments[viewpointID='" + viewpointID + "']").show();
    var el = "div.fragments[viewpointID='" + viewpointID + "'][topicID='" + arg.targetTopicID + "'] ul";
    //logger.debug(el);
    $('.fragments li[fragmentID="' + arg.fragmentID + '"]').clone().appendTo($(el)).attr("topicID", arg.targetTopicID);
    //logger.debug($(el).html());
    $('.fragments li[fragmentID="' + arg.fragmentID + '"][topicID="' + arg.sourceTopicID + '"]').hide().remove();
    //logger.debug("old fragment hide");
    $('.fragments li.ui-draggable-dragging[fragmentID="' + arg.fragmentID + '"]').hide().remove();
    //logger.debug("sort fragments");
    $("div.fragments ul li").tsort({order:"asc",attr:"startPos"});
    dispatch("lasuli.ui.doMakeFragmentsDragable", null);
  },

  doDropFragmentDenied : function(arg){
    arg.helper.fadeOut();
  },

  doRemoveFragment : function(fragmentID) {
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doRemoveFragment");
    var el = "li.fragment[fragmentID='" + fragmentID + "']";
    logger.trace(el);
    $(el).slideToggle({duration: 500, easing: 'easeInSine'}).remove();
    dispatch("lasuli.ui.doHideEmptyAnalysis", null);
  },

  doCreateAnalysis: function(topic){
    lasuli.ui._initFragmentsContainer(topic);
    dispatch("lasuli.ui.doMakeFragmentsDragable", null);
    dispatch("lasuli.ui.doMakeFragmentsDroppable", null);
    var el = "div.fragment-header[viewpointID='" + topic.viewpointID + "'][topicID='" + topic.topicID + "']";
    var span = $(el).find("span");
    span[0].scrollIntoView(true);
    span.fadeOut(500).fadeIn(500).fadeOut(500).fadeIn(500).fadeOut(500).fadeIn(500);
  },

  doRenameAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doRenameAnalysis");
    //logger.trace(arg);
    var el="div.fragment-header[viewpointID='" + arg.viewpointID + "'][topicID='" + arg.topicID + "']";
    var span = $(el).find("span");
    span.html(arg.name);
  },

  doRestoreAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doRestoreAnalysis");
    //logger.trace(arg);

    var viewpointID = arg.viewpointID;
    var topicID = arg.topicID;
    var originalImage = arg.originalImage;
    var originalSpan = arg.originalSpan;
    originalSpan.text(arg.name);
    var el="div.fragment-header[viewpointID='" + viewpointID + "'][topicID='" + topicID + "']";
    $(el).find('img.fragment-toggle').attr("src", originalImage);
    $(el).find('input').replaceWith(originalSpan);
  },

  doDestroyAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doDestroyAnalysis");
    //logger.trace(arg);

    var viewpointID = arg.viewpointID;
    var topicID = arg.topicID;
    var el="div.fragments[viewpointID='" + viewpointID + "'][topicID='" + topicID + "']";
    $(el).slideToggle({duration: 500, easing: 'easeInSine'}).remove();
  },

  doHighlightMenuClick: function(topicBase64Encoded){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doHighlightMenuClick");
    try{ topic = JSON.parse(Base64.decode(topicBase64Encoded)); }catch(e){}
    //logger.debug(topic);
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    var content = win.getBrowser().contentWindow;
    var selection = content.getSelection();
    //logger.debug("selection:" + selection);
    var strContent = selection + "";
    strContent = strContent.trim();
    if(strContent == ""){
      //TODO replace with message in lasuli
      alert(_("null.content.selected"));
      return false;
    }
    var range = selection.getRangeAt(0);
    var startContainer = range.startContainer;
    var endContainer = range.endContainer;
    var startOffset = range.startOffset;
    var endOffset = range.endOffset;

    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    var contentDocument = win.getBrowser().contentDocument;
    var treewalker;
    //logger.debug('start to get treewalker');
    try{
      treewalker = contentDocument.createTreeWalker(contentDocument.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: function(node)
        {
          // only get text content
          if(node.nodeType != 3 || node.data.length == 0)
            return NodeFilter.FILTER_REJECT;

          // Filter the <script> content
          var m_parent = node.parentNode;
          if(m_parent && m_parent.tagName == "SCRIPT")
            return NodeFilter.FILTER_REJECT;

          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false);
    }catch(e){
      logger.fatal(e);
      return false;
    }
    //logger.debug('start to get position');
    var curPos = 0;
    var startPos,endPos;
    //logger.debug(startContainer.data);
    //logger.debug(typeof(endContainer));
    //logger.debug(endContainer.tagName);
    //logger.debug(endContainer.textContent);
    //logger.debug(startContainer.isSameNode(endContainer));
    while(treewalker.nextNode())
    {
        var node = treewalker.currentNode;
        //logger.debug(node.textContent);

        if(node.isSameNode(startContainer)){
          startPos = curPos + startOffset;
          //logger.debug("start:" + startPos);
          //logger.debug("strContent.length:" + strContent.length);
          endPos = startPos + strContent.length;
          //logger.debug("endPos:" + endPos);
          break;
        }
        //logger.debug("in loop startPos:" + startPos + ", endPost:" + endPos);
        curPos += node.data.length;
    }
    //logger.debug("startPos:" + startPos + ", endPost:" + endPos);
    if(typeof startPos != "number" || typeof endPos != "number") return false;
    //logger.debug(strContent);
    var viewpointID;
    if(topic.viewpointID)
      viewpointID = topic.viewpointID;
    else
      viewpointID = $('div#tabs li.ui-tabs-selected a').attr('href').substr(1);

    var topicID = (topic.topicID) ? topic.topicID : null;
    var fragment = { "viewpointID": viewpointID, "topicID": topicID, "startPos": startPos, "endPos": endPos, "text": strContent };
    //logger.debug(fragment);
    dispatch("lasuli.core.doCreateFragment", fragment);
  },

  doUpdateProgressBar: function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doUpdateProgressBar");
    var t,v;
    if(typeof(arg) == "object")
    {
      t = arg[1];
      v = arg[0];
      v = (v/t) * 100;
    }
    else
    {
      t = 100;
      v = arg;
    }
    if(v < 100)
    {
      $('div#overlay-div').removeClass('hide').css("opacity", 0.2);
      $('div#progressbar').show().progressbar({ value: v });
    }
    else
    {
      $('div#overlay-div').addClass('hide').css("opacity", 0.5);
      $('div#progressbar').hide().destroy();
    }
  }
}

$(window).bind("load", function(){
  var logger = Log4Moz.repository.getLogger("lasuli.ui.load");
  lasuli.jqGirdLoader();
  logger.trace("jqGirdLoader");
  lasuli.ui.register();
  logger.trace("register");
  lasuli.ui.doBlockUI();
  logger.trace("doBlockUI");
  lasuli.ui.initTabs();
  logger.trace("initTabs");
  lasuli.ui.initViewpointPanel();
  logger.trace("initViewpointPanel");
  lasuli.ui.initPlusPanel();
  logger.trace("initPlusPanel");
  lasuli.ui.initAttributeGrid();
  logger.trace("initAttributeGrid");
  lasuli.ui.initTagCloud();
  logger.trace("initTagCloud");
  lasuli.ui.initItemName();
  logger.trace("initItemName");
  dispatch('lasuli.sidebar.onSidebarOpened', null);
  //wait until all event listener registered
  Sync.sleep(500);
  try{ lasuli.ui.initDocumentPanel(); }catch(e){ logger.fatal(e.message); }
});

$(window).bind("unload", function(){
  lasuli.ui.unregister();
  dispatch('lasuli.core.doClearFragmentsCache', null);
  dispatch('lasuli.contextmenu.doHide', null);
  dispatch('lasuli.highlighter.doClear', null);
  dispatch('lasuli.sidebar.onSidebarClosed', null);

});