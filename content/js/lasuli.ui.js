include("resource://lasuli/modules/Observers.js");
include("resource://lasuli/modules/Sync.js");
lasuli.ui = {
  initTabs : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.initTabs");
    $tabs = $('#tabs').tabs({
      tabTemplate: '<li><a href="#{href}" class="tab-viewpoint">#{label}</a> <span class="ui-icon ui-icon-close">Remove Tab</span></li>',
      selected:0,
      add: function(event, ui) {
        logger.info(ui.tab.href);
        var viewpointPanelHtml = '<div class="topics" ><p class="h3-title"><span>' + _("Index") + '</span>'
                          		 + '<img class="add-topic-img" src="css/blitzer/images/add.png"></p><ul class="topics-ul"></ul></div>'
                          		 + '<div class="fragments-container"><p class="h3-title"><span>' + _("Analysis") + '</span>'
                          		 + '<img class="add-analyses-img" src="css/blitzer/images/add.png"></p></div>';
        $(ui.panel).append(viewpointPanelHtml);
      },
      remove: function(event, ui)
      {
        logger.info(ui);
        if($('#' + ui.panel.id))
          $('#' + ui.panel.id).remove();
      }
    });

    $tabs.bind('tabsselect', function(event, ui) {
      var logger = Log4Moz.repository.getLogger("lasuli.ui.initTabs.tabsselect");
      if($(ui.tab).hasClass("tab-viewpoint"))
      {
        var viewpointID = $(ui.tab).attr("href").substr(1);
        logger.info(viewpointID);
        dispatch("lasuli.ui.doClearViewpointPanel", viewpointID);
        dispatch("lasuli.core.doLoadKeywords", viewpointID);
        dispatch("lasuli.core.doLoadFragments", viewpointID);
      }
      else
        dispatch('lasuli.contextmenu.doHide', null);
      if($(ui.tab).hasClass("tab-document"))
      {
        dispatch("lasuli.core.doLoadDocument", null);
      }
      if($(ui.tab).hasClass("tab-add"))
      {
        dispatch("lasuli.core.doListViewpoints", null);
        dispatch('lasuli.highlighter.doClear', null);
      }
      $("div.ui-tabs-panel").height($(window).height() - $('ul.ui-tabs-nav').outerHeight() - 32);
    });

    $('#tabs span.ui-icon-close').live('click', function() {
      var index = $('li',$tabs).index($(this).parent());
      $tabs.tabs('remove', index);
    });

    $(window).bind('resize', function() {
        $("div.ui-tabs-panel").height($(window).height() - $('ul.ui-tabs-nav').outerHeight() - 32);
    }).trigger('resize');
  },

  initDocumentPanel : function(){
    //var browsingUrl = "http://cassandre/text/d0";
    dispatch("lasuli.core.doLocationChange", null);
  },

  initPlusPanel : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.initViewpointPanel");
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
		  logger.debug("Create viewpoint button click.\nViewpoint name:" + viewpointName);
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
      //$(this).stop().animate({marginLeft : -26}, 250);
    });
    $('#viewpoints-ul li').live('mouseout', function(){
      $(this).find("img").stop().animate({opacity: 0}, 250);
      //$(this).stop().animate({marginLeft : 0}, 250);
    });
    //Click the trash icon to delete a viewpoint
    $('.icon-remove-viewpoint').live('click', function(){
      var viewpointID = $(this).parent().attr('uri');
      var viewpointName = $(this).next().text();
      var message = {};
      message.title = _("Warning");
      message.content = _("delete.viewpoint.warning", [viewpointName]);
      message.callback = function() {
        dispatch("lasuli.core.doDestroyViewpoint", viewpointID);
      };
      dispatch("lasuli.ui.doShowMessage", message);

    });
    $('#viewpoints-ul li a').live('click', function(){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.initViewpointPanel.viewpoint.click");
      var viewpointID = $(this).parent().attr("uri");
      var viewpointName = $(this).text();
      var viewpoints = new Array({"id": viewpointID, "name": viewpointName});
      logger.debug(viewpoints);
      dispatch("lasuli.ui.doShowViewpointPanels", viewpoints);
      return false;
    });
  },

  initViewpointPanel : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.initViewpointPanel");
    // Delete a tag by click the trash icon
    $('.remove-tag-img').live('click', function(){
      var topicID = $(this).next("a").attr("uri");
      var name = $(this).next("a").html();
      var viewpointID = $(this).parents('.ui-tabs-panel').attr("id");
      if(typeof(topicID) == "string" && topicID.length >0)
        dispatch("lasuli.core.doDestroyKeyword", {"topicID":topicID, "viewpointID": viewpointID, "name": name});
      return false;
    });

    //Mouse over the tag shows the trash icon
    $(".topic").live("mouseover", function(){
      $(this).find("img").removeClass("hide");
      return false;
    }).live("mouseout", function(){
      $(this).find("img").addClass("hide");
      return false;
    });

    //Edit in place of a tag
    $(".topic a").live("click", function(event){
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

    //Open dialog for add topic
    $('.add-topic-img').live("click", function(){
      //$("#topic-dialog").dialog('open');
      $("#topic-tree-dialog").dialog('open');
    });

    //Initial topic tree dialog
    $("#topic-tree-dialog").dialog({
      bgiframe: true,
      autoOpen: false,
      modal: true,
      width: 170,
      title: _("topictree.dialog.title"),
      close: function(){
        $("#tree").jstree('destroy');
      },
      open: function(){
        var viewpointID = $('div#tabs li.ui-tabs-selected a').attr('href').substr(1);
        dispatch("lasuli.core.doLoadTopicTree", viewpointID);
      }
    });

    //Topic side icon click
    $(".fragment-toggle").live('click', function(event){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.fragment-toggle.click");
      logger.debug($(this).attr('src'));
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
      if($(this).attr('src').indexOf('delete.png') > 0)
      {
        var viewpointID = $(this).parent().attr("viewpointID");
        var topicID = $(this).parent().attr("topicID");
        var name = $(this).next().val();
        dispatch("lasuli.core.doDestroyAnalysis", {"viewpointID":viewpointID, "topicID": topicID, "name": name});
        //return false;
      }
    });

    $(".fragment").live("mouseover", function(){
      $(this).find("span").removeClass("ui-icon-arrowthick-2-n-s");
      $(this).find("span").addClass("ui-icon-trash");
    });

    $(".fragment").live("mouseout", function(){
      $(this).find("span").removeClass("ui-icon-trash");
      $(this).find("span").addClass("ui-icon-arrowthick-2-n-s");
    });

    $(".fragment").live("click", function(){
      var fragmentID = $(this).attr("fragmentID");
      dispatch("lasuli.highlighter.doScrollTo", fragmentID);
      return false;
    });

    //Delete fragment
    $("li.fragment span.ui-icon-trash").live("click", function(){
      var fragmentID = $(this).parent().attr("fragmentID");
      var viewpointID = $(this).parent().attr("viewpointID");
      var topicID = $(this).parent().attr("topicID");
      var itemID = $(this).parent().attr("itemID");
      dispatch("lasuli.core.doDestroyFragment", {"fragmentID": fragmentID, "viewpointID": viewpointID, "topicID": topicID, "itemID": itemID});
    });

    //Add analysis topic
    $('.add-analyses-img').live("click", function(){
      var viewpointID = $(this).parents("div.ui-tabs-panel").attr("id");
      dispatch("lasuli.core.doCreateAnalysis", viewpointID);
    });

    //Edit analysis topic
    $('.fragment-header span').live('click', function(event){
      var divContainer = $(this).parent();
      var originalSpan = $(this).clone();
      var originalTopicName = $(this).text();
      var img = $(this).prev();
      var originalImage = img.attr('src');
      img.attr('src','css/blitzer/images/delete.png');
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
    });
  },

  initAttributeGrid : function(){
    var attributesDialogButtons = {};
  	attributesDialogButtons[_('Okay')] = function() {
  	  var bValid = true;
      $('#attribute-name').removeClass('ui-state-error');
      $('#attribute-value').removeClass('ui-state-error');
      if ( $('#attribute-name').val().length == 0)
      {
        $('#attribute-name').addClass('ui-state-error');
        bValid = false;
      }

      if ( $('#attribute-value').val().length == 0)
      {
        $('#attribute-value').addClass('ui-state-error');
        bValid = false;
      }

      if (bValid) {
        var attribute = {"name": $('#attribute-name').val(), "value": $('#attribute-value').val()};
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
		//Modify selected attribute
		/*$('#attribute-modify').button({
			text: false,
			icons: {
				primary: 'ui-icon-pencil'
			}
		}).click(function(){
		  var gr = $("#attribute-grid").jqGrid('getGridParam','selrow');
      if( gr != null )
        $('#attribute-dialog').dialog('open');
      else
      {
        var message = {};
        message.title = _("Warning");
        message.content = _("no.attribute.selected");
        dispatch("lasuli.ui.doShowMessage", message);
      }
		});*/
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
    $("h3#h3-entity-name").live("click", function(event){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.initItemName");
      var itemName = $(this).html();
      $('div#tabs-document').data('itemName', itemName);
      logger.debug(itemName);
      $(this).replaceWith("<input type='text' class='edit-itemname-in-place' value=''>");
      $("input.edit-itemname-in-place").val(itemName).focus().select();

      $("input.edit-itemname-in-place").blur(function(){
        var logger = Log4Moz.repository.getLogger("lasuli.ui.initItemName.blur");
        var name = $('div#tabs-document').data('itemName');
        var newName = $(this).val();
        logger.debug(name + "," + newName);
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
          //logger.debug(event.keyCode);
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
    var logger = Log4Moz.repository.getLogger("lasuli.ui.register");
    for(var func in this)
      if(func.substr(0, 2) == "do")
      {
        //logger.debug("registering function: " + func);
        Observers.add("lasuli.ui." + func, lasuli.ui[func], lasuli.ui);
      }
  },
  unregister: function(){
    for(var func in this)
      if(func.substr(0, 2) == "do")
        Observers.remove("lasuli.ui." + func, lasuli.ui[func], lasuli.ui);
  },

  doBlockUI : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doBlockUI");
    logger.debug("block ui");
    $('div#overlay-div').removeClass('hide');
  },

  doUnBlockUI : function(){
    $('div#overlay-div').addClass('hide');
  },

  doShowItemName : function(itemName){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowItemName");
    logger.debug(itemName);
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
      logger.debug(el);
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
    logger.debug(attributes);
    $("#attribute-grid").jqGrid('clearGridData');
    if(!attributes) return false;
    var index = 1;
    for(var name in attributes)
      if(typeof(attributes[name]) == "string")
      {
        logger.debug({"name": name, "value": attributes[name]});
        $("#attribute-grid").addRowData(index, {"name": name, "value": attributes[name]});
        index++;
      }
      else
      for(var j=0, v; v = attributes[name][j]; j++)
      {
        logger.debug({"name": name, "value": v});
        $("#attribute-grid").addRowData(index, {"name": name, "value": v});
        index++;
      }
  },

  doShowTagCloud : function(tags){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowTagCloud");
    logger.debug(tags);
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
    logger.info("clear the document panel");
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
    logger.debug(viewpoints);
    if(!viewpoints) return false;

    var tabIndex = -1;
    for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++)
    {
      logger.debug($("div#"+viewpoint.id));
      //If this viewpoint tab is already created.
      if($("div#"+viewpoint.id).length > 0) continue;
      //Create the tab for this viewpoint
      logger.info("adding viewpoint:" + viewpoint.id + ", " + viewpoint.name);
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


  doClearViewpointPanel : function(viewpointID){
    $("div#" + viewpointID).find("ul.topics-ul li").hide().remove();
    $("div#" + viewpointID).find("div.fragments").hide().remove();
  },


  doShowKeywords : function(keywords){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowKeywords");
    var html = "";
    var viewpointID = null;
    for(var topicID in keywords)
    {
      var topic = keywords[topicID];
      if(!viewpointID) viewpointID = topic.viewpointID;
      var el = 'div#' + topic.viewpointID + ' ul.topics-ul li a[uri="' + topic.topicID + '"]';
      logger.info(el);
      if($(el).length > 0)
        continue;
      html += '<li class="topic"><img src="css/blitzer/images/delete.png" class="remove-tag-img hide"><a uri="' + topic.topicID + '">' + topic.name + '</a></li>';
      //logger.debug(html);
    }
    //logger.info(viewpointID);
    logger.debug(html);
    if(viewpointID && $('#' + viewpointID).length > 0)
    {
      //$('#' + viewpointID +' .topics-ul li').remove();
      $('#' + viewpointID).find(".topics-ul").append(html);
    }
  },

  doShowTopicTree : function(topics){
    var jstree_types = {
      "valid_children" : [ "viewpoint" ],
      "types" : {
        "viewpoint": {
          "icon" : {  "image" : "css/blitzer/images/viewpoint.png"},
          "select_node" : false
        },
        "keyword": {
          "icon" : {  "image" : "css/blitzer/images/topic_forbidden.png" },
          "select_node": false
        },
        "analysis": {
          "icon" : {  "image" : "css/blitzer/images/topic_forbidden.png" },
          "select_node": false
        },
        "topic": {
          "icon" : { "image" : "css/blitzer/images/topic_add.png" }
        }
      }
    };
    var jstree_contextmenu = {
      "items": function(node){
        var viewpointID = node.attr("viewpointID");
        var topicID = node.attr("topicID") || '';
        var topicType = node.attr("rel");
        var name = node.attr("name");
        var arg = {"viewpointID": viewpointID, "topicID": topicID, "topicType": topicType, "name": name, "sourceObj": node};
        var items = {};
        items.ccp = false;
        items.create = false;
        items.rename = false;
        items.remove = false;
        items.tag = {
          "label"             : _("topictree.tag"),
          "action"            : function (obj) { dispatch("lasuli.core.doTagTopicTreeItem", arg); },
          "separator_after"   : true,
          "icon"              : "css/blitzer/images/menu_tag.png"
        };
        items.add = {
          "label"             : _("topictree.create"),
          "action"            : function (obj) { dispatch("lasuli.core.doCreateTopicTreeItem", arg); },
          "icon"              : "css/blitzer/images/menu_add.png"
        };
        items.edit = {
          "label"             : _("topictree.rename"),
          "action"            : function (obj) { this.rename(obj); },
          "icon"              : "css/blitzer/images/menu_edit.png"
        };
        items.destroy = {
          "label"             : _("topictree.destroy"),
          "action"            : function (obj) { dispatch("lasuli.core.doDestroyTopicTreeItem", arg); },
          "icon"              : "css/blitzer/images/menu_delete.png"
        };
        switch(topicType) {
          case "viewpoint":
            delete items.tag;
            delete items.destroy;
            items.edit.label = _('topictree.viewpoint.rename');
            return items;
          case "analysis":
            delete items.tag;
            return items;
          case "keyword":
            delete items.tag;
            return items;
          case "topic":
            return items;
        }
      }
    };
    $.jstree._themes = 'chrome://lasuli/content/css/jsTree/themes/';
    $("#tree").jstree({
      "json_data" : topics,
      "types" : jstree_types,
      "contextmenu": jstree_contextmenu,
      "plugins" : [ "themes", "json_data", "ui", "crrm", "contextmenu", "types" ]
    }).bind("rename.jstree", function (e, data) {
      var logger = Log4Moz.repository.getLogger("lasuli.ui.rename");
      var sourceObj   = data.rslt.obj;
      var viewpointID = sourceObj.attr('viewpointID');
      logger.debug(viewpointID);
      var topicID     = sourceObj.attr('topicID') || '';
      logger.debug(topicID);
      var topicType   = sourceObj.attr('rel');
      var name        = data.rslt.old_name;
      var newName     = data.rslt.new_name;
      logger.debug(newName);
      var arg = {"viewpointID": viewpointID, "topicID": topicID, "topicType": topicType, "name": name, "newName": newName, "sourceObj": sourceObj};

      dispatch("lasuli.core.doRenameTopicTreeItem", arg);
    });
  },

  doCreateTopicTreeItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doCreateTopicTreeItem");
    $("#tree").jstree("create", arg.sourceObj, "inside", {"data": _("no.name"), "attr": {"viewpointID": arg.viewpointID, "topicID": arg.topicID, "rel": "topic"}}, null, true);
  },
  doDestroyTopicTreeItem : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doDestroyTopicTreeItem");
    $("#tree").jstree("remove", arg.sourceObj);
  },

  doRenameViewpoint : function(viewpointID, name){
    $('div#tabs li a[href="#' + viewpointID + '"]').html(name);
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
    //logger.debug('div#' + tag.viewpointID + ' ul.topics-ul li a[uri="' + tag.topicID + '"]');
    var el = 'div#' + keyword.viewpointID + ' ul.topics-ul li a[uri="' + keyword.topicID + '"]';
    if($(el).length > 0)
      $(el).parent().remove();
  },

  doRestoreKeyword : function(keyword){
    $('ul.topics-ul img.remove-tag-img').addClass('hide');
    $('ul.topics-ul').find('input').replaceWith("<a uri='" + keyword.topicID + "'>" + keyword.name + "</a>");
  },

  _initFragmentsContainer : function(topic){
    var logger = Log4Moz.repository.getLogger("lasuli.ui._initFragmentsContainer");
    var html = '<div class="fragments ui-widget" viewpointID="' + topic.viewpointID + '" topicID="' + topic.topicID + '">'
       +'<div class="fragment-header" viewpointID="' + topic.viewpointID + '" topicID="' + topic.topicID + '">'
       +'<img class="fragment-toggle" src="css/blitzer/images/toggle-close.png" style="vertical-align:middle">'
       +'<span class="ui-corner-right" style="background-color:'+ topic.color + '">'
       + topic.name + '</span></div><ul>'
       + '</ul></div>';
    $('div#' + topic.viewpointID).find(".fragments-container").append(html);
  },

  doCreateFragments : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doCreateFragments");
    logger.debug(arg);
    var fragments = arg.fragments;
    for(var fragmentID in fragments)
    {
      fragment = fragments[fragmentID];
      var li_html = '<li class="fragment ui-corner-bottom" itemID="' + fragment.itemID + '" fragmentID="' + fragmentID + '" viewpointID="' + fragment.viewpointID
             + '" topicID="' + fragment.topicID + '" startPos="' + fragment.startPos + '" >'
             +'<span class="ui-icon ui-icon-arrowthick-2-n-s"></span>'
             + fragment.text + '</li>';
      logger.debug(li_html);
      var el = "div.fragments[viewpointID='" + fragment.viewpointID + "'][topicID='" + fragment.topicID + "']";
      logger.debug(el);
      if($(el).length > 0)
        $(el).find("ul").append(li_html);
    }

    $("div.fragments ul li").tsort({order:"asc",attr:"startPos"});
    dispatch("lasuli.ui.doMakeFragmentsDragable", null);
  },

  doShowFragments : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowFragments");
    var topics = arg.topics;
    logger.debug(topics);
    for each(var topic in topics)
    {
      lasuli.ui._initFragmentsContainer(topic);
    }
    dispatch("lasuli.ui.doMakeFragmentsDroppable", null);
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
  },

  doMakeFragmentsDroppable : function(){
    $(".fragments").droppable({
      accept: '.fragment',
      drop: function(event, ui)
      {
        var logger = Log4Moz.repository.getLogger("lasuli.ui.doMakeFragmentsDroppable.drop");
        logger.debug($(this).html());
        var li_element = ui.draggable;
        var ul_element = ui.draggable.parent();
        logger.debug(ul_element.prev("div").attr("class"));
        var sourceTopicID = ul_element.prev("div").attr("topicID");
        var targetTopicID = $(this).attr("topicID");
        var fragmentID = li_element.attr("fragmentID");
        var viewpointID = li_element.attr("viewpointID");
        var itemID = li_element.attr("itemID");

        logger.debug("sourceTopicID:" + sourceTopicID + ", targetTopicID:" + targetTopicID + ",fragmentID:" + fragmentID);

        if(targetTopicID == sourceTopicID)
        {
          ui.helper.fadeOut();
          return;
        }
        dispatch("lasuli.core.doMoveFragment", {"fragmentID": fragmentID, "sourceTopicID": sourceTopicID, "targetTopicID": targetTopicID, "helper": ui.helper,
          "viewpointID": viewpointID, "itemID": itemID} );
      }
    });
  },

  doDropFragmentAccepted : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doDropFragmentAccepted");
    logger.debug(arg);
    var viewpointID = $('li[fragmentID="' + arg.fragmentID + '"]').attr("viewpointID");
    logger.debug(viewpointID);

    var el = "div.fragments[viewpointID='" + viewpointID + "'][topicID='" + arg.targetTopicID + "'] ul";
    logger.debug(el);
    $('li[fragmentID="' + arg.fragmentID + '"]').clone().appendTo($(el)).attr("topicID", arg.targetTopicID);
    $('li[fragmentID="' + arg.fragmentID + '"][topicID="' + arg.sourceTopicID + '"]').hide().remove();
    $('li.ui-draggable-dragging[fragmentID="' + arg.fragmentID + '"]').hide().remove();
    $("div.fragments ul li").tsort({order:"asc",attr:"startPos"});
    //TODO Update the highlight
    dispatch("lasuli.ui.doMakeFragmentsDragable", null);
  },

  doDropFragmentDenied : function(arg){
    arg.helper.fadeOut();
  },

  doRemoveFragment : function(fragmentID) {
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doRemoveFragment");
    var el = "li.fragment[fragmentID='" + fragmentID + "']";
    logger.debug(el);
    $(el).slideToggle({duration: 500, easing: 'easeInSine'}).remove();
  },


  doCreateAnalysis: function(topic){
    lasuli.ui._initFragmentsContainer(topic);
    dispatch("lasuli.ui.doMakeFragmentsDragable", null);
    var el = "div.fragment-header[viewpointID='" + topic.viewpointID + "'][topicID='" + topic.topicID + "']";
    var span = $(el).find("span");
    span[0].scrollIntoView(true);
    span.fadeOut(500).fadeIn(500).fadeOut(500).fadeIn(500).fadeOut(500).fadeIn(500);
  },

  doRenameAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doRenameAnalysis");
    logger.debug(arg);
    var el="div.fragment-header[viewpointID='" + arg.viewpointID + "'][topicID='" + arg.topicID + "']";
    var span = $(el).find("span");
    span.html(arg.name);
  },

  doRestoreAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doRestoreAnalysis");
    logger.debug(arg);

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
    logger.debug(arg);

    var viewpointID = arg.viewpointID;
    var topicID = arg.topicID;
    var el="div.fragments[viewpointID='" + viewpointID + "'][topicID='" + topicID + "']";
    $(el).slideToggle({duration: 500, easing: 'easeInSine'}).remove();
  },

  doHighlightMenuClick: function(topic){

    var logger = Log4Moz.repository.getLogger("lasuli.ui.doHighlightMenuClick");
    try{ topic = JSON.parse(topic); }catch(e){}
    logger.debug(topic);
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    var content = win.getBrowser().contentWindow;
    var selection = content.getSelection();
    logger.debug("selection:" + selection);
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
    logger.debug('start to get treewalker');
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
      //TODO error message?
      return false;
    }
    logger.debug('start to get position');
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
          endPos = startPos + strContent.length;

          break;
        }
        /*if(node.isSameNode(endContainer)){
          endPos = curPos + endOffset;
          logger.debug("end:" + startPos);
        }*/
        curPos += node.data.length;
    }
    if(!startPos || !endPos) return false;
    logger.debug(new Array(startPos, endPos));
    logger.debug(strContent);
    var viewpointID;
    if(topic.viewpointID)
      viewpointID = topic.viewpointID;
    else
      viewpointID = $('div#tabs li.ui-tabs-selected a').attr('href').substr(1);

    var topicID = (topic.topicID) ? topic.topicID : null;
    var fragment = { "viewpointID": viewpointID, "topicID": topicID, "startPos": startPos, "endPos": endPos, "text": strContent };
    dispatch("lasuli.core.doCreateFragment", fragment);
  }
}


$(window).bind("load", function(){
  lasuli.jqGirdLoader();
  lasuli.ui.register();
  lasuli.ui.doBlockUI();
  lasuli.ui.initTabs();
  lasuli.ui.initViewpointPanel();
  lasuli.ui.initPlusPanel();
  lasuli.ui.initAttributeGrid();
  lasuli.ui.initTagCloud();
  lasuli.ui.initItemName();
  lasuli.ui.initDocumentPanel();
});

$(window).bind("unload", function(){
  lasuli.ui.unregister();
  dispatch('lasuli.core.doClearFragmentsCache', null);
  dispatch('lasuli.contextmenu.doHide', null);
  dispatch('lasuli.highlighter.doClear', null);
});