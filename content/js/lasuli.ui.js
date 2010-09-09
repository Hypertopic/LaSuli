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
        Observers.notify("lasuli.ui.doClearViewpointPanel", viewpointID);
        Observers.notify("lasuli.core.doLoadTags", viewpointID);
        Observers.notify("lasuli.core.doLoadFragments", viewpointID);
      }
      else
        Observers.notify('lasuli.contextmenu.doHide', null);
    });

    $('#tabs span.ui-icon-close').live('click', function() {
      var index = $('li',$tabs).index($(this).parent());
      $tabs.tabs('remove', index);
    });
  },

  initDocumentPanel : function(){
    //var browsingUrl = "http://cassandre/text/d0";
    Observers.notify("lasuli.core.doLoadDocument", null);
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
		    Observers.notify("lasuli.ui.doShowMessage", message);
		    return false;
		  }
		  logger.debug("Create viewpoint button click.\nViewpoint name:" + viewpointName);
		  Observers.notify("lasuli.core.doCreateViewpoint", viewpointName);
		});

		var resizeInput = function(){
		  $('div#create-viewpoint input').width( $('#tabs').innerWidth() - 130);
		};
		//Resize the input box
		$(window).resize(resizeInput);
		resizeInput();

		//Noticy the core to load all viewpoints.
		Observers.notify("lasuli.core.doListViewpoints", null);

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
        Observers.notify("lasuli.core.doDestroyViewpoint", viewpointID);
      };
      Observers.notify("lasuli.ui.doShowMessage", message);

    });
    $('#viewpoints-ul li a').live('click', function(){
      var logger = Log4Moz.repository.getLogger("lasuli.ui.initViewpointPanel.viewpoint.click");
      var viewpointID = $(this).parent().attr("uri");
      var viewpointName = $(this).text();
      var viewpoints = new Array({"id": viewpointID, "name": viewpointName});
      logger.debug(viewpoints);
      Observers.notify("lasuli.ui.doShowViewpointPanels", viewpoints);
      return false;
    });
  },

  initViewpointPanel : function(){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.initViewpointPanel");
    // Delete a tag by click the trash icon
    $('.remove-tag-img').live('click', function(){
      var topicID = $(this).next("a").attr("uri");
      var viewpointID = $(this).parents('.ui-tabs-panel').attr("id");
      if(typeof(topicID) == "string" && topicID.length >0)
        Observers.notify("lasuli.core.doRemoveTag", {"topicID":topicID, "viewpointID": viewpointID});
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
        Observers.notify("lasuli.core.doRenameTag", {"viewpointID":viewpointID, "topicID":topicID, "name": topicName, "newName": topicNewName});
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
      $("#topic-dialog").dialog('open');
      //Observers.notify("lasuli.core.doCreateTag", {"viewpointID":"5a03d6d794ec4b9215f7cba8600c0739", "name": "topicName"});
    });

    var topicDialogButtons = {};
    topicDialogButtons[_('Cancel')] = function() { $(this).dialog('close');  };
  	topicDialogButtons[_('Okay')] = function() {
  	  $('#topic-name').removeClass('ui-state-error');
      if ( $('#topic-name').val().length == 0)
      {
        $('#topic-name').addClass('ui-state-error');
        return false;
      }

      var topicName = $('#topic-name').val();
      var viewpointID = $("#tabs ul li.ui-state-active").find("a").attr("href").substr(1);
      $("#topic-dialog").dialog('close');
      Observers.notify("lasuli.core.doCreateTag", {"viewpointID":viewpointID, "name": topicName});
    };

    //Initial topic dialog
    $("#topic-dialog").dialog({
      bgiframe: true,
      autoOpen: false,
      modal: true,
      width: 170,
      title: _("add-topic-dialog-title"),
      buttons: topicDialogButtons,
      open: function(){
        $('#topic-name').val('').focus().select();
      },
      close: function() {
        $('#topic-name').removeClass('ui-state-error');
      }
    });

    $('#topic-name').keyup(function(event){
      if (event.keyCode == 13)
      {
        var buttons = $('#topic-dialog').dialog('option','buttons');
        if(typeof(buttons[_('Okay')]) == "function")
          buttons[_('Okay')].call();
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
        Observers.notify("lasuli.core.doDestroyAnalysis", {"viewpointID":viewpointID, "topicID": topicID, "name": name});
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
      //TODO
      /*var itemUri = $(this).attr('uri');
      var nodes = findNodeByItem(itemUri);
      if(nodes)
        nodes[0].scrollIntoView(true);*/
    });

    //Delete fragment
    $("li.fragment span.ui-icon-trash").live("click", function(){
      var fragmentID = $(this).parent().attr("fragmentID");
      var viewpointID = $(this).parent().attr("viewpointID");
      var topicID = $(this).parent().attr("topicID");
      var itemID = $(this).parent().attr("itemID");
      Observers.notify("lasuli.core.doUntagFragment", {"fragmentID": fragmentID, "viewpointID": viewpointID, "topicID": topicID, "itemID": itemID});
    });

    //Add analysis topic
    $('.add-analyses-img').live("click", function(){
      var viewpointID = $(this).parents("div.ui-tabs-panel").attr("id");
      Observers.notify("lasuli.core.doAddAnalysis", viewpointID);
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
          Observers.notify("lasuli.ui.doRestoreAnalysis", {
            "viewpointID": viewpointID, "topicID": topicID, "name": originalTopicName,
            "newName": newName, "originalSpan": originalSpan, "originalImage": originalImage});
        }
        else
          Observers.notify("lasuli.core.doRenameAnalysis", {
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
        Observers.notify("lasuli.core.doCreateAttribute", attribute);
        $('#attribute-dialog').dialog('close');
      }
    };

    $("#attribute-dialog").dialog({
      bgiframe: true,
      autoOpen: false,
      modal: true,
      width: 170,
      title: _("add-attribute-dialog-title"),
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
        Observers.notify("lasuli.core.doDestroyAttribute", attribute);
      }
      else
      {
        var message = {};
        message.title = _("Warning");
        message.content = _("no-attribute-selected");
        Observers.notify("lasuli.ui.doShowMessage", message);
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
        message.content = _("no-attribute-selected");
        Observers.notify("lasuli.ui.doShowMessage", message);
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
      var el = $(this).clone();
      logger.debug(el);
      logger.debug(el.html());
      $(this).html("<input type='text' class='edit-in-place' value=''>");
      $(this).find("input").val(el.html());
      $(this).find("input").focus().select();

      $(this).find("input").blur(function(){
        var name = el.html();
        var newName = $(this).val();
        Observers.notify("lasuli.core.doRenameItem", {"name": name, "newName": newName});
        return false;
      });

      $(this).find("input").keyup(function(event){
        if (event.keyCode == 27)
          $(this).replaceWith(el.html());
        if (event.keyCode == 13)
          $(this).blur();
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
    //logger.debug(viewpoints);
    $('#viewpoints-ul li').hide().remove();
    //logger.debug(typeof(viewpoints));
    //logger.debug(viewpoints.length);
    if(typeof(viewpoints) == "object" && viewpoints.length > 0)
      for(var i=0, viewpoint; viewpoint = viewpoints[i]; i++){
        //logger.debug("adding:" + viewpoint.name);
        $("#viewpoints-ul").append("<li uri='" + viewpoint.id + "'><img src='css/blitzer/images/delete.png' class='icon-remove-viewpoint'><a>"
                                   + viewpoint.name + "</a></li>");
      }
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
      Observers.notify("lasuli.core.doOpenViewpointByUser", user);
      return false;
    });
  },

  doShowItemName : function(itemName){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowItemName");
    logger.debug(itemName);
    if(!itemName) itemName = _("no.name");
    $("#h3-entity-name").html(itemName);
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

  doShowTagCloud : function(topics){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowTagCloud");
    logger.debug(topics);
    $("#tags ul li").hide().remove();
    if(!topics) return false;

    var tags = {};
    for(var i=0, topic; topic = topics[i]; i++)
      if(!tags[topic.name])
        tags[topic.name] = (topic.highlight) ? topic.highlight.length : 1;
      else
        tags[topic.name] = tags[topic.name] + ((topic.highlight) ? topic.highlight.length : 1);

    var max = 0;
    var min = 32768;
    for(var name in tags)
    {
      if(tags[name] > max) max = tags[name];
      if(tags[name] < min) min = tags[name];
    }
    //var_dump("UI.init.js", "max:" + max + ", min:" + min, 4);
    for(var name in tags)
    {
      var size = Math.round((tags[name] - min) / (max-min) * 4) + 1;
      //var_dump("UI.init.js", "topics[name].length:" + topics[name].length, 4);
      var content = "<li class='tag" + size + "'><a>" + name + "</a></li>";
      $("#tags ul").append(content);
    }
    $(".tagcloudSortAlphabetically").data("desc", true);
    $("#tags ul li").tsort({order:"asc"});
    $("#tags ul li a").click(function(){
      var topicName = $(this).text();
      Observers.notify("lasuli.core.doOpenViewpointByTopicName", topicName);
      return false;
    });
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

  doShowTags : function(tags){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doShowTags");
    logger.debug(tags);
    if(tags.length == 0) return false;
    var html = "";
    var viewpointID = null;
    for(var i=0; topic = tags[i]; i++)
    {
      if(!viewpointID) viewpointID = topic.viewpointID;
      var el = 'div#' + topic.viewpointID + ' ul.topics-ul li a[uri="' + topic.topicID + '"]';
      logger.info(el);
      if($(el).length > 0)
        continue;
      html += '<li class="topic"><img src="css/blitzer/images/delete.png" class="remove-tag-img hide"><a uri="' + topic.topicID + '">' + topic.name + '</a></li>';
      //logger.debug(html);
    }
    //logger.info(viewpointID);
    //logger.debug(html);
    if(viewpointID && $('#' + viewpointID).length > 0)
      $('#' + viewpointID).find(".topics-ul").append(html);
  },

  doRemoveTag : function(tag){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doRemoveTag");
    //logger.debug('div#' + tag.viewpointID + ' ul.topics-ul li a[uri="' + tag.topicID + '"]');
    var el = 'div#' + tag.viewpointID + ' ul.topics-ul li a[uri="' + tag.topicID + '"]';
    if($(el).length > 0)
      $(el).parent().remove();
  },

  doRestoreTag : function(tag){
    $('ul.topics-ul').find('input').prev('a').addClass('hide');
    $('ul.topics-ul').find('input').replaceWith("<a uri='" + tag.topicID + "'>" + tag.name + "</a>");

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

  doAddFragments : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doAddFragments");
    var fragments = arg.fragments;
    for(var i=0, fragment; fragment = fragments[i]; i++)
    {
      var li_html = '<li class="fragment ui-corner-bottom" itemID="' + fragment.itemID + '" fragmentID="' + fragment.fragmentID + '" viewpointID="' + fragment.viewpointID
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
    Observers.notify("lasuli.ui.doMakeFragmentsDragable", null);
  },

  doShowFragments : function(arg){
    var topics = arg.topics;

    for(var i=0, topic; topic = topics[i]; i++)
    {
      lasuli.ui._initFragmentsContainer(topic);
    }
    Observers.notify("lasuli.ui.doMakeFragmentsDroppable", null);
    Observers.notify("lasuli.ui.doAddFragments", {"fragments": arg.fragments, "highlight": true} );
  },

  doClearViewpointPanel : function(viewpointID){
    $("div#" + viewpointID).find("ul.topics-ul li").hide().remove();
    $("div#" + viewpointID).find("div.fragments").hide().remove();
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
        Observers.notify("lasuli.core.doMoveFragment", {"fragmentID": fragmentID, "sourceTopicID": sourceTopicID, "targetTopicID": targetTopicID, "helper": ui.helper,
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
    Observers.notify("lasuli.ui.doMakeFragmentsDragable", null);
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

  doAddAnalysis: function(topic){
    lasuli.ui._initFragmentsContainer(topic);
    var el = "div.fragment-header[viewpointID='" + topic.viewpointID + "'][topicID='" + topic.topicID + "']";
    var span = $(el).find("span");
    span[0].scrollIntoView(true);
    span.fadeOut(500).fadeIn(500).fadeOut(500).fadeIn(500).fadeOut(500).fadeIn(500);
  },

  doRestoreAnalysis : function(arg){
    var logger = Log4Moz.repository.getLogger("lasuli.ui.doRestoreAnalysis");
    logger.debug(arg);

    var viewpointID = arg.viewpointID;
    var topicID = arg.topicID;
    var originalImage = arg.originalImage;
    var originalSpan = arg.originalSpan;
    if(!arg.name)
      originalSpan.text(arg.newName);
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

  doDisplayItemName : function(name){
    $("h3#h3-entity-name").html(name);
  }

}


$(window).bind("load", function(){
  lasuli.jqGirdLoader();
  lasuli.ui.register();
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
  Observers.notify('lasuli.contextmenu.doHide', null);
});