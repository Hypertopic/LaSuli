var overlay = {
	openSideBar: function(){
		if(!overlay.isSidebarOpen()){
   		toggleSidebar('viewLaSuliSidebar', true);
  	}
	},

	isSidebarOpen: function(){
		return (document.getElementById("viewLaSuliSidebar").getAttribute("checked") == "true");
	}
}