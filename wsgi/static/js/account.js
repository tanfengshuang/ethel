/**
 * @summary     Account Management
 * @description Creates bindings for the web UI to Ethel back end using AJAX
 * @version     1.0
 * @file        account.js
 * @author      Tomas Coufal
 *
 * Licensed under the MIT license
 */

/* global $, __simpleAJAX, __serializeForm */

/**
 * Refresh Subscription pools for given account
 *
 * Build an options dictionary and pass it (along with given data) to the
 * __simpleAJAX.
 * @param {Object} data - object containing keys: 'username', 'password'
 * @param {string} success_text - text that should be displayed when successful
 * @param {string} loading_text - description on the loading toast
 */
function RefreshPools (data, success_text, loading_text) {
  var opts = {
    labels: {
      loading: loading_text || 'Refreshing subscriptions for "' + data['username'] + '"',
      success: success_text || 'All attached pools were refreshed successfully'
    }
  }
  var url = '/account/refresh'

  // data's ready, time to call Ethel
  __simpleAJAX(data, url, opts)
}

/**
 * Attach Subscription pools for given account
 *
 * Build an options dictionary, bind callbacks and prepare/parse given data to
 * be in proper format for the Ethel API. Than pass the data to __SimpleAJAX.
 * @param {Object} data - object containing keys:
 *    'username', 'password', 'sku', 'quantity', 'expire', 'terms'
 * @param {string} success_text - text that should be displayed when successful
 * @param {function} callback - callback for both success and failure of the
 *    request. If not set defaults to RefreshPools call.
 */
function AttachPools (data, success_text, callback) {
  var url = '/account/attach'
  success_text = success_text || 'All pools successfully added'
  var opts = {
    labels: {
      loading: 'Adding subscriptions to "' + data['username'] + '"'
    },
    callbacks: {
      success: callback || function () {
        RefreshPools(data, success_text)
      },
      failure: callback || function () {
        RefreshPools(data)
      }
    },
    skip_toast_success: true,
    persistent_toast_error: true
  }

  // build a list of SKUs (string -> array)
  data['sku'] = data['sku'].replace(/\s+/g, '').split(',')

  // use the quantity set by user (or fallback to default = 1)
  data['quantity'] = parseInt(data['quantity'], 10) || 1

  // if expiration date not set, don't send the empty value
  if (!data['expire']) delete data['expire']

  // terms are not needed for this call, remove it
  delete data['terms']

  // give Ethel a homework
  __simpleAJAX(data, url, opts)
}

/**
 * Accept Terms and conditions for given account
 *
 * Build an options dictionary, bind success callback and let the __SimpleAJAX
 * call Ethel.
 * @param {Object} data - object containing keys: 'username', 'password'
 * @param {string} success_text - text that should be displayed when successful
 * @param {function} callback - callback in case the request went fine
 */
function ActivateAccount (data, success_text, callback) {
  var url = '/account/activate'
  var opts = {
    labels: {
      loading: 'Accepting Ts&Cs for "' + data['username'] + '"',
      success: success_text || 'All Terms and Conditions accepted'
    },
    callbacks: {
      success: callback
    }
  }

  // if the success_text value is set to false let's assume the caller doesn't
  // want us to show the Toast
  if (success_text === false) {
    opts.skip_toast_success = true
  }

  // let Ethel do her job
  __simpleAJAX(data, url, opts)
}

/**
 * Create new account
 *
 * Build an options dictionary, bind callback and create account. Simple,
 * isn't it?
 * @param {Object} data - object containing keys:
 *    'username', 'password', 'first_name', 'last_name'
 * @param {function} callback - callback for a successful request
 */
function NewAccount (data, callback) {
  var url = '/account/new'
  var opts = {
    labels: {
      loading: 'Creating account "' + data['username'] + '"'
    },
    callbacks: {
      success: callback
    },
    skip_toast_success: true
  }

  // Ethel's on stage!
  __simpleAJAX(data, url, opts)
}

/**
 * Account subscriptions viewer
 *
 * Build an options dictionary, bind callbacks, ask Ethel for data and then just
 * display what the user wants to see.
 * @param {Object} data - object containing keys: 'username', 'password'
 */
