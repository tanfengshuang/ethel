/**
 * @summary     UI tweaks
 * @description All the general Ethel UI helpers and features are stored here
 * @version     1.0
 * @file        ui.js
 * @author      Tomas Coufal
 *
 * Licensed under the MIT license
 */

/* global $ */

/**
 * Initialize the sidebar for Manage Accounts tab
 */
function navSetup () {
  $(document).sidebar() // Sets sidebar height, etc.
}

/**
 * Enable user to select rows in DataTables
 */
function enableRowSelect () {
  $('.table-clickable tbody').on('click', 'tr', function () {
    $(this).toggleClass('selected')

    // toggle download button for selected rows if any row remains selected
    var lines_selected = $('.table-clickable tbody tr.selected').length
    $('#search .download-button.download-selected').toggleClass('disabled', !lines_selected)
    $('#search .download-button.download-selected span.counter').text(lines_selected)
  })
}

/**
 * Remember Username and Password on the loaded Ethel instance across forms
 */
function keepAccount () {
  $('[name=username]').focusout(function () {
    $('[name=username]').val($(this).val())
  })
  $('[name=password]').focusout(function () {
    $('[name=password]').val($(this).val())
  })
}

/**
 * Tabs management
 *
 * - Keep the tabs persistent when switching between Search and Manage Accounts.
 * - Update browser's URL location when tab is changed
 * - Push the tab selection into the history
 * - When URL points to a specific tab, show it
 * - When on tab is specified by the URL hash, show the default one.
 */
function persistentTabs () {
  // change the browser URL and prevent jumping if possible
  var change_url = function (hash) {
    if (window.history.pushState) {
      window.history.pushState(null, null, hash)
    } else {
      window.location.hash = hash
    }
  }

  // load the hashes of all available views
  var manage_view = $('.nav-pills a').map(function (obj, item) { return item.hash })
  var search_view = $('.navbar-persistent a').map(function (obj, item) { return item.hash })

  // set the behavior on tab activation
  $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    // the clicked tab is shown automatically, manage just the outer environment

    // if the hash is found in the Manage Accounts views
    if ($.inArray(e.currentTarget.hash, manage_view) > -1) {
      // highlight the active tab label (pill) if it's second-level navigation
      $('.nav-pills li').removeClass('active')
      $('.nav-pills a[href=' + e.currentTarget.hash + ']').parent().addClass('active')

      // also activate proper top-level tab if it's not already active
      $('a[data-toggle="tab"][href="#manage"]').tab('show')

      // change the url
      change_url(e.currentTarget.hash)
    } else if ($.inArray(e.currentTarget.hash, search_view) > -1) {
      // one of the Search views should be displayed
      // activate the top-level search tab
      $('a[data-toggle="tab"][href="#search"]').tab('show')

      // change the url
      change_url(e.currentTarget.hash)
    }

    // if changing top-level (Manage Accounts or Search is clicked)
    // use the active tab on the destination
    var hash = ''
    if (e.currentTarget.hash === '#manage') {
      // Manage Accounts top-level clicked
      // hide search tab navigation
      $('.navbar-primary').removeClass('persistent-secondary')

      // check if there's already an active second-level tab
      // if there is no such tab show the #create. Only change the URL hash otherwise.
      hash = $('.nav-pills li.active a').attr('href')
      if (hash === undefined) {
        $('.nav-pills a[href=#create]').tab('show')
      } else {
        change_url(hash)
      }
    } else if (e.currentTarget.hash === '#search') {
      // Search SKU DB top-level clicked
      // show search navigation
      $('.navbar-primary').addClass('persistent-secondary')

      // check for existent active tab (same as above, fallback to #search_basic)
      hash = $('.navbar-persistent li.active a').attr('href')
      if (hash === undefined) {
        $('.navbar-persistent a[href=#search_basic]').tab('show')
      } else {
        change_url(hash)
      }
    }
  })

  // manually invoke a tab change
  var manual_tab = function (hash) {
    // ensure that the proper top level tab is shown
    if ($.inArray(hash, manage_view) > -1) {
      $('a[data-toggle="tab"][href="#manage"]').tab('show')
    } else if ($.inArray(hash, search_view) > -1) {
      $('a[data-toggle="tab"][href="#search"]').tab('show')
    }
    // show desired view
    $('a[data-toggle="tab"][href="' + hash + '"]').tab('show')
  }

  // set proper tab on the initial page load
  manual_tab(window.location.hash ? window.location.hash : '#create')

  // when the hash in URL has been changed (manually), show the tab
  $(window).on('hashchange', function (e) { manual_tab(window.location.hash) })
}

/**
 * Enable the date picker for the Attach Subscription work flows
 */
function enableDatePicker () {
  $('input[data-field-type=date]').datepicker({
    autoclose: true, // close on loast focus
    orientation: 'top auto', // show above the fiels
    todayBtn: 'linked', // show button to return to 'today'
    todayHighlight: true, // highlight current day
    endDate: '+1y', // set max date to +1 year
    startDate: '0d', // set the minimum date to today
    maxViewMode: 'decade' // set maximum zoom out to decades view
  })
}

/**
 * Run all the functions above when Ethel's loaded
 */
$(document).ready(function () {
  navSetup()
  persistentTabs()
  keepAccount()
  enableRowSelect()
  enableDatePicker()
})
