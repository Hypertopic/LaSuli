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
* [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/)

Installation procedure
----------------------

* Start Firefox Developer Edition with the default development profile and go to the [corresponding directory](http://support.mozilla.com/kb/Profiles#How_to_find_your_profile).
* Go to the ``extensions`` sub-directory (after creating it if necessary) and get the latest revision of the source code:

        git clone git@github.com:Hypertopic/LaSuli.git

* Rename ``LaSuli`` directory into ``lasuli@hypertopic.org``
* Open `about:config` in Firefox Developer Edition.
* Search for `xpinstall.signatures.required` and set it to `false`.
* Open `about:addons` and enable `LaSuli`.
* Restart Firefox Developer Edition.

Debugging procedure
-------------------

* In the menu, choose `Tools > Web development > Browser console`.
* Enable (only) `JS` and the levels you need (errors, warnings, log).
