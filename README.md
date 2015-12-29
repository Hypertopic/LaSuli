LASULI – Social annotation for qualitative analysis
===================================================

License: [BSD](http://www.opensource.org/licenses/bsd-license.php)

Author: Chao Zhou

Contact: <contact@hypertopic.org>

Home page: <https://github.com/Hypertopic/LaSuli>

Notice
------

If you just want to **use** LaSuli, [install its **stable version**](https://hypertopic.s3.amazonaws.com/lasuli.xpi).

The following instructions are only for people willing to **modify** the software or to test the development version.

Installation requirements
-------------------------

* Git client
* [Firefox](http://www.mozilla.org/firefox/) 
* [Firefox development profile](http://support.mozilla.org/kb/Managing-profiles#w_starting-the-profile-manager)

Installation procedure
----------------------

* Start Firefox [with your development profile](https://support.mozilla.org/kb/using-multiple-profiles) and go to the [corresponding directory](http://support.mozilla.com/kb/Profiles#How_to_find_your_profile).

* Go to the ``extension`` sub-directory and get the latest revision of the source code:

        git clone git@github.com:Hypertopic/LaSuli.git

* Rename ``LaSuli`` directory into ``lasuli@hypertopic.org``

* Restart Firefox.

Debugging procedure
-------------------

* Open `about:config` in Firefox.
* Search for `extensions.lasuli.log.level` and set it to `Debug`.
* In the menu, choose `Tools > Web development > Browser console`.
* Enable (only) `JS` and the levels you need (errors, warnings, log).