function ViewAccount (data) {
  var url = '/account/get'
  var opts = {
    method: 'get',
    labels: {
      loading: 'Fetching "' + data['username'] + '" account details',
      success: 'Data retieved successfully'
    },
    callbacks: {
      success: function (resp) {
        // in case of success initialize table for results

        // enable the View button back (disabled when the request begun)
        $('#account_view input[type=submit]').prop('disabled', false)

        // finish the progress-bar
        $('#account_details_pending .progress-bar').removeClass('hidden')
          .animate({width: '100%'}, 100)

        // add artificial visual feedback - show the data after 200ms
        // so the progress bar has time to finish to 100%
        setTimeout(function () {
          // show the results
          $('#account_details_pending').addClass('hidden')
          $('#account_details_result').removeClass('hidden')

          // add the username in the title
          $('#view small').removeClass('hidden')
            .find('.username').text(resp.data['username'])
        }, 200)

        // initialize the table with data
        InitViewAccountTable(resp.data['pools'])
      },
      failure: function (foo) {
        // when request failed, hide the progress
        // TODO: add a special failure view
        $('#account_details_pending .progress-bar').addClass('hidden')

        // enable the View button back
        $('#account_view input[type=submit]').prop('disabled', false)
      }
    }
  }

  // remove the placeholder
  $('#account_details_placeholder').remove()

  // setup the loading progress-bar
  $('#account_details_result').addClass('hidden')
  $('#account_details_pending').removeClass('hidden')
  $('#account_details_pending .progress-bar').removeClass('hidden')
    .css({width: '0%'}).animate({width: '70%'}, 7500)

  // disable the View button because the request starts now
  $('#account_view input[type=submit]').prop('disabled', true)

  // give Ethel a new task
  __simpleAJAX(data, url, opts)
}

/**
 * Initialize DataTable with account's pools
 *
 * Use the given data and render them into a table
 * @param {Object} data - raw JSON data from Ethel
 */
function InitViewAccountTable (data) {
  $('#account_details_result .datatable').DataTable({
    data: data,
    columns: [
      {title: 'Subscription ID', data: 'sku'},
      {title: 'Product Name', data: 'name'},
      {title: 'Quantity', data: 'quantity'},
      {title: 'Subscription pool', data: 'id'}
    ],
    colReorder: true,
    dom: '<"dataTables_header">t<"dataTables_footer"ip>',
    language: {
      loadingRecords: '',
      info: '<strong>_TOTAL_</strong> pools available'
    }
  })
  // adjust the pagination appereance
  $('.dataTables_paginate .pagination-input input').addClass('form-control').css('display', 'inline')
}

/**
 * Bind all the forms to proper calls
 */
$(document).ready(function () {
  /**
   * New Account form
   *
   * Applied workflow:
   *  -  NewAccount()
   *  -  Should the account be active? -> ActivateAccount()
   *  -  Are SKUs listed? -> AttachPools()
   *  -  RefreshPools()
   *
   */
  $('#account_new').submit(function (event) {
    event.preventDefault()
    var data = __serializeForm(this)

    NewAccount(data, function (resp) {
      // Define the SECOND callback when the account is created
      var callback = function (resp) {
        // Add subscription pools if SKUs are specified. Otherwise generate the
        // organization and owner.
        var success_text = 'Account "' + data['username'] + '" created'
        var loading_text = 'Creating account owners in Candlepin'

        // Define the LAST callback -> ensure the refresh is called
        var callback2 = function (foo) {
          RefreshPools(data, success_text, loading_text)
        }

        // if SKUs are listed add pools. Otherwise just refresh
        data['sku'] ? AttachPools(data, false, callback2) : callback2(resp)
      }

      // This is the actual INITIAL callback ->
      // if activation is requested do it now, proceed to next step otherwise
      data['terms'] ? ActivateAccount(data, false, callback) : callback(resp)
    })
  })

  /**
   * Activate account form
   */
  $('#account_terms').submit(function (event) {
    event.preventDefault()
    var data = __serializeForm(this)
    ActivateAccount(data)
  })

  /**
   * Create Pools form
   *
   * Applied workflow:
   *  -  Should the account be active? -> ActivateAccount()
   *  -  AttachPools()
   *
   */
  $('#pool_create').submit(function (event) {
    event.preventDefault()
    var data = __serializeForm(this)

    // if account should be activate, do it first and as a callback attach the
    // subscriptions
    if (data['terms']) {
      ActivateAccount(data, false, function (resp) {
        AttachPools(data)
      })
    } else {
      AttachPools(data)
    }
  })

  /**
   * Refresh Pools form
   */
  $('#pool_refresh').submit(function (event) {
    event.preventDefault()
    var data = __serializeForm(this)
    RefreshPools(data)
  })

  /**
   * View Account form
   */
  $('#account_view').submit(function (event) {
    event.preventDefault()
    var data = __serializeForm(this)
    ViewAccount(data)
  })
})
